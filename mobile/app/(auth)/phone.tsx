import { useState } from 'react';
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
import { router } from 'expo-router';
import { useMutation } from '@apollo/client';
import { REQUEST_OTP } from '@/graphql/auth';
import { colors, spacing, borderRadius, typography } from '@/styles/theme';

export default function PhoneScreen() {
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const [requestOtp] = useMutation(REQUEST_OTP);

    // Validate Indian phone number (10 digits starting with 6-9)
    const isValidPhone = /^[6-9]\d{9}$/.test(phone);

    const handleRequestOtp = async () => {
        if (!isValidPhone) {
            Alert.alert('Invalid Number', 'Please enter a valid 10-digit Indian mobile number');
            return;
        }

        setIsLoading(true);
        try {
            const fullPhone = `+91${phone}`;
            const { data, errors } = await requestOtp({
                variables: { input: { phone: fullPhone } },
            });

            if (errors) {
                console.error('GraphQL Errors:', errors);
            }

            if (data?.requestOtp?.success) {
                setIsLoading(false);
                router.push(`/(auth)/otp?phone=${encodeURIComponent(fullPhone)}`);
            } else {
                setIsLoading(false);
                Alert.alert('Error', data?.requestOtp?.message || 'Failed to send OTP');
            }
        } catch (error: any) {
            console.error('Request OTP error:', error?.message || error);
            setIsLoading(false);
            Alert.alert('Error', error?.message || 'Something went wrong. Please try again.');
        }
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
                    <Text style={styles.headerTitle}>Getting started</Text>

                    {/* Hero Text */}
                    <View style={styles.heroContainer}>
                        <Text style={styles.heroTitle}>
                            What's your mobile{'\n'}number?
                        </Text>
                        <Text style={styles.heroSubtitle}>
                            We'll send you a verification code
                        </Text>
                    </View>

                    {/* Phone Input */}
                    <View style={[
                        styles.inputContainer,
                        isFocused && styles.inputContainerFocused,
                        phone.length > 0 && !isValidPhone && styles.inputContainerError,
                    ]}>
                        <Text style={styles.inputLabel}>Mobile Number</Text>
                        <View style={styles.inputRow}>
                            <Text style={styles.countryCode}>+91</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="9876543210"
                                placeholderTextColor={colors.textTertiary}
                                keyboardType="phone-pad"
                                maxLength={10}
                                value={phone}
                                onChangeText={setPhone}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                editable={!isLoading}
                                autoFocus
                            />
                        </View>
                    </View>

                    {phone.length > 0 && !isValidPhone && (
                        <Text style={styles.errorText}>
                            Enter a valid 10-digit mobile number
                        </Text>
                    )}

                    {/* Next Button */}
                    <TouchableOpacity
                        style={[
                            styles.primaryButton,
                            (!isValidPhone || isLoading) && styles.primaryButtonDisabled,
                        ]}
                        onPress={handleRequestOtp}
                        disabled={!isValidPhone || isLoading}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.primaryButtonText}>
                            {isLoading ? 'Sending...' : 'Next'}
                        </Text>
                    </TouchableOpacity>

                    {/* Terms */}
                    <Text style={styles.termsText}>
                        By continuing, you agree to our{' '}
                        <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                        <Text style={styles.termsLink}>Privacy Policy</Text>
                    </Text>
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
    },

    // Input
    inputContainer: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginBottom: spacing.sm,
    },
    inputContainerFocused: {
        borderColor: colors.accent,
        borderWidth: 2,
    },
    inputContainerError: {
        borderColor: colors.error,
    },
    inputLabel: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    countryCode: {
        ...typography.bodyLarge,
        fontWeight: '600',
        color: colors.text,
        marginRight: spacing.sm,
    },
    input: {
        flex: 1,
        ...typography.bodyLarge,
        color: colors.text,
        paddingVertical: spacing.xs,
    },
    errorText: {
        ...typography.bodySmall,
        color: colors.error,
        marginBottom: spacing.md,
    },

    // Buttons
    primaryButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.full,
        paddingVertical: spacing.md + 2,
        alignItems: 'center',
        marginTop: spacing.md,
        marginBottom: spacing.lg,
    },
    primaryButtonDisabled: {
        backgroundColor: '#E0E0E0',
    },
    primaryButtonText: {
        ...typography.button,
        color: colors.primaryText,
    },

    // Terms
    termsText: {
        ...typography.bodySmall,
        color: colors.textTertiary,
        textAlign: 'center',
        paddingHorizontal: spacing.md,
    },
    termsLink: {
        color: colors.accent,
    },
});
