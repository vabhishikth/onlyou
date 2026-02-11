import '../global.css';
import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ApolloProvider } from '@apollo/client';
import { apolloClient } from '../src/lib/apollo';
import { AuthProvider, useAuth } from '../src/lib/auth';
import { View, ActivityIndicator } from 'react-native';

function RootLayoutNav() {
    const { isLoading, isAuthenticated } = useAuth();

    useEffect(() => {
        if (!isLoading) {
            if (isAuthenticated) {
                router.replace('/(tabs)');
            } else {
                router.replace('/(auth)/welcome');
            }
        }
    }, [isLoading, isAuthenticated]);

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#0ea5e9" />
            </View>
        );
    }

    return (
        <>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="intake" />
            </Stack>
            <StatusBar style="dark" />
        </>
    );
}

export default function RootLayout() {
    return (
        <ApolloProvider client={apolloClient}>
            <AuthProvider>
                <RootLayoutNav />
            </AuthProvider>
        </ApolloProvider>
    );
}
