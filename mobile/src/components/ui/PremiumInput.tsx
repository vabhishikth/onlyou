/**
 * PremiumInput — Onlyou Design System
 * Text input with floating label animation
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    TextInput,
    Text,
    StyleSheet,
    TextInputProps,
    ViewStyle,
    Pressable,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    interpolate,
} from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import { fontFamilies, fontSizes } from '@/theme/typography';
import { dimensions, borderRadius, spacing } from '@/theme/spacing';

interface PremiumInputProps extends Omit<TextInputProps, 'style'> {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    error?: string;
    containerStyle?: ViewStyle;
    testID?: string;
}

export function PremiumInput({
    label,
    value,
    onChangeText,
    error,
    containerStyle,
    testID,
    ...textInputProps
}: PremiumInputProps) {
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<TextInput>(null);

    // Animation value: 0 = unfocused/empty, 1 = focused/filled
    const labelPosition = useSharedValue(value ? 1 : 0);

    useEffect(() => {
        const shouldFloat = isFocused || value.length > 0;
        labelPosition.value = withTiming(shouldFloat ? 1 : 0, { duration: 200 });
    }, [isFocused, value]);

    const animatedLabelStyle = useAnimatedStyle(() => {
        const translateY = interpolate(
            labelPosition.value,
            [0, 1],
            [0, -18] // Move up 18px when floating
        );
        const fontSize = interpolate(
            labelPosition.value,
            [0, 1],
            [fontSizes.body, fontSizes.caption]
        );

        return {
            transform: [{ translateY }],
            fontSize,
        };
    });

    const handleFocus = () => {
        setIsFocused(true);
        textInputProps.onFocus?.({} as any);
    };

    const handleBlur = () => {
        setIsFocused(false);
        textInputProps.onBlur?.({} as any);
    };

    const handleContainerPress = () => {
        inputRef.current?.focus();
    };

    const getBorderColor = () => {
        if (error) return colors.error;
        if (isFocused) return colors.borderFocus;
        return colors.border;
    };

    const getLabelColor = () => {
        if (error) return colors.error;
        if (isFocused) return colors.accent;
        return colors.textMuted;
    };

    return (
        <View style={containerStyle}>
            <Pressable onPress={handleContainerPress}>
                <View
                    style={[
                        styles.inputContainer,
                        {
                            borderColor: getBorderColor(),
                            borderWidth: isFocused || error ? 1.5 : 1.5,
                        },
                    ]}
                >
                    <Animated.Text
                        style={[
                            styles.label,
                            animatedLabelStyle,
                            { color: getLabelColor() },
                        ]}
                    >
                        {label}
                    </Animated.Text>
                    <TextInput
                        ref={inputRef}
                        style={styles.input}
                        value={value}
                        onChangeText={onChangeText}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        placeholderTextColor="transparent"
                        testID={testID}
                        {...textInputProps}
                    />
                </View>
            </Pressable>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    inputContainer: {
        height: dimensions.inputHeight,
        backgroundColor: colors.white,
        borderRadius: borderRadius.xl,
        paddingHorizontal: spacing.base,
        justifyContent: 'center',
    },
    label: {
        position: 'absolute',
        left: spacing.base,
        top: dimensions.inputHeight / 2 - fontSizes.body / 2,
        fontFamily: fontFamilies.sansMedium,
        backgroundColor: colors.white,
        paddingHorizontal: 4,
    },
    input: {
        flex: 1,
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.body,
        color: colors.textPrimary,
        paddingTop: 12, // Push text down when label floats
    },
    errorText: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.caption,
        color: colors.error,
        marginTop: spacing.xs,
        marginLeft: spacing.base,
    },
});

export default PremiumInput;
