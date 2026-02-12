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
// For physical device testing, use your machine's local IP
// For simulator, use localhost
const API_URL = __DEV__
    ? 'http://192.168.0.101:4000/graphql'  // Change to your local IP for device testing
    : 'https://api.onlyou.life/graphql';

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
                // Token refresh should be handled by the auth context
                // This error will be caught and handled there
                console.log('Auth error: Token may be expired');
            }
        }
    }

    if (networkError) {
        console.log(`[Network error]: ${networkError}`);
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
