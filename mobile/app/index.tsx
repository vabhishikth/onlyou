/**
 * Splash Screen — Onlyou Design System
 * Brand splash with animated logo, font loading, and crossfade to welcome
 */

import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
    runOnJS,
} from 'react-native-reanimated';
import { useFonts } from '@/theme/fonts';
import { colors } from '@/theme/colors';
import { textStyles } from '@/theme/typography';

// Keep native splash visible while we load fonts
SplashScreen.preventAutoHideAsync();

export default function SplashScreenComponent() {
    const router = useRouter();
    const [fontsLoaded] = useFonts();

    // Animation values
    const opacity = useSharedValue(0);

    const navigateToWelcome = useCallback(() => {
        router.replace('/welcome' as any);
    }, [router]);

    const onLayoutRootView = useCallback(async () => {
        if (fontsLoaded) {
            // Hide native splash once fonts are loaded
            await SplashScreen.hideAsync();

            // Start fade-in animation
            opacity.value = withTiming(1, {
                duration: 800,
                easing: Easing.out(Easing.ease),
            });

            // Hold for 1200ms, then navigate
            setTimeout(() => {
                opacity.value = withTiming(
                    0,
                    {
                        duration: 400,
                        easing: Easing.in(Easing.ease),
                    },
                    (finished) => {
                        if (finished) {
                            runOnJS(navigateToWelcome)();
                        }
                    }
                );
            }, 2000); // 800ms fade-in + 1200ms hold = 2000ms
        }
    }, [fontsLoaded, opacity, navigateToWelcome]);

    useEffect(() => {
        onLayoutRootView();
    }, [onLayoutRootView]);

    // Animated style for logo
    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    // Don't render anything until fonts are loaded
    if (!fontsLoaded) {
        return null;
    }

    return (
        <View style={styles.container} testID="splash-screen">
            <Animated.Text style={[styles.logo, animatedStyle]} testID="splash-logo">
                onlyou
            </Animated.Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        ...textStyles.logo,
        color: colors.textPrimary,
    },
});
