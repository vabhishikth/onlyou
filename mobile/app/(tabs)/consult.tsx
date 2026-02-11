import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, SafeAreaView, StatusBar } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/styles/theme';

export default function ConsultScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Consultations</Text>
                    <Text style={styles.subtitle}>
                        Connect with healthcare providers
                    </Text>
                </View>

                {/* Start Consultation Card */}
                <TouchableOpacity style={styles.startCard} activeOpacity={0.8}>
                    <View style={styles.startCardContent}>
                        <Text style={styles.startCardIcon}>👨‍⚕️</Text>
                        <View style={styles.startCardText}>
                            <Text style={styles.startCardTitle}>Start a new visit</Text>
                            <Text style={styles.startCardSubtitle}>
                                Consult a specialist in under 5 minutes
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.startCardArrow}>→</Text>
                </TouchableOpacity>

                {/* Upcoming Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Upcoming</Text>
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>📅</Text>
                        <Text style={styles.emptyTitle}>No upcoming consultations</Text>
                        <Text style={styles.emptySubtitle}>
                            Start a visit to connect with a provider
                        </Text>
                    </View>
                </View>

                {/* Past Consultations */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Past visits</Text>
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>📋</Text>
                        <Text style={styles.emptyTitle}>No past consultations</Text>
                        <Text style={styles.emptySubtitle}>
                            Your consultation history will appear here
                        </Text>
                    </View>
                </View>

                {/* Help Card */}
                <View style={styles.helpCard}>
                    <Text style={styles.helpIcon}>💬</Text>
                    <View style={styles.helpContent}>
                        <Text style={styles.helpTitle}>Need help?</Text>
                        <Text style={styles.helpSubtitle}>
                            Our support team is available 24/7
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.helpButton} activeOpacity={0.7}>
                        <Text style={styles.helpButtonText}>Chat</Text>
                    </TouchableOpacity>
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
        paddingTop: spacing.xl,
        paddingBottom: spacing.xxl,
    },

    // Header
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

    // Start Card
    startCard: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xl,
    },
    startCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    startCardIcon: {
        fontSize: 40,
        marginRight: spacing.md,
    },
    startCardText: {
        flex: 1,
    },
    startCardTitle: {
        ...typography.bodyLarge,
        fontWeight: '600',
        color: colors.primaryText,
    },
    startCardSubtitle: {
        ...typography.bodySmall,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    startCardArrow: {
        fontSize: 24,
        color: colors.primaryText,
    },

    // Section
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.md,
    },

    // Empty State
    emptyState: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    emptyIcon: {
        fontSize: 40,
        marginBottom: spacing.md,
    },
    emptyTitle: {
        ...typography.bodyLarge,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    emptySubtitle: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        textAlign: 'center',
    },

    // Help Card
    helpCard: {
        backgroundColor: colors.accentLight,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.accent,
    },
    helpIcon: {
        fontSize: 28,
        marginRight: spacing.md,
    },
    helpContent: {
        flex: 1,
    },
    helpTitle: {
        ...typography.bodyMedium,
        fontWeight: '600',
        color: colors.text,
    },
    helpSubtitle: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    helpButton: {
        backgroundColor: colors.accent,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
    },
    helpButtonText: {
        ...typography.bodySmall,
        fontWeight: '600',
        color: colors.primaryText,
    },
});
