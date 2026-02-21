import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@apollo/client';
import { colors, spacing, borderRadius, typography } from '@/theme';
import {
    GET_MY_LAB_ORDERS,
    GetMyLabOrdersResponse,
    PatientLabOrder,
} from '@/graphql/profile';

// Spec: Phase 11 — Patient-facing lab results screen

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    ORDERED: { label: 'Ordered', color: colors.textSecondary },
    SLOT_BOOKED: { label: 'Slot Booked', color: colors.accent },
    PHLEBOTOMIST_ASSIGNED: { label: 'Assigned', color: colors.accent },
    SAMPLE_COLLECTED: { label: 'Sample Collected', color: colors.accent },
    RECEIVED_AT_LAB: { label: 'At Lab', color: colors.accent },
    PROCESSING: { label: 'Processing', color: colors.accent },
    RESULTS_UPLOADED: { label: 'Results Ready', color: colors.success },
    RESULTS_READY: { label: 'Results Ready', color: colors.success },
    DOCTOR_REVIEWED: { label: 'Doctor Reviewed', color: colors.success },
    CLOSED: { label: 'Closed', color: colors.textTertiary },
};

export default function LabResultsScreen() {
    const router = useRouter();
    const { data, loading } = useQuery<GetMyLabOrdersResponse>(GET_MY_LAB_ORDERS);

    const labOrders = data?.myLabOrders || [];

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer} testID="lab-results-loading">
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const getStatusInfo = (status: string) => {
        return STATUS_LABELS[status] || { label: status, color: colors.textSecondary };
    };

    const getTestCount = (order: PatientLabOrder) => {
        const count = order.testPanel.length;
        return count === 1 ? '1 test' : `${count} tests`;
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>{'<'}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Lab Results</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {labOrders.length === 0 ? (
                    <View style={styles.emptyContainer} testID="lab-results-empty">
                        <Text style={styles.emptyTitle}>No Lab Orders</Text>
                        <Text style={styles.emptyText}>
                            Your lab results will appear here after your doctor orders blood work
                        </Text>
                    </View>
                ) : (
                    labOrders.map((order) => {
                        const statusInfo = getStatusInfo(order.status);
                        return (
                            <TouchableOpacity
                                key={order.id}
                                style={styles.labOrderCard}
                                testID={`lab-order-card-${order.id}`}
                                onPress={() => router.push(`/lab/${order.id}` as any)}
                            >
                                <View style={styles.cardHeader}>
                                    <Text style={styles.panelName}>
                                        {order.panelName || 'Lab Panel'}
                                    </Text>
                                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
                                        <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
                                            {statusInfo.label}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={styles.testCount}>
                                    {getTestCount(order)}
                                </Text>

                                <View style={styles.cardFooter}>
                                    <Text style={styles.dateText}>
                                        Ordered {formatDate(order.orderedAt)}
                                    </Text>
                                    {order.resultFileUrl && (
                                        <Text style={styles.viewResults}>View Results</Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })
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
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    emptyText: {
        ...typography.bodyMedium,
        color: colors.textTertiary,
        textAlign: 'center',
    },
    labOrderCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    panelName: {
        ...typography.bodyMedium,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    statusBadgeText: {
        ...typography.label,
        fontWeight: '600',
    },
    testCount: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    dateText: {
        ...typography.label,
        color: colors.textTertiary,
    },
    viewResults: {
        ...typography.label,
        color: colors.primary,
        fontWeight: '600',
    },
});
