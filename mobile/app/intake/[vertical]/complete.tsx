import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme';

const verticalNames: Record<string, string> = {
    'hair-loss': 'Hair Loss',
    'sexual-health': 'Sexual Health',
    'pcos': 'PCOS',
    'weight-management': 'Weight Management',
};

export default function CompleteScreen() {
    const { vertical } = useLocalSearchParams<{
        vertical: string;
    }>();
    const router = useRouter();

    const verticalName = verticalNames[vertical || ''] || 'Assessment';

    const handleGoHome = () => {
        // Navigate to home tab, clearing the intake stack
        router.replace('/(tabs)');
    };

    const handleViewActivity = () => {
        // Navigate to activity tab within tab navigator
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.replace('/(tabs)/activity' as any);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Success animation/icon */}
                <View style={styles.successIcon}>
                    <Text style={styles.successEmoji}>🎉</Text>
                </View>

                {/* Main message */}
                <Text style={styles.title}>Assessment Submitted!</Text>
                <Text style={styles.subtitle}>
                    Your {verticalName} assessment has been received
                </Text>

                {/* What's next card */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>What happens now?</Text>

                    <View style={styles.timeline}>
                        <View style={styles.timelineItem}>
                            <View style={[styles.timelineDot, styles.timelineDotActive]} />
                            <View style={styles.timelineContent}>
                                <Text style={styles.timelineTitle}>Assessment received</Text>
                                <Text style={styles.timelineDesc}>Just now</Text>
                            </View>
                        </View>

                        <View style={styles.timelineLine} />

                        <View style={styles.timelineItem}>
                            <View style={styles.timelineDot} />
                            <View style={styles.timelineContent}>
                                <Text style={styles.timelineTitle}>Doctor review</Text>
                                <Text style={styles.timelineDesc}>Usually within 24 hours</Text>
                            </View>
                        </View>

                        <View style={styles.timelineLine} />

                        <View style={styles.timelineItem}>
                            <View style={styles.timelineDot} />
                            <View style={styles.timelineContent}>
                                <Text style={styles.timelineTitle}>Treatment plan ready</Text>
                                <Text style={styles.timelineDesc}>We'll notify you</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Notification notice */}
                <View style={styles.noticeCard}>
                    <Text style={styles.noticeIcon}>🔔</Text>
                    <Text style={styles.noticeText}>
                        We'll send you a notification when your doctor has reviewed your assessment and your treatment plan is ready.
                    </Text>
                </View>
            </View>

            {/* Action buttons */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleViewActivity}
                    activeOpacity={0.8}
                >
                    <Text style={styles.primaryButtonText}>Track Progress</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleGoHome}
                    activeOpacity={0.7}
                >
                    <Text style={styles.secondaryButtonText}>Go to Home</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        padding: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    successIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.successLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    successEmoji: {
        fontSize: 48,
    },
    title: {
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        fontSize: 28,
        fontWeight: '600',
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    subtitle: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xxl,
    },
    infoCard: {
        width: '100%',
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    infoTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.lg,
    },
    timeline: {
        paddingLeft: spacing.sm,
    },
    timelineItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.border,
        marginRight: spacing.md,
        marginTop: 4,
    },
    timelineDotActive: {
        backgroundColor: colors.success,
    },
    timelineContent: {
        flex: 1,
    },
    timelineTitle: {
        ...typography.bodyMedium,
        fontWeight: '600',
        color: colors.text,
    },
    timelineDesc: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    timelineLine: {
        width: 2,
        height: 24,
        backgroundColor: colors.border,
        marginLeft: 5,
        marginVertical: spacing.xs,
    },
    noticeCard: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.accentLight,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.accent,
    },
    noticeIcon: {
        fontSize: 20,
        marginRight: spacing.sm,
    },
    noticeText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        flex: 1,
    },
    footer: {
        padding: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    primaryButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md + 2,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
        ...shadows.md,
    },
    primaryButtonText: {
        ...typography.button,
        color: colors.primaryText,
    },
    secondaryButton: {
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    secondaryButtonText: {
        ...typography.button,
        color: colors.textSecondary,
    },
});
