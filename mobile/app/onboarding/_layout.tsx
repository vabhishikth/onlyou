/**
 * Onboarding Layout
 * Stack navigator for onboarding screens with no tab bar
 */

import { Stack } from 'expo-router';

export default function OnboardingLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="health-goals" />
            <Stack.Screen name="basic-info" />
            <Stack.Screen name="location" />
            <Stack.Screen name="health-snapshot" />
        </Stack>
    );
}
