/**
 * Spec: Phase 15 — Mobile auto-refill management
 * View active auto-refills, create new, cancel existing
 */

import React from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import { MY_AUTO_REFILLS, CANCEL_AUTO_REFILL } from '../../src/graphql/pharmacy';

export default function RefillsScreen() {
    const { data, loading, error, refetch } = useQuery(MY_AUTO_REFILLS);
    const [cancelRefill] = useMutation(CANCEL_AUTO_REFILL, {
        onCompleted: () => refetch(),
    });

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator testID="refills-loading" size="large" color="#16a34a" />
            </View>
        );
    }

    const refills = data?.myAutoRefills || [];

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Auto-Refills</Text>

            <TouchableOpacity style={styles.newButton}>
                <Text style={styles.newButtonText}>+ New Refill</Text>
            </TouchableOpacity>

            {refills.length === 0 && (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No auto-refills set up yet.</Text>
                </View>
            )}

            {refills.map((refill: any) => (
                <View key={refill.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.intervalText}>
                            Every {refill.intervalDays} days
                        </Text>
                        <Text style={styles.nextDate}>
                            Next: {new Date(refill.nextRefillDate).toLocaleDateString()}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() =>
                            cancelRefill({ variables: { autoRefillId: refill.id } })
                        }
                    >
                        <Text style={styles.cancelButtonText}>Cancel Refill</Text>
                    </TouchableOpacity>
                </View>
            ))}
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
    newButton: {
        backgroundColor: '#16a34a',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        marginBottom: 16,
    },
    newButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
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
        marginBottom: 12,
    },
    intervalText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111',
    },
    nextDate: {
        fontSize: 13,
        color: '#666',
        marginTop: 4,
    },
    cancelButton: {
        borderWidth: 1,
        borderColor: '#ef4444',
        borderRadius: 8,
        paddingVertical: 8,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#ef4444',
        fontWeight: '600',
        fontSize: 14,
    },
});
