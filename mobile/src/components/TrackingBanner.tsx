import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme';
import {
    LabOrder,
    Order,
    LAB_STATUS_LABELS,
    DELIVERY_STATUS_LABELS,
} from '@/graphql/tracking';

interface TrackingBannerProps {
    labOrders?: LabOrder[];
    deliveryOrders?: Order[];
}

export default function TrackingBanner({
    labOrders = [],
    deliveryOrders = [],
}: TrackingBannerProps) {
    const router = useRouter();

    // Get the most recent active item
    const activeLabOrder = labOrders.find(
        (order) => !['CLOSED', 'CANCELLED', 'EXPIRED'].includes(order.status)
    );
    const activeDeliveryOrder = deliveryOrders.find(
        (order) => !['DELIVERED', 'CANCELLED'].includes(order.status)
    );

    // If no active orders, don't render
    if (!activeLabOrder && !activeDeliveryOrder) {
        return null;
    }

    const handlePress = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.push('/activity' as any);
    };

    // Determine which item to show (prioritize lab orders if recent)
    const showLabOrder = activeLabOrder && (!activeDeliveryOrder ||
        new Date(activeLabOrder.orderedAt) > new Date(activeDeliveryOrder.prescriptionCreatedAt));

    if (showLabOrder && activeLabOrder) {
        const statusInfo = LAB_STATUS_LABELS[activeLabOrder.status];
        return (
            <TouchableOpacity
                style={[styles.banner, styles.labBanner]}
                onPress={handlePress}
                activeOpacity={0.9}
            >
                <View style={styles.iconContainer}>
                    <Text style={styles.icon}>{statusInfo.icon}</Text>
                </View>
                <View style={styles.content}>
                    <Text style={styles.title}>Blood Test</Text>
                    <Text style={styles.status} numberOfLines={1}>
                        {statusInfo.label}
                    </Text>
                </View>
                <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
        );
    }

    if (activeDeliveryOrder) {
        const statusInfo = DELIVERY_STATUS_LABELS[activeDeliveryOrder.status];
        return (
            <TouchableOpacity
                style={[styles.banner, styles.deliveryBanner]}
                onPress={handlePress}
                activeOpacity={0.9}
            >
                <View style={styles.iconContainer}>
                    <Text style={styles.icon}>{statusInfo.icon}</Text>
                </View>
                <View style={styles.content}>
                    <Text style={styles.title}>Medication Delivery</Text>
                    <Text style={styles.status} numberOfLines={1}>
                        {statusInfo.label}
                        {activeDeliveryOrder.estimatedDeliveryTime &&
                            activeDeliveryOrder.status === 'OUT_FOR_DELIVERY' &&
                            ` — ETA ${activeDeliveryOrder.estimatedDeliveryTime}`}
                    </Text>
                </View>
                <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
        );
    }

    return null;
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.lg,
        ...shadows.sm,
    },
    labBanner: {
        backgroundColor: colors.infoLight,
        borderWidth: 1,
        borderColor: colors.info,
    },
    deliveryBanner: {
        backgroundColor: colors.successLight,
        borderWidth: 1,
        borderColor: colors.success,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.8)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    icon: {
        fontSize: 20,
    },
    content: {
        flex: 1,
    },
    title: {
        ...typography.bodyMedium,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    status: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    arrow: {
        fontSize: 18,
        color: colors.textSecondary,
        marginLeft: spacing.sm,
    },
});
