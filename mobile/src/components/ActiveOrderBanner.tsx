/**
 * ActiveOrderBanner Component
 * Premium active order tracking banner for Home screen
 * Shows lab orders or delivery orders with status
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Truck, FlaskConical, ChevronRight } from 'lucide-react-native';

import { colors } from '@/theme/colors';
import { fontFamilies, fontSizes } from '@/theme/typography';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import {
    LabOrder,
    Order,
    LabOrderStatus,
    OrderStatus,
} from '@/graphql/tracking';

interface ActiveOrderBannerProps {
    labOrders: LabOrder[];
    deliveryOrders: Order[];
}

// Completed/terminal statuses that should not show in the banner
const COMPLETED_LAB_STATUSES: LabOrderStatus[] = ['CLOSED', 'CANCELLED', 'EXPIRED'];
const COMPLETED_DELIVERY_STATUSES: OrderStatus[] = ['DELIVERED', 'CANCELLED'];

// Lab order status labels
const LAB_STATUS_LABELS: Record<LabOrderStatus, string> = {
    ORDERED: 'Ordered',
    SLOT_BOOKED: 'Slot Booked',
    PHLEBOTOMIST_ASSIGNED: 'Phlebotomist Assigned',
    SAMPLE_COLLECTED: 'Sample Collected',
    COLLECTION_FAILED: 'Collection Failed',
    DELIVERED_TO_LAB: 'Delivered to Lab',
    SAMPLE_RECEIVED: 'Sample Received',
    SAMPLE_ISSUE: 'Sample Issue',
    PROCESSING: 'Processing',
    RESULTS_READY: 'Results Ready',
    DOCTOR_REVIEWED: 'Doctor Reviewed',
    RESULTS_UPLOADED: 'Results Uploaded',
    CANCELLED: 'Cancelled',
    EXPIRED: 'Expired',
    CLOSED: 'Completed',
};

// Delivery order status labels
const DELIVERY_STATUS_LABELS: Record<OrderStatus, string> = {
    PRESCRIPTION_CREATED: 'Prescription Created',
    SENT_TO_PHARMACY: 'Sent to Pharmacy',
    PHARMACY_PREPARING: 'Pharmacy Preparing',
    PHARMACY_READY: 'Pharmacy Ready',
    PICKUP_ARRANGED: 'Pickup Arranged',
    OUT_FOR_DELIVERY: 'Out for Delivery',
    DELIVERED: 'Delivered',
    DELIVERY_FAILED: 'Delivery Failed',
    RESCHEDULED: 'Rescheduled',
    CANCELLED: 'Cancelled',
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ActiveOrderBanner({
    labOrders = [],
    deliveryOrders = [],
}: ActiveOrderBannerProps) {
    const router = useRouter();
    const scale = useSharedValue(1);

    // Get the most recent active item
    const activeLabOrder = labOrders.find(
        (order) => !COMPLETED_LAB_STATUSES.includes(order.status)
    );
    const activeDeliveryOrder = deliveryOrders.find(
        (order) => !COMPLETED_DELIVERY_STATUSES.includes(order.status)
    );

    // If no active orders, don't render
    if (!activeLabOrder && !activeDeliveryOrder) {
        return null;
    }

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    };

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.push('/activity' as any);
    };

    // Determine which item to show (prioritize more recent)
    const showLabOrder = activeLabOrder && (!activeDeliveryOrder ||
        new Date(activeLabOrder.orderedAt) > new Date(activeDeliveryOrder.prescriptionCreatedAt));

    if (showLabOrder && activeLabOrder) {
        const statusLabel = LAB_STATUS_LABELS[activeLabOrder.status];
        return (
            <AnimatedPressable
                style={[styles.banner, styles.labBanner, animatedStyle]}
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                testID="active-order-banner"
            >
                <View style={[styles.iconContainer, styles.labIconContainer]} testID="order-icon">
                    <FlaskConical size={20} color={colors.accent} strokeWidth={1.5} />
                </View>
                <View style={styles.content}>
                    <Text style={styles.title}>Blood Test</Text>
                    <Text style={styles.status} numberOfLines={1}>
                        {statusLabel}
                    </Text>
                </View>
                <ChevronRight size={20} color={colors.textTertiary} strokeWidth={2} />
            </AnimatedPressable>
        );
    }

    if (activeDeliveryOrder) {
        const statusLabel = DELIVERY_STATUS_LABELS[activeDeliveryOrder.status];
        const showEta = activeDeliveryOrder.status === 'OUT_FOR_DELIVERY' &&
            activeDeliveryOrder.estimatedDeliveryTime;

        return (
            <AnimatedPressable
                style={[styles.banner, styles.deliveryBanner, animatedStyle]}
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                testID="active-order-banner"
            >
                <View style={[styles.iconContainer, styles.deliveryIconContainer]} testID="order-icon">
                    <Truck size={20} color={colors.success} strokeWidth={1.5} />
                </View>
                <View style={styles.content}>
                    <Text style={styles.title}>Medication Delivery</Text>
                    <Text style={styles.status} numberOfLines={1}>
                        {statusLabel}
                        {showEta && ` — ETA ${activeDeliveryOrder.estimatedDeliveryTime}`}
                    </Text>
                </View>
                <ChevronRight size={20} color={colors.textTertiary} strokeWidth={2} />
            </AnimatedPressable>
        );
    }

    return null;
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        marginBottom: spacing.lg,
        ...shadows.soft,
    },
    labBanner: {
        backgroundColor: colors.accentLight,
        borderWidth: 1,
        borderColor: colors.accent,
    },
    deliveryBanner: {
        backgroundColor: colors.successLight,
        borderWidth: 1,
        borderColor: colors.success,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    labIconContainer: {
        backgroundColor: colors.white,
    },
    deliveryIconContainer: {
        backgroundColor: colors.white,
    },
    content: {
        flex: 1,
    },
    title: {
        fontFamily: fontFamilies.sansSemiBold,
        fontSize: fontSizes.label,
        color: colors.textPrimary,
        marginBottom: 2,
    },
    status: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.caption,
        color: colors.textSecondary,
    },
});
