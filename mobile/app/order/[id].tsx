import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@apollo/client';
import { colors, spacing, borderRadius, typography } from '@/theme';
import { GET_ORDER_DETAIL, GetOrderDetailResponse } from '@/graphql/orders';

// Spec: Phase 11 — Order detail screen for medication delivery

const STATUS_STEPS = [
    { key: 'PRESCRIPTION_CREATED', label: 'Order Placed' },
    { key: 'SENT_TO_PHARMACY', label: 'Sent to Pharmacy' },
    { key: 'PHARMACY_PREPARING', label: 'Medication Being Prepared' },
    { key: 'PHARMACY_READY', label: 'Ready for Pickup' },
    { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
    { key: 'DELIVERED', label: 'Delivered' },
];

const STATUS_ORDER = STATUS_STEPS.map((s) => s.key);

function getStepState(
    orderStatus: string,
    stepKey: string
): 'completed' | 'current' | 'upcoming' {
    const currentIdx = STATUS_ORDER.indexOf(orderStatus);
    const stepIdx = STATUS_ORDER.indexOf(stepKey);

    if (currentIdx < 0) return 'upcoming';
    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'current';
    return 'upcoming';
}

function formatAmount(paise: number): string {
    const rupees = paise / 100;
    return rupees.toLocaleString('en-IN');
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

export default function OrderDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { data, loading } = useQuery<GetOrderDetailResponse>(GET_ORDER_DETAIL, {
        variables: { id },
        skip: !id,
    });

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer} testID="order-detail-loading">
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    const result = data?.order;
    const order = result?.order;

    if (!result?.success || !order) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backButtonText}>{'<'}</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Order Details</Text>
                    <View style={styles.headerSpacer} />
                </View>
                <View style={styles.errorContainer} testID="order-detail-error">
                    <Text style={styles.errorText}>
                        {result?.message || 'Order not found'}
                    </Text>
                    <TouchableOpacity
                        style={styles.goBackButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.goBackButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const isOutForDelivery = order.status === 'OUT_FOR_DELIVERY';
    const isDelivered = order.status === 'DELIVERED';
    const isCancelled = order.status === 'CANCELLED';

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>{'<'}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Order Details</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Order Summary Card */}
                <View style={styles.summaryCard}>
                    <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                    <Text style={styles.orderDate}>
                        Ordered {formatDate(order.orderedAt)}
                    </Text>

                    <View style={styles.divider} />

                    <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>Medication</Text>
                        <Text style={styles.amountValue}>
                            Rs {formatAmount(order.medicationCost)}
                        </Text>
                    </View>
                    <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>Delivery</Text>
                        <Text style={styles.amountValue}>
                            Rs {formatAmount(order.deliveryCost)}
                        </Text>
                    </View>
                    <View style={[styles.amountRow, styles.totalRow]}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>
                            Rs {formatAmount(order.totalAmount)}
                        </Text>
                    </View>
                </View>

                {/* Delivery Address */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Delivery Address</Text>
                    <View style={styles.addressCard}>
                        <Text style={styles.addressText}>
                            {order.deliveryAddress}
                        </Text>
                        <Text style={styles.addressCity}>
                            {order.deliveryCity} — {order.deliveryPincode}
                        </Text>
                    </View>
                </View>

                {/* Delivery Stepper */}
                {!isCancelled && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Delivery Progress</Text>
                        <View style={styles.stepperCard}>
                            {STATUS_STEPS.map((step, index) => {
                                const state = getStepState(order.status, step.key);
                                const isLast = index === STATUS_STEPS.length - 1;

                                return (
                                    <View key={step.key} style={styles.stepRow}>
                                        <View style={styles.stepIndicatorColumn}>
                                            <View
                                                style={[
                                                    styles.stepDot,
                                                    state === 'completed' && styles.stepDotCompleted,
                                                    state === 'current' && styles.stepDotCurrent,
                                                ]}
                                            />
                                            {!isLast && (
                                                <View
                                                    style={[
                                                        styles.stepLine,
                                                        state === 'completed' && styles.stepLineCompleted,
                                                    ]}
                                                />
                                            )}
                                        </View>
                                        <Text
                                            style={[
                                                styles.stepLabel,
                                                state === 'current' && styles.stepLabelCurrent,
                                                state === 'completed' && styles.stepLabelCompleted,
                                            ]}
                                        >
                                            {step.label}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Delivery Person Info */}
                {isOutForDelivery && order.deliveryPersonName && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Delivery Person</Text>
                        <View style={styles.deliveryPersonCard}>
                            <View style={styles.deliveryPersonInfo}>
                                <Text style={styles.deliveryPersonName}>
                                    {order.deliveryPersonName}
                                </Text>
                                {order.estimatedDeliveryTime && (
                                    <Text style={styles.etaText}>
                                        ETA: {order.estimatedDeliveryTime}
                                    </Text>
                                )}
                            </View>
                            {order.deliveryPersonPhone && (
                                <TouchableOpacity
                                    style={styles.callButton}
                                    onPress={() =>
                                        Linking.openURL(`tel:${order.deliveryPersonPhone}`)
                                    }
                                >
                                    <Text style={styles.callButtonText}>Call</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}

                {/* Delivery OTP */}
                {isOutForDelivery && order.deliveryOtp && (
                    <View style={styles.section} testID="delivery-otp-section">
                        <Text style={styles.sectionTitle}>Delivery OTP</Text>
                        <View style={styles.otpCard}>
                            <View style={styles.otpDigitsRow}>
                                {order.deliveryOtp.split('').map((digit, index) => (
                                    <View key={index} style={styles.otpDigit}>
                                        <Text style={styles.otpDigitText}>{digit}</Text>
                                    </View>
                                ))}
                            </View>
                            <Text style={styles.otpNote}>
                                Show this OTP to the delivery person to confirm receipt
                            </Text>
                        </View>
                    </View>
                )}

                {/* Cancelled State */}
                {isCancelled && (
                    <View style={styles.cancelledCard}>
                        <Text style={styles.cancelledTitle}>Order Cancelled</Text>
                        {order.deliveryFailedReason && (
                            <Text style={styles.cancelledReason}>
                                {order.deliveryFailedReason}
                            </Text>
                        )}
                    </View>
                )}

                {/* Delivered State */}
                {isDelivered && order.deliveredAt && (
                    <View style={styles.deliveredCard}>
                        <Text style={styles.deliveredTitle}>Delivered</Text>
                        <Text style={styles.deliveredDate}>
                            {formatDate(order.deliveredAt)}
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
    backButtonText: {
        fontSize: 24,
        color: colors.text,
    },
    headerTitle: {
        ...typography.headingSmall,
        color: colors.text,
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
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    errorText: {
        ...typography.bodyMedium,
        color: colors.error,
        marginBottom: spacing.lg,
        textAlign: 'center',
    },
    goBackButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.full,
    },
    goBackButtonText: {
        ...typography.buttonSmall,
        color: colors.primaryText,
    },
    summaryCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    orderNumber: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    orderDate: {
        ...typography.bodySmall,
        color: colors.textTertiary,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.md,
    },
    amountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
    },
    amountLabel: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    amountValue: {
        ...typography.bodySmall,
        color: colors.text,
    },
    totalRow: {
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        marginBottom: 0,
    },
    totalLabel: {
        ...typography.bodyMedium,
        fontWeight: '600',
        color: colors.text,
    },
    totalValue: {
        ...typography.bodyMedium,
        fontWeight: '600',
        color: colors.text,
    },
    section: {
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        ...typography.label,
        color: colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.sm,
    },
    addressCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    addressText: {
        ...typography.bodyMedium,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    addressCity: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    stepperCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        minHeight: 40,
    },
    stepIndicatorColumn: {
        alignItems: 'center',
        width: 24,
        marginRight: spacing.md,
    },
    stepDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.border,
        marginTop: 4,
    },
    stepDotCompleted: {
        backgroundColor: colors.success,
    },
    stepDotCurrent: {
        backgroundColor: colors.primary,
    },
    stepLine: {
        width: 2,
        flex: 1,
        minHeight: 20,
        backgroundColor: colors.border,
        marginVertical: 4,
    },
    stepLineCompleted: {
        backgroundColor: colors.success,
    },
    stepLabel: {
        ...typography.bodySmall,
        color: colors.textTertiary,
        paddingTop: 2,
    },
    stepLabelCurrent: {
        ...typography.bodyMedium,
        fontWeight: '600',
        color: colors.primary,
    },
    stepLabelCompleted: {
        color: colors.text,
    },
    deliveryPersonCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    deliveryPersonInfo: {
        flex: 1,
    },
    deliveryPersonName: {
        ...typography.bodyMedium,
        fontWeight: '600',
        color: colors.text,
    },
    etaText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginTop: 2,
    },
    callButton: {
        backgroundColor: colors.successLight,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
    },
    callButtonText: {
        ...typography.buttonSmall,
        color: colors.success,
    },
    otpCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    otpDigitsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    otpDigit: {
        width: 48,
        height: 56,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        borderWidth: 2,
        borderColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    otpDigitText: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
    },
    otpNote: {
        ...typography.label,
        color: colors.textTertiary,
        textAlign: 'center',
    },
    cancelledCard: {
        backgroundColor: colors.errorLight,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.error,
    },
    cancelledTitle: {
        ...typography.bodyMedium,
        fontWeight: '600',
        color: colors.error,
    },
    cancelledReason: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    deliveredCard: {
        backgroundColor: colors.successLight,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.success,
    },
    deliveredTitle: {
        ...typography.bodyMedium,
        fontWeight: '600',
        color: colors.success,
    },
    deliveredDate: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
});
