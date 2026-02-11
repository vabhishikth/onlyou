import { Stack } from 'expo-router';

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
            <Stack.Screen name="location" />
            <Stack.Screen name="birthdate" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="phone" />
            <Stack.Screen name="otp" />
        </Stack>
    );
}
