/**
 * Spec: Phase 16 — Biomarker trend detail screen
 * Chronological data points with normal range display
 */

import React from 'react';
import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@apollo/client';
import { MY_BIOMARKER_TREND, BiomarkerTrend } from '../../../src/graphql/biomarker';

export default function BiomarkerTrendScreen() {
    const { testCode } = useLocalSearchParams<{ testCode: string }>();
    const router = useRouter();

    const { data, loading } = useQuery(MY_BIOMARKER_TREND, {
        variables: { testCode },
        skip: !testCode,
    });

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator testID="trend-loading" size="large" color="#16a34a" />
            </View>
        );
    }

    const trend: BiomarkerTrend | null = data?.myBiomarkerTrend || null;

    return (
        <ScrollView style={styles.container}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Text style={styles.backText}>{'< Back'}</Text>
            </TouchableOpacity>

            <Text style={styles.title}>{testCode} Trend</Text>

            {!trend ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No trend data available for {testCode}.</Text>
                </View>
            ) : (
                <>
                    {/* Normal range info */}
                    <View style={styles.rangeCard}>
                        <Text style={styles.rangeLabel}>Normal Range</Text>
                        <Text style={styles.rangeValue}>
                            {Number(trend.normalMin).toFixed(1)} — {Number(trend.normalMax).toFixed(1)} {trend.unit}
                        </Text>
                    </View>

                    {/* Data points */}
                    <Text style={styles.sectionTitle}>History</Text>
                    {trend.dataPoints.map((point, index) => {
                        const isInRange =
                            point.value >= trend.normalMin && point.value <= trend.normalMax;
                        const date = new Date(point.recordedAt);

                        return (
                            <View key={index} style={styles.dataRow}>
                                <View style={styles.dateCol}>
                                    <Text style={styles.dateText}>
                                        {date.toLocaleDateString('en-IN', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}
                                    </Text>
                                </View>
                                <View style={styles.valueCol}>
                                    <Text
                                        style={[
                                            styles.valueText,
                                            !isInRange && styles.valueAbnormal,
                                        ]}
                                    >
                                        {point.value}
                                    </Text>
                                    {!isInRange && (
                                        <View style={styles.flagDot} />
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </>
            )}
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
    backButton: {
        marginBottom: 8,
    },
    backText: {
        fontSize: 15,
        color: '#16a34a',
        fontWeight: '600',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111',
        marginBottom: 16,
    },
    emptyState: {
        padding: 32,
        alignItems: 'center',
    },
    emptyText: {
        color: '#888',
        fontSize: 14,
    },
    rangeCard: {
        backgroundColor: '#f0fdf4',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#bbf7d0',
    },
    rangeLabel: {
        fontSize: 13,
        color: '#666',
        marginBottom: 4,
    },
    rangeValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#16a34a',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111',
        marginBottom: 12,
    },
    dataRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    dateCol: {
        flex: 1,
    },
    dateText: {
        fontSize: 14,
        color: '#666',
    },
    valueCol: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    valueText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111',
    },
    valueAbnormal: {
        color: '#dc2626',
    },
    flagDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#dc2626',
        marginLeft: 6,
    },
});
