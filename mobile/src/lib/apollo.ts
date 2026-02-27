import {
    ApolloClient,
    InMemoryCache,
    Observable,
    createHttpLink,
    from,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

/**
 * Resolve the GraphQL API URL.
 *
 * In production: always use the live API.
 * In development on a physical device: auto-detect the dev machine's IP from the
 * Expo Metro server connection so no manual IP config is ever needed.
 * In development on simulator: fall back to localhost.
 */
function getApiUrl(): string {
    if (!__DEV__) {
        return 'https://api.onlyou.life/graphql';
    }

    // When running in dev client connected to Metro, Expo injects the Metro
    // server's host into Constants at runtime (e.g. "192.168.0.101:8081").
    // We strip the port and point to the backend on port 4000 instead.
    const hostUri: string | undefined =
        Constants.expoConfig?.hostUri                              // SDK 50+ dev client
        ?? (Constants as any).manifest?.debuggerHost;              // SDK 46-50 fallback

    if (hostUri) {
        const host = hostUri.split(':')[0];
        return `http://${host}:4000/graphql`;
    }

    // Fallback: explicit env var (mobile/.env) or localhost for simulator
    return process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/graphql';
}

const API_URL = getApiUrl();

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

// Auth link - adds token + CSRF header to every request
const authLink = setContext(async (_, { headers }) => {
    const token = await getToken();
    return {
        headers: {
            ...headers,
            // Required by backend CSRF guard for non-cookie auth clients
            'x-requested-with': 'XMLHttpRequest',
            ...(token ? { authorization: `Bearer ${token}` } : {}),
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
