import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from '@apollo/client';
import { colors, spacing, borderRadius, typography } from '@/theme';
import {
    GET_SUBSCRIPTIONS,
    PAUSE_SUBSCRIPTION,
    RESUME_SUBSCRIPTION,
    CANCEL_SUBSCRIPTION,
    GetSubscriptionsResponse,
    Subscription,
    formatAmount,
    VERTICAL_NAMES,
    SUBSCRIPTION_STATUS_LABELS,
} from '@/graphql/profile';

export default function SubscriptionsScreen() {
    const router = useRouter();

    const { data, loading, refetch } = useQuery<GetSubscriptionsResponse>(GET_SUBSCRIPTIONS);

    const [pauseSubscription] = useMutation(PAUSE_SUBSCRIPTION, {
        onCompleted: () => refetch(),
        onError: (error) => Alert.alert('Error', error.message),
    });

    const [resumeSubscription] = useMutation(RESUME_SUBSCRIPTION, {
        onCompleted: () => refetch(),
        onError: (error) => Alert.alert('Error', error.message),
    });

    const [cancelSubscription] = useMutation(CANCEL_SUBSCRIPTION, {
        onCompleted: () => {
            refetch();
            Alert.alert('Cancelled', 'Your subscription has been cancelled');
        },
        onError: (error) => Alert.alert('Error', error.message),
    });

    const subscriptions = data?.mySubscriptions || [];

    const handleToggle = (subscription: Subscription) => {
        const isPaused = subscription.status === 'PAUSED';
        Alert.alert(
            isPaused ? 'Resume Subscription' : 'Pause Subscription',
            isPaused
                ? 'Your subscription will be resumed and billing will continue.'
                : 'Your subscription will be paused. No charges until you resume.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: isPaused ? 'Resume' : 'Pause',
                    onPress: () => {
                        if (isPaused) {
                            resumeSubscription({
                                variables: { subscriptionId: subscription.id },
                            });
                        } else {
                            pauseSubscription({
                                variables: { subscriptionId: subscription.id },
                            });
                        }
                    },
                },
            ]
        );
    };

    const handleCancel = (subscription: Subscription) => {
        Alert.alert(
            'Cancel Subscription',
            'Are you sure? You will lose access to your treatment plan at the end of the current billing period.',
            [
                { text: 'Keep', style: 'cancel' },
                {
                    text: 'Cancel',
                    style: 'destructive',
                    onPress: () => {
                        cancelSubscription({
                            variables: {
                                input: {
                                    subscriptionId: subscription.id,
                                    reason: 'User cancelled from app',
                                },
                            },
                        });
                    },
                },
            ]
        );
    };

    const renderSubscription = (subscription: Subscription) => {
        const statusInfo = SUBSCRIPTION_STATUS_LABELS[subscription.status];
        const statusColor = colors[statusInfo.color as keyof typeof colors] || colors.textSecondary;
        const vertical = subscription.plan?.vertical || '';
        const planName = subscription.plan?.name || 'Treatment Plan';
        const amount = subscription.plan?.priceInPaise || 0;

        return (
            <View key={subscription.id} style={styles.subscriptionCard}>
                <View style={styles.subscriptionHeader}>
                    <View>
                        <Text style={styles.verticalName}>
                            {VERTICAL_NAMES[vertical] || vertical}
                        </Text>
                        <Text style={styles.planName}>{planName}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>
                            {statusInfo.label}
                        </Text>
                    </View>
                </View>

                <View style={styles.subscriptionDetails}>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Amount</Text>
                        <Text style={styles.detailValue}>
                            {formatAmount(amount)}/month
                        </Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Started</Text>
                        <Text style={styles.detailValue}>
                            {new Date(subscription.currentPeriodStart).toLocaleDateString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                            })}
                        </Text>
                    </View>

                    {subscription.currentPeriodEnd && subscription.status === 'ACTIVE' && (
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Renews on</Text>
                            <Text style={styles.detailValue}>
                                {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-IN', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                })}
                            </Text>
                        </View>
                    )}
                </View>

                {(subscription.status === 'ACTIVE' || subscription.status === 'PAUSED') && (
                    <View style={styles.subscriptionActions}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleToggle(subscription)}
                        >
                            <Text style={styles.actionButtonText}>
                                {subscription.status === 'PAUSED' ? 'Resume' : 'Pause'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, styles.actionButtonDanger]}
                            onPress={() => handleCancel(subscription)}
                        >
                            <Text style={styles.actionButtonTextDanger}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>{'<'}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Subscriptions</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {subscriptions.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>💳</Text>
                        <Text style={styles.emptyTitle}>No subscriptions</Text>
                        <Text style={styles.emptyText}>
                            After your doctor prescribes a treatment plan, your subscription will appear here
                        </Text>
                    </View>
                ) : (
                    subscriptions.map(renderSubscription)
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
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxxl,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: spacing.md,
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
    subscriptionCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    subscriptionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.md,
    },
    verticalName: {
        ...typography.headingSmall,
        color: colors.text,
    },
    planName: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    statusText: {
        ...typography.label,
        fontWeight: '600',
    },
    subscriptionDetails: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.xs,
    },
    detailLabel: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    detailValue: {
        ...typography.bodySmall,
        fontWeight: '600',
        color: colors.text,
    },
    subscriptionActions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    actionButton: {
        flex: 1,
        paddingVertical: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    actionButtonDanger: {
        borderColor: colors.error,
    },
    actionButtonText: {
        ...typography.buttonSmall,
        color: colors.text,
    },
    actionButtonTextDanger: {
        ...typography.buttonSmall,
        color: colors.error,
    },
});
