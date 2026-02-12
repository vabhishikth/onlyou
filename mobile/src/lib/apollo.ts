import * as SecureStore from 'expo-secure-store';
import { ApolloClient, InMemoryCache, createHttpLink, ApolloLink, Observable, FetchResult } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

const ACCESS_TOKEN_KEY = 'onlyou_access_token';
const REFRESH_TOKEN_KEY = 'onlyou_refresh_token';

// Token storage helpers
export async function getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

export async function clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

// Track if we're currently refreshing to prevent multiple refresh calls
let isRefreshing = false;
let pendingRequests: Array<() => void> = [];

const resolvePendingRequests = () => {
    pendingRequests.forEach((callback) => callback());
    pendingRequests = [];
};

// Get the correct API URL based on environment
function getApiUrl(): string {
    // For physical device testing: use your computer's local IP
    // Find it with: ipconfig (Windows) or ifconfig (Mac/Linux)
    // Make sure phone and computer are on same WiFi
    if (__DEV__) {
        const LOCAL_IP = '192.168.0.104';
        return `http://${LOCAL_IP}:4000/graphql`;
    }

    // Production
    return 'https://api.onlyou.in/graphql';
}

const API_URL = getApiUrl();
console.log(`[Apollo] API URL: ${API_URL}`);

const httpLink = createHttpLink({
    uri: API_URL,
    fetchOptions: {
        timeout: 30000, // 30 second timeout for photo uploads
    },
});

// Refresh token function
async function refreshAccessToken(): Promise<string | null> {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
        console.log('[Apollo] No refresh token available');
        return null;
    }

    try {
        console.log('[Apollo] Attempting token refresh...');
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `
                    mutation RefreshToken($input: RefreshTokenInput!) {
                        refreshToken(input: $input) {
                            success
                            accessToken
                            refreshToken
                        }
                    }
                `,
                variables: { input: { refreshToken } },
            }),
        });

        const result = await response.json();
        if (result.data?.refreshToken?.success) {
            const { accessToken, refreshToken: newRefreshToken } = result.data.refreshToken;
            await setTokens(accessToken, newRefreshToken);
            console.log('[Apollo] Token refresh successful');
            return accessToken;
        }
        console.log('[Apollo] Token refresh failed:', result.data?.refreshToken);
        return null;
    } catch (error) {
        console.error('[Apollo] Token refresh error:', error);
        return null;
    }
}

// Error handling link with automatic token refresh
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
    if (graphQLErrors) {
        for (const error of graphQLErrors) {
            const { message, locations, path } = error;
            console.error(
                `[GraphQL Error] Message: ${message}, Location: ${locations}, Path: ${path}, Operation: ${operation.operationName}`
            );

            // Check for Unauthorized error
            if (message === 'Unauthorized') {
                // Skip refresh for auth-related operations
                const skipRefresh = ['RefreshToken', 'VerifyOtp', 'RequestOtp', 'Logout'];
                if (skipRefresh.includes(operation.operationName || '')) {
                    continue;
                }

                // Return observable that handles token refresh
                return new Observable<FetchResult>((observer) => {
                    (async () => {
                        try {
                            if (isRefreshing) {
                                // Wait for existing refresh to complete
                                await new Promise<void>((resolve) => {
                                    pendingRequests.push(resolve);
                                });
                            } else {
                                isRefreshing = true;
                                const newToken = await refreshAccessToken();
                                isRefreshing = false;

                                if (!newToken) {
                                    // Refresh failed - clear tokens and let error propagate
                                    console.log('[Apollo] Token refresh failed, clearing tokens');
                                    await clearTokens();
                                    resolvePendingRequests();
                                    observer.error(error);
                                    return;
                                }

                                resolvePendingRequests();
                            }

                            // Retry the original operation with new token
                            const subscriber = forward(operation).subscribe({
                                next: observer.next.bind(observer),
                                error: observer.error.bind(observer),
                                complete: observer.complete.bind(observer),
                            });

                            return () => subscriber.unsubscribe();
                        } catch (e) {
                            isRefreshing = false;
                            resolvePendingRequests();
                            observer.error(e);
                        }
                    })();
                });
            }
        }
    }

    if (networkError) {
        console.error(`[Network Error] ${networkError.message}`);
        console.error(`[Network Error] Operation: ${operation.operationName}`);
        console.error(`[Network Error] API URL: ${API_URL}`);
    }
});

const authLink = setContext(async (operation, { headers }) => {
    const token = await getAccessToken();
    if (__DEV__) {
        console.log(`[Apollo Auth] Operation: ${operation.operationName}`);
        console.log(`[Apollo Auth] Token present: ${!!token}`);
        if (token) {
            console.log(`[Apollo Auth] Token prefix: ${token.substring(0, 20)}...`);
        }
    }
    return {
        headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : '',
        },
    };
});

export const apolloClient = new ApolloClient({
    link: ApolloLink.from([errorLink, authLink, httpLink]),
    cache: new InMemoryCache(),
    defaultOptions: {
        watchQuery: {
            fetchPolicy: 'cache-and-network',
            errorPolicy: 'all',
        },
        query: {
            fetchPolicy: 'network-only',
            errorPolicy: 'all',
        },
        mutate: {
            errorPolicy: 'all',
        },
    },
});
