import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/styles/theme';
import VerticalStepper, { StepperStep } from './VerticalStepper';
import {
    Order,
    OrderStatus,
    DELIVERY_STATUS_LABELS,
} from '@/graphql/tracking';

interface DeliveryTrackerProps {
    order: Order;
    onViewPrescription?: () => void;
    onEnterOtp?: () => void;
}

function formatDate(dateString?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

// Determine which step is current based on status
function getStepStatus(
    orderStatus: OrderStatus,
    stepStatuses: OrderStatus[]
): 'completed' | 'current' | 'upcoming' {
    const statusOrder: OrderStatus[] = [
        'PRESCRIPTION_CREATED',
        'SENT_TO_PHARMACY',
        'PHARMACY_PREPARING',
        'PHARMACY_READY',
        'PICKUP_ARRANGED',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
    ];

    const currentIndex = statusOrder.indexOf(orderStatus);
    const stepIndex = Math.max(...stepStatuses.map((s) => statusOrder.indexOf(s)));

    if (currentIndex > stepIndex) return 'completed';
    if (currentIndex === stepIndex) return 'current';
    return 'upcoming';
}

export default function DeliveryTracker({
    order,
    onViewPrescription,
    onEnterOtp,
}: DeliveryTrackerProps) {
    const buildSteps = (): StepperStep[] => {
        const steps: StepperStep[] = [];

        // Step 1: Treatment Plan Ready
        steps.push({
            id: 'prescription_created',
            label: 'Treatment Plan Ready',
            description: 'Your doctor prescribed your treatment',
            timestamp: formatDate(order.prescriptionCreatedAt),
            status: getStepStatus(order.status, ['PRESCRIPTION_CREATED']),
            icon: '📋',
            action: onViewPrescription ? (
                <TouchableOpacity style={styles.viewButton} onPress={onViewPrescription}>
                    <Text style={styles.viewButtonText}>View Prescription</Text>
                </TouchableOpacity>
            ) : undefined,
        });

        // Step 2: Medication Being Prepared
        steps.push({
            id: 'preparing',
            label: 'Medication Being Prepared',
            description: 'Your kit is being packed at the pharmacy',
            timestamp: formatDate(order.pharmacyPreparingAt || order.sentToPharmacyAt),
            status: getStepStatus(order.status, ['SENT_TO_PHARMACY', 'PHARMACY_PREPARING', 'PHARMACY_READY']),
            icon: '💊',
        });

        // Step 3: Out for Delivery
        const isOutForDelivery = order.status === 'OUT_FOR_DELIVERY';
        steps.push({
            id: 'out_for_delivery',
            label: isOutForDelivery ? 'Out for Delivery' : 'Delivery',
            description: isOutForDelivery && order.deliveryPersonName
                ? `Delivery by: ${order.deliveryPersonName}${order.estimatedDeliveryTime ? ` — ETA ${order.estimatedDeliveryTime}` : ''}`
                : 'Will be delivered to your address',
            timestamp: formatDate(order.outForDeliveryAt),
            status: getStepStatus(order.status, ['PICKUP_ARRANGED', 'OUT_FOR_DELIVERY']),
            icon: '🚗',
            action: isOutForDelivery && order.deliveryPersonPhone ? (
                <TouchableOpacity
                    style={styles.callButton}
                    onPress={() => Linking.openURL(`tel:${order.deliveryPersonPhone}`)}
                >
                    <Text style={styles.callButtonText}>📞 Call Delivery</Text>
                </TouchableOpacity>
            ) : undefined,
        });

        // Step 4: Delivered
        const isDelivered = order.status === 'DELIVERED';
        const needsOtp = order.status === 'OUT_FOR_DELIVERY' && order.deliveryOtp;

        steps.push({
            id: 'delivered',
            label: isDelivered ? 'Delivered' : 'Delivery Confirmation',
            description: isDelivered
                ? 'Your treatment kit has been delivered'
                : 'Enter delivery OTP to confirm receipt',
            timestamp: formatDate(order.deliveredAt),
            status: getStepStatus(order.status, ['DELIVERED']),
            icon: '📦',
            action: needsOtp && onEnterOtp ? (
                <TouchableOpacity style={styles.otpButton} onPress={onEnterOtp}>
                    <Text style={styles.otpButtonText}>Enter OTP to Confirm</Text>
                </TouchableOpacity>
            ) : undefined,
        });

        return steps;
    };

    // Handle failed/rescheduled status
    if (order.status === 'DELIVERY_FAILED' || order.status === 'RESCHEDULED') {
        return (
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={[styles.headerIcon, styles.headerIconWarning]}>
                        <Text style={styles.headerIconText}>📦</Text>
                    </View>
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>Medication Delivery</Text>
                        <Text style={[styles.headerStatus, styles.headerStatusWarning]}>
                            {DELIVERY_STATUS_LABELS[order.status]?.label || order.status}
                        </Text>
                    </View>
                </View>

                {/* Warning message */}
                <View style={styles.warningCard}>
                    <Text style={styles.warningIcon}>⚠️</Text>
                    <View style={styles.warningContent}>
                        <Text style={styles.warningTitle}>
                            {order.status === 'DELIVERY_FAILED' ? 'Delivery Unsuccessful' : 'Delivery Rescheduled'}
                        </Text>
                        <Text style={styles.warningText}>
                            {order.status === 'DELIVERY_FAILED'
                                ? 'We couldn\'t complete your delivery. Our team will contact you to reschedule.'
                                : `Your delivery has been rescheduled for ${formatDate(order.rescheduledAt)}`}
                        </Text>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={[styles.headerIcon, styles.headerIconSuccess]}>
                    <Text style={styles.headerIconText}>📦</Text>
                </View>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Medication Delivery</Text>
                    <Text style={styles.headerStatus}>
                        {DELIVERY_STATUS_LABELS[order.status]?.label || order.status}
                    </Text>
                </View>
            </View>

            {/* Stepper */}
            <VerticalStepper steps={buildSteps()} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    headerIconSuccess: {
        backgroundColor: colors.successLight,
    },
    headerIconWarning: {
        backgroundColor: colors.warningLight,
    },
    headerIconText: {
        fontSize: 22,
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        ...typography.headingSmall,
        color: colors.text,
    },
    headerStatus: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    headerStatusWarning: {
        color: colors.warning,
    },
    viewButton: {
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: colors.border,
    },
    viewButtonText: {
        ...typography.buttonSmall,
        color: colors.text,
    },
    callButton: {
        backgroundColor: colors.successLight,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        alignSelf: 'flex-start',
    },
    callButtonText: {
        ...typography.buttonSmall,
        color: colors.success,
    },
    otpButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        alignSelf: 'flex-start',
    },
    otpButtonText: {
        ...typography.buttonSmall,
        color: colors.primaryText,
    },
    warningCard: {
        flexDirection: 'row',
        backgroundColor: colors.warningLight,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.warning,
    },
    warningIcon: {
        fontSize: 24,
        marginRight: spacing.sm,
    },
    warningContent: {
        flex: 1,
    },
    warningTitle: {
        ...typography.bodyMedium,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    warningText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
});
