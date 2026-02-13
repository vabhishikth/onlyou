/**
 * BackButton — Onlyou Design System
 * Circular back button with chevron icon
 */

import React from 'react';
import { StyleSheet, ViewStyle, Pressable } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ChevronLeft } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { dimensions } from '@/theme/spacing';

interface BackButtonProps {
    onPress: () => void;
    style?: ViewStyle;
    testID?: string;
}

export function BackButton({ onPress, style, testID }: BackButtonProps) {
    const backgroundColor = useSharedValue<string>(colors.surface);

    const animatedStyle = useAnimatedStyle(() => ({
        backgroundColor: backgroundColor.value,
    }));

    const handlePressIn = () => {
        backgroundColor.value = withTiming(colors.border, { duration: 150 });
    };

    const handlePressOut = () => {
        backgroundColor.value = withTiming(colors.surface, { duration: 150 });
    };

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
    };

    return (
        <Pressable
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            testID={testID}
        >
            <Animated.View style={[styles.button, animatedStyle, style]}>
                <ChevronLeft
                    size={dimensions.iconSizeLg}
                    color={colors.textPrimary}
                    strokeWidth={2}
                />
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        width: dimensions.backButtonSize,
        height: dimensions.backButtonSize,
        borderRadius: dimensions.backButtonSize / 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default BackButton;
