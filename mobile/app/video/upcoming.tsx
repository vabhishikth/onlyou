import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from '@apollo/client';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme';
import {
    GET_MY_UPCOMING_VIDEO_SESSIONS,
    CANCEL_VIDEO_BOOKING,
    BOOKED_SLOT_STATUS_LABELS,
    type BookedSlot,
    type BookedSlotStatus,
} from '@/graphql/video';

// Spec: Phase 14 Chunk 3 — Upcoming video sessions screen

const STATUS_BADGE_CONFIG: Record<BookedSlotStatus, { bg: string; text: string }> = {
    BOOKED: { bg: colors.accentLight, text: colors.accent },
    CANCELLED: { bg: '#FEE2E2', text: colors.error },
    COMPLETED: { bg: '#DCFCE7', text: colors.success },
    NO_SHOW: { bg: '#FEF3C7', text: colors.warning },
};

export default function UpcomingVideoSessions() {
    const router = useRouter();

    const { data, loading, refetch } = useQuery(GET_MY_UPCOMING_VIDEO_SESSIONS, {
        fetchPolicy: 'cache-and-network',
    });

    const [cancelBooking] = useMutation(CANCEL_VIDEO_BOOKING, {
        onCompleted: () => {
            Alert.alert('Cancelled', 'Your video session has been cancelled.');
            refetch();
        },
        onError: (error) => Alert.alert('Error', error.message),
    });

    const sessions: BookedSlot[] = data?.myUpcomingVideoSessions || [];

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
        });
    };

    const formatTime = (timeStr: string) => {
        const date = new Date(timeStr);
        return date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    };

    const handleJoin = (videoSessionId: string) => {
        router.push(`/video/session/${videoSessionId}` as never);
    };

    const handleCancel = (bookedSlotId: string) => {
        Alert.alert(
            'Cancel Session',
            'Are you sure you want to cancel this video consultation?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: () => cancelBooking({
                        variables: { bookedSlotId, reason: 'Patient cancelled' },
                    }),
                },
            ],
        );
    };

    const handleReschedule = (consultationId: string) => {
        router.push(`/video/slots/${consultationId}` as never);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity
                    testID="back-button"
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.backText}>{'\u2190'}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Video Sessions</Text>
                <View style={styles.headerSpacer} />
            </View>

            {loading && !data ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator
                        testID="loading-indicator"
                        size="large"
                        color={colors.primary}
                    />
                </View>
            ) : sessions.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>{'\uD83D\uDCF9'}</Text>
                    <Text style={styles.emptyTitle}>No upcoming sessions</Text>
                    <Text style={styles.emptyText}>
                        When you book a video consultation, it will appear here.
                    </Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={false} onRefresh={refetch} />
                    }
                >
                    {sessions.map((session, index) => {
                        const status = session.status as BookedSlotStatus;
                        const statusLabel = BOOKED_SLOT_STATUS_LABELS[status]?.label || status;
                        const badgeConfig = STATUS_BADGE_CONFIG[status] || STATUS_BADGE_CONFIG.BOOKED;

                        return (
                            <Animated.View
                                key={session.id}
                                entering={FadeInUp.delay(100 + index * 50).duration(300)}
                            >
                                <View testID={`session-card-${session.id}`} style={styles.card}>
                                    <View style={styles.cardHeader}>
                                        <View style={styles.cardIconContainer}>
                                            <Text style={styles.cardIcon}>{'\uD83D\uDCF9'}</Text>
                                        </View>
                                        <View style={styles.cardInfo}>
                                            <Text style={styles.cardDate}>
                                                {formatDate(session.slotDate)}
                                            </Text>
                                            <Text style={styles.cardTime}>
                                                {formatTime(session.startTime)} - {formatTime(session.endTime)}
                                            </Text>
                                        </View>
                                        <View style={[styles.statusBadge, { backgroundColor: badgeConfig.bg }]}>
                                            <Text style={[styles.statusText, { color: badgeConfig.text }]}>
                                                {statusLabel}
                                            </Text>
                                        </View>
                                    </View>

                                    {status === 'BOOKED' && (
                                        <View style={styles.cardActions}>
                                            <TouchableOpacity
                                                style={styles.joinButton}
                                                onPress={() => handleJoin(session.videoSessionId)}
                                            >
                                                <Text style={styles.joinButtonText}>Join</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.actionButton}
                                                onPress={() => handleReschedule(session.consultationId)}
                                            >
                                                <Text style={styles.actionButtonText}>Reschedule</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.actionButton}
                                                onPress={() => handleCancel(session.id)}
                                            >
                                                <Text style={styles.cancelButtonText}>Cancel</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            </Animated.View>
                        );
                    })}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backText: {
        fontSize: 20,
        color: colors.text,
    },
    headerTitle: {
        ...typography.headingSmall,
        color: colors.text,
        flex: 1,
        textAlign: 'center',
    },
    headerSpacer: {
        width: 40,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    emptyText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.lg,
        gap: spacing.md,
    },
    card: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        ...shadows.md,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.accentLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    cardIcon: {
        fontSize: 22,
    },
    cardInfo: {
        flex: 1,
    },
    cardDate: {
        ...typography.bodySmall,
        fontWeight: '600',
        color: colors.text,
    },
    cardTime: {
        ...typography.label,
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
    cardActions: {
        flexDirection: 'row',
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: spacing.sm,
    },
    joinButton: {
        flex: 1,
        backgroundColor: colors.primary,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        ...shadows.sm,
    },
    joinButtonText: {
        ...typography.button,
        color: colors.primaryText,
        fontSize: 14,
    },
    actionButton: {
        flex: 1,
        backgroundColor: colors.surface,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        alignItems: 'center',
    },
    actionButtonText: {
        ...typography.buttonSmall,
        color: colors.text,
    },
    cancelButtonText: {
        ...typography.buttonSmall,
        color: colors.error,
    },
});
