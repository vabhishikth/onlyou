/**
 * ProgressIndicator — Onlyou Design System
 * Onboarding progress dots with animated active state
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import { dimensions, spacing } from '@/theme/spacing';

interface ProgressIndicatorProps {
    totalSteps: number;
    currentStep: number;
    style?: ViewStyle;
    testID?: string;
}

function ProgressDot({ isActive }: { isActive: boolean }) {
    const animatedStyle = useAnimatedStyle(() => ({
        width: withSpring(isActive ? dimensions.progressDotActiveWidth : dimensions.progressDotSize, {
            damping: 15,
            stiffness: 150,
        }),
        backgroundColor: withSpring(isActive ? colors.ctaPrimary : colors.ctaDisabled, {
            damping: 15,
            stiffness: 150,
        }),
    }));

    return <Animated.View style={[styles.dot, animatedStyle]} />;
}

export function ProgressIndicator({
    totalSteps,
    currentStep,
    style,
    testID,
}: ProgressIndicatorProps) {
    return (
        <View style={[styles.container, style]} testID={testID}>
            {Array.from({ length: totalSteps }, (_, index) => (
                <ProgressDot key={index} isActive={index === currentStep} />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    dot: {
        height: dimensions.progressDotSize,
        borderRadius: dimensions.progressDotSize / 2,
    },
});

export default ProgressIndicator;
