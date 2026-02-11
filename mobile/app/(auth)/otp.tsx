import { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Alert,
    StyleSheet,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@apollo/client';
import { VERIFY_OTP, REQUEST_OTP, UPDATE_PROFILE } from '@/graphql/auth';
import { useAuth } from '@/lib/auth';
import { colors, spacing, borderRadius, typography, shadows } from '@/styles/theme';

export default function OtpScreen() {
    const { phone, state, dob, isEmail: _isEmail } = useLocalSearchParams<{
        phone: string;
        state?: string;
        dob?: string;
        isEmail?: string;
    }>();
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(30);
    const inputRefs = useRef<(TextInput | null)[]>([]);

    const { login } = useAuth();
    const [verifyOtp] = useMutation(VERIFY_OTP);
    const [requestOtp] = useMutation(REQUEST_OTP);
    const [updateProfile] = useMutation(UPDATE_PROFILE);

    // Resend timer countdown
    useEffect(() => {
        if (resendTimer > 0) {
            const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [resendTimer]);

    const handleOtpChange = (value: string, index: number) => {
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all filled
        if (newOtp.every(digit => digit) && newOtp.join('').length === 6) {
            handleVerifyOtp(newOtp.join(''));
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerifyOtp = async (otpCode: string) => {
        if (!phone) return;

        setIsLoading(true);
        try {
            const { data } = await verifyOtp({
                variables: { input: { phone, otp: otpCode } },
            });

            if (data?.verifyOtp?.success && data.verifyOtp.accessToken) {
                await login(
                    data.verifyOtp.accessToken,
                    data.verifyOtp.refreshToken!,
                    data.verifyOtp.user!
                );

                // Save pre-auth data (state, dob) if available
                if (state || dob) {
                    try {
                        const profileInput: Record<string, string> = {};
                        if (state) profileInput.state = state;
                        if (dob) profileInput.dateOfBirth = dob;

                        await updateProfile({
                            variables: { input: profileInput },
                        });
                        console.log('✅ Pre-auth data saved: state=', state, 'dob=', dob);
                    } catch (profileError) {
                        console.warn('Failed to save pre-auth data:', profileError);
                        // Don't block login for this
                    }
                }

                // Navigate based on profile status
                if (data.verifyOtp.user?.isProfileComplete) {
                    router.replace('/(tabs)');
                } else {
                    router.replace('/(auth)/create-profile');
                }
            } else {
                Alert.alert('Error', data?.verifyOtp?.message || 'Invalid OTP');
                setOtp(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
            }
        } catch (error) {
            console.error('Verify OTP error:', error);
            Alert.alert('Error', 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (resendTimer > 0 || !phone) return;

        try {
            const { data } = await requestOtp({
                variables: { input: { phone } },
            });

            if (data?.requestOtp?.success) {
                setResendTimer(30);
                Alert.alert('Success', 'OTP sent successfully');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to resend OTP');
        }
    };

    // Format phone for display
    const displayPhone = phone?.replace('+91', '+91 ') || '';

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.content}>
                    {/* Back Button */}
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.backButtonText}>←</Text>
                    </TouchableOpacity>

                    {/* Header */}
                    <Text style={styles.headerTitle}>Getting started</Text>

                    {/* Hero Text */}
                    <View style={styles.heroContainer}>
                        <Text style={styles.heroTitle}>
                            Enter verification code
                        </Text>
                        <Text style={styles.heroSubtitle}>
                            We sent a 6-digit code to{'\n'}
                            <Text style={styles.phoneNumber}>{displayPhone}</Text>
                        </Text>
                    </View>

                    {/* OTP Input */}
                    <View style={styles.otpContainer}>
                        {otp.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={(ref) => { inputRefs.current[index] = ref; }}
                                style={[
                                    styles.otpInput,
                                    digit && styles.otpInputFilled,
                                ]}
                                keyboardType="number-pad"
                                maxLength={1}
                                value={digit}
                                onChangeText={(value) => handleOtpChange(value, index)}
                                onKeyPress={(e) => handleKeyPress(e, index)}
                                editable={!isLoading}
                                selectTextOnFocus
                            />
                        ))}
                    </View>

                    {/* Verify Button */}
                    <TouchableOpacity
                        style={[
                            styles.primaryButton,
                            (!otp.every(d => d) || isLoading) && styles.primaryButtonDisabled,
                        ]}
                        onPress={() => handleVerifyOtp(otp.join(''))}
                        disabled={!otp.every(d => d) || isLoading}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.primaryButtonText}>
                            {isLoading ? 'Verifying...' : 'Verify & Continue'}
                        </Text>
                    </TouchableOpacity>

                    {/* Resend OTP */}
                    <View style={styles.resendContainer}>
                        {resendTimer > 0 ? (
                            <Text style={styles.resendTimer}>
                                Resend code in <Text style={styles.resendTimerBold}>{resendTimer}s</Text>
                            </Text>
                        ) : (
                            <TouchableOpacity onPress={handleResendOtp}>
                                <Text style={styles.resendLink}>Resend code</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Dev Mode Hint */}
                    {__DEV__ && (
                        <View style={styles.devHint}>
                            <Text style={styles.devHintText}>
                                🧑‍💻 Dev Mode: Use OTP <Text style={styles.devHintBold}>123456</Text>
                            </Text>
                        </View>
                    )}
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
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
    },

    // Back Button
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    backButtonText: {
        fontSize: 20,
        color: colors.text,
    },

    // Header
    headerTitle: {
        ...typography.bodyMedium,
        fontWeight: '500',
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },

    // Hero
    heroContainer: {
        marginBottom: spacing.xl,
    },
    heroTitle: {
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        fontSize: 26,
        fontWeight: '400',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    heroSubtitle: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        lineHeight: 22,
    },
    phoneNumber: {
        fontWeight: '600',
        color: colors.text,
    },

    // OTP Input
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
        textAlign: 'center',
        fontSize: 24,
        fontWeight: '600',
        color: colors.text,
    },
    otpInputFilled: {
        borderColor: colors.accent,
        borderWidth: 2,
        backgroundColor: colors.accentLight,
    },

    // Buttons
    primaryButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.full,
        paddingVertical: spacing.md + 2,
        alignItems: 'center',
        marginBottom: spacing.lg,
        ...shadows.sm,
    },
    primaryButtonDisabled: {
        backgroundColor: '#E0E0E0',
    },
    primaryButtonText: {
        ...typography.button,
        color: colors.primaryText,
    },

    // Resend
    resendContainer: {
        alignItems: 'center',
    },
    resendTimer: {
        ...typography.bodyMedium,
        color: colors.textTertiary,
    },
    resendTimerBold: {
        fontWeight: '600',
        color: colors.text,
    },
    resendLink: {
        ...typography.bodyMedium,
        fontWeight: '600',
        color: colors.accent,
    },

    // Dev Hint
    devHint: {
        marginTop: spacing.xl,
        padding: spacing.md,
        backgroundColor: '#FEF3C7',
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: '#F59E0B',
    },
    devHintText: {
        ...typography.bodySmall,
        color: '#92400E',
        textAlign: 'center',
    },
    devHintBold: {
        fontWeight: '700',
    },
});
