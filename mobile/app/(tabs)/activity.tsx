/**
 * Activity Screen
 * PR 6: Remaining Screens Restyle
 * Clinical Luxe design system with status steppers
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
import { useQuery } from '@apollo/client';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
    Package,
    TestTube2,
    ChevronRight,
    Sparkles,
    Heart,
    Flower2,
    Scale,
    Stethoscope,
} from 'lucide-react-native';

import { colors } from '@/theme/colors';
import { fontFamilies, fontSizes, textStyles } from '@/theme/typography';
import { spacing, borderRadius, screenSpacing } from '@/theme/spacing';
import { PremiumButton } from '@/components/ui';
import {
    GET_ACTIVE_TRACKING,
    ActiveTrackingResponse,
    LabOrder,
    Order,
} from '@/graphql/tracking';
import { GET_MY_CONSULTATIONS, Consultation } from '@/graphql/intake';

// Treatment vertical config
const TREATMENT_CONFIG: Record<string, { label: string; tint: string; iconColor: string; Icon: React.FC<{ size: number; color: string }> }> = {
    HAIR_LOSS: { label: 'Hair Loss', tint: colors.hairLossTint, iconColor: colors.hairLossIcon, Icon: Sparkles },
    SEXUAL_HEALTH: { label: 'Sexual Health', tint: colors.sexualHealthTint, iconColor: colors.sexualHealthIcon, Icon: Heart },
    PCOS: { label: 'PCOS', tint: colors.pcosTint, iconColor: colors.pcosIcon, Icon: Flower2 },
    WEIGHT_MANAGEMENT: { label: 'Weight', tint: colors.weightTint, iconColor: colors.weightIcon, Icon: Scale },
};

// Lab order status steps
const LAB_ORDER_STEPS = [
    { key: 'ORDERED', label: 'Ordered' },
    { key: 'SLOT_BOOKED', label: 'Slot Booked' },
    { key: 'PHLEBOTOMIST_ASSIGNED', label: 'Assigned' },
    { key: 'SAMPLE_COLLECTED', label: 'Collected' },
    { key: 'RESULTS_UPLOADED', label: 'Results Ready' },
    { key: 'DOCTOR_REVIEWED', label: 'Reviewed' },
];

// Delivery order status steps
const DELIVERY_ORDER_STEPS = [
    { key: 'PENDING', label: 'Processing' },
    { key: 'CONFIRMED', label: 'Confirmed' },
    { key: 'DISPATCHED', label: 'Shipped' },
    { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
    { key: 'DELIVERED', label: 'Delivered' },
];

// Consultation status steps (patient-facing)
const CONSULTATION_STEPS = [
    { key: 'PENDING_ASSESSMENT', label: 'Submitted' },
    { key: 'AI_REVIEWED', label: 'AI Reviewed' },
    { key: 'DOCTOR_REVIEWING', label: 'Doctor Reviewing' },
    { key: 'VIDEO_SCHEDULED', label: 'Video Scheduled' },
    { key: 'VIDEO_COMPLETED', label: 'Video Complete' },
    { key: 'APPROVED', label: 'Approved' },
];

// Consultation status label for patient
const CONSULTATION_STATUS_LABELS: Record<string, string> = {
    PENDING_ASSESSMENT: 'Your assessment is being reviewed',
    AI_REVIEWED: 'AI review complete, awaiting doctor',
    DOCTOR_REVIEWING: 'A doctor is reviewing your case',
    VIDEO_SCHEDULED: 'Video consultation scheduled',
    VIDEO_COMPLETED: 'Video complete, awaiting prescription',
    AWAITING_LABS: 'Lab tests required before prescription',
    APPROVED: 'Treatment plan approved',
    NEEDS_INFO: 'Doctor needs additional information',
    REJECTED: 'Consultation closed',
};

function isActiveConsultation(c: Consultation): boolean {
    return !['APPROVED', 'REJECTED'].includes(c.status);
}

// Filter helpers
function isActiveLabOrder(order: LabOrder): boolean {
    return !['CLOSED', 'CANCELLED', 'EXPIRED', 'DOCTOR_REVIEWED'].includes(order.status);
}

function isActiveDeliveryOrder(order: Order): boolean {
    return !['DELIVERED', 'CANCELLED'].includes(order.status);
}

function getStepIndex(status: string, steps: { key: string }[]): number {
    return steps.findIndex(s => s.key === status);
}

export default function ActivityScreen() {
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

    const { data, loading, refetch } = useQuery<ActiveTrackingResponse>(GET_ACTIVE_TRACKING, {
        fetchPolicy: 'cache-and-network',
    });

    const { data: consultData, refetch: refetchConsultations } = useQuery<{ myConsultations: Consultation[] }>(GET_MY_CONSULTATIONS, {
        fetchPolicy: 'cache-and-network',
    });

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([refetch(), refetchConsultations()]);
        } finally {
            setRefreshing(false);
        }
    }, [refetch, refetchConsultations]);

    const toggleExpand = (id: string) => {
        setExpandedCards(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const labOrders = data?.activeTracking?.labOrders || [];
    const deliveryOrders = data?.activeTracking?.deliveryOrders || [];
    const consultations = consultData?.myConsultations || [];

    const activeConsultations = consultations.filter(isActiveConsultation);
    const activeLabOrders = labOrders.filter(isActiveLabOrder);
    const completedLabOrders = labOrders.filter(o => !isActiveLabOrder(o));
    const activeDeliveryOrders = deliveryOrders.filter(isActiveDeliveryOrder);
    const completedDeliveryOrders = deliveryOrders.filter(o => !isActiveDeliveryOrder(o));

    const hasActiveItems = activeConsultations.length > 0 || activeLabOrders.length > 0 || activeDeliveryOrders.length > 0;
    const hasCompletedItems = completedLabOrders.length > 0 || completedDeliveryOrders.length > 0;
    const isEmpty = !hasActiveItems && !hasCompletedItems;

    // Loading skeleton
    if (loading && !data) {
        return (
            <SafeAreaView style={styles.container} edges={['top']} testID="activity-screen">
                <View style={styles.content}>
                    <Text style={styles.title}>Activity</Text>
                    <View testID="loading-skeleton" style={styles.skeletonContainer}>
                        <SkeletonCard />
                        <SkeletonCard />
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']} testID="activity-screen">
            <ScrollView
                testID="activity-scroll-view"
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
                    <Text style={styles.title}>Activity</Text>
                </Animated.View>

                {/* Empty State */}
                {isEmpty && (
                    <Animated.View
                        entering={FadeInUp.delay(100).duration(300)}
                        style={styles.emptyState}
                        testID="empty-state"
                    >
                        <View style={styles.emptyIconContainer}>
                            <Package size={48} color={colors.textTertiary} />
                        </View>
                        <Text style={styles.emptyTitle}>No active orders yet</Text>
                        <Text style={styles.emptyText}>
                            Start a consultation to track your lab tests and medication deliveries here.
                        </Text>
                        <PremiumButton
                            testID="start-consultation-button"
                            variant="secondary"
                            onPress={() => router.push('/(tabs)' as never)}
                            style={styles.emptyButton}
                        >
                            Start a consultation
                        </PremiumButton>
                    </Animated.View>
                )}

                {/* Active Section */}
                {hasActiveItems && (
                    <Animated.View
                        entering={FadeInUp.delay(100).duration(300)}
                        style={styles.section}
                        testID="active-section"
                    >
                        <Text style={styles.sectionTitle}>Active</Text>

                        {/* Active Consultations */}
                        {activeConsultations.map((consultation, index) => (
                            <ConsultationCard
                                key={consultation.id}
                                consultation={consultation}
                                delay={index * 50}
                            />
                        ))}

                        {/* Active Lab Orders */}
                        {activeLabOrders.map((order, index) => (
                            <TrackingCard
                                key={order.id}
                                order={order}
                                type="lab"
                                expanded={expandedCards.has(order.id)}
                                onToggle={() => toggleExpand(order.id)}
                                delay={index * 50}
                            />
                        ))}

                        {/* Active Delivery Orders */}
                        {activeDeliveryOrders.map((order, index) => (
                            <TrackingCard
                                key={order.id}
                                order={order}
                                type="delivery"
                                expanded={expandedCards.has(order.id)}
                                onToggle={() => toggleExpand(order.id)}
                                delay={(activeLabOrders.length + index) * 50}
                            />
                        ))}
                    </Animated.View>
                )}

                {/* Completed Section */}
                {hasCompletedItems && (
                    <Animated.View
                        entering={FadeInUp.delay(200).duration(300)}
                        style={styles.section}
                        testID="completed-section"
                    >
                        <Text style={styles.sectionTitle}>Completed</Text>

                        {/* Completed Lab Orders */}
                        {completedLabOrders.map(order => (
                            <CompletedCard
                                key={order.id}
                                order={order}
                                type="lab"
                                expanded={expandedCards.has(order.id)}
                                onToggle={() => toggleExpand(order.id)}
                            />
                        ))}

                        {/* Completed Delivery Orders */}
                        {completedDeliveryOrders.map(order => (
                            <CompletedCard
                                key={order.id}
                                order={order}
                                type="delivery"
                                expanded={expandedCards.has(order.id)}
                                onToggle={() => toggleExpand(order.id)}
                            />
                        ))}
                    </Animated.View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

// Skeleton shimmer card
function SkeletonCard() {
    return (
        <View style={styles.skeletonCard}>
            <View style={styles.skeletonBadge} />
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonStepper}>
                <View style={styles.skeletonDot} />
                <View style={styles.skeletonLine} />
                <View style={styles.skeletonDot} />
                <View style={styles.skeletonLine} />
                <View style={styles.skeletonDot} />
            </View>
        </View>
    );
}

// Tracking Card Component (active items with status stepper)
interface TrackingCardProps {
    order: LabOrder | Order;
    type: 'lab' | 'delivery';
    expanded: boolean;
    onToggle: () => void;
    delay?: number;
}

function TrackingCard({ order, type, expanded, onToggle, delay = 0 }: TrackingCardProps) {
    const steps = type === 'lab' ? LAB_ORDER_STEPS : DELIVERY_ORDER_STEPS;
    const currentStepIndex = getStepIndex(order.status, steps);

    // Treatment config (for delivery orders)
    const treatment = type === 'delivery' && 'treatmentType' in order
        ? TREATMENT_CONFIG[order.treatmentType] || TREATMENT_CONFIG.HAIR_LOSS
        : null;

    const Icon = type === 'lab' ? TestTube2 : Package;
    const title = type === 'lab'
        ? ('panelName' in order ? order.panelName : 'Blood Test')
        : 'Medication Delivery';

    return (
        <Animated.View entering={FadeInUp.delay(delay).duration(300)}>
            <Pressable
                testID={`tracking-card-${order.id}`}
                style={styles.trackingCard}
                onPress={onToggle}
            >
                {/* Treatment Badge */}
                {treatment && (
                    <View
                        testID={`treatment-badge-${order.id}`}
                        style={[styles.treatmentBadge, { backgroundColor: treatment.tint }]}
                    >
                        <treatment.Icon size={12} color={treatment.iconColor} />
                        <Text style={[styles.treatmentBadgeText, { color: treatment.iconColor }]}>
                            {treatment.label}
                        </Text>
                    </View>
                )}

                {/* Card Header */}
                <View style={styles.cardHeader}>
                    <View style={styles.cardIconContainer}>
                        <Icon size={22} color={colors.textSecondary} />
                    </View>
                    <View style={styles.cardHeaderContent}>
                        <Text style={styles.cardTitle}>{title}</Text>
                        <Text style={styles.cardSubtitle}>
                            {type === 'lab' && 'slotDate' in order && order.slotDate
                                ? `Scheduled: ${formatDate(order.slotDate)}`
                                : type === 'delivery' && 'estimatedDelivery' in order && order.estimatedDelivery
                                    ? `Expected: ${formatDate(order.estimatedDelivery)}`
                                    : `Started: ${formatDate(order.orderedAt || order.prescriptionCreatedAt)}`}
                        </Text>
                    </View>
                    <ChevronRight
                        size={20}
                        color={colors.textTertiary}
                        style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}
                    />
                </View>

                {/* Status Stepper */}
                <View testID={`status-stepper-${order.id}`} style={styles.statusStepper}>
                    <View testID={`step-indicator-${order.id}`} style={styles.stepperTimeline}>
                        {steps.slice(0, expanded ? steps.length : 4).map((step, index) => {
                            const isCompleted = index < currentStepIndex;
                            const isCurrent = index === currentStepIndex;
                            const isUpcoming = index > currentStepIndex;

                            return (
                                <View key={step.key} style={styles.stepRow}>
                                    {/* Vertical Line (above) */}
                                    {index > 0 && (
                                        <View style={[
                                            styles.stepLineAbove,
                                            isCompleted || isCurrent ? styles.stepLineCompleted : styles.stepLineUpcoming,
                                        ]} />
                                    )}

                                    {/* Step Dot */}
                                    <View style={[
                                        styles.stepDot,
                                        isCompleted && styles.stepDotCompleted,
                                        isCurrent && styles.stepDotCurrent,
                                        isUpcoming && styles.stepDotUpcoming,
                                    ]}>
                                        {isCurrent && <View style={styles.stepDotPulse} />}
                                    </View>

                                    {/* Step Label */}
                                    <View style={styles.stepContent}>
                                        <Text style={[
                                            styles.stepLabel,
                                            isCurrent && styles.stepLabelCurrent,
                                            isUpcoming && styles.stepLabelUpcoming,
                                        ]}>
                                            {step.label}
                                        </Text>
                                        {isCurrent && (
                                            <Text style={styles.stepTimestamp}>
                                                In progress
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
}

// Completed Card Component
interface CompletedCardProps {
    order: LabOrder | Order;
    type: 'lab' | 'delivery';
    expanded: boolean;
    onToggle: () => void;
}

function CompletedCard({ order, type, expanded, onToggle }: CompletedCardProps) {
    const Icon = type === 'lab' ? TestTube2 : Package;
    const title = type === 'lab' ? 'Blood Test' : 'Medication Delivery';
    const completedDate = type === 'delivery' && 'deliveredAt' in order
        ? order.deliveredAt
        : order.orderedAt || ('prescriptionCreatedAt' in order ? order.prescriptionCreatedAt : '');

    return (
        <Pressable
            testID={`completed-card-${order.id}`}
            style={styles.completedCard}
            onPress={onToggle}
        >
            <View style={styles.completedIconContainer}>
                <Icon size={20} color={colors.textTertiary} />
            </View>
            <View style={styles.completedContent}>
                <Text style={styles.completedTitle}>{title}</Text>
                <Text style={styles.completedDate}>
                    Completed {formatDate(completedDate)}
                </Text>
            </View>
            <ChevronRight
                size={18}
                color={colors.textMuted}
                style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}
            />
        </Pressable>
    );
}

// Consultation Card Component
interface ConsultationCardProps {
    consultation: Consultation;
    delay?: number;
}

function ConsultationCard({ consultation, delay = 0 }: ConsultationCardProps) {
    const treatment = TREATMENT_CONFIG[consultation.vertical] || TREATMENT_CONFIG.HAIR_LOSS;
    const steps = CONSULTATION_STEPS;
    const currentStepIndex = getStepIndex(consultation.status, steps);
    const statusLabel = CONSULTATION_STATUS_LABELS[consultation.status] || consultation.status;

    return (
        <Animated.View entering={FadeInUp.delay(delay).duration(300)}>
            <View
                testID={`consultation-card-${consultation.id}`}
                style={styles.trackingCard}
            >
                {/* Treatment Badge */}
                <View
                    style={[styles.treatmentBadge, { backgroundColor: treatment.tint }]}
                >
                    <treatment.Icon size={12} color={treatment.iconColor} />
                    <Text style={[styles.treatmentBadgeText, { color: treatment.iconColor }]}>
                        {treatment.label}
                    </Text>
                </View>

                {/* Card Header */}
                <View style={styles.cardHeader}>
                    <View style={styles.cardIconContainer}>
                        <Stethoscope size={22} color={colors.textSecondary} />
                    </View>
                    <View style={styles.cardHeaderContent}>
                        <Text style={styles.cardTitle}>Consultation</Text>
                        <Text style={styles.cardSubtitle}>{statusLabel}</Text>
                    </View>
                </View>

                {/* Status Stepper */}
                <View testID={`consultation-stepper-${consultation.id}`} style={styles.statusStepper}>
                    <View style={styles.stepperTimeline}>
                        {steps.map((step, index) => {
                            const isCompleted = index < currentStepIndex;
                            const isCurrent = index === currentStepIndex;
                            const isUpcoming = index > currentStepIndex;

                            return (
                                <View key={step.key} style={styles.stepRow}>
                                    {index > 0 && (
                                        <View style={[
                                            styles.stepLineAbove,
                                            isCompleted || isCurrent ? styles.stepLineCompleted : styles.stepLineUpcoming,
                                        ]} />
                                    )}
                                    <View style={[
                                        styles.stepDot,
                                        isCompleted && styles.stepDotCompleted,
                                        isCurrent && styles.stepDotCurrent,
                                        isUpcoming && styles.stepDotUpcoming,
                                    ]}>
                                        {isCurrent && <View style={styles.stepDotPulse} />}
                                    </View>
                                    <View style={styles.stepContent}>
                                        <Text style={[
                                            styles.stepLabel,
                                            isCurrent && styles.stepLabelCurrent,
                                            isUpcoming && styles.stepLabelUpcoming,
                                        ]}>
                                            {step.label}
                                        </Text>
                                        {isCurrent && (
                                            <Text style={styles.stepTimestamp}>
                                                In progress
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </View>
            </View>
        </Animated.View>
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
    content: {
        flex: 1,
        paddingHorizontal: screenSpacing.horizontal,
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
        marginBottom: spacing['2xl'],
    },
    title: {
        fontFamily: fontFamilies.serifSemiBold,
        fontSize: 28,
        color: colors.textPrimary,
        letterSpacing: -0.5,
    },
    section: {
        marginBottom: spacing['2xl'],
    },
    sectionTitle: {
        fontFamily: fontFamilies.sansMedium,
        fontSize: fontSizes.label,
        color: colors.textTertiary,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: spacing.md,
    },

    // Tracking Card
    trackingCard: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 20,
        padding: 20,
        marginBottom: spacing.md,
    },
    treatmentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        marginBottom: spacing.md,
        gap: 4,
    },
    treatmentBadgeText: {
        fontFamily: fontFamilies.sansMedium,
        fontSize: fontSizes.tiny,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    cardIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    cardHeaderContent: {
        flex: 1,
    },
    cardTitle: {
        fontFamily: fontFamilies.sansSemiBold,
        fontSize: fontSizes.body,
        color: colors.textPrimary,
    },
    cardSubtitle: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.label,
        color: colors.textTertiary,
        marginTop: 2,
    },

    // Status Stepper
    statusStepper: {
        paddingLeft: 4,
    },
    stepperTimeline: {
        position: 'relative',
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: spacing.md,
        position: 'relative',
    },
    stepLineAbove: {
        position: 'absolute',
        left: 3,
        top: -spacing.md,
        width: 2,
        height: spacing.md,
    },
    stepLineCompleted: {
        backgroundColor: colors.success,
    },
    stepLineUpcoming: {
        backgroundColor: colors.border,
        borderStyle: 'dashed',
    },
    stepDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: spacing.md,
        marginTop: 5,
    },
    stepDotCompleted: {
        backgroundColor: colors.success,
    },
    stepDotCurrent: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.textPrimary,
        marginRight: spacing.md - 1,
    },
    stepDotUpcoming: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    stepDotPulse: {
        // Subtle glow effect placeholder
    },
    stepContent: {
        flex: 1,
    },
    stepLabel: {
        fontFamily: fontFamilies.sansMedium,
        fontSize: fontSizes.label,
        color: colors.textPrimary,
    },
    stepLabelCurrent: {
        fontFamily: fontFamilies.sansSemiBold,
    },
    stepLabelUpcoming: {
        color: colors.textTertiary,
    },
    stepTimestamp: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.caption,
        color: colors.textTertiary,
        marginTop: 2,
    },

    // Completed Card
    completedCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    completedIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    completedContent: {
        flex: 1,
    },
    completedTitle: {
        fontFamily: fontFamilies.sansMedium,
        fontSize: fontSizes.body,
        color: colors.textTertiary,
    },
    completedDate: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.label,
        color: colors.textMuted,
        marginTop: 2,
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
        marginBottom: spacing.xl,
    },
    emptyButton: {
        minWidth: 200,
    },

    // Skeleton
    skeletonContainer: {
        paddingTop: spacing.xl,
    },
    skeletonCard: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 20,
        marginBottom: spacing.md,
    },
    skeletonBadge: {
        width: 80,
        height: 20,
        backgroundColor: colors.border,
        borderRadius: borderRadius.full,
        marginBottom: spacing.md,
    },
    skeletonTitle: {
        width: '60%',
        height: 20,
        backgroundColor: colors.border,
        borderRadius: borderRadius.md,
        marginBottom: spacing.lg,
    },
    skeletonStepper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    skeletonDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.border,
    },
    skeletonLine: {
        width: 40,
        height: 2,
        backgroundColor: colors.border,
        marginHorizontal: spacing.sm,
    },
});
