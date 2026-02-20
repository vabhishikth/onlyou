import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/theme';

export interface StepperStep {
    id: string;
    label: string;
    description?: string;
    timestamp?: string;
    status: 'completed' | 'current' | 'upcoming';
    icon?: string;
    action?: React.ReactNode;
}

interface VerticalStepperProps {
    steps: StepperStep[];
}

export default function VerticalStepper({ steps }: VerticalStepperProps) {
    return (
        <View style={styles.container}>
            {steps.map((step, index) => {
                const isLast = index === steps.length - 1;

                return (
                    <View key={step.id} style={styles.stepRow}>
                        {/* Status indicator column */}
                        <View style={styles.indicatorColumn}>
                            <View style={[
                                styles.dot,
                                step.status === 'completed' && styles.dotCompleted,
                                step.status === 'current' && styles.dotCurrent,
                                step.status === 'upcoming' && styles.dotUpcoming,
                            ]}>
                                {step.status === 'completed' && (
                                    <Text style={styles.checkmark}>✓</Text>
                                )}
                                {step.status === 'current' && (
                                    <View style={styles.currentDotInner} />
                                )}
                            </View>
                            {!isLast && (
                                <View style={[
                                    styles.line,
                                    step.status === 'completed' && styles.lineCompleted,
                                ]} />
                            )}
                        </View>

                        {/* Content column */}
                        <View style={[styles.contentColumn, !isLast && styles.contentWithMargin]}>
                            <View style={styles.labelRow}>
                                {step.icon && <Text style={styles.stepIcon}>{step.icon}</Text>}
                                <Text style={[
                                    styles.label,
                                    step.status === 'upcoming' && styles.labelUpcoming,
                                ]}>
                                    {step.label}
                                </Text>
                            </View>

                            {step.description && (
                                <Text style={styles.description}>{step.description}</Text>
                            )}

                            {step.timestamp && (
                                <Text style={styles.timestamp}>{step.timestamp}</Text>
                            )}

                            {step.action && (
                                <View style={styles.actionContainer}>{step.action}</View>
                            )}
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: spacing.sm,
    },
    stepRow: {
        flexDirection: 'row',
    },
    indicatorColumn: {
        alignItems: 'center',
        width: 32,
    },
    dot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dotCompleted: {
        backgroundColor: colors.success,
    },
    dotCurrent: {
        backgroundColor: colors.info,
    },
    dotUpcoming: {
        backgroundColor: colors.border,
    },
    checkmark: {
        color: colors.primaryText,
        fontSize: 12,
        fontWeight: '700',
    },
    currentDotInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primaryText,
    },
    line: {
        width: 2,
        flex: 1,
        minHeight: 24,
        backgroundColor: colors.border,
    },
    lineCompleted: {
        backgroundColor: colors.success,
    },
    contentColumn: {
        flex: 1,
        marginLeft: spacing.md,
    },
    contentWithMargin: {
        marginBottom: spacing.lg,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stepIcon: {
        fontSize: 16,
        marginRight: spacing.xs,
    },
    label: {
        ...typography.bodyMedium,
        fontWeight: '600',
        color: colors.text,
    },
    labelUpcoming: {
        color: colors.textTertiary,
    },
    description: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginTop: 2,
    },
    timestamp: {
        ...typography.label,
        color: colors.textTertiary,
        marginTop: spacing.xs,
    },
    actionContainer: {
        marginTop: spacing.sm,
    },
});
