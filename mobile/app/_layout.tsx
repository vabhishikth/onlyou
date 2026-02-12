import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ApolloProvider } from '@apollo/client';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { apolloClient } from '@/lib/apollo';
import { AuthProvider, useAuth } from '@/lib/auth';
import { colors } from '@/styles/theme';

// Auth-based navigation guard
function AuthNavigationGuard({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === '(auth)';

        if (!isAuthenticated && !inAuthGroup) {
            // Redirect to login if not authenticated and not already in auth flow
            router.replace('/(auth)/phone');
        } else if (isAuthenticated && inAuthGroup) {
            // Redirect to main app if authenticated but still in auth flow
            router.replace('/(tabs)');
        }
    }, [isAuthenticated, isLoading, segments]);

    return <>{children}</>;
}

function RootLayoutContent() {
    return (
        <AuthNavigationGuard>
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background },
                    animation: 'slide_from_right',
                }}
            >
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                    name="intake"
                    options={{
                        presentation: 'modal',
                    }}
                />
            </Stack>
        </AuthNavigationGuard>
    );
}

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <ApolloProvider client={apolloClient}>
                <AuthProvider>
                    <StatusBar style="dark" />
                    <RootLayoutContent />
                </AuthProvider>
            </ApolloProvider>
        </SafeAreaProvider>
    );
}
