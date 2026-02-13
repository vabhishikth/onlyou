/**
 * Orders Screen
 * PR 6: Remaining Screens Restyle
 * Clinical Luxe design system with Active/Past tabs
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    Pressable,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@apollo/client';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Package, TestTube2, ChevronRight } from 'lucide-react-native';

import { colors } from '@/theme/colors';
import { fontFamilies, fontSizes } from '@/theme/typography';
import { spacing, borderRadius, screenSpacing } from '@/theme/spacing';
import { GET_MY_ORDERS, MyOrdersResponse, Order } from '@/graphql/orders';

// Status badge config
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
    PENDING: { label: 'Processing', bg: colors.warningLight, text: colors.warning },
    CONFIRMED: { label: 'Confirmed', bg: colors.accentLight, text: colors.accent },
    DISPATCHED: { label: 'Shipped', bg: colors.accentLight, text: colors.accent },
    OUT_FOR_DELIVERY: { label: 'Out for Delivery', bg: colors.successLight, text: colors.success },
    DELIVERED: { label: 'Delivered', bg: colors.successLight, text: colors.success },
    CANCELLED: { label: 'Cancelled', bg: colors.errorLight, text: colors.error },
    // Lab statuses
    ORDERED: { label: 'Ordered', bg: colors.warningLight, text: colors.warning },
    SLOT_BOOKED: { label: 'Slot Booked', bg: colors.accentLight, text: colors.accent },
    SAMPLE_COLLECTED: { label: 'Sample Collected', bg: colors.accentLight, text: colors.accent },
    RESULTS_UPLOADED: { label: 'Results Ready', bg: colors.successLight, text: colors.success },
    DOCTOR_REVIEWED: { label: 'Reviewed', bg: colors.successLight, text: colors.success },
};

type TabType = 'active' | 'past';

export default function OrdersScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabType>('active');
    const [refreshing, setRefreshing] = useState(false);

    const { data, loading, refetch } = useQuery<MyOrdersResponse>(GET_MY_ORDERS, {
        fetchPolicy: 'cache-and-network',
    });

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await refetch();
        } finally {
            setRefreshing(false);
        }
    }, [refetch]);

    const activeOrders = data?.myOrders?.active || [];
    const pastOrders = data?.myOrders?.past || [];
    const currentOrders = activeTab === 'active' ? activeOrders : pastOrders;

    // Loading skeleton
    if (loading && !data) {
        return (
            <SafeAreaView style={styles.container} edges={['top']} testID="orders-screen">
                <View style={styles.header}>
                    <Text style={styles.title}>Orders</Text>
                </View>
                <View testID="loading-skeleton" style={styles.skeletonContainer}>
                    <View style={styles.skeletonToggle} />
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']} testID="orders-screen">
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.accent}
                        colors={[colors.accent]}
                    />
                }
            >
                {/* Header */}
                <Animated.View entering={FadeInUp.duration(300)} style={styles.header}>
                    <Text style={styles.title}>Orders</Text>
                </Animated.View>

                {/* Tab Toggle */}
                <Animated.View
                    entering={FadeInUp.delay(50).duration(300)}
                    testID="tab-toggle"
                    style={styles.tabToggle}
                >
                    <Pressable
                        testID="tab-active"
                        style={[styles.tab, activeTab === 'active' && styles.tabActive]}
                        onPress={() => setActiveTab('active')}
                    >
                        <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
                            Active
                        </Text>
                    </Pressable>
                    <Pressable
                        testID="tab-past"
                        style={[styles.tab, activeTab === 'past' && styles.tabActive]}
                        onPress={() => setActiveTab('past')}
                    >
                        <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>
                            Past
                        </Text>
                    </Pressable>
                </Animated.View>

                {/* Empty State */}
                {currentOrders.length === 0 && (
                    <Animated.View
                        entering={FadeInUp.delay(100).duration(300)}
                        style={styles.emptyState}
                        testID="empty-state"
                    >
                        <View style={styles.emptyIconContainer}>
                            <Package size={48} color={colors.textTertiary} />
                        </View>
                        <Text style={styles.emptyTitle}>No orders yet</Text>
                        <Text style={styles.emptyText}>
                            {activeTab === 'active'
                                ? 'Your active orders will appear here once you complete a consultation.'
                                : 'Your past orders will appear here after delivery.'}
                        </Text>
                    </Animated.View>
                )}

                {/* Order Cards */}
                {currentOrders.map((order, index) => (
                    <OrderCard key={order.id} order={order} delay={100 + index * 50} />
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

// Order Card Component
interface OrderCardProps {
    order: Order;
    delay?: number;
}

function OrderCard({ order, delay = 0 }: OrderCardProps) {
    const router = useRouter();
    const isLab = order.type === 'LAB';
    const Icon = isLab ? TestTube2 : Package;
    const statusConfig = STATUS_CONFIG[order.status] || { label: order.status, bg: colors.surface, text: colors.textSecondary };

    const getDateText = () => {
        if (order.status === 'DELIVERED' && order.deliveredAt) {
            return `Delivered ${formatDate(order.deliveredAt)}`;
        }
        if (order.status === 'DOCTOR_REVIEWED' && order.completedAt) {
            return `Completed ${formatDate(order.completedAt)}`;
        }
        if (order.estimatedDelivery) {
            return `Arriving by ${formatDate(order.estimatedDelivery)}`;
        }
        if (order.slotDate) {
            return `Scheduled ${formatDate(order.slotDate)}`;
        }
        return `Ordered ${formatDate(order.createdAt)}`;
    };

    return (
        <Animated.View entering={FadeInUp.delay(delay).duration(300)}>
            <Pressable
                testID={`order-card-${order.id}`}
                style={styles.orderCard}
                onPress={() => router.push(`/order/${order.id}` as never)}
            >
                <View style={styles.cardHeader}>
                    <View testID={`order-icon-${order.id}`} style={styles.iconContainer}>
                        <Icon size={22} color={colors.textSecondary} />
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                            {order.title}
                        </Text>
                        <View
                            testID={`status-badge-${order.id}`}
                            style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}
                        >
                            <Text style={[styles.statusText, { color: statusConfig.text }]}>
                                {statusConfig.label}
                            </Text>
                        </View>
                    </View>
                    <ChevronRight size={18} color={colors.textMuted} />
                </View>
                <Text style={styles.dateText}>{getDateText()}</Text>
            </Pressable>
        </Animated.View>
    );
}

// Skeleton card for loading state
function SkeletonCard() {
    return (
        <View style={styles.skeletonCard}>
            <View style={styles.skeletonIcon} />
            <View style={styles.skeletonContent}>
                <View style={styles.skeletonTitle} />
                <View style={styles.skeletonBadge} />
            </View>
        </View>
    );
}

// Date formatter
function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
    });
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: screenSpacing.horizontal,
        paddingTop: spacing.lg,
        paddingBottom: spacing['3xl'],
    },
    header: {
        marginBottom: spacing.xl,
    },
    title: {
        fontFamily: fontFamilies.serifSemiBold,
        fontSize: 28,
        color: colors.textPrimary,
        letterSpacing: -0.5,
    },

    // Tab Toggle
    tabToggle: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: 24,
        padding: 4,
        marginBottom: spacing.xl,
    },
    tab: {
        flex: 1,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        borderRadius: 20,
    },
    tabActive: {
        backgroundColor: colors.textPrimary,
    },
    tabText: {
        fontFamily: fontFamilies.sansMedium,
        fontSize: fontSizes.label,
        color: colors.textSecondary,
    },
    tabTextActive: {
        color: colors.white,
    },

    // Order Card
    orderCard: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 20,
        padding: 20,
        marginBottom: spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontFamily: fontFamilies.sansSemiBold,
        fontSize: fontSizes.body,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    statusText: {
        fontFamily: fontFamilies.sansMedium,
        fontSize: fontSizes.tiny,
    },
    dateText: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.label,
        color: colors.textTertiary,
        marginLeft: 40 + spacing.md, // Align with content
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing['4xl'],
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
    emptyTitle: {
        fontFamily: fontFamilies.serifSemiBold,
        fontSize: fontSizes.sectionH,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    emptyText: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.body,
        color: colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
        lineHeight: fontSizes.body * 1.5,
    },

    // Skeleton
    skeletonContainer: {
        paddingHorizontal: screenSpacing.horizontal,
        paddingTop: spacing.xl,
    },
    skeletonToggle: {
        width: '100%',
        height: 44,
        backgroundColor: colors.border,
        borderRadius: 24,
        marginBottom: spacing.xl,
    },
    skeletonCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 20,
        marginBottom: spacing.md,
    },
    skeletonIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.border,
        marginRight: spacing.md,
    },
    skeletonContent: {
        flex: 1,
    },
    skeletonTitle: {
        width: '70%',
        height: 18,
        backgroundColor: colors.border,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
    },
    skeletonBadge: {
        width: 60,
        height: 18,
        backgroundColor: colors.border,
        borderRadius: borderRadius.full,
    },
});
