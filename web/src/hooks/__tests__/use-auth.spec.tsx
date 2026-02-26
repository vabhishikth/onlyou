import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import { useAuth } from '../use-auth';
import { REQUEST_OTP, VERIFY_OTP, LOGOUT, ME } from '@/graphql/auth';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
        replace: jest.fn(),
        prefetch: jest.fn(),
    }),
}));

const mockUser = {
    id: 'user-1',
    phone: '9876543210',
    name: 'Dr. Arun',
    email: 'arun@onlyou.life',
    role: 'DOCTOR' as const,
    isVerified: true,
    isProfileComplete: true,
    createdAt: '2026-01-01T00:00:00Z',
};

function createWrapper(mocks: MockedResponse[]) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return (
            <MockedProvider mocks={mocks} addTypename={false}>
                {children}
            </MockedProvider>
        );
    };
}

describe('useAuth', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should start with loading state', () => {
        const meMock: MockedResponse = {
            request: { query: ME },
            result: { data: { me: null } },
        };

        const { result } = renderHook(() => useAuth(), {
            wrapper: createWrapper([meMock]),
        });

        expect(result.current.isLoading).toBe(true);
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
    });

    it('should set user when ME query returns data', async () => {
        const meMock: MockedResponse = {
            request: { query: ME },
            result: { data: { me: mockUser } },
        };

        const { result } = renderHook(() => useAuth(), {
            wrapper: createWrapper([meMock]),
        });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user?.id).toBe('user-1');
        expect(result.current.user?.role).toBe('DOCTOR');
    });

    it('should set unauthenticated when ME query returns null', async () => {
        const meMock: MockedResponse = {
            request: { query: ME },
            result: { data: { me: null } },
        };

        const { result } = renderHook(() => useAuth(), {
            wrapper: createWrapper([meMock]),
        });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
    });

    it('should call requestOTP mutation', async () => {
        const meMock: MockedResponse = {
            request: { query: ME },
            result: { data: { me: null } },
        };

        const requestOTPMock: MockedResponse = {
            request: {
                query: REQUEST_OTP,
                variables: { phone: '9876543210' },
            },
            result: {
                data: {
                    requestOtp: {
                        success: true,
                        message: 'OTP sent',
                    },
                },
            },
        };

        const { result } = renderHook(() => useAuth(), {
            wrapper: createWrapper([meMock, requestOTPMock]),
        });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        let response: { success: boolean; message: string } | undefined;
        await act(async () => {
            response = await result.current.requestOTP('9876543210');
        });

        expect(response?.success).toBe(true);
        expect(response?.message).toBe('OTP sent');
    });

    it('should set user on successful verify (tokens in HttpOnly cookies)', async () => {
        const meMock: MockedResponse = {
            request: { query: ME },
            result: { data: { me: null } },
        };

        const verifyMock: MockedResponse = {
            request: {
                query: VERIFY_OTP,
                variables: { phone: '9876543210', otp: '123456' },
            },
            result: {
                data: {
                    verifyOtp: {
                        success: true,
                        message: 'Verified',
                        accessToken: 'access-token-123',
                        refreshToken: 'refresh-token-456',
                        user: mockUser,
                    },
                },
            },
        };

        // ME is refetched after verify
        const meRefetchMock: MockedResponse = {
            request: { query: ME },
            result: { data: { me: mockUser } },
        };

        const { result } = renderHook(() => useAuth(), {
            wrapper: createWrapper([meMock, verifyMock, meRefetchMock]),
        });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        await act(async () => {
            await result.current.verifyOTP('9876543210', '123456');
        });

        // Tokens are NOT stored in localStorage — they're in HttpOnly cookies set by backend
        expect(localStorage.getItem('accessToken')).toBeNull();
        expect(localStorage.getItem('refreshToken')).toBeNull();
        expect(sessionStorage.getItem('refreshToken')).toBeNull();

        // User state is set from the mutation response
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user?.id).toBe('user-1');
    });

    it('should throw on failed verification', async () => {
        const meMock: MockedResponse = {
            request: { query: ME },
            result: { data: { me: null } },
        };

        const verifyMock: MockedResponse = {
            request: {
                query: VERIFY_OTP,
                variables: { phone: '9876543210', otp: '000000' },
            },
            result: {
                data: {
                    verifyOtp: {
                        success: false,
                        message: 'Invalid OTP',
                        accessToken: null,
                        refreshToken: null,
                        user: null,
                    },
                },
            },
        };

        const { result } = renderHook(() => useAuth(), {
            wrapper: createWrapper([meMock, verifyMock]),
        });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        await expect(
            act(async () => {
                await result.current.verifyOTP('9876543210', '000000');
            }),
        ).rejects.toThrow('Invalid OTP');
    });

    it('should call logout mutation and redirect', async () => {
        const meMock: MockedResponse = {
            request: { query: ME },
            result: { data: { me: mockUser } },
        };

        const logoutMock: MockedResponse = {
            request: {
                query: LOGOUT,
                variables: {},
            },
            result: {
                data: {
                    logout: { success: true, message: 'Logged out' },
                },
            },
        };

        const { result } = renderHook(() => useAuth(), {
            wrapper: createWrapper([meMock, logoutMock]),
        });

        await waitFor(() => {
            expect(result.current.isAuthenticated).toBe(true);
        });

        await act(async () => {
            await result.current.logout();
        });

        // HttpOnly cookies are cleared by the backend — no localStorage to check
        expect(result.current.isAuthenticated).toBe(false);
        expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('should expose loading states for OTP operations', () => {
        const meMock: MockedResponse = {
            request: { query: ME },
            result: { data: { me: null } },
        };

        const { result } = renderHook(() => useAuth(), {
            wrapper: createWrapper([meMock]),
        });

        expect(result.current.requestingOTP).toBe(false);
        expect(result.current.verifyingOTP).toBe(false);
    });
});
