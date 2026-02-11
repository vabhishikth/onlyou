import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '@/styles/theme';

export default function CompleteScreen() {
    const handleGoHome = () => {
        router.replace('/(tabs)');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Success Icon */}
                <View style={styles.iconContainer}>
                    <Text style={styles.successIcon}>✓</Text>
                </View>

                {/* Title */}
                <Text style={styles.title}>Assessment Complete!</Text>

                {/* Description */}
                <Text style={styles.description}>
                    Thank you for completing your health assessment. A licensed physician will
                    review your responses and create a personalized treatment plan.
                </Text>

                {/* Timeline Card */}
                <View style={styles.timelineCard}>
                    <Text style={styles.timelineTitle}>What happens next?</Text>

                    <View style={styles.timelineItem}>
                        <View style={styles.timelineDot} />
                        <View style={styles.timelineContent}>
                            <Text style={styles.timelineStep}>Doctor Review</Text>
                            <Text style={styles.timelineTime}>Within 24 hours</Text>
                        </View>
                    </View>

                    <View style={styles.timelineLine} />

                    <View style={styles.timelineItem}>
                        <View style={[styles.timelineDot, styles.timelineDotPending]} />
                        <View style={styles.timelineContent}>
                            <Text style={styles.timelineStep}>Treatment Plan</Text>
                            <Text style={styles.timelineTime}>
                                You&apos;ll receive your personalized plan
                            </Text>
                        </View>
                    </View>

                    <View style={styles.timelineLine} />

                    <View style={styles.timelineItem}>
                        <View style={[styles.timelineDot, styles.timelineDotPending]} />
                        <View style={styles.timelineContent}>
                            <Text style={styles.timelineStep}>Delivery</Text>
                            <Text style={styles.timelineTime}>Discreet shipping to your door</Text>
                        </View>
                    </View>
                </View>

                {/* Notification Note */}
                <View style={styles.notificationNote}>
                    <Text style={styles.notificationIcon}>🔔</Text>
                    <Text style={styles.notificationText}>
                        We&apos;ll notify you when your treatment plan is ready.
                    </Text>
                </View>
            </View>

            {/* Bottom CTA */}
            <View style={styles.bottomCTA}>
                <TouchableOpacity style={styles.homeButton} onPress={handleGoHome} activeOpacity={0.8}>
                    <Text style={styles.homeButtonText}>Return to Home</Text>
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
        padding: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Success Icon
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.success,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    successIcon: {
        fontSize: 40,
        color: colors.primaryText,
        fontWeight: '700',
    },

    // Text
    title: {
        ...typography.headingLarge,
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    description: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
        maxWidth: 300,
    },

    // Timeline
    timelineCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        width: '100%',
        borderWidth: 1,
        borderColor: colors.border,
    },
    timelineTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.md,
    },
    timelineItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.success,
        marginTop: 4,
        marginRight: spacing.md,
    },
    timelineDotPending: {
        backgroundColor: colors.border,
    },
    timelineLine: {
        width: 2,
        height: 20,
        backgroundColor: colors.border,
        marginLeft: 5,
        marginVertical: spacing.xs,
    },
    timelineContent: {
        flex: 1,
    },
    timelineStep: {
        ...typography.bodyMedium,
        fontWeight: '600',
        color: colors.text,
    },
    timelineTime: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },

    // Notification
    notificationNote: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.lg,
        paddingHorizontal: spacing.md,
    },
    notificationIcon: {
        fontSize: 20,
        marginRight: spacing.sm,
    },
    notificationText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },

    // Bottom CTA
    bottomCTA: {
        padding: spacing.lg,
        paddingBottom: spacing.xl,
    },
    homeButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    homeButtonText: {
        ...typography.button,
        color: colors.primaryText,
    },
});
