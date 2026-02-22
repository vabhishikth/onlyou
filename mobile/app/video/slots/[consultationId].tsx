import React, { useState, useMemo } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation } from '@apollo/client';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme';
import {
    GET_AVAILABLE_VIDEO_SLOTS,
    BOOK_VIDEO_SLOT,
    type AvailableSlotWindow,
} from '@/graphql/video';

// Spec: Phase 14 Chunk 4 — Video slot picker screen

export default function VideoSlotPicker() {
    const router = useRouter();
    const { consultationId } = useLocalSearchParams<{ consultationId: string }>();

    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<AvailableSlotWindow | null>(null);

    const { data, loading } = useQuery(GET_AVAILABLE_VIDEO_SLOTS, {
        variables: { consultationId },
        skip: !consultationId,
    });

    const [bookSlot, { loading: booking }] = useMutation(BOOK_VIDEO_SLOT, {
        onCompleted: () => {
            Alert.alert('Booked!', 'Your video consultation has been scheduled.', [
                { text: 'OK', onPress: () => router.push('/video/upcoming' as never) },
            ]);
        },
        onError: (error) => Alert.alert('Error', error.message),
    });

    const slotsData = data?.availableVideoSlots;
    const slots: AvailableSlotWindow[] = slotsData?.slots || [];
    const connectivityWarning: string = slotsData?.connectivityWarning || '';

    // Group slots by date
    const groupedSlots = useMemo(() => {
        const grouped: Record<string, AvailableSlotWindow[]> = {};
        slots.forEach((slot) => {
            if (!grouped[slot.date]) {
                grouped[slot.date] = [];
            }
            grouped[slot.date].push(slot);
        });
        return grouped;
    }, [slots]);

    const dates = useMemo(() => Object.keys(groupedSlots).sort(), [groupedSlots]);

    // Auto-select first date
    const activeDate = selectedDate || dates[0] || null;

    const activeDateSlots = activeDate ? (groupedSlots[activeDate] || []) : [];

    const formatDateTab = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00');
        const day = date.getDate();
        const month = date.toLocaleDateString('en-IN', { month: 'short' });
        const weekday = date.toLocaleDateString('en-IN', { weekday: 'short' });
        return { day, month, weekday };
    };

    const handleConfirm = () => {
        if (!selectedSlot || !consultationId) return;
        bookSlot({
            variables: {
                consultationId,
                slotDate: selectedSlot.date,
                startTime: selectedSlot.startTime,
            },
        });
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
                <Text style={styles.headerTitle}>Pick a Slot</Text>
                <View style={styles.headerSpacer} />
            </View>

            {connectivityWarning ? (
                <Animated.View entering={FadeInUp.delay(50).duration(300)}>
                    <View style={styles.warningBanner}>
                        <Text style={styles.warningIcon}>{'\u26A0\uFE0F'}</Text>
                        <Text style={styles.warningText}>{connectivityWarning}</Text>
                    </View>
                </Animated.View>
            ) : null}

            {loading && !data ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator
                        testID="loading-indicator"
                        size="large"
                        color={colors.primary}
                    />
                </View>
            ) : slots.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>{'\uD83D\uDCC5'}</Text>
                    <Text style={styles.emptyTitle}>No slots available</Text>
                    <Text style={styles.emptyText}>
                        Your doctor has not set availability yet. Please check back later.
                    </Text>
                </View>
            ) : (
                <>
                    {/* Date tabs */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.dateTabsContainer}
                        contentContainerStyle={styles.dateTabsContent}
                    >
                        {dates.map((date) => {
                            const { day, month, weekday } = formatDateTab(date);
                            const isActive = date === activeDate;
                            return (
                                <TouchableOpacity
                                    key={date}
                                    style={[styles.dateTab, isActive && styles.dateTabActive]}
                                    onPress={() => {
                                        setSelectedDate(date);
                                        setSelectedSlot(null);
                                    }}
                                >
                                    <Text style={[styles.dateTabWeekday, isActive && styles.dateTabTextActive]}>
                                        {weekday}
                                    </Text>
                                    <Text style={[styles.dateTabDay, isActive && styles.dateTabTextActive]}>
                                        {day}
                                    </Text>
                                    <Text style={[styles.dateTabMonth, isActive && styles.dateTabTextActive]}>
                                        {month}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Time slot chips */}
                    <ScrollView
                        style={styles.slotsContainer}
                        contentContainerStyle={styles.slotsContent}
                    >
                        <Text style={styles.slotsLabel}>Available Times</Text>
                        <View style={styles.slotsGrid}>
                            {activeDateSlots.map((slot) => {
                                const isSelected =
                                    selectedSlot?.date === slot.date &&
                                    selectedSlot?.startTime === slot.startTime;
                                return (
                                    <TouchableOpacity
                                        key={`${slot.date}-${slot.startTime}`}
                                        style={[styles.slotChip, isSelected && styles.slotChipSelected]}
                                        onPress={() => setSelectedSlot(slot)}
                                    >
                                        <Text style={[styles.slotChipText, isSelected && styles.slotChipTextSelected]}>
                                            {slot.startTime}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>

                    {/* Confirm button */}
                    <View style={styles.footer}>
                        {selectedSlot && (
                            <Text style={styles.selectedSummary}>
                                {formatDateTab(selectedSlot.date).weekday},{' '}
                                {formatDateTab(selectedSlot.date).day}{' '}
                                {formatDateTab(selectedSlot.date).month} at{' '}
                                {selectedSlot.startTime}
                            </Text>
                        )}
                        <TouchableOpacity
                            style={[
                                styles.confirmButton,
                                !selectedSlot && styles.confirmButtonDisabled,
                            ]}
                            onPress={handleConfirm}
                            disabled={!selectedSlot || booking}
                        >
                            {booking ? (
                                <ActivityIndicator color={colors.primaryText} />
                            ) : (
                                <Text style={styles.confirmButtonText}>
                                    Confirm Booking
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </>
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
    warningBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
    },
    warningIcon: {
        fontSize: 18,
        marginRight: spacing.sm,
    },
    warningText: {
        ...typography.bodySmall,
        color: colors.warning,
        flex: 1,
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
    dateTabsContainer: {
        maxHeight: 90,
    },
    dateTabsContent: {
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
    },
    dateTab: {
        width: 64,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.xl,
        backgroundColor: colors.surface,
        alignItems: 'center',
    },
    dateTabActive: {
        backgroundColor: colors.primary,
    },
    dateTabWeekday: {
        ...typography.label,
        color: colors.textSecondary,
        fontSize: 11,
    },
    dateTabDay: {
        ...typography.headingSmall,
        color: colors.text,
        fontSize: 20,
    },
    dateTabMonth: {
        ...typography.label,
        color: colors.textSecondary,
        fontSize: 11,
    },
    dateTabTextActive: {
        color: colors.primaryText,
    },
    slotsContainer: {
        flex: 1,
    },
    slotsContent: {
        padding: spacing.lg,
    },
    slotsLabel: {
        ...typography.bodySmall,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    slotsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    slotChip: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.full,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    slotChipSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    slotChipText: {
        ...typography.bodySmall,
        fontWeight: '600',
        color: colors.text,
    },
    slotChipTextSelected: {
        color: colors.primaryText,
    },
    footer: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    selectedSummary: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    confirmButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.md,
    },
    confirmButtonDisabled: {
        backgroundColor: colors.border,
    },
    confirmButtonText: {
        ...typography.button,
        color: colors.primaryText,
    },
});
