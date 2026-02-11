import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@apollo/client';
import { colors, spacing, borderRadius, typography } from '@/styles/theme';
import { GET_QUESTIONNAIRE_TEMPLATE, HealthVertical, QuestionnaireTemplate } from '@/graphql/intake';

const VERTICAL_INFO: Record<HealthVertical, { title: string; icon: string; gradient: string; benefits: string[] }> = {
    HAIR_LOSS: {
        title: 'Hair Loss Treatment',
        icon: '✨',
        gradient: '#FEF3C7',
        benefits: [
            'Clinically proven treatments',
            'Personalized treatment plan',
            'Doctor-supervised care',
            'Discreet delivery',
        ],
    },
    SEXUAL_HEALTH: {
        title: 'Sexual Health',
        icon: '💙',
        gradient: '#DBEAFE',
        benefits: [
            'FDA-approved medications',
            'Same-day prescription possible',
            'Discreet packaging',
            '24/7 support available',
        ],
    },
    PCOS: {
        title: 'PCOS & Hormones',
        icon: '🌸',
        gradient: '#FCE7F3',
        benefits: [
            'Holistic hormone care',
            'Personalized treatment',
            'Regular monitoring',
            'Lifestyle guidance included',
        ],
    },
    WEIGHT_MANAGEMENT: {
        title: 'Weight Management',
        icon: '💪',
        gradient: '#D1FAE5',
        benefits: [
            'GLP-1 medications available',
            'Medical supervision',
            'Nutrition guidance',
            'Progress tracking',
        ],
    },
};

export default function IntakeIntroScreen() {
    const { vertical } = useLocalSearchParams<{ vertical: string }>();
    const verticalKey = vertical?.toUpperCase().replace('-', '_') as HealthVertical;

    const { loading, error, data } = useQuery<{ questionnaireTemplate: QuestionnaireTemplate }>(
        GET_QUESTIONNAIRE_TEMPLATE,
        {
            variables: { input: { vertical: verticalKey } },
            skip: !verticalKey,
        }
    );

    const info = VERTICAL_INFO[verticalKey] || VERTICAL_INFO.HAIR_LOSS;
    const questionCount = data?.questionnaireTemplate?.schema?.sections?.reduce(
        (acc, section) => acc + section.questions.length,
        0
    ) || 0;

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading assessment...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorIcon}>⚠️</Text>
                    <Text style={styles.errorTitle}>Something went wrong</Text>
                    <Text style={styles.errorText}>{error.message}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
                        <Text style={styles.retryButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const handleStart = () => {
        router.push(`/intake/${vertical}/questions` as never);
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Section */}
                <View style={[styles.heroSection, { backgroundColor: info.gradient }]}>
                    <Text style={styles.heroIcon}>{info.icon}</Text>
                    <Text style={styles.heroTitle}>{info.title}</Text>
                    <Text style={styles.heroSubtitle}>
                        Answer a few questions and a licensed physician will create your personalized treatment plan.
                    </Text>
                </View>

                {/* What to Expect */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>What to expect</Text>

                    <View style={styles.expectCard}>
                        <View style={styles.expectItem}>
                            <View style={styles.expectIcon}>
                                <Text style={styles.expectIconText}>📝</Text>
                            </View>
                            <View style={styles.expectContent}>
                                <Text style={styles.expectTitle}>Quick Assessment</Text>
                                <Text style={styles.expectDescription}>
                                    {questionCount} questions · Takes about 5 minutes
                                </Text>
                            </View>
                        </View>

                        <View style={styles.expectDivider} />

                        <View style={styles.expectItem}>
                            <View style={styles.expectIcon}>
                                <Text style={styles.expectIconText}>👨‍⚕️</Text>
                            </View>
                            <View style={styles.expectContent}>
                                <Text style={styles.expectTitle}>Doctor Review</Text>
                                <Text style={styles.expectDescription}>
                                    Licensed physician reviews within 24 hours
                                </Text>
                            </View>
                        </View>

                        <View style={styles.expectDivider} />

                        <View style={styles.expectItem}>
                            <View style={styles.expectIcon}>
                                <Text style={styles.expectIconText}>📦</Text>
                            </View>
                            <View style={styles.expectContent}>
                                <Text style={styles.expectTitle}>Discreet Delivery</Text>
                                <Text style={styles.expectDescription}>
                                    Treatment shipped in plain packaging
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Benefits */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Why choose us</Text>

                    <View style={styles.benefitsGrid}>
                        {info.benefits.map((benefit, index) => (
                            <View key={index} style={styles.benefitItem}>
                                <Text style={styles.benefitCheck}>✓</Text>
                                <Text style={styles.benefitText}>{benefit}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Privacy Note */}
                <View style={styles.privacyNote}>
                    <Text style={styles.privacyIcon}>🔒</Text>
                    <Text style={styles.privacyText}>
                        Your information is encrypted and protected by doctor-patient confidentiality.
                    </Text>
                </View>
            </ScrollView>

            {/* Bottom CTA */}
            <View style={styles.bottomCTA}>
                <TouchableOpacity style={styles.startButton} onPress={handleStart} activeOpacity={0.8}>
                    <Text style={styles.startButtonText}>Start Assessment</Text>
                </TouchableOpacity>
                <Text style={styles.timeEstimate}>Takes about 5 minutes</Text>
            </View>
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
        paddingBottom: spacing.xxl,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        marginTop: spacing.md,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    errorIcon: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    errorTitle: {
        ...typography.headingMedium,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    errorText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    retryButton: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.primary,
        borderRadius: borderRadius.md,
    },
    retryButtonText: {
        ...typography.button,
        color: colors.primaryText,
    },

    // Hero
    heroSection: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    heroIcon: {
        fontSize: 64,
        marginBottom: spacing.md,
    },
    heroTitle: {
        ...typography.headingLarge,
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    heroSubtitle: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        textAlign: 'center',
        maxWidth: 300,
    },

    // Sections
    section: {
        padding: spacing.lg,
    },
    sectionTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.md,
    },

    // Expect Card
    expectCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    expectItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    expectIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    expectIconText: {
        fontSize: 20,
    },
    expectContent: {
        flex: 1,
    },
    expectTitle: {
        ...typography.bodyLarge,
        fontWeight: '600',
        color: colors.text,
    },
    expectDescription: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginTop: 2,
    },
    expectDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.xs,
    },

    // Benefits
    benefitsGrid: {
        gap: spacing.sm,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    benefitCheck: {
        ...typography.bodyLarge,
        color: colors.success,
        marginRight: spacing.sm,
        fontWeight: '700',
    },
    benefitText: {
        ...typography.bodyMedium,
        color: colors.text,
    },

    // Privacy
    privacyNote: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        marginHorizontal: spacing.lg,
        padding: spacing.md,
        borderRadius: borderRadius.md,
    },
    privacyIcon: {
        fontSize: 20,
        marginRight: spacing.sm,
    },
    privacyText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        flex: 1,
    },

    // Bottom CTA
    bottomCTA: {
        padding: spacing.lg,
        paddingBottom: spacing.xl,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
    },
    startButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    startButtonText: {
        ...typography.button,
        color: colors.primaryText,
    },
    timeEstimate: {
        ...typography.caption,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.sm,
    },
});
