'use client';

import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useApolloClient } from '@apollo/client';
import { useRouter } from 'next/navigation';
import {
    REQUEST_OTP,
    VERIFY_OTP,
    LOGOUT,
    ME,
    User,
    RequestOTPResponse,
    VerifyOTPResponse,
    LogoutResponse,
    MeResponse,
} from '@/graphql/auth';

interface AuthState {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

export function useAuth() {
    const router = useRouter();
    const client = useApolloClient();
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        isLoading: true,
        isAuthenticated: false,
    });

    // Fetch current user on mount
    const { data: meData, loading: meLoading, refetch } = useQuery<MeResponse>(ME, {
        skip: typeof window === 'undefined',
        onCompleted: (data) => {
            if (data?.me) {
                setAuthState({
                    user: data.me,
                    isLoading: false,
                    isAuthenticated: true,
                });
            }
        },
        onError: () => {
            // Not authenticated or token expired
            clearTokens();
            setAuthState({
                user: null,
                isLoading: false,
                isAuthenticated: false,
            });
        },
    });

    // Update auth state when query completes
    useEffect(() => {
        if (!meLoading) {
            setAuthState((prev) => ({
                ...prev,
                isLoading: false,
                user: meData?.me || null,
                isAuthenticated: !!meData?.me,
            }));
        }
    }, [meData, meLoading]);

    // Request OTP mutation
    const [requestOTPMutation, { loading: requestingOTP }] = useMutation<RequestOTPResponse>(
        REQUEST_OTP
    );

    // Verify OTP mutation
    const [verifyOTPMutation, { loading: verifyingOTP }] = useMutation<VerifyOTPResponse>(
        VERIFY_OTP
    );

    // Logout mutation
    const [logoutMutation] = useMutation<LogoutResponse>(LOGOUT);

    const requestOTP = useCallback(
        async (phone: string) => {
            const result = await requestOTPMutation({
                variables: { phone },
            });
            return result.data?.requestOtp;
        },
        [requestOTPMutation]
    );

    const verifyOTP = useCallback(
        async (phone: string, otp: string, rememberDevice = false) => {
            const result = await verifyOTPMutation({
                variables: { phone, otp },
            });

            const response = result.data?.verifyOtp;
            if (response?.success && response.accessToken && response.refreshToken && response.user) {
                const { accessToken, refreshToken, user } = response;

                // Store tokens
                localStorage.setItem('accessToken', accessToken);

                if (rememberDevice) {
                    localStorage.setItem('refreshToken', refreshToken);
                } else {
                    sessionStorage.setItem('refreshToken', refreshToken);
                }

                // Also set as cookie for middleware
                document.cookie = `accessToken=${accessToken}; path=/; max-age=${rememberDevice ? 604800 : 86400}`;

                // Update state
                setAuthState({
                    user,
                    isLoading: false,
                    isAuthenticated: true,
                });

                // Refetch user data
                await refetch();

                return user;
            }

            // Return error message if failed
            throw new Error(response?.message || 'Verification failed');
        },
        [verifyOTPMutation, refetch]
    );

    const logout = useCallback(async () => {
        try {
            const refreshToken =
                localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
            await logoutMutation({ variables: { refreshToken } });
        } catch {
            // Ignore errors - we're logging out anyway
        }

        clearTokens();
        setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
        });

        // Clear Apollo cache
        await client.clearStore();

        // Redirect to login
        router.push('/login');
    }, [logoutMutation, client, router]);

    return {
        ...authState,
        requestOTP,
        verifyOTP,
        logout,
        requestingOTP,
        verifyingOTP,
        refetch,
    };
}

// Helper to clear all auth tokens
function clearTokens() {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        sessionStorage.removeItem('refreshToken');
        document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
}

// Hook to require auth for a page
export function useRequireAuth(allowedRoles?: User['role'][]) {
    const router = useRouter();
    const { user, isLoading, isAuthenticated } = useAuth();

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated) {
                router.push('/login?returnUrl=' + encodeURIComponent(window.location.pathname));
            } else if (allowedRoles && user && !allowedRoles.includes(user.role)) {
                // User doesn't have required role
                router.push('/unauthorized');
            }
        }
    }, [isLoading, isAuthenticated, user, allowedRoles, router]);

    return { user, isLoading, isAuthenticated };
}
