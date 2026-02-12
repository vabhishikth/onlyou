import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/styles/theme';
import VerticalStepper, { StepperStep } from './VerticalStepper';
import {
    LabOrder,
    LabOrderStatus,
    LAB_STATUS_LABELS,
} from '@/graphql/tracking';

interface LabOrderTrackerProps {
    order: LabOrder;
    onReschedule?: () => void;
    onCancel?: () => void;
    onViewResults?: () => void;
}

function formatDate(dateString?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

// Determine which step is current based on status
function getStepStatus(
    orderStatus: LabOrderStatus,
    stepStatuses: LabOrderStatus[]
): 'completed' | 'current' | 'upcoming' {
    const statusOrder: LabOrderStatus[] = [
        'ORDERED',
        'SLOT_BOOKED',
        'PHLEBOTOMIST_ASSIGNED',
        'SAMPLE_COLLECTED',
        'DELIVERED_TO_LAB',
        'SAMPLE_RECEIVED',
        'PROCESSING',
        'RESULTS_READY',
        'DOCTOR_REVIEWED',
    ];

    const currentIndex = statusOrder.indexOf(orderStatus);
    const stepIndex = Math.max(...stepStatuses.map((s) => statusOrder.indexOf(s)));

    if (currentIndex > stepIndex) return 'completed';
    if (currentIndex === stepIndex) return 'current';
    return 'upcoming';
}

export default function LabOrderTracker({
    order,
    onReschedule,
    onCancel,
    onViewResults,
}: LabOrderTrackerProps) {
    const buildSteps = (): StepperStep[] => {
        const steps: StepperStep[] = [];

        // Step 1: Ordered
        steps.push({
            id: 'ordered',
            label: 'Doctor Ordered Tests',
            description: order.panelName || order.testPanel.join(', '),
            timestamp: formatDate(order.orderedAt),
            status: getStepStatus(order.status, ['ORDERED']),
            icon: '🔬',
        });

        // Step 2: Slot Booked
        const slotDescription = order.bookedDate
            ? `${order.bookedDate}, ${order.bookedTimeSlot || ''}`
            : 'Choose a time slot for sample collection';

        const slotActions = order.status === 'SLOT_BOOKED' && (
            <View style={styles.actionRow}>
                {onReschedule && (
                    <TouchableOpacity style={styles.actionButton} onPress={onReschedule}>
                        <Text style={styles.actionButtonText}>Reschedule</Text>
                    </TouchableOpacity>
                )}
                {onCancel && (
                    <TouchableOpacity style={[styles.actionButton, styles.actionButtonSecondary]} onPress={onCancel}>
                        <Text style={styles.actionButtonTextSecondary}>Cancel</Text>
                    </TouchableOpacity>
                )}
            </View>
        );

        steps.push({
            id: 'slot_booked',
            label: 'Collection Scheduled',
            description: slotDescription,
            timestamp: formatDate(order.slotBookedAt),
            status: getStepStatus(order.status, ['SLOT_BOOKED']),
            icon: '📅',
            action: slotActions || undefined,
        });

        // Step 3: Phlebotomist Assigned
        steps.push({
            id: 'phlebotomist',
            label: 'Phlebotomist Assigned',
            description: order.phlebotomistName
                ? `${order.phlebotomistName} will collect your sample`
                : 'A phlebotomist will be assigned',
            timestamp: formatDate(order.phlebotomistAssignedAt),
            status: getStepStatus(order.status, ['PHLEBOTOMIST_ASSIGNED']),
            icon: '👤',
            action: order.phlebotomistPhone && order.status === 'PHLEBOTOMIST_ASSIGNED' ? (
                <TouchableOpacity
                    style={styles.callButton}
                    onPress={() => Linking.openURL(`tel:${order.phlebotomistPhone}`)}
                >
                    <Text style={styles.callButtonText}>📞 Call</Text>
                </TouchableOpacity>
            ) : undefined,
        });

        // Step 4: Sample Collected (or Failed)
        if (order.status === 'COLLECTION_FAILED') {
            steps.push({
                id: 'collection_failed',
                label: 'Collection Missed',
                description: order.collectionFailedReason || 'Please reschedule',
                timestamp: formatDate(order.collectionFailedAt),
                status: 'current',
                icon: '⚠️',
                action: onReschedule ? (
                    <TouchableOpacity style={styles.actionButton} onPress={onReschedule}>
                        <Text style={styles.actionButtonText}>Rebook Slot</Text>
                    </TouchableOpacity>
                ) : undefined,
            });
        } else {
            steps.push({
                id: 'sample_collected',
                label: 'Sample Collection',
                description: 'Phlebotomist will call 30 min before',
                timestamp: formatDate(order.sampleCollectedAt),
                status: getStepStatus(order.status, ['SAMPLE_COLLECTED']),
                icon: order.sampleCollectedAt ? '✅' : '🧪',
            });
        }

        // Step 5: At Lab
        steps.push({
            id: 'at_lab',
            label: 'Sample at Lab',
            description: 'Being processed at the diagnostic centre',
            timestamp: formatDate(order.sampleReceivedAt),
            status: getStepStatus(order.status, ['DELIVERED_TO_LAB', 'SAMPLE_RECEIVED', 'PROCESSING']),
            icon: '🏥',
        });

        // Step 6: Results Ready
        steps.push({
            id: 'results_ready',
            label: 'Results Ready',
            description: "You'll be notified via app, WhatsApp & email",
            timestamp: formatDate(order.resultsUploadedAt),
            status: getStepStatus(order.status, ['RESULTS_READY']),
            icon: '📄',
            action: order.resultFileUrl && onViewResults ? (
                <TouchableOpacity style={styles.viewResultsButton} onPress={onViewResults}>
                    <Text style={styles.viewResultsText}>View Results</Text>
                </TouchableOpacity>
            ) : undefined,
        });

        // Step 7: Doctor Review
        steps.push({
            id: 'doctor_reviewed',
            label: 'Doctor Review',
            description: 'Your doctor will review and update your treatment',
            timestamp: formatDate(order.doctorReviewedAt),
            status: getStepStatus(order.status, ['DOCTOR_REVIEWED']),
            icon: '👨‍⚕️',
        });

        return steps;
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerIcon}>
                    <Text style={styles.headerIconText}>🔬</Text>
                </View>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Blood Test</Text>
                    <Text style={styles.headerStatus}>
                        {LAB_STATUS_LABELS[order.status]?.label || order.status}
                    </Text>
                </View>
            </View>

            {/* Stepper */}
            <VerticalStepper steps={buildSteps()} />

            {/* Doctor's Note (if results reviewed) */}
            {order.doctorNote && order.status === 'DOCTOR_REVIEWED' && (
                <View style={styles.doctorNote}>
                    <Text style={styles.doctorNoteIcon}>💬</Text>
                    <View style={styles.doctorNoteContent}>
                        <Text style={styles.doctorNoteLabel}>Doctor's Note</Text>
                        <Text style={styles.doctorNoteText}>{order.doctorNote}</Text>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.infoLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    headerIconText: {
        fontSize: 22,
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        ...typography.headingSmall,
        color: colors.text,
    },
    headerStatus: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    actionRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    actionButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
    },
    actionButtonText: {
        ...typography.buttonSmall,
        color: colors.primaryText,
    },
    actionButtonSecondary: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.border,
    },
    actionButtonTextSecondary: {
        ...typography.buttonSmall,
        color: colors.textSecondary,
    },
    callButton: {
        backgroundColor: colors.successLight,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        alignSelf: 'flex-start',
    },
    callButtonText: {
        ...typography.buttonSmall,
        color: colors.success,
    },
    viewResultsButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        alignSelf: 'flex-start',
    },
    viewResultsText: {
        ...typography.buttonSmall,
        color: colors.primaryText,
    },
    doctorNote: {
        flexDirection: 'row',
        backgroundColor: colors.accentLight,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginTop: spacing.md,
        borderWidth: 1,
        borderColor: colors.accent,
    },
    doctorNoteIcon: {
        fontSize: 20,
        marginRight: spacing.sm,
    },
    doctorNoteContent: {
        flex: 1,
    },
    doctorNoteLabel: {
        ...typography.label,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    doctorNoteText: {
        ...typography.bodySmall,
        color: colors.text,
    },
});
