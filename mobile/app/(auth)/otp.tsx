import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@apollo/client';
import { VERIFY_OTP, VerifyOtpResponse, REQUEST_OTP, RequestOtpResponse } from '@/graphql/auth';
import { useAuth } from '@/lib/auth';
import { colors, spacing, borderRadius, typography } from '@/styles/theme';

const OTP_LENGTH = 6;

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
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Verification failed');
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
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to resend OTP');
        }
    };

    const maskedPhone = phone?.replace(/(\+91)(\d{2})(\d{4})(\d{4})/, '$1 $2**** $4') || '';

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.content}>
                    {/* Back button */}
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.backText}>Back</Text>
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.heading}>Verify your number</Text>
                        <Text style={styles.subheading}>
                            Enter the 6-digit code sent to{'\n'}
                            <Text style={styles.phone}>{maskedPhone}</Text>
                        </Text>
                    </View>

                    {/* OTP Inputs */}
                    <View style={styles.otpContainer}>
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
                            />
                        ))}
                    </View>

                    {/* Loading indicator */}
                    {verifying && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color={colors.primary} />
                            <Text style={styles.loadingText}>Verifying...</Text>
                        </View>
                    )}

                    {/* Resend */}
                    <View style={styles.resendContainer}>
                        <Text style={styles.resendLabel}>Didn't receive the code?</Text>
                        {resendTimer > 0 ? (
                            <Text style={styles.resendTimer}>
                                Resend in {resendTimer}s
                            </Text>
                        ) : (
                            <TouchableOpacity
                                onPress={handleResend}
                                disabled={resending}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.resendButton}>
                                    {resending ? 'Sending...' : 'Resend OTP'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
    },
    backButton: {
        alignSelf: 'flex-start',
        paddingVertical: spacing.sm,
        marginBottom: spacing.xl,
    },
    backText: {
        ...typography.bodyMedium,
        color: colors.primary,
        fontWeight: '500',
    },
    header: {
        marginBottom: spacing.xxxl,
    },
    heading: {
        ...typography.headingLarge,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    subheading: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        lineHeight: 22,
    },
    phone: {
        fontWeight: '600',
        color: colors.text,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.xl,
    },
    otpInput: {
        width: 48,
        height: 56,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.surfaceElevated,
        textAlign: 'center',
        ...typography.headingMedium,
        color: colors.text,
    },
    otpInputFocused: {
        borderColor: colors.primary,
        borderWidth: 2,
    },
    otpInputFilled: {
        backgroundColor: colors.surface,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    loadingText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        marginLeft: spacing.sm,
    },
    resendContainer: {
        alignItems: 'center',
    },
    resendLabel: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    resendTimer: {
        ...typography.bodyMedium,
        color: colors.textTertiary,
    },
    resendButton: {
        ...typography.bodyMedium,
        color: colors.primary,
        fontWeight: '600',
    },
});
