/**
 * SelectionCard — Onlyou Design System
 * Multi-select card with check indicator
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { fontFamilies, fontSizes } from '@/theme/typography';
import { borderRadius, spacing } from '@/theme/spacing';

interface SelectionCardProps {
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    selected: boolean;
    onPress: () => void;
    disabled?: boolean;
    style?: ViewStyle;
    testID?: string;
}

export function SelectionCard({
    title,
    subtitle,
    icon,
    selected,
    onPress,
    disabled = false,
    style,
    testID,
}: SelectionCardProps) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        if (!disabled) {
            scale.value = withSpring(1.02, {
                damping: 10,
                stiffness: 200,
            });
        }
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, {
            damping: 10,
            stiffness: 200,
        });
    };

    const handlePress = () => {
        if (!disabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress();
        }
    };

    return (
        <Animated.View style={[animatedStyle, style]}>
            <Pressable
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled}
                testID={testID}
            >
                <View
                    style={[
                        styles.card,
                        selected && styles.cardSelected,
                        disabled && styles.cardDisabled,
                    ]}
                >
                    {/* Icon */}
                    {icon && <View style={styles.iconContainer}>{icon}</View>}

                    {/* Text content */}
                    <View style={styles.textContainer}>
                        <Text
                            style={[
                                styles.title,
                                disabled && styles.textDisabled,
                            ]}
                        >
                            {title}
                        </Text>
                        {subtitle && (
                            <Text
                                style={[
                                    styles.subtitle,
                                    disabled && styles.textDisabled,
                                ]}
                            >
                                {subtitle}
                            </Text>
                        )}
                    </View>

                    {/* Selection indicator */}
                    {selected && (
                        <View style={styles.checkCircle}>
                            <Check
                                size={12}
                                color={colors.white}
                                strokeWidth={3}
                            />
                        </View>
                    )}
                </View>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        minHeight: 72,
        backgroundColor: colors.white,
        borderRadius: borderRadius['2xl'],
        borderWidth: 1.5,
        borderColor: colors.border,
        padding: spacing.base,
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardSelected: {
        borderWidth: 2,
        borderColor: colors.ctaPrimary,
        backgroundColor: colors.surface,
    },
    cardDisabled: {
        opacity: 0.5,
    },
    iconContainer: {
        marginRight: spacing.md,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontFamily: fontFamilies.sansSemiBold,
        fontSize: fontSizes.body,
        color: colors.textPrimary,
    },
    subtitle: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.caption,
        color: colors.textTertiary,
        marginTop: 2,
    },
    textDisabled: {
        color: colors.textMuted,
    },
    checkCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.ctaPrimary,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        top: 12,
        right: 12,
    },
});

export default SelectionCard;
