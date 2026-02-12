'use client';

import {
    ApolloClient,
    ApolloProvider,
    InMemoryCache,
    createHttpLink,
    from,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { ReactNode, useMemo } from 'react';
import { ToastProvider } from '@/components/ui/toast';

const httpLink = createHttpLink({
    uri: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql',
});

const authLink = setContext((_, { headers }) => {
    // Get token from localStorage (client-side only)
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    return {
        headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : '',
        },
    };
});

// Error handling link for token refresh and auth errors
const errorLink = onError(({ graphQLErrors }) => {
    if (graphQLErrors) {
        for (const err of graphQLErrors) {
            // Check for authentication errors
            if (
                err.extensions?.code === 'UNAUTHENTICATED' ||
                err.message.includes('Unauthorized') ||
                err.message.includes('jwt expired')
            ) {
                // Try to refresh token
                const refreshToken =
                    typeof window !== 'undefined'
                        ? localStorage.getItem('refreshToken') ||
                          sessionStorage.getItem('refreshToken')
                        : null;

                if (refreshToken) {
                    // Note: For a full implementation, you'd want to use fromPromise
                    // and retry the failed request. For simplicity, we'll redirect to login.
                    console.warn('Token expired, redirecting to login');
                }

                // Clear tokens and redirect to login
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    sessionStorage.removeItem('refreshToken');
                    document.cookie =
                        'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

                    // Only redirect if not already on login page
                    if (!window.location.pathname.includes('/login')) {
                        window.location.href =
                            '/login?returnUrl=' +
                            encodeURIComponent(window.location.pathname);
                    }
                }
            }
        }
    }
});

function createApolloClient() {
    return new ApolloClient({
        link: from([errorLink, authLink, httpLink]),
        cache: new InMemoryCache(),
        defaultOptions: {
            watchQuery: {
                fetchPolicy: 'cache-and-network',
            },
        },
    });
}

export function Providers({ children }: { children: ReactNode }) {
    const client = useMemo(() => createApolloClient(), []);

    return (
        <ApolloProvider client={client}>
            <ToastProvider>{children}</ToastProvider>
        </ApolloProvider>
    );
}
