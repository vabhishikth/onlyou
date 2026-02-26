'use client';

import {
    ApolloClient,
    ApolloProvider,
    InMemoryCache,
    createHttpLink,
    from,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { ReactNode, useMemo } from 'react';
import { ToastProvider } from '@/components/ui/toast';

const httpLink = createHttpLink({
    uri: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql',
    credentials: 'include', // Send HttpOnly cookies with every request
    headers: {
        'x-requested-with': 'graphql', // CSRF protection — required by backend for cookie auth
    },
});

// Error handling link for auth errors
const errorLink = onError(({ graphQLErrors }) => {
    if (graphQLErrors) {
        for (const err of graphQLErrors) {
            if (
                err.extensions?.code === 'UNAUTHENTICATED' ||
                err.message.includes('Unauthorized') ||
                err.message.includes('jwt expired')
            ) {
                // Redirect to login — cookies are cleared by backend on logout,
                // or by middleware when expired
                if (typeof window !== 'undefined') {
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
        link: from([errorLink, httpLink]),
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
