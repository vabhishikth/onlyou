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

    // Fetch current user on mount — cookie is sent automatically via credentials: 'include'
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
        async (phone: string, otp: string) => {
            const result = await verifyOTPMutation({
                variables: { phone, otp },
            });

            const response = result.data?.verifyOtp;
            if (response?.success && response.user) {
                // Tokens are now set as HttpOnly cookies by the backend.
                // No client-side token storage needed.
                setAuthState({
                    user: response.user,
                    isLoading: false,
                    isAuthenticated: true,
                });

                // Refetch user data
                await refetch();

                return response.user;
            }

            throw new Error(response?.message || 'Verification failed');
        },
        [verifyOTPMutation, refetch]
    );

    const logout = useCallback(async () => {
        try {
            // Backend clears HttpOnly cookies on logout response
            await logoutMutation();
        } catch {
            // Ignore errors - we're logging out anyway
        }

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

// Hook to require auth for a page
export function useRequireAuth(allowedRoles?: User['role'][]) {
    const router = useRouter();
    const { user, isLoading, isAuthenticated } = useAuth();

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated) {
                router.push('/login?returnUrl=' + encodeURIComponent(window.location.pathname));
            } else if (allowedRoles && user && !allowedRoles.includes(user.role)) {
                router.push('/unauthorized');
            }
        }
    }, [isLoading, isAuthenticated, user, allowedRoles, router]);

    return { user, isLoading, isAuthenticated };
}
