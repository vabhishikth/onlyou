import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useMutation } from '@apollo/client';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme';
import { CANCEL_LAB_ORDER, LabOrder } from '@/graphql/tracking';

interface CancelLabOrderModalProps {
    visible: boolean;
    labOrder: LabOrder | null;
    onClose: () => void;
    onCancelled: () => void;
}

const CANCELLATION_REASONS = [
    { id: 'not_needed', label: 'No longer need the test' },
    { id: 'wrong_date', label: 'Wrong date/time' },
    { id: 'feeling_unwell', label: "I'm not feeling well" },
    { id: 'traveling', label: "I'll be traveling" },
    { id: 'other', label: 'Other reason' },
];

export default function CancelLabOrderModal({
    visible,
    labOrder,
    onClose,
    onCancelled,
}: CancelLabOrderModalProps) {
    const [selectedReason, setSelectedReason] = useState<string | null>(null);
    const [otherReason, setOtherReason] = useState('');

    const [cancelLabOrder, { loading: cancelling }] = useMutation(CANCEL_LAB_ORDER, {
        onCompleted: () => {
            resetState();
            onCancelled();
        },
        onError: (error) => {
            // Error is shown to the user via Alert in the parent or handled here
            console.error('Cancel failed:', error.message);
        },
    });

    const resetState = () => {
        setSelectedReason(null);
        setOtherReason('');
    };

    const handleCancel = async () => {
        if (!labOrder || !selectedReason) return;

        const reason =
            selectedReason === 'other'
                ? otherReason || 'Other'
                : CANCELLATION_REASONS.find((r) => r.id === selectedReason)?.label || selectedReason;

        await cancelLabOrder({
            variables: {
                labOrderId: labOrder.id,
                reason,
            },
            refetchQueries: ['GetActiveTracking', 'GetLabOrder'],
        });
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    // Check if we can cancel (4-hour cutoff for PHLEBOTOMIST_ASSIGNED)
    const canCancel = () => {
        if (!labOrder) return true;

        if (labOrder.status === 'PHLEBOTOMIST_ASSIGNED' && labOrder.bookedDate) {
            const bookedTime = new Date(labOrder.bookedDate);
            const now = new Date();
            const hoursUntilSlot = (bookedTime.getTime() - now.getTime()) / (1000 * 60 * 60);
            return hoursUntilSlot >= 4;
        }

        return true;
    };

    const isSubmitDisabled =
        !selectedReason ||
        (selectedReason === 'other' && !otherReason.trim()) ||
        cancelling ||
        !canCancel();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={handleClose}
                />

                <View style={styles.modal}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.warningIcon}>
                            <Text style={styles.warningIconText}>⚠️</Text>
                        </View>
                        <Text style={styles.title}>Cancel Collection?</Text>
                        <Text style={styles.subtitle}>
                            Are you sure you want to cancel your blood test collection?
                        </Text>
                    </View>

                    {/* 4-hour cutoff warning */}
                    {!canCancel() && (
                        <View style={styles.cutoffWarning}>
                            <Text style={styles.cutoffWarningText}>
                                You cannot cancel within 4 hours of your scheduled collection. Please contact support.
                            </Text>
                        </View>
                    )}

                    {/* Reason selection */}
                    {canCancel() && (
                        <View style={styles.reasonsContainer}>
                            <Text style={styles.reasonsLabel}>Please select a reason:</Text>

                            {CANCELLATION_REASONS.map((reason) => (
                                <TouchableOpacity
                                    key={reason.id}
                                    style={[
                                        styles.reasonOption,
                                        selectedReason === reason.id && styles.reasonOptionSelected,
                                    ]}
                                    onPress={() => setSelectedReason(reason.id)}
                                >
                                    <View style={styles.radioOuter}>
                                        {selectedReason === reason.id && (
                                            <View style={styles.radioInner} />
                                        )}
                                    </View>
                                    <Text style={styles.reasonLabel}>{reason.label}</Text>
                                </TouchableOpacity>
                            ))}

                            {selectedReason === 'other' && (
                                <TextInput
                                    style={styles.otherInput}
                                    placeholder="Please specify..."
                                    value={otherReason}
                                    onChangeText={setOtherReason}
                                    multiline
                                    maxLength={200}
                                    placeholderTextColor={colors.textTertiary}
                                />
                            )}
                        </View>
                    )}

                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.keepButton}
                            onPress={handleClose}
                            disabled={cancelling}
                        >
                            <Text style={styles.keepButtonText}>Keep Booking</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.cancelButton,
                                isSubmitDisabled && styles.cancelButtonDisabled,
                            ]}
                            onPress={handleCancel}
                            disabled={isSubmitDisabled}
                        >
                            {cancelling ? (
                                <ActivityIndicator color={colors.primaryText} size="small" />
                            ) : (
                                <Text style={styles.cancelButtonText}>Cancel Collection</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modal: {
        width: '90%',
        maxWidth: 400,
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        ...shadows.lg,
    },
    header: {
        alignItems: 'center',
        padding: spacing.lg,
        paddingBottom: spacing.md,
    },
    warningIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.warningLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    warningIconText: {
        fontSize: 28,
    },
    title: {
        ...typography.headingMedium,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    subtitle: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    cutoffWarning: {
        backgroundColor: colors.errorLight,
        padding: spacing.md,
        marginHorizontal: spacing.lg,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
    },
    cutoffWarningText: {
        ...typography.bodySmall,
        color: colors.error,
        textAlign: 'center',
    },
    reasonsContainer: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
    },
    reasonsLabel: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    reasonOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.xs,
    },
    reasonOptionSelected: {
        backgroundColor: colors.surface,
    },
    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary,
    },
    reasonLabel: {
        ...typography.bodyMedium,
        color: colors.text,
    },
    otherInput: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginTop: spacing.sm,
        minHeight: 80,
        ...typography.bodyMedium,
        color: colors.text,
        textAlignVertical: 'top',
    },
    actions: {
        flexDirection: 'row',
        padding: spacing.lg,
        gap: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    keepButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    keepButtonText: {
        ...typography.button,
        color: colors.text,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.full,
        backgroundColor: colors.error,
        alignItems: 'center',
    },
    cancelButtonDisabled: {
        backgroundColor: colors.border,
    },
    cancelButtonText: {
        ...typography.button,
        color: colors.primaryText,
    },
});
