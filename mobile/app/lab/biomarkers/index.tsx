/**
 * Spec: Phase 16 — Mobile biomarker dashboard
 * Latest results, critical alerts, flag badges, grouped by test code
 */

import React from 'react';
import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import { useQuery } from '@apollo/client';
import { MY_LATEST_LAB_RESULTS, MY_CRITICAL_VALUES, BiomarkerResult } from '../../../src/graphql/biomarker';

const FLAG_COLORS: Record<string, { bg: string; text: string }> = {
    NORMAL: { bg: '#dcfce7', text: '#16a34a' },
    LOW: { bg: '#fef3c7', text: '#d97706' },
    HIGH: { bg: '#fed7aa', text: '#ea580c' },
    CRITICAL: { bg: '#fecaca', text: '#dc2626' },
};

export default function BiomarkersScreen() {
    const { data, loading } = useQuery(MY_LATEST_LAB_RESULTS);
    const criticalQuery = useQuery(MY_CRITICAL_VALUES);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator testID="biomarkers-loading" size="large" color="#16a34a" />
            </View>
        );
    }

    const results: BiomarkerResult[] = data?.myLatestLabResults || [];
    const criticals: BiomarkerResult[] = criticalQuery.data?.myCriticalValues || [];

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Biomarkers</Text>

            {/* Critical alert section */}
            {criticals.length > 0 && (
                <View style={styles.criticalSection}>
                    <Text style={styles.criticalTitle}>Critical Alert</Text>
                    {criticals.map((c) => (
                        <View key={c.id} style={styles.criticalCard}>
                            <Text style={styles.criticalName}>{c.testName || c.testCode}</Text>
                            <Text style={styles.criticalValue}>
                                {c.value} {c.unit}
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Empty state */}
            {results.length === 0 && (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No biomarker results yet.</Text>
                </View>
            )}

            {/* Result cards */}
            {results.map((result) => {
                const flagStyle = FLAG_COLORS[result.flag] || FLAG_COLORS.NORMAL;

                return (
                    <View key={result.id} style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={styles.nameRow}>
                                <Text style={styles.testCode}>{result.testCode}</Text>
                                {result.testName && (
                                    <Text style={styles.testName}>{result.testName}</Text>
                                )}
                            </View>
                            {result.flag !== 'NORMAL' && (
                                <View style={[styles.flagBadge, { backgroundColor: flagStyle.bg }]}>
                                    <Text style={[styles.flagText, { color: flagStyle.text }]}>
                                        {result.flag}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.valueRow}>
                            <Text style={styles.value}>{result.value} {result.unit}</Text>
                            <Text style={styles.range}>Range: {result.normalRange}</Text>
                        </View>
                    </View>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 16,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111',
        marginBottom: 16,
    },
    criticalSection: {
        backgroundColor: '#fef2f2',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    criticalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#dc2626',
        marginBottom: 8,
    },
    criticalCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
    },
    criticalName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#991b1b',
    },
    criticalValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#dc2626',
    },
    emptyState: {
        padding: 32,
        alignItems: 'center',
    },
    emptyText: {
        color: '#888',
        fontSize: 14,
    },
    card: {
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    nameRow: {
        flex: 1,
    },
    testCode: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111',
    },
    testName: {
        fontSize: 13,
        color: '#666',
        marginTop: 2,
    },
    flagBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    flagText: {
        fontSize: 11,
        fontWeight: '700',
    },
    valueRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    value: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111',
    },
    range: {
        fontSize: 12,
        color: '#888',
    },
});
