import {
    ApolloClient,
    InMemoryCache,
    Observable,
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

// Error handling link with automatic token refresh on UNAUTHENTICATED errors
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
    if (graphQLErrors) {
        for (const err of graphQLErrors) {
            if (err.extensions?.code === 'UNAUTHENTICATED') {
                // Attempt automatic token refresh and retry the failed operation
                return new Observable(observer => {
                    getRefreshToken()
                        .then(refreshToken => {
                            if (!refreshToken) {
                                observer.error(err);
                                return;
                            }
                            // Call the refresh token mutation directly via fetch
                            return fetch(API_URL, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    query: `mutation RefreshToken($input: RefreshTokenInput!) {
                                        refreshToken(input: $input) {
                                            success accessToken refreshToken
                                        }
                                    }`,
                                    variables: { input: { refreshToken } },
                                }),
                            });
                        })
                        .then(response => response?.json())
                        .then(data => {
                            const result = data?.data?.refreshToken;
                            if (result?.success && result.accessToken) {
                                // Store new tokens in SecureStore
                                setToken(result.accessToken);
                                if (result.refreshToken) {
                                    setRefreshToken(result.refreshToken);
                                }
                                // Retry the failed operation with the new access token
                                const oldHeaders = operation.getContext().headers;
                                operation.setContext({
                                    headers: {
                                        ...oldHeaders,
                                        authorization: `Bearer ${result.accessToken}`,
                                    },
                                });
                                forward(operation).subscribe(observer);
                            } else {
                                // Refresh failed — clear tokens so auth context can redirect to login
                                clearTokens();
                                observer.error(err);
                            }
                        })
                        .catch(refreshError => {
                            if (__DEV__) {
                                console.warn('Token refresh failed:', refreshError);
                            }
                            clearTokens();
                            observer.error(err);
                        });
                });
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
    cache: new InMemoryCache({ canonizeResults: false }),
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
