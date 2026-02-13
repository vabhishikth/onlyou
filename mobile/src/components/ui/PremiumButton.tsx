/**
 * PremiumButton — Onlyou Design System
 * Primary, Secondary, and Ghost button variants with haptic feedback
 */

import React from 'react';
import {
    TouchableOpacity,
    Text,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme/colors';
import { textStyles } from '@/theme/typography';
import { dimensions, borderRadius } from '@/theme/spacing';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface PremiumButtonProps {
    title: string;
    onPress: () => void;
    variant?: ButtonVariant;
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    hapticFeedback?: boolean;
    testID?: string;
}

export function PremiumButton({
    title,
    onPress,
    variant = 'primary',
    disabled = false,
    loading = false,
    fullWidth = true,
    style,
    textStyle,
    hapticFeedback = true,
    testID,
}: PremiumButtonProps) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.97, {
            damping: 10,
            stiffness: 200,
        });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, {
            damping: 10,
            stiffness: 200,
        });
    };

    const handlePress = () => {
        if (hapticFeedback && !disabled && !loading) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress();
    };

    const getButtonStyle = (): ViewStyle => {
        const baseStyle: ViewStyle = {
            height: dimensions.buttonHeight,
            borderRadius: borderRadius.full,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
        };

        if (fullWidth) {
            baseStyle.width = '100%';
        }

        switch (variant) {
            case 'primary':
                return {
                    ...baseStyle,
                    backgroundColor: disabled ? colors.ctaDisabled : colors.ctaPrimary,
                };
            case 'secondary':
                return {
                    ...baseStyle,
                    backgroundColor: colors.ctaSecondary,
                    borderWidth: 1.5,
                    borderColor: colors.ctaSecondaryBorder,
                };
            case 'ghost':
                return {
                    ...baseStyle,
                    backgroundColor: 'transparent',
                };
            default:
                return baseStyle;
        }
    };

    const getTextStyle = (): TextStyle => {
        switch (variant) {
            case 'primary':
                return {
                    ...textStyles.button,
                    color: disabled ? colors.ctaDisabledText : colors.ctaPrimaryText,
                };
            case 'secondary':
                return {
                    ...textStyles.button,
                    color: colors.textPrimary,
                };
            case 'ghost':
                return {
                    fontFamily: textStyles.bodyMedium.fontFamily,
                    fontSize: 15,
                    lineHeight: 15 * 1.5,
                    color: colors.textSecondary,
                };
            default:
                return textStyles.button;
        }
    };

    const buttonStyle = getButtonStyle();
    const labelStyle = getTextStyle();

    return (
        <AnimatedTouchable
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled || loading}
            activeOpacity={0.9}
            style={[buttonStyle, animatedStyle, style]}
            testID={testID}
        >
            {loading ? (
                <ActivityIndicator
                    color={variant === 'primary' ? colors.ctaPrimaryText : colors.textPrimary}
                    size="small"
                />
            ) : (
                <Text style={[labelStyle, textStyle]}>{title}</Text>
            )}
        </AnimatedTouchable>
    );
}

export default PremiumButton;
