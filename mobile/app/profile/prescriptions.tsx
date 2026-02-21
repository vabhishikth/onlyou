import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@apollo/client';
import { colors, spacing, borderRadius, typography } from '@/theme';
import {
    GET_MY_PRESCRIPTIONS,
    GetMyPrescriptionsResponse,
    PatientPrescription,
    VERTICAL_NAMES,
} from '@/graphql/profile';

// Spec: Phase 11 — Patient-facing prescription list screen

export default function PrescriptionsScreen() {
    const router = useRouter();
    const { data, loading } = useQuery<GetMyPrescriptionsResponse>(GET_MY_PRESCRIPTIONS);

    const prescriptions = data?.myPrescriptions || [];

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer} testID="prescriptions-loading">
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    const getMedicationCount = (rx: PatientPrescription) => {
        const meds = rx.medications as Array<{ name: string }>;
        const count = Array.isArray(meds) ? meds.length : 0;
        return count === 1 ? '1 medication' : `${count} medications`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>{'<'}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Prescriptions</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {prescriptions.length === 0 ? (
                    <View style={styles.emptyContainer} testID="prescriptions-empty">
                        <Text style={styles.emptyTitle}>No Prescriptions</Text>
                        <Text style={styles.emptyText}>
                            Your prescriptions will appear here after your doctor review
                        </Text>
                    </View>
                ) : (
                    prescriptions.map((rx) => (
                        <View
                            key={rx.id}
                            style={styles.prescriptionCard}
                            testID={`prescription-card-${rx.id}`}
                        >
                            <View style={styles.cardHeader}>
                                <View style={styles.verticalBadge}>
                                    <Text style={styles.verticalBadgeText}>
                                        {VERTICAL_NAMES[rx.vertical] || rx.vertical}
                                    </Text>
                                </View>
                                <Text style={styles.dateText}>
                                    {formatDate(rx.issuedAt)}
                                </Text>
                            </View>

                            {rx.doctorName && (
                                <Text style={styles.doctorName}>{rx.doctorName}</Text>
                            )}

                            <Text style={styles.medicationCount}>
                                {getMedicationCount(rx)}
                            </Text>

                            {rx.instructions && (
                                <Text style={styles.instructions} numberOfLines={2}>
                                    {rx.instructions}
                                </Text>
                            )}

                            <View style={styles.cardFooter}>
                                <Text style={styles.validUntil}>
                                    Valid until {formatDate(rx.validUntil)}
                                </Text>
                                {rx.pdfUrl && (
                                    <TouchableOpacity style={styles.downloadButton}>
                                        <Text style={styles.downloadButtonText}>
                                            Download PDF
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    ))
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
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    emptyText: {
        ...typography.bodyMedium,
        color: colors.textTertiary,
        textAlign: 'center',
    },
    prescriptionCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    verticalBadge: {
        backgroundColor: colors.accentLight,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    verticalBadgeText: {
        ...typography.label,
        color: colors.accent,
        fontWeight: '600',
    },
    dateText: {
        ...typography.label,
        color: colors.textTertiary,
    },
    doctorName: {
        ...typography.bodyMedium,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    medicationCount: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    instructions: {
        ...typography.bodySmall,
        color: colors.textTertiary,
        marginBottom: spacing.sm,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    validUntil: {
        ...typography.label,
        color: colors.textTertiary,
    },
    downloadButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    downloadButtonText: {
        ...typography.buttonSmall,
        color: colors.primaryText,
    },
});
