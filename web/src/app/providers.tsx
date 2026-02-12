'use client';

import { ApolloClient, ApolloProvider, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { ReactNode, useMemo } from 'react';

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

function createApolloClient() {
    return new ApolloClient({
        link: authLink.concat(httpLink),
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

    return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
