import {
    ApolloClient,
    InMemoryCache,
    createHttpLink,
    from,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import * as SecureStore from 'expo-secure-store';

// Configure based on environment
// EXPO_PUBLIC_API_URL is set in .env (root) for dev
// For physical device: set EXPO_PUBLIC_API_URL=http://YOUR_IP:4000/graphql in .env
// For simulator: localhost works by default
const API_URL = process.env.EXPO_PUBLIC_API_URL
    || (__DEV__ ? 'http://localhost:4000/graphql' : 'https://api.onlyou.life/graphql');

const TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

// Token storage helpers
export const getToken = async (): Promise<string | null> => {
    try {
        return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
        return null;
    }
};

export const setToken = async (token: string): Promise<void> => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
};

export const getRefreshToken = async (): Promise<string | null> => {
    try {
        return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
        return null;
    }
};

export const setRefreshToken = async (token: string): Promise<void> => {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
};

export const clearTokens = async (): Promise<void> => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
};

// HTTP link
const httpLink = createHttpLink({
    uri: API_URL,
});

// Auth link - adds token to headers
const authLink = setContext(async (_, { headers }) => {
    const token = await getToken();
    return {
        headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : '',
        },
    };
});

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors) {
        for (const err of graphQLErrors) {
            // Handle UNAUTHENTICATED error - token expired
            if (err.extensions?.code === 'UNAUTHENTICATED') {
                if (__DEV__) {
                    console.warn('Auth error: Token may be expired');
                }
            }
        }
    }

    if (networkError && __DEV__) {
        console.warn(`[Network error]: ${networkError}`);
    }
});

// Apollo Client instance
export const apolloClient = new ApolloClient({
    link: from([errorLink, authLink, httpLink]),
    cache: new InMemoryCache(),
    defaultOptions: {
        watchQuery: {
            fetchPolicy: 'cache-and-network',
        },
        query: {
            fetchPolicy: 'network-only',
        },
    },
});

export default apolloClient;
