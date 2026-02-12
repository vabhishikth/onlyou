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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from '@apollo/client';
import { colors, spacing, borderRadius, typography, shadows } from '@/styles/theme';
import {
    GET_LAB_ORDER,
    GET_AVAILABLE_SLOTS,
    BOOK_LAB_SLOT,
    LabOrder,
    LabSlot,
    GetAvailableSlotsResponse,
} from '@/graphql/tracking';

// Generate date range for next 7 days
function getDateRange(): { startDate: Date; endDate: Date; dates: Date[] } {
    const dates: Date[] = [];
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    // Start from tomorrow
    startDate.setDate(startDate.getDate() + 1);

    for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        dates.push(date);
    }

    const lastDate = dates[dates.length - 1];
    const endDate = lastDate ? new Date(lastDate) : new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate, dates };
}

function formatDateHeader(date: Date): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow';
    }

    return date.toLocaleDateString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
}

function formatTimeSlot(startTime: string, endTime: string): string {
    return `${startTime} - ${endTime}`;
}

interface GroupedSlots {
    [dateKey: string]: LabSlot[];
}

export default function LabBookingScreen() {
    const { labOrderId } = useLocalSearchParams<{ labOrderId: string }>();
    const router = useRouter();
    const [selectedSlot, setSelectedSlot] = useState<LabSlot | null>(null);

    const { startDate, endDate, dates } = useMemo(() => getDateRange(), []);

    // Fetch lab order details
    const { data: orderData, loading: orderLoading } = useQuery(GET_LAB_ORDER, {
        variables: { id: labOrderId },
        skip: !labOrderId,
    });

    const labOrder: LabOrder | undefined = orderData?.labOrder;

    // Fetch available slots
    const { data: slotsData, loading: slotsLoading } = useQuery<GetAvailableSlotsResponse>(
        GET_AVAILABLE_SLOTS,
        {
            variables: {
                city: labOrder?.collectionAddress?.split(',').pop()?.trim() || 'Mumbai',
                pincode: '400001', // TODO: Get from user profile
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            },
            skip: !labOrder,
        }
    );

    // Book slot mutation
    const [bookSlot, { loading: booking }] = useMutation(BOOK_LAB_SLOT, {
        onCompleted: () => {
            Alert.alert(
                'Slot Booked',
                'Your blood test collection has been scheduled. A phlebotomist will be assigned soon.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        },
        onError: (error) => {
            Alert.alert('Booking Failed', error.message);
        },
    });

    // Group slots by date
    const groupedSlots = useMemo<GroupedSlots>(() => {
        const slots = slotsData?.availableSlots || [];
        const grouped: GroupedSlots = {};

        slots.forEach((slot) => {
            const dateKey = new Date(slot.date).toDateString();
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(slot);
        });

        return grouped;
    }, [slotsData]);

    const handleBookSlot = async () => {
        if (!selectedSlot || !labOrderId) return;

        await bookSlot({
            variables: {
                labOrderId,
                slotId: selectedSlot.id,
            },
            refetchQueries: ['GetActiveTracking', 'GetLabOrder'],
        });
    };

    if (orderLoading || slotsLoading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading available slots...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!labOrder) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Lab order not found</Text>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backArrow} onPress={() => router.back()}>
                    <Text style={styles.backArrowText}>{'<'}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Schedule Collection</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Lab Order Summary */}
                <View style={styles.orderCard}>
                    <View style={styles.orderIcon}>
                        <Text style={styles.orderIconText}>🔬</Text>
                    </View>
                    <View style={styles.orderContent}>
                        <Text style={styles.orderTitle}>{labOrder.panelName || 'Blood Tests'}</Text>
                        <Text style={styles.orderTests}>
                            {labOrder.testPanel.slice(0, 3).join(', ')}
                            {labOrder.testPanel.length > 3 ? ` +${labOrder.testPanel.length - 3} more` : ''}
                        </Text>
                    </View>
                </View>

                {/* Instructions */}
                <View style={styles.instructionCard}>
                    <Text style={styles.instructionIcon}>💡</Text>
                    <Text style={styles.instructionText}>
                        Choose a morning slot (6-10 AM) for fasting blood tests. Our phlebotomist will call 30 minutes before arrival.
                    </Text>
                </View>

                {/* Date & Slot Selection */}
                <Text style={styles.sectionTitle}>Select a slot</Text>

                {dates.map((date) => {
                    const dateKey = date.toDateString();
                    const daySlots = groupedSlots[dateKey] || [];

                    return (
                        <View key={dateKey} style={styles.dateSection}>
                            <Text style={styles.dateHeader}>{formatDateHeader(date)}</Text>

                            {daySlots.length === 0 ? (
                                <Text style={styles.noSlotsText}>No slots available</Text>
                            ) : (
                                <View style={styles.slotsGrid}>
                                    {daySlots.map((slot) => {
                                        const isSelected = selectedSlot?.id === slot.id;
                                        const isFull = slot.currentBookings >= slot.maxBookings;

                                        return (
                                            <TouchableOpacity
                                                key={slot.id}
                                                style={[
                                                    styles.slotChip,
                                                    isSelected && styles.slotChipSelected,
                                                    isFull && styles.slotChipDisabled,
                                                ]}
                                                onPress={() => !isFull && setSelectedSlot(slot)}
                                                disabled={isFull}
                                            >
                                                <Text style={[
                                                    styles.slotChipText,
                                                    isSelected && styles.slotChipTextSelected,
                                                    isFull && styles.slotChipTextDisabled,
                                                ]}>
                                                    {formatTimeSlot(slot.startTime, slot.endTime)}
                                                </Text>
                                                {isFull && (
                                                    <Text style={styles.slotFullBadge}>Full</Text>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    );
                })}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                {selectedSlot && (
                    <View style={styles.selectedSummary}>
                        <Text style={styles.selectedLabel}>Selected:</Text>
                        <Text style={styles.selectedValue}>
                            {formatDateHeader(new Date(selectedSlot.date))} • {formatTimeSlot(selectedSlot.startTime, selectedSlot.endTime)}
                        </Text>
                    </View>
                )}

                <TouchableOpacity
                    style={[
                        styles.confirmButton,
                        (!selectedSlot || booking) && styles.confirmButtonDisabled,
                    ]}
                    onPress={handleBookSlot}
                    disabled={!selectedSlot || booking}
                >
                    {booking ? (
                        <ActivityIndicator color={colors.primaryText} />
                    ) : (
                        <Text style={styles.confirmButtonText}>Confirm Booking</Text>
                    )}
                </TouchableOpacity>
            </View>
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
    loadingText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        marginTop: spacing.md,
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    errorText: {
        ...typography.bodyMedium,
        color: colors.error,
        marginBottom: spacing.lg,
    },
    backButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.primary,
        borderRadius: borderRadius.full,
    },
    backButtonText: {
        ...typography.button,
        color: colors.primaryText,
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
    backArrow: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backArrowText: {
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
        paddingBottom: spacing.xxl,
    },
    orderCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    orderIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.infoLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    orderIconText: {
        fontSize: 24,
    },
    orderContent: {
        flex: 1,
    },
    orderTitle: {
        ...typography.bodyMedium,
        fontWeight: '600',
        color: colors.text,
    },
    orderTests: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginTop: 2,
    },
    instructionCard: {
        flexDirection: 'row',
        backgroundColor: colors.accentLight,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: colors.accent,
    },
    instructionIcon: {
        fontSize: 20,
        marginRight: spacing.sm,
    },
    instructionText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        flex: 1,
    },
    sectionTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.md,
    },
    dateSection: {
        marginBottom: spacing.lg,
    },
    dateHeader: {
        ...typography.bodyMedium,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    noSlotsText: {
        ...typography.bodySmall,
        color: colors.textTertiary,
        fontStyle: 'italic',
    },
    slotsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    slotChip: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.border,
        minWidth: 100,
        alignItems: 'center',
    },
    slotChipSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    slotChipDisabled: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        opacity: 0.5,
    },
    slotChipText: {
        ...typography.bodySmall,
        fontWeight: '500',
        color: colors.text,
    },
    slotChipTextSelected: {
        color: colors.primaryText,
    },
    slotChipTextDisabled: {
        color: colors.textTertiary,
    },
    slotFullBadge: {
        ...typography.label,
        color: colors.error,
        marginTop: 2,
    },
    footer: {
        padding: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
    },
    selectedSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    selectedLabel: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginRight: spacing.xs,
    },
    selectedValue: {
        ...typography.bodySmall,
        fontWeight: '600',
        color: colors.text,
    },
    confirmButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md + 2,
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
