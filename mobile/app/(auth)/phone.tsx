import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { useMutation } from '@apollo/client';
import { REQUEST_OTP, RequestOtpResponse } from '@/graphql/auth';
import { colors, spacing, borderRadius, typography } from '@/styles/theme';

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
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Something went wrong');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.content}>
                    {/* Logo / Brand */}
                    <View style={styles.brandSection}>
                        <Text style={styles.brandName}>Onlyou</Text>
                        <Text style={styles.tagline}>Healthcare, made personal</Text>
                    </View>

                    {/* Phone Input */}
                    <View style={styles.formSection}>
                        <Text style={styles.heading}>Welcome</Text>
                        <Text style={styles.subheading}>
                            Enter your mobile number to get started
                        </Text>

                        <View style={styles.inputContainer}>
                            <View style={styles.countryCode}>
                                <Text style={styles.countryCodeText}>+91</Text>
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="10-digit mobile number"
                                placeholderTextColor={colors.textTertiary}
                                keyboardType="phone-pad"
                                maxLength={10}
                                value={phone}
                                onChangeText={(text) => setPhone(text.replace(/\D/g, ''))}
                                autoFocus
                            />
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.button,
                                (!isValidPhone || loading) && styles.buttonDisabled,
                            ]}
                            onPress={handleSubmit}
                            disabled={!isValidPhone || loading}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <ActivityIndicator color={colors.primaryText} />
                            ) : (
                                <Text style={styles.buttonText}>Continue</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Terms */}
                    <Text style={styles.terms}>
                        By continuing, you agree to our{' '}
                        <Text style={styles.link}>Terms of Service</Text> and{' '}
                        <Text style={styles.link}>Privacy Policy</Text>
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
        paddingHorizontal: spacing.xl,
        justifyContent: 'center',
    },
    brandSection: {
        alignItems: 'center',
        marginBottom: spacing.xxxl,
    },
    brandName: {
        ...typography.displayLarge,
        color: colors.primary,
    },
    tagline: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    formSection: {
        marginBottom: spacing.xxxl,
    },
    heading: {
        ...typography.headingLarge,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    subheading: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        marginBottom: spacing.xl,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.surfaceElevated,
        marginBottom: spacing.lg,
    },
    countryCode: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderRightWidth: 1,
        borderRightColor: colors.border,
    },
    countryCodeText: {
        ...typography.bodyLarge,
        color: colors.text,
        fontWeight: '500',
    },
    input: {
        flex: 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        ...typography.bodyLarge,
        color: colors.text,
    },
    button: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md + 2,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
    },
    buttonDisabled: {
        backgroundColor: colors.textTertiary,
    },
    buttonText: {
        ...typography.button,
        color: colors.primaryText,
    },
    terms: {
        ...typography.bodySmall,
        color: colors.textTertiary,
        textAlign: 'center',
        paddingHorizontal: spacing.lg,
    },
    link: {
        color: colors.primary,
        fontWeight: '500',
    },
});
