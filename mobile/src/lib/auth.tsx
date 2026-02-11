import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useMutation, useLazyQuery } from '@apollo/client';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './apollo';
import { ME, LOGOUT, User } from '../graphql/auth';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [fetchMe] = useLazyQuery(ME);
    const [logoutMutation] = useMutation(LOGOUT);

    // Check for existing auth on app start
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const token = await getAccessToken();
            console.log('[Auth] checkAuth - token exists:', !!token);
            if (token) {
                console.log('[Auth] checkAuth - token prefix:', token.substring(0, 20) + '...');
                const { data, error } = await fetchMe();
                console.log('[Auth] checkAuth - fetchMe result:', { hasData: !!data?.me, error: error?.message });
                if (data?.me) {
                    setUser(data.me);
                } else {
                    console.log('[Auth] checkAuth - clearing tokens (no user data)');
                    await clearTokens();
                }
            }
        } catch (error) {
            console.error('[Auth] checkAuth failed:', error);
            await clearTokens();
        } finally {
            setIsLoading(false);
        }
    };

    const login = useCallback(async (accessToken: string, refreshToken: string, userData: User) => {
        console.log('[Auth] Storing tokens...');
        console.log('[Auth] Access token prefix:', accessToken?.substring(0, 20) + '...');
        await setTokens(accessToken, refreshToken);
        // Verify tokens were stored
        const storedToken = await getAccessToken();
        console.log('[Auth] Token stored and verified:', !!storedToken);
        setUser(userData);
    }, []);

    const logout = useCallback(async () => {
        try {
            const refreshToken = await getRefreshToken();
            await logoutMutation({ variables: { refreshToken } });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            await clearTokens();
            setUser(null);
        }
    }, [logoutMutation]);

    const refreshUser = useCallback(async () => {
        const { data } = await fetchMe();
        if (data?.me) {
            setUser(data.me);
        }
    }, [fetchMe]);

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
