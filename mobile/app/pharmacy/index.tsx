import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useQuery } from '@apollo/client';
import { MY_ACTIVE_PHARMACY_ORDERS } from '@/graphql/pharmacy';

// Spec: Phase 15 — Patient active pharmacy orders screen

const STATUS_LABELS: Record<string, string> = {
    PENDING_ASSIGNMENT: 'Pending',
    ASSIGNED: 'Assigned',
    PHARMACY_ACCEPTED: 'Accepted',
    PREPARING: 'Preparing',
    AWAITING_SUBSTITUTION_APPROVAL: 'Substitution Review',
    READY_FOR_PICKUP: 'Ready',
    DISPATCHED: 'Dispatched',
    OUT_FOR_DELIVERY: 'Out for Delivery',
    STOCK_ISSUE: 'Stock Issue',
};

const STATUS_COLORS: Record<string, string> = {
    PENDING_ASSIGNMENT: '#f59e0b',
    ASSIGNED: '#8b5cf6',
    PHARMACY_ACCEPTED: '#3b82f6',
    PREPARING: '#3b82f6',
    READY_FOR_PICKUP: '#10b981',
    DISPATCHED: '#0ea5e9',
    OUT_FOR_DELIVERY: '#0ea5e9',
    STOCK_ISSUE: '#ef4444',
};

export default function PharmacyOrdersScreen() {
    const { data, loading } = useQuery(MY_ACTIVE_PHARMACY_ORDERS);

    const orders = data?.myActivePharmacyOrders || [];

    if (loading) {
        return (
            <View testID="pharmacy-loading" style={styles.centered}>
                <ActivityIndicator size="large" color="#6366f1" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>My Orders</Text>
            <Text style={styles.subtitle}>Track your medication orders</Text>

            {orders.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>No active orders</Text>
                    <Text style={styles.emptySubtitle}>
                        Your medication orders will appear here
                    </Text>
                </View>
            ) : (
                orders.map((order: any) => {
                    const statusLabel = STATUS_LABELS[order.status] || order.status;
                    const statusColor = STATUS_COLORS[order.status] || '#6b7280';

                    return (
                        <View key={order.id} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                                <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
                                    <Text style={[styles.badgeText, { color: statusColor }]}>
                                        {statusLabel}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.address}>{order.deliveryAddress}</Text>
                            <Text style={styles.city}>
                                {order.deliveryCity} — {order.deliveryPincode}
                            </Text>
                        </View>
                    );
                })
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
        padding: 16,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1a1a2e',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 20,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 48,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6b7280',
        marginBottom: 4,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#9ca3af',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    orderNumber: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1a1a2e',
        fontFamily: 'monospace',
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    address: {
        fontSize: 13,
        color: '#374151',
        marginBottom: 2,
    },
    city: {
        fontSize: 12,
        color: '#9ca3af',
    },
});
