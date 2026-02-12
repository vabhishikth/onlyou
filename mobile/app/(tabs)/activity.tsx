import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    Platform,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@apollo/client';
import { colors, spacing, borderRadius, typography } from '@/styles/theme';
import {
    GET_ACTIVE_TRACKING,
    ActiveTrackingResponse,
    LabOrder,
    Order,
    LAB_STATUS_LABELS,
    DELIVERY_STATUS_LABELS,
} from '@/graphql/tracking';
import LabOrderTracker from '@/components/LabOrderTracker';
import DeliveryTracker from '@/components/DeliveryTracker';

// Filter active vs completed
function isActiveLabOrder(order: LabOrder): boolean {
    return !['CLOSED', 'CANCELLED', 'EXPIRED', 'DOCTOR_REVIEWED'].includes(order.status);
}

function isActiveDeliveryOrder(order: Order): boolean {
    return !['DELIVERED', 'CANCELLED'].includes(order.status);
}

export default function ActivityScreen() {
    const [refreshing, setRefreshing] = useState(false);
    const [expandedLabOrder, setExpandedLabOrder] = useState<string | null>(null);
    const [expandedDeliveryOrder, setExpandedDeliveryOrder] = useState<string | null>(null);

    const { data, loading, refetch } = useQuery<ActiveTrackingResponse>(GET_ACTIVE_TRACKING, {
        fetchPolicy: 'cache-and-network',
    });

    const labOrders = data?.activeTracking?.labOrders || [];
    const deliveryOrders = data?.activeTracking?.deliveryOrders || [];

    // Split into active and completed
    const activeLabOrders = labOrders.filter(isActiveLabOrder);
    const completedLabOrders = labOrders.filter((o) => !isActiveLabOrder(o));
    const activeDeliveryOrders = deliveryOrders.filter(isActiveDeliveryOrder);
    const completedDeliveryOrders = deliveryOrders.filter((o) => !isActiveDeliveryOrder(o));

    const hasActiveItems = activeLabOrders.length > 0 || activeDeliveryOrders.length > 0;
    const hasCompletedItems = completedLabOrders.length > 0 || completedDeliveryOrders.length > 0;
    const isEmpty = !hasActiveItems && !hasCompletedItems;

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        try {
            await refetch();
        } finally {
            setRefreshing(false);
        }
    }, [refetch]);

    if (loading && !data) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading your activity...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>My Activity</Text>
                    <Text style={styles.subtitle}>
                        Track your lab tests and deliveries
                    </Text>
                </View>

                {/* Empty state */}
                {isEmpty && (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconContainer}>
                            <Text style={styles.emptyIcon}>📋</Text>
                        </View>
                        <Text style={styles.emptyTitle}>No activity yet</Text>
                        <Text style={styles.emptyText}>
                            Once you start a consultation, you'll be able to track your lab tests and medication deliveries here.
                        </Text>
                    </View>
                )}

                {/* Active Items Section */}
                {hasActiveItems && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Active</Text>

                        {/* Active Lab Orders */}
                        {activeLabOrders.map((order) => (
                            <View key={order.id} style={styles.trackerContainer}>
                                {expandedLabOrder === order.id ? (
                                    <View>
                                        <TouchableOpacity
                                            style={styles.collapseButton}
                                            onPress={() => setExpandedLabOrder(null)}
                                        >
                                            <Text style={styles.collapseButtonText}>Collapse ↑</Text>
                                        </TouchableOpacity>
                                        <LabOrderTracker
                                            order={order}
                                            onReschedule={() => {/* TODO: Navigate to reschedule */}}
                                            onCancel={() => {/* TODO: Show cancel confirmation */}}
                                            onViewResults={() => {/* TODO: Open results PDF */}}
                                        />
                                    </View>
                                ) : (
                                    <TrackingCard
                                        type="lab"
                                        title="Blood Test"
                                        status={LAB_STATUS_LABELS[order.status]?.label || order.status}
                                        icon={LAB_STATUS_LABELS[order.status]?.icon || '🔬'}
                                        timestamp={order.orderedAt}
                                        onPress={() => setExpandedLabOrder(order.id)}
                                    />
                                )}
                            </View>
                        ))}

                        {/* Active Delivery Orders */}
                        {activeDeliveryOrders.map((order) => (
                            <View key={order.id} style={styles.trackerContainer}>
                                {expandedDeliveryOrder === order.id ? (
                                    <View>
                                        <TouchableOpacity
                                            style={styles.collapseButton}
                                            onPress={() => setExpandedDeliveryOrder(null)}
                                        >
                                            <Text style={styles.collapseButtonText}>Collapse ↑</Text>
                                        </TouchableOpacity>
                                        <DeliveryTracker
                                            order={order}
                                            onViewPrescription={() => {/* TODO: Open prescription PDF */}}
                                            onEnterOtp={() => {/* TODO: Show OTP input modal */}}
                                        />
                                    </View>
                                ) : (
                                    <TrackingCard
                                        type="delivery"
                                        title="Medication Delivery"
                                        status={DELIVERY_STATUS_LABELS[order.status]?.label || order.status}
                                        icon={DELIVERY_STATUS_LABELS[order.status]?.icon || '📦'}
                                        timestamp={order.prescriptionCreatedAt}
                                        onPress={() => setExpandedDeliveryOrder(order.id)}
                                    />
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* Completed Items Section */}
                {hasCompletedItems && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Completed</Text>

                        {/* Completed Lab Orders */}
                        {completedLabOrders.map((order) => (
                            <CompletedCard
                                key={order.id}
                                type="lab"
                                title="Blood Test"
                                date={order.orderedAt}
                                hasResults={!!order.resultFileUrl}
                                onViewResults={() => {/* TODO: Open results */}}
                            />
                        ))}

                        {/* Completed Delivery Orders */}
                        {completedDeliveryOrders.map((order) => (
                            <CompletedCard
                                key={order.id}
                                type="delivery"
                                title="Medication Delivery"
                                date={order.deliveredAt || order.prescriptionCreatedAt}
                            />
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

// Tracking Card Component (collapsed view)
function TrackingCard({
    type,
    title,
    status,
    icon,
    timestamp,
    onPress,
}: {
    type: 'lab' | 'delivery';
    title: string;
    status: string;
    icon: string;
    timestamp: string;
    onPress: () => void;
}) {
    const formattedDate = new Date(timestamp).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
    });

    return (
        <TouchableOpacity
            style={[
                styles.trackingCard,
                type === 'lab' ? styles.trackingCardLab : styles.trackingCardDelivery,
            ]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View style={styles.trackingCardIcon}>
                <Text style={styles.trackingCardIconText}>{icon}</Text>
            </View>
            <View style={styles.trackingCardContent}>
                <Text style={styles.trackingCardTitle}>{title}</Text>
                <Text style={styles.trackingCardStatus}>{status}</Text>
                <Text style={styles.trackingCardDate}>Started {formattedDate}</Text>
            </View>
            <Text style={styles.trackingCardArrow}>→</Text>
        </TouchableOpacity>
    );
}

// Completed Card Component
function CompletedCard({
    type,
    title,
    date,
    hasResults,
    onViewResults,
}: {
    type: 'lab' | 'delivery';
    title: string;
    date: string;
    hasResults?: boolean;
    onViewResults?: () => void;
}) {
    const formattedDate = new Date(date).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    return (
        <View style={styles.completedCard}>
            <Text style={styles.completedIcon}>{type === 'lab' ? '🔬' : '📦'}</Text>
            <View style={styles.completedContent}>
                <Text style={styles.completedTitle}>{title}</Text>
                <Text style={styles.completedDate}>{formattedDate}</Text>
            </View>
            {hasResults && onViewResults && (
                <TouchableOpacity style={styles.viewResultsLink} onPress={onViewResults}>
                    <Text style={styles.viewResultsLinkText}>View Results</Text>
                </TouchableOpacity>
            )}
        </View>
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
    loadingText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        marginTop: spacing.md,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.xxl,
    },
    header: {
        marginBottom: spacing.xl,
    },
    title: {
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        fontSize: 28,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    subtitle: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxxl,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    emptyIcon: {
        fontSize: 48,
    },
    emptyTitle: {
        ...typography.headingMedium,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    emptyText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.md,
    },
    trackerContainer: {
        marginBottom: spacing.md,
    },
    collapseButton: {
        alignSelf: 'flex-end',
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        marginBottom: spacing.sm,
    },
    collapseButtonText: {
        ...typography.bodySmall,
        color: colors.primary,
        fontWeight: '500',
    },
    trackingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    trackingCardLab: {
        borderLeftWidth: 4,
        borderLeftColor: colors.info,
    },
    trackingCardDelivery: {
        borderLeftWidth: 4,
        borderLeftColor: colors.success,
    },
    trackingCardIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    trackingCardIconText: {
        fontSize: 22,
    },
    trackingCardContent: {
        flex: 1,
    },
    trackingCardTitle: {
        ...typography.bodyMedium,
        fontWeight: '600',
        color: colors.text,
    },
    trackingCardStatus: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginTop: 2,
    },
    trackingCardDate: {
        ...typography.label,
        color: colors.textTertiary,
        marginTop: spacing.xs,
    },
    trackingCardArrow: {
        fontSize: 18,
        color: colors.textTertiary,
    },
    completedCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    completedIcon: {
        fontSize: 20,
        marginRight: spacing.md,
    },
    completedContent: {
        flex: 1,
    },
    completedTitle: {
        ...typography.bodyMedium,
        color: colors.text,
    },
    completedDate: {
        ...typography.bodySmall,
        color: colors.textTertiary,
    },
    viewResultsLink: {
        paddingHorizontal: spacing.sm,
    },
    viewResultsLinkText: {
        ...typography.bodySmall,
        color: colors.primary,
        fontWeight: '500',
    },
});
