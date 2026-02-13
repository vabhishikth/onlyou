/**
 * OTP Verification Screen
 * PR 5: Treatment + Questionnaire + Photo Restyle
 * Refined with Clinical Luxe design system
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@apollo/client';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { colors } from '@/theme/colors';
import { fontFamilies, fontSizes } from '@/theme/typography';
import { spacing, borderRadius, screenSpacing } from '@/theme/spacing';
import { BackButton } from '@/components/ui';
import { VERIFY_OTP, VerifyOtpResponse, REQUEST_OTP, RequestOtpResponse } from '@/graphql/auth';
import { useAuth } from '@/lib/auth';

const OTP_LENGTH = 6;
const OTP_BOX_SIZE = 52; // 52x52px as per requirements

export default function OtpScreen() {
    const router = useRouter();
    const { phone } = useLocalSearchParams<{ phone: string }>();
    const { login } = useAuth();

    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [focusedIndex, setFocusedIndex] = useState(0);
    const [resendTimer, setResendTimer] = useState(30);

    const inputRefs = useRef<(TextInput | null)[]>([]);

    const [verifyOtp, { loading: verifying }] = useMutation<VerifyOtpResponse>(VERIFY_OTP);
    const [requestOtp, { loading: resending }] = useMutation<RequestOtpResponse>(REQUEST_OTP);

    // Countdown timer for resend
    useEffect(() => {
        if (resendTimer > 0) {
            const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [resendTimer]);

    // Auto-submit when all digits entered
    useEffect(() => {
        const fullOtp = otp.join('');
        if (fullOtp.length === OTP_LENGTH) {
            handleVerify(fullOtp);
        }
    }, [otp]);

    const handleInputChange = (text: string, index: number) => {
        // Only allow digits
        const digit = text.replace(/\D/g, '').slice(-1);

        const newOtp = [...otp];
        newOtp[index] = digit;
        setOtp(newOtp);

        // Auto-advance to next input
        if (digit && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
            setFocusedIndex(index + 1);
        }
    };

    const handleKeyPress = (key: string, index: number) => {
        if (key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
            setFocusedIndex(index - 1);
        }
    };

    const handleVerify = async (otpValue: string) => {
        if (!phone) return;

        try {
            const { data } = await verifyOtp({
                variables: { input: { phone, otp: otpValue } },
            });

            if (data?.verifyOtp.success && data.verifyOtp.accessToken && data.verifyOtp.refreshToken && data.verifyOtp.user) {
                await login(
                    data.verifyOtp.accessToken,
                    data.verifyOtp.refreshToken,
                    data.verifyOtp.user
                );
                // Navigation will happen automatically via AuthNavigationGuard
            } else {
                Alert.alert('Error', data?.verifyOtp.message || 'Invalid OTP');
                // Clear OTP on error
                setOtp(Array(OTP_LENGTH).fill(''));
                inputRefs.current[0]?.focus();
                setFocusedIndex(0);
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Verification failed';
            Alert.alert('Error', errorMessage);
            setOtp(Array(OTP_LENGTH).fill(''));
            inputRefs.current[0]?.focus();
            setFocusedIndex(0);
        }
    };

    const handleResend = async () => {
        if (resendTimer > 0 || !phone) return;

        try {
            const { data } = await requestOtp({
                variables: { input: { phone } },
            });

            if (data?.requestOtp.success) {
                setResendTimer(30);
                Alert.alert('Success', 'OTP sent successfully');
            } else {
                Alert.alert('Error', data?.requestOtp.message || 'Failed to resend OTP');
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to resend OTP';
            Alert.alert('Error', errorMessage);
        }
    };

    const handleBack = () => {
        router.back();
    };

    const handleEditPhone = () => {
        router.back();
    };

    const maskedPhone = phone?.replace(/(\+91)(\d{2})(\d{4})(\d{4})/, '$1 $2**** $4') || '';

    return (
        <SafeAreaView style={styles.container} testID="otp-screen">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.content}>
                    {/* Back button */}
                    <BackButton onPress={handleBack} testID="back-button" />

                    {/* Header */}
                    <Animated.View
                        entering={FadeInUp.duration(300)}
                        style={styles.header}
                    >
                        <Text style={styles.heading}>Verify your number</Text>
                        <Text style={styles.subheading}>
                            Enter the 6-digit code sent to{'\n'}
                            <Text style={styles.phone}>{maskedPhone}</Text>
                            {'  '}
                            <Pressable onPress={handleEditPhone} testID="edit-phone-link">
                                <Text style={styles.editLink}>Edit</Text>
                            </Pressable>
                        </Text>
                    </Animated.View>

                    {/* OTP Inputs */}
                    <Animated.View
                        entering={FadeInUp.delay(100).duration(300)}
                        style={styles.otpContainer}
                        testID="otp-container"
                    >
                        {otp.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={(ref) => { inputRefs.current[index] = ref; }}
                                style={[
                                    styles.otpInput,
                                    focusedIndex === index && styles.otpInputFocused,
                                    digit && styles.otpInputFilled,
                                ]}
                                value={digit}
                                onChangeText={(text) => handleInputChange(text, index)}
                                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                                onFocus={() => setFocusedIndex(index)}
                                keyboardType="number-pad"
                                maxLength={1}
                                selectTextOnFocus
                                autoFocus={index === 0}
                                testID={`otp-input-${index}`}
                            />
                        ))}
                    </Animated.View>

                    {/* Loading indicator */}
                    {verifying && (
                        <Animated.View
                            entering={FadeInUp.duration(200)}
                            style={styles.loadingContainer}
                        >
                            <ActivityIndicator size="small" color={colors.accent} />
                            <Text style={styles.loadingText}>Verifying...</Text>
                        </Animated.View>
                    )}

                    {/* Resend */}
                    <Animated.View
                        entering={FadeInUp.delay(200).duration(300)}
                        style={styles.resendContainer}
                    >
                        <Text style={styles.resendLabel}>Didn't receive the code?</Text>
                        {resendTimer > 0 ? (
                            <Text style={styles.resendTimer}>
                                Resend in {resendTimer}s
                            </Text>
                        ) : (
                            <Pressable
                                onPress={handleResend}
                                disabled={resending}
                            >
                                <Text style={styles.resendButton}>
                                    {resending ? 'Sending...' : 'Resend OTP'}
                                </Text>
                            </Pressable>
                        )}
                    </Animated.View>
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
    header: {
        marginTop: spacing.xl,
        marginBottom: spacing['3xl'],
    },
    heading: {
        fontFamily: fontFamilies.serifSemiBold,
        fontSize: 28,
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
    phone: {
        fontFamily: fontFamilies.sansSemiBold,
        color: colors.textPrimary,
    },
    editLink: {
        fontFamily: fontFamilies.sansMedium,
        fontSize: fontSizes.body,
        color: colors.accent,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.xl,
    },
    otpInput: {
        width: OTP_BOX_SIZE,
        height: OTP_BOX_SIZE,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.surface,
        textAlign: 'center',
        fontFamily: fontFamilies.sansSemiBold,
        fontSize: fontSizes.sectionH,
        color: colors.textPrimary,
    },
    otpInputFocused: {
        borderColor: colors.accent,
        borderWidth: 2,
    },
    otpInputFilled: {
        backgroundColor: colors.white,
        borderColor: colors.accent,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    loadingText: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.body,
        color: colors.textSecondary,
        marginLeft: spacing.sm,
    },
    resendContainer: {
        alignItems: 'center',
    },
    resendLabel: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.body,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    resendTimer: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.body,
        color: colors.textTertiary,
    },
    resendButton: {
        fontFamily: fontFamilies.sansSemiBold,
        fontSize: fontSizes.body,
        color: colors.accent,
    },
});
