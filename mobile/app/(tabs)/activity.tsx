import React from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/styles/theme';

// Placeholder - will be built in Task 5 (Most Important Screen!)
export default function ActivityScreen() {
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>My Activity</Text>
                    <Text style={styles.subtitle}>
                        Track your lab tests and deliveries
                    </Text>
                </View>

                {/* Placeholder content */}
                <View style={styles.placeholder}>
                    <Text style={styles.placeholderIcon}>📋</Text>
                    <Text style={styles.placeholderTitle}>Activity Screen</Text>
                    <Text style={styles.placeholderText}>
                        Unified tracking with vertical steppers for lab orders and medication deliveries
                    </Text>
                </View>

                {/* Status preview */}
                <View style={styles.statusPreview}>
                    <Text style={styles.statusTitle}>Coming Soon:</Text>
                    <View style={styles.statusList}>
                        <Text style={styles.statusItem}>🔬 Lab Order Tracking (12 statuses)</Text>
                        <Text style={styles.statusItem}>📦 Delivery Tracking (10 statuses)</Text>
                        <Text style={styles.statusItem}>📄 Lab Results with Summary</Text>
                        <Text style={styles.statusItem}>📅 Slot Booking & Reschedule</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.xxl,
    },
    header: {
        marginBottom: spacing.xl,
    },
    title: {
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        fontSize: 28,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    subtitle: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
    },
    placeholder: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxxl,
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
        marginBottom: spacing.xl,
    },
    placeholderIcon: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    placeholderTitle: {
        ...typography.headingMedium,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    placeholderText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
    },
    statusPreview: {
        backgroundColor: colors.accentLight,
        borderRadius: 16,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.accent,
    },
    statusTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.md,
    },
    statusList: {
        gap: spacing.sm,
    },
    statusItem: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
    },
});
