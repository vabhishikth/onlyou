import { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    Platform,
    KeyboardAvoidingView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@apollo/client';
import { REQUEST_OTP } from '@/graphql/auth';
import { colors, spacing, borderRadius, typography } from '@/styles/theme';

export default function SignupScreen() {
    const { state, dob } = useLocalSearchParams<{ state: string; dob: string }>();
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const [requestOtp] = useMutation(REQUEST_OTP);

    // Format phone number
    const formatPhone = (text: string) => {
        const digits = text.replace(/\D/g, '');
        return digits.substring(0, 10);
    };

    const handlePhoneChange = (text: string) => {
        setPhone(formatPhone(text));
    };

    // Validate phone (10 digits)
    const isValidPhone = phone.length === 10;

    const handleContinue = async () => {
        if (!isValidPhone) {
            Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number');
            return;
        }

        setIsLoading(true);
        try {
            const fullPhone = `+91${phone}`;
            const { data } = await requestOtp({
                variables: { input: { phone: fullPhone } },
            });

            if (data?.requestOtp?.success) {
                router.push({
                    pathname: '/(auth)/otp',
                    params: {
                        phone: fullPhone,
                        state: state || '',
                        dob: dob || '',
                    }
                });
            } else {
                Alert.alert('Error', data?.requestOtp?.message || 'Failed to send OTP');
            }
        } catch (error: any) {
            console.error('Request OTP error:', error);
            Alert.alert(
                'Connection Error',
                'Could not connect to server. Please check your connection and try again.'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignIn = () => {
        router.push('/(auth)/phone');
    };

    const handleGoogleSignIn = () => {
        Alert.alert('Coming Soon', 'Google Sign-In will be available soon.');
    };

    const handleAppleSignIn = () => {
        Alert.alert('Coming Soon', 'Apple Sign-In will be available soon.');
    };

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
                    <Text style={styles.headerTitle}>Sign up</Text>

                    {/* Title */}
                    <Text style={styles.title}>Let's get your account{'\n'}set up</Text>

                    {/* Phone Input */}
                    <View style={[
                        styles.inputContainer,
                        isFocused && styles.inputContainerFocused,
                    ]}>
                        <View style={styles.inputRow}>
                            <Text style={styles.countryCode}>+91</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Mobile number"
                                placeholderTextColor={colors.textTertiary}
                                keyboardType="phone-pad"
                                maxLength={10}
                                value={phone}
                                onChangeText={handlePhoneChange}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                editable={!isLoading}
                            />
                        </View>
                    </View>

                    {/* Terms Text */}
                    <Text style={styles.termsText}>
                        By creating an account, I agree to the{' '}
                        <Text style={styles.termsLink}>Terms and Conditions</Text>{' '}
                        and acknowledge the{' '}
                        <Text style={styles.termsLink}>Privacy Policy</Text>
                    </Text>

                    {/* Continue Button */}
                    <TouchableOpacity
                        style={[
                            styles.continueButton,
                            (!isValidPhone || isLoading) && styles.buttonDisabled
                        ]}
                        onPress={handleContinue}
                        disabled={!isValidPhone || isLoading}
                        activeOpacity={0.8}
                    >
                        {isLoading ? (
                            <ActivityIndicator color={colors.primaryText} />
                        ) : (
                            <Text style={styles.continueButtonText}>Continue</Text>
                        )}
                    </TouchableOpacity>

                    {/* Sign In Button */}
                    <TouchableOpacity
                        style={styles.signInButton}
                        onPress={handleSignIn}
                        activeOpacity={0.7}
                        disabled={isLoading}
                    >
                        <Text style={styles.signInButtonText}>
                            Already have an account? Sign in
                        </Text>
                    </TouchableOpacity>

                    {/* Divider */}
                    <View style={styles.dividerContainer}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Social Buttons */}
                    <TouchableOpacity
                        style={styles.socialButton}
                        onPress={handleGoogleSignIn}
                        activeOpacity={0.7}
                        disabled={isLoading}
                    >
                        <Text style={styles.socialIcon}>G</Text>
                        <Text style={styles.socialButtonText}>Continue With Google</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.socialButton}
                        onPress={handleAppleSignIn}
                        activeOpacity={0.7}
                        disabled={isLoading}
                    >
                        <Text style={styles.socialIcon}></Text>
                        <Text style={styles.socialButtonText}>Continue With Apple</Text>
                    </TouchableOpacity>
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
        justifyContent: 'center',
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

    // Title
    title: {
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        fontSize: 26,
        fontWeight: '400',
        color: colors.text,
        marginBottom: spacing.lg,
    },

    // Input
    inputContainer: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
    },
    inputContainerFocused: {
        borderColor: colors.primary,
        borderWidth: 2,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    countryCode: {
        ...typography.bodyLarge,
        color: colors.text,
        fontWeight: '500',
        paddingLeft: spacing.md,
        paddingRight: spacing.sm,
        paddingVertical: spacing.md,
        borderRightWidth: 1,
        borderRightColor: colors.border,
    },
    input: {
        ...typography.bodyMedium,
        color: colors.text,
        flex: 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },

    // Terms
    termsText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.lg,
        lineHeight: 20,
    },
    termsLink: {
        color: '#8B7FC7',
        textDecorationLine: 'underline',
    },

    // Continue Button
    continueButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.full,
        paddingVertical: spacing.md + 2,
        alignItems: 'center',
        marginBottom: spacing.md,
        height: 52,
        justifyContent: 'center',
    },
    buttonDisabled: {
        backgroundColor: '#E5E5E5',
    },
    continueButtonText: {
        ...typography.button,
        color: colors.primaryText,
    },

    // Sign In Button
    signInButton: {
        backgroundColor: colors.surfaceSecondary,
        borderRadius: borderRadius.full,
        paddingVertical: spacing.md,
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    signInButtonText: {
        ...typography.button,
        color: colors.text,
    },

    // Divider
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border,
    },
    dividerText: {
        ...typography.bodySmall,
        color: colors.textTertiary,
        marginHorizontal: spacing.md,
    },

    // Social Buttons
    socialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.full,
        paddingVertical: spacing.md,
        marginBottom: spacing.md,
    },
    socialIcon: {
        fontSize: 18,
        marginRight: spacing.sm,
        fontWeight: '600',
    },
    socialButtonText: {
        ...typography.button,
        color: colors.text,
    },
});
