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

// Placeholder - will be built in Task 7
export default function MessagesScreen() {
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Messages</Text>
                    <Text style={styles.subtitle}>
                        Chat with your healthcare providers
                    </Text>
                </View>

                {/* Empty state */}
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconContainer}>
                        <Text style={styles.emptyIcon}>💬</Text>
                    </View>
                    <Text style={styles.emptyTitle}>No messages yet</Text>
                    <Text style={styles.emptyText}>
                        After you start a consultation, you can message your doctor here
                    </Text>
                </View>

                {/* Features preview */}
                <View style={styles.featuresCard}>
                    <Text style={styles.featuresTitle}>Coming Soon:</Text>
                    <View style={styles.featuresList}>
                        <View style={styles.featureItem}>
                            <Text style={styles.featureIcon}>👨‍⚕️</Text>
                            <View style={styles.featureContent}>
                                <Text style={styles.featureLabel}>Doctor Chat</Text>
                                <Text style={styles.featureDesc}>Threaded conversations per consultation</Text>
                            </View>
                        </View>
                        <View style={styles.featureItem}>
                            <Text style={styles.featureIcon}>📎</Text>
                            <View style={styles.featureContent}>
                                <Text style={styles.featureLabel}>Attachments</Text>
                                <Text style={styles.featureDesc}>Share photos and documents</Text>
                            </View>
                        </View>
                        <View style={styles.featureItem}>
                            <Text style={styles.featureIcon}>✓✓</Text>
                            <View style={styles.featureContent}>
                                <Text style={styles.featureLabel}>Read Receipts</Text>
                                <Text style={styles.featureDesc}>Know when your message is read</Text>
                            </View>
                        </View>
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
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxxl,
        marginBottom: spacing.xl,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    emptyIcon: {
        fontSize: 48,
    },
    emptyTitle: {
        ...typography.headingMedium,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    emptyText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
    },
    featuresCard: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    featuresTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.md,
    },
    featuresList: {
        gap: spacing.md,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    featureIcon: {
        fontSize: 24,
        marginRight: spacing.md,
    },
    featureContent: {
        flex: 1,
    },
    featureLabel: {
        ...typography.bodyMedium,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    featureDesc: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
});
