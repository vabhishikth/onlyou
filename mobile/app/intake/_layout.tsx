import { Stack } from 'expo-router';
import { colors } from '@/styles/theme';

export default function IntakeLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: true,
                headerStyle: {
                    backgroundColor: colors.background,
                },
                headerTintColor: colors.text,
                headerTitleStyle: {
                    fontWeight: '600',
                    fontSize: 17,
                },
                headerShadowVisible: false,
                headerBackTitle: 'Back',
            }}
        >
            <Stack.Screen
                name="[vertical]/index"
                options={{
                    title: 'Get Started',
                }}
            />
            <Stack.Screen
                name="[vertical]/questions"
                options={{
                    title: 'Assessment',
                    gestureEnabled: false,
                }}
            />
            <Stack.Screen
                name="[vertical]/review"
                options={{
                    title: 'Review',
                }}
            />
            <Stack.Screen
                name="[vertical]/complete"
                options={{
                    headerShown: false,
                    gestureEnabled: false,
                }}
            />
        </Stack>
    );
}
