import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@apollo/client';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme';
import { CREATE_PAYMENT_ORDER, VERIFY_PAYMENT, formatAmount } from '@/graphql/payment';
import { SUBMIT_INTAKE } from '@/graphql/intake';

// Spec: master spec Section 12 — Razorpay Integration
// Flow: Plan Selection → Payment (this screen) → Complete

// Map URL path to DB enum
const pathToVertical: Record<string, string> = {
    'hair-loss': 'HAIR_LOSS',
    'sexual-health': 'SEXUAL_HEALTH',
    'pcos': 'PCOS',
    'weight-management': 'WEIGHT_MANAGEMENT',
};

export default function PaymentScreen() {
    const {
        vertical,
        responses,
        photos,
        planId,
        amountPaise,
        planName,
        durationMonths,
    } = useLocalSearchParams<{
        vertical: string;
        responses: string;
        photos?: string;
        planId: string;
        amountPaise: string;
        planName: string;
        durationMonths: string;
    }>();
    const router = useRouter();

    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<string>('');

    const amount = parseInt(amountPaise || '0', 10);
    const dbVertical = pathToVertical[vertical || ''] || 'HAIR_LOSS';
    const parsedResponses = responses ? JSON.parse(responses) : {};
    const parsedPhotos = photos ? JSON.parse(photos) : [];

    const [createPaymentOrder] = useMutation(CREATE_PAYMENT_ORDER);
    const [verifyPayment] = useMutation(VERIFY_PAYMENT);
    const [submitIntake] = useMutation(SUBMIT_INTAKE);

    const handleBack = () => {
        router.back();
    };

    const handlePay = async () => {
        setProcessing(true);
        setError(null);

        try {
            // Step 1: Create payment order
            setStep('Creating order...');
            const orderResult = await createPaymentOrder({
                variables: {
                    input: {
                        amountPaise: amount,
                        currency: 'INR',
                        purpose: 'INTAKE_PAYMENT',
                        vertical: dbVertical,
                        planId,
                    },
                },
            });

            const orderData = orderResult.data?.createPaymentOrder;
            if (!orderData?.success) {
                setError(orderData?.message || 'Failed to create payment order');
                setProcessing(false);
                return;
            }

            // Step 2: Open Razorpay checkout
            setStep('Opening payment...');
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const RazorpayModule = require('react-native-razorpay');
            const RazorpayCheckout = RazorpayModule.default || RazorpayModule;

            const razorpayOptions = {
                key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '',
                amount: orderData.amountPaise,
                currency: orderData.currency || 'INR',
                name: 'Onlyou',
                description: planName || 'Treatment Plan',
                order_id: orderData.razorpayOrderId,
                prefill: {
                    contact: '',
                    email: '',
                },
                theme: {
                    color: colors.primary,
                },
            };

            const razorpayResult = await RazorpayCheckout.open(razorpayOptions);

            // Step 3: Verify payment
            setStep('Verifying payment...');
            const verifyResult = await verifyPayment({
                variables: {
                    input: {
                        razorpayOrderId: razorpayResult.razorpay_order_id,
                        razorpayPaymentId: razorpayResult.razorpay_payment_id,
                        razorpaySignature: razorpayResult.razorpay_signature,
                    },
                },
            });

            const verifyData = verifyResult.data?.verifyPayment;
            if (!verifyData?.success) {
                setError(verifyData?.message || 'Payment verification failed');
                setProcessing(false);
                return;
            }

            // Step 4: Submit intake
            setStep('Submitting assessment...');
            const intakeResult = await submitIntake({
                variables: {
                    input: {
                        vertical: dbVertical,
                        responses: parsedResponses,
                        photos: parsedPhotos.length > 0 ? parsedPhotos : undefined,
                    },
                },
            });

            const intakeData = intakeResult.data?.submitIntake;
            if (!intakeData?.success) {
                setError('Assessment submission failed. Your payment was successful — please contact support.');
                setProcessing(false);
                return;
            }

            // Step 5: Navigate to complete
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            router.replace({
                pathname: `/intake/${vertical}/complete` as any,
                params: {
                    vertical,
                    consultationId: intakeData.consultation?.id,
                },
            });
        } catch (err: any) {
            // Razorpay error codes: 2 = cancelled by user
            if (err?.code === 2) {
                setError('Payment cancelled. You can try again when ready.');
            } else {
                setError(err?.description || err?.message || 'Payment failed. Please try again.');
            }
            setProcessing(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Text style={styles.backText}>{'<'}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Payment</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Order Summary */}
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Order Summary</Text>

                    <Text style={styles.planLabel}>{planName || 'Treatment Plan'}</Text>

                    {durationMonths && parseInt(durationMonths, 10) > 1 && (
                        <Text style={styles.durationNote}>
                            {durationMonths} months plan
                        </Text>
                    )}
                </View>

                {/* Secure Payment Notice */}
                <View style={styles.secureNotice}>
                    <Text style={styles.secureIcon}>🔒</Text>
                    <Text style={styles.secureText}>
                        Secure payment powered by Razorpay
                    </Text>
                </View>

                {/* Error Message */}
                {error && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                {/* Processing Step */}
                {processing && step && (
                    <View style={styles.processingContainer}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={styles.processingText}>{step}</Text>
                    </View>
                )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[
                        styles.payButton,
                        processing && styles.payButtonDisabled,
                    ]}
                    onPress={handlePay}
                    disabled={processing}
                    activeOpacity={0.8}
                    testID="pay-button"
                >
                    {processing ? (
                        <ActivityIndicator size="small" color={colors.primaryText} />
                    ) : (
                        <Text style={styles.payButtonText}>
                            Pay {formatAmount(amount)}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backText: {
        fontSize: 24,
        color: colors.text,
    },
    headerTitle: {
        ...typography.headingSmall,
        color: colors.text,
        flex: 1,
        textAlign: 'center',
    },
    headerSpacer: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.lg,
    },
    summaryCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        ...shadows.sm,
    },
    summaryTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.md,
    },
    planLabel: {
        ...typography.bodyMedium,
        color: colors.text,
        fontWeight: '600',
        marginBottom: spacing.xs,
    },
    durationNote: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },
    secureNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    secureIcon: {
        fontSize: 16,
        marginRight: spacing.xs,
    },
    secureText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    errorContainer: {
        backgroundColor: '#FFF0F0',
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.error,
    },
    errorText: {
        ...typography.bodySmall,
        color: colors.error,
        textAlign: 'center',
    },
    processingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.md,
    },
    processingText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginLeft: spacing.sm,
    },
    footer: {
        padding: spacing.lg,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    payButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md + 2,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.md,
    },
    payButtonDisabled: {
        opacity: 0.7,
    },
    payButtonText: {
        ...typography.button,
        color: colors.primaryText,
    },
});
