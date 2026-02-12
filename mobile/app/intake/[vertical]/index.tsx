import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography, shadows } from '@/styles/theme';
import { HealthVertical } from '@/graphql/intake';

// Vertical info mapping
const VERTICAL_INFO: Record<string, {
    id: HealthVertical;
    name: string;
    icon: string;
    description: string;
    duration: string;
    steps: string[];
    benefits: string[];
}> = {
    'hair-loss': {
        id: 'HAIR_LOSS',
        name: 'Hair Loss',
        icon: '💇',
        description: 'Answer a few questions about your hair health so our doctors can create a personalized treatment plan.',
        duration: '5-7 minutes',
        steps: [
            'Answer health questions',
            'Upload photos of your scalp',
            'Review and submit',
            'Get your personalized plan',
        ],
        benefits: [
            'Clinically proven treatments',
            'Expert dermatologist review',
            'Free doorstep delivery',
            'Ongoing doctor support',
        ],
    },
    'sexual-health': {
        id: 'SEXUAL_HEALTH',
        name: 'Sexual Health',
        icon: '❤️',
        description: 'Confidential assessment for ED and performance concerns. Your privacy is our priority.',
        duration: '5 minutes',
        steps: [
            'Answer health questions',
            'Review and submit',
            'Get your personalized plan',
        ],
        benefits: [
            'Completely confidential',
            'Expert urologist review',
            'Discreet packaging',
            'Quick and effective treatments',
        ],
    },
    'pcos': {
        id: 'PCOS',
        name: 'PCOS',
        icon: '🌸',
        description: 'Comprehensive assessment for polycystic ovary syndrome symptoms and management.',
        duration: '7-10 minutes',
        steps: [
            'Answer health questions',
            'Review and submit',
            'Get your personalized plan',
        ],
        benefits: [
            'Holistic symptom management',
            'Expert gynecologist review',
            'Lifestyle recommendations',
            'Ongoing monitoring',
        ],
    },
    'weight-management': {
        id: 'WEIGHT_MANAGEMENT',
        name: 'Weight Management',
        icon: '⚖️',
        description: 'Medical weight loss assessment tailored to your body and lifestyle.',
        duration: '7-10 minutes',
        steps: [
            'Answer health questions',
            'Upload body photos',
            'Review and submit',
            'Get your personalized plan',
        ],
        benefits: [
            'Doctor-supervised programs',
            'Medication options if suitable',
            'Nutritional guidance',
            'Regular check-ins',
        ],
    },
};

export default function IntakeIntroScreen() {
    const { vertical } = useLocalSearchParams<{ vertical: string }>();
    const router = useRouter();

    const info = VERTICAL_INFO[vertical || ''] ?? VERTICAL_INFO['hair-loss']!;

    const handleStart = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.push(`/intake/${vertical}/questions` as any);
    };

    const handleBack = () => {
        router.back();
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>

                {/* Hero section */}
                <View style={styles.heroSection}>
                    <Text style={styles.heroIcon}>{info.icon}</Text>
                    <Text style={styles.heroTitle}>{info.name} Assessment</Text>
                    <Text style={styles.heroDescription}>{info.description}</Text>
                    <View style={styles.durationBadge}>
                        <Text style={styles.durationText}>⏱️ {info.duration}</Text>
                    </View>
                </View>

                {/* Steps section */}
                <View style={styles.stepsSection}>
                    <Text style={styles.sectionTitle}>What to expect</Text>
                    {info.steps.map((step, index) => (
                        <View key={index} style={styles.stepItem}>
                            <View style={styles.stepNumber}>
                                <Text style={styles.stepNumberText}>{index + 1}</Text>
                            </View>
                            <Text style={styles.stepText}>{step}</Text>
                        </View>
                    ))}
                </View>

                {/* Benefits section */}
                <View style={styles.benefitsSection}>
                    <Text style={styles.sectionTitle}>What you get</Text>
                    {info.benefits.map((benefit, index) => (
                        <View key={index} style={styles.benefitItem}>
                            <Text style={styles.benefitCheck}>✓</Text>
                            <Text style={styles.benefitText}>{benefit}</Text>
                        </View>
                    ))}
                </View>

                {/* Privacy notice */}
                <View style={styles.privacyNotice}>
                    <Text style={styles.privacyIcon}>🔒</Text>
                    <Text style={styles.privacyText}>
                        Your information is encrypted and confidential. Only your assigned doctor will review your responses.
                    </Text>
                </View>
            </ScrollView>

            {/* Start button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.startButton}
                    onPress={handleStart}
                    activeOpacity={0.8}
                >
                    <Text style={styles.startButtonText}>Start Assessment</Text>
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xxl,
    },
    backButton: {
        alignSelf: 'flex-start',
        paddingVertical: spacing.md,
    },
    backText: {
        ...typography.bodyMedium,
        color: colors.primary,
        fontWeight: '500',
    },
    heroSection: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    heroIcon: {
        fontSize: 64,
        marginBottom: spacing.md,
    },
    heroTitle: {
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        fontSize: 28,
        fontWeight: '600',
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    heroDescription: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: spacing.md,
        marginBottom: spacing.md,
    },
    durationBadge: {
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
    },
    durationText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    stepsSection: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.md,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    stepNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    stepNumberText: {
        ...typography.bodySmall,
        color: colors.primaryText,
        fontWeight: '600',
    },
    stepText: {
        ...typography.bodyMedium,
        color: colors.text,
        flex: 1,
    },
    benefitsSection: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    benefitCheck: {
        fontSize: 16,
        color: colors.success,
        marginRight: spacing.sm,
    },
    benefitText: {
        ...typography.bodyMedium,
        color: colors.text,
    },
    privacyNotice: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.accentLight,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.accent,
    },
    privacyIcon: {
        fontSize: 18,
        marginRight: spacing.sm,
    },
    privacyText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        flex: 1,
    },
    footer: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    startButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md + 2,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.md,
    },
    startButtonText: {
        ...typography.button,
        color: colors.primaryText,
    },
});
