import { Stack } from 'expo-router';
import { colors } from '@/styles/theme';

export default function IntakeLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="[vertical]/index" />
            <Stack.Screen name="[vertical]/questions" />
            <Stack.Screen name="[vertical]/photos" />
            <Stack.Screen name="[vertical]/review" />
            <Stack.Screen name="[vertical]/complete" />
        </Stack>
    );
}
