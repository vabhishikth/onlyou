import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
} from 'react';
import { useMutation } from '@apollo/client';
import {
    getToken,
    setToken,
    getRefreshToken,
    setRefreshToken,
    clearTokens,
    apolloClient,
} from './apollo';
import {
    REFRESH_TOKEN,
    RefreshTokenResponse,
} from '../graphql/auth';

interface User {
    id: string;
    phone: string;
    name?: string;
    email?: string;
    isProfileComplete: boolean;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
    logout: () => Promise<void>;
    refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [refreshTokenMutation] = useMutation<RefreshTokenResponse>(REFRESH_TOKEN);

    // Check for existing session on mount
    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        try {
            const token = await getToken();
            if (token) {
                // Try to refresh the token to validate session
                const success = await refreshSession();
                if (!success) {
                    await clearTokens();
                }
            }
        } catch (error) {
            console.error('Session check failed:', error);
            await clearTokens();
        } finally {
            setIsLoading(false);
        }
    };

    const refreshSession = useCallback(async (): Promise<boolean> => {
        try {
            const storedRefreshToken = await getRefreshToken();
            if (!storedRefreshToken) {
                return false;
            }

            const { data } = await refreshTokenMutation({
                variables: { refreshToken: storedRefreshToken },
            });

            if (data?.refreshToken.success && data.refreshToken.accessToken) {
                await setToken(data.refreshToken.accessToken);
                if (data.refreshToken.refreshToken) {
                    await setRefreshToken(data.refreshToken.refreshToken);
                }
                return true;
            }

            return false;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    }, [refreshTokenMutation]);

    const login = useCallback(
        async (accessToken: string, refreshToken: string, userData: User) => {
            await setToken(accessToken);
            await setRefreshToken(refreshToken);
            setUser(userData);
        },
        []
    );

    const logout = useCallback(async () => {
        await clearTokens();
        setUser(null);
        // Clear Apollo cache on logout
        await apolloClient.clearStore();
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                logout,
                refreshSession,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
