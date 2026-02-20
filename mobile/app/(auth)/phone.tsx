/**
 * Phone Entry Screen — Onlyou Design System
 * Clinical Luxe design with consistent branding
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation } from '@apollo/client';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { colors } from '@/theme/colors';
import { fontFamilies, fontSizes, textStyles } from '@/theme/typography';
import { spacing, screenSpacing, borderRadius, dimensions } from '@/theme/spacing';
import { BackButton, PremiumButton } from '@/components/ui';
import { REQUEST_OTP, RequestOtpResponse } from '@/graphql/auth';

export default function PhoneScreen() {
    const router = useRouter();
    const [phone, setPhone] = useState('');
    const [requestOtp, { loading }] = useMutation<RequestOtpResponse>(REQUEST_OTP);

    // Validate Indian phone number (10 digits starting with 6-9)
    const isValidPhone = /^[6-9]\d{9}$/.test(phone);

    const handleSubmit = async () => {
        if (!isValidPhone) {
            Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number');
            return;
        }

        try {
            const { data } = await requestOtp({
                variables: { input: { phone: `+91${phone}` } },
            });

            if (data?.requestOtp.success) {
                router.push({
                    pathname: '/(auth)/otp',
                    params: { phone: `+91${phone}` },
                });
            } else {
                Alert.alert('Error', data?.requestOtp.message || 'Failed to send OTP');
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Something went wrong';
            Alert.alert('Error', errorMessage);
        }
    };

    const handleBack = () => {
        router.back();
    };

    return (
        <SafeAreaView style={styles.container} testID="phone-screen">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.content}>
                    {/* Back button */}
                    <BackButton onPress={handleBack} testID="back-button" />

                    {/* Logo */}
                    <Animated.Text
                        entering={FadeInUp.delay(0).duration(400)}
                        style={styles.logo}
                        testID="phone-logo"
                    >
                        onlyou
                    </Animated.Text>

                    {/* Header */}
                    <Animated.View
                        entering={FadeInUp.delay(80).duration(400)}
                        style={styles.header}
                    >
                        <Text style={styles.heading}>Welcome</Text>
                        <Text style={styles.subheading}>
                            Enter your mobile number to get started
                        </Text>
                    </Animated.View>

                    {/* Phone Input */}
                    <Animated.View
                        entering={FadeInUp.delay(160).duration(400)}
                    >
                        <View style={styles.inputContainer}>
                            <View style={styles.countryCode}>
                                <Text style={styles.countryCodeText}>+91</Text>
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="10-digit mobile number"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="phone-pad"
                                maxLength={10}
                                value={phone}
                                onChangeText={(text) => setPhone(text.replace(/\D/g, ''))}
                                autoFocus
                                testID="phone-input"
                            />
                        </View>
                    </Animated.View>

                    {/* Continue Button */}
                    <Animated.View
                        entering={FadeInUp.delay(240).duration(400)}
                        style={styles.buttonContainer}
                    >
                        <PremiumButton
                            title="Continue"
                            onPress={handleSubmit}
                            variant="primary"
                            disabled={!isValidPhone || loading}
                            loading={loading}
                            testID="continue-button"
                        />
                    </Animated.View>

                    {/* Terms */}
                    <Animated.Text
                        entering={FadeInUp.delay(320).duration(400)}
                        style={styles.terms}
                    >
                        By continuing, you agree to our{' '}
                        <Text style={styles.link}>Terms of Service</Text> and{' '}
                        <Text style={styles.link}>Privacy Policy</Text>
                    </Animated.Text>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: screenSpacing.horizontal,
        paddingTop: spacing.lg,
    },
    logo: {
        ...textStyles.logo,
        color: colors.textPrimary,
        marginTop: spacing['3xl'],
        marginBottom: spacing.xl,
    },
    header: {
        marginBottom: spacing['2xl'],
    },
    heading: {
        fontFamily: fontFamilies.serifSemiBold,
        fontSize: fontSizes.title,
        color: colors.textPrimary,
        letterSpacing: -0.5,
        marginBottom: spacing.sm,
    },
    subheading: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.body,
        color: colors.textSecondary,
        lineHeight: fontSizes.body * 1.5,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.surface,
        height: dimensions.inputHeight,
    },
    countryCode: {
        paddingHorizontal: spacing.base,
        height: '100%',
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: colors.border,
    },
    countryCodeText: {
        fontFamily: fontFamilies.sansMedium,
        fontSize: fontSizes.body,
        color: colors.textPrimary,
    },
    input: {
        flex: 1,
        paddingHorizontal: spacing.base,
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.body,
        color: colors.textPrimary,
    },
    buttonContainer: {
        marginTop: spacing.xl,
    },
    terms: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.caption,
        color: colors.textTertiary,
        textAlign: 'center',
        paddingHorizontal: spacing.lg,
        marginTop: spacing.xl,
        lineHeight: fontSizes.caption * 1.6,
    },
    link: {
        color: colors.accent,
        fontFamily: fontFamilies.sansMedium,
    },
});
