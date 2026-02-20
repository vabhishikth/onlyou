import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@apollo/client';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme';
import { GET_LAB_ORDER, LabOrder } from '@/graphql/tracking';

// Spec: master spec Section 4.5 — Lab Results Presentation

interface AbnormalFlag {
    status: string;
    value: string;
    normalRange: string;
}

function parseAbnormalFlags(
    flagsJson?: string | null,
): Record<string, AbnormalFlag> | null {
    if (!flagsJson) return null;
    try {
        return JSON.parse(flagsJson) as Record<string, AbnormalFlag>;
    } catch {
        return null;
    }
}

function getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
        case 'normal':
            return '\u2705'; // green check
        case 'abnormal':
            return '\u26A0\uFE0F'; // warning
        case 'critical':
            return '\uD83D\uDD34'; // red circle
        default:
            return '\u2796'; // dash
    }
}

function getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
        case 'normal':
            return colors.success;
        case 'abnormal':
            return colors.warning;
        case 'critical':
            return colors.error;
        default:
            return colors.textSecondary;
    }
}

function formatTestName(code: string): string {
    return code
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function LabResultsScreen() {
    const { labOrderId } = useLocalSearchParams<{ labOrderId: string }>();
    const router = useRouter();

    const { data, loading } = useQuery(GET_LAB_ORDER, {
        variables: { id: labOrderId },
        skip: !labOrderId,
    });

    const labOrder: LabOrder | undefined = data?.labOrder;
    const abnormalFlags = parseAbnormalFlags(
        labOrder?.abnormalFlags as unknown as string | null,
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading results...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!labOrder) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Lab order not found</Text>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Text style={styles.backBtnText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const hasCriticalValues = labOrder.criticalValues === true;
    const hasResults =
        labOrder.resultFileUrl ||
        (abnormalFlags && Object.keys(abnormalFlags).length > 0);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backArrow} onPress={() => router.back()}>
                    <Text style={styles.backArrowText}>{'<'}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Lab Results</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Panel Info */}
                <View style={styles.panelCard}>
                    <View style={styles.panelIcon}>
                        <Text style={styles.panelIconText}>{'\uD83D\uDCCB'}</Text>
                    </View>
                    <View style={styles.panelContent}>
                        <Text style={styles.panelName}>
                            {labOrder.panelName || 'Blood Tests'}
                        </Text>
                        <Text style={styles.panelTests}>
                            {labOrder.testPanel.join(', ')}
                        </Text>
                    </View>
                </View>

                {/* Critical Values Banner */}
                {hasCriticalValues && (
                    <View style={styles.criticalBanner}>
                        <Text style={styles.criticalIcon}>{'\uD83D\uDD34'}</Text>
                        <View style={styles.criticalContent}>
                            <Text style={styles.criticalTitle}>Critical Values Detected</Text>
                            <Text style={styles.criticalText}>
                                Some values are outside normal range. Your doctor has been notified
                                and will follow up shortly.
                            </Text>
                        </View>
                    </View>
                )}

                {/* Results Summary Table */}
                {abnormalFlags && Object.keys(abnormalFlags).length > 0 && (
                    <View style={styles.resultsSection}>
                        <Text style={styles.sectionTitle}>Results Summary</Text>
                        <View style={styles.resultsTable}>
                            {/* Table Header */}
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableHeaderCell, styles.cellTest]}>
                                    Test
                                </Text>
                                <Text style={[styles.tableHeaderCell, styles.cellValue]}>
                                    Value
                                </Text>
                                <Text style={[styles.tableHeaderCell, styles.cellStatus]}>
                                    Status
                                </Text>
                                <Text style={[styles.tableHeaderCell, styles.cellRange]}>
                                    Normal Range
                                </Text>
                            </View>

                            {/* Table Rows */}
                            {Object.entries(abnormalFlags).map(([testCode, flag]) => (
                                <View key={testCode} style={styles.tableRow}>
                                    <Text style={[styles.tableCell, styles.cellTest]} numberOfLines={1}>
                                        {formatTestName(testCode)}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.tableCell,
                                            styles.cellValue,
                                            { color: getStatusColor(flag.status) },
                                        ]}
                                    >
                                        {flag.value}
                                    </Text>
                                    <Text style={[styles.tableCell, styles.cellStatus]}>
                                        {getStatusIcon(flag.status)}
                                    </Text>
                                    <Text
                                        style={[styles.tableCell, styles.cellRange]}
                                        numberOfLines={1}
                                    >
                                        {flag.normalRange}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {/* Legend */}
                        <View style={styles.legend}>
                            <View style={styles.legendItem}>
                                <Text style={styles.legendIcon}>{'\u2705'}</Text>
                                <Text style={styles.legendText}>Normal</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <Text style={styles.legendIcon}>{'\u26A0\uFE0F'}</Text>
                                <Text style={styles.legendText}>Abnormal</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <Text style={styles.legendIcon}>{'\uD83D\uDD34'}</Text>
                                <Text style={styles.legendText}>Critical</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Doctor's Note */}
                {labOrder.doctorNote && (
                    <View style={styles.doctorNoteCard}>
                        <Text style={styles.doctorNoteIcon}>{'\uD83D\uDCAC'}</Text>
                        <View style={styles.doctorNoteContent}>
                            <Text style={styles.doctorNoteLabel}>Doctor's Note</Text>
                            <Text style={styles.doctorNoteText}>{labOrder.doctorNote}</Text>
                        </View>
                    </View>
                )}

                {/* No results yet */}
                {!hasResults && (
                    <View style={styles.noResultsCard}>
                        <Text style={styles.noResultsIcon}>{'\u23F3'}</Text>
                        <Text style={styles.noResultsTitle}>Results Pending</Text>
                        <Text style={styles.noResultsText}>
                            Your results are not yet available. You'll be notified as soon as
                            they're ready.
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Footer — View Full Report */}
            {labOrder.resultFileUrl && (
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.viewReportButton}
                        onPress={() => Linking.openURL(labOrder.resultFileUrl!)}
                    >
                        <Text style={styles.viewReportText}>
                            {'\uD83D\uDCC4'} View Full Lab Report
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
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
    backBtn: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.primary,
        borderRadius: borderRadius.full,
    },
    backBtnText: {
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
    panelCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    panelIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.infoLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    panelIconText: {
        fontSize: 24,
    },
    panelContent: {
        flex: 1,
    },
    panelName: {
        ...typography.bodyMedium,
        fontWeight: '600',
        color: colors.text,
    },
    panelTests: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginTop: 2,
    },
    criticalBanner: {
        flexDirection: 'row',
        backgroundColor: colors.errorLight,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.error,
    },
    criticalIcon: {
        fontSize: 24,
        marginRight: spacing.sm,
    },
    criticalContent: {
        flex: 1,
    },
    criticalTitle: {
        ...typography.bodyMedium,
        fontWeight: '700',
        color: colors.error,
        marginBottom: spacing.xs,
    },
    criticalText: {
        ...typography.bodySmall,
        color: colors.text,
    },
    resultsSection: {
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.md,
    },
    resultsTable: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    tableHeaderCell: {
        ...typography.label,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    tableCell: {
        ...typography.bodySmall,
        color: colors.text,
    },
    cellTest: {
        flex: 3,
    },
    cellValue: {
        flex: 2,
        textAlign: 'center',
    },
    cellStatus: {
        flex: 1,
        textAlign: 'center',
    },
    cellRange: {
        flex: 3,
        textAlign: 'right',
    },
    legend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.lg,
        marginTop: spacing.md,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    legendIcon: {
        fontSize: 14,
    },
    legendText: {
        ...typography.label,
        color: colors.textSecondary,
    },
    doctorNoteCard: {
        flexDirection: 'row',
        backgroundColor: colors.accentLight,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.lg,
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
    noResultsCard: {
        alignItems: 'center',
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    noResultsIcon: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    noResultsTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    noResultsText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    footer: {
        padding: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
    },
    viewReportButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md + 2,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.md,
    },
    viewReportText: {
        ...typography.button,
        color: colors.primaryText,
    },
});
