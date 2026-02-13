import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ApolloProvider } from '@apollo/client';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { apolloClient } from '@/lib/apollo';
import { AuthProvider, useAuth } from '@/lib/auth';

// Auth-based navigation guard
function AuthNavigationGuard({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        const firstSegment = segments[0] as string | undefined;
        const inAuthGroup = firstSegment === '(auth)';
        const inProtectedGroup = firstSegment === '(tabs)';
        const onWelcome = firstSegment === 'welcome';
        const onSplash = !firstSegment || firstSegment === '';

        // Allow splash and welcome for unauthenticated users
        if (!isAuthenticated && (onSplash || onWelcome)) {
            return; // Let them stay on splash/welcome
        }

        // Redirect unauthenticated users from protected routes to welcome
        if (!isAuthenticated && inProtectedGroup) {
            router.replace('/welcome' as any);
        }

        // Redirect authenticated users from auth/welcome to main app
        if (isAuthenticated && (inAuthGroup || onWelcome)) {
            router.replace('/(tabs)');
        }
    }, [isAuthenticated, isLoading, segments]);

    return <>{children}</>;
}

function RootLayoutContent() {
    return (
        <AuthNavigationGuard>
            <Slot />
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
