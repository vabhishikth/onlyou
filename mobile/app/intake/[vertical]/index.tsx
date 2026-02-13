/**
 * Treatment Detail Screen (Intake Intro)
 * PR 5: Treatment + Questionnaire + Photo Restyle
 * Restyled with Clinical Luxe design system
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
    Sparkles,
    Heart,
    Flower2,
    Scale,
    Check,
    Clock,
} from 'lucide-react-native';

import { colors } from '@/theme/colors';
import { fontFamilies, fontSizes } from '@/theme/typography';
import { spacing, borderRadius, screenSpacing } from '@/theme/spacing';
import { BackButton, PremiumButton } from '@/components/ui';
import { HealthVertical } from '@/graphql/intake';

// Map URL path to icon components
const verticalIcons: Record<string, React.ComponentType<{ size: number; color: string; strokeWidth?: number }>> = {
    'hair-loss': Sparkles,
    'sexual-health': Heart,
    'pcos': Flower2,
    'weight-management': Scale,
};

// Vertical info mapping
const VERTICAL_INFO: Record<string, {
    id: HealthVertical;
    name: string;
    title: string;
    subtitle: string;
    iconColor: string;
    duration: string;
    expectItems: string[];
    planItems: string[];
}> = {
    'hair-loss': {
        id: 'HAIR_LOSS',
        name: 'Hair Loss',
        title: 'Hair Loss Treatment',
        subtitle: 'Regrow thicker, fuller hair with clinically proven treatments designed for your unique hair type.',
        iconColor: colors.hairLossIcon,
        duration: '5 minutes',
        expectItems: [
            'Doctor reviews your responses within 24 hours',
            'Personalised treatment plan created for you',
            'Medication delivered discreetly to your door',
        ],
        planItems: [
            'Expert dermatologist consultation',
            'Clinically proven medications',
            'Free doorstep delivery',
            'Ongoing doctor support',
        ],
    },
    'sexual-health': {
        id: 'SEXUAL_HEALTH',
        name: 'Sexual Health',
        title: 'Sexual Health Treatment',
        subtitle: 'Discreet care for ED and performance concerns with clinically proven treatments.',
        iconColor: colors.sexualHealthIcon,
        duration: '5 minutes',
        expectItems: [
            'Doctor reviews your responses within 24 hours',
            'Personalised treatment plan created for you',
            'Medication delivered discreetly to your door',
        ],
        planItems: [
            'Expert urologist consultation',
            'Clinically proven medications',
            'Discreet packaging',
            'Ongoing doctor support',
        ],
    },
    'pcos': {
        id: 'PCOS',
        name: 'PCOS',
        title: 'PCOS Treatment',
        subtitle: 'Comprehensive care for polycystic ovary syndrome with clinically proven approaches.',
        iconColor: colors.pcosIcon,
        duration: '7 minutes',
        expectItems: [
            'Doctor reviews your responses within 24 hours',
            'Personalised treatment plan created for you',
            'Medication delivered discreetly to your door',
        ],
        planItems: [
            'Expert gynecologist consultation',
            'Holistic symptom management',
            'Lifestyle recommendations',
            'Ongoing monitoring',
        ],
    },
    'weight-management': {
        id: 'WEIGHT_MANAGEMENT',
        name: 'Weight Management',
        title: 'Weight Management Treatment',
        subtitle: 'Doctor-supervised weight loss with clinically proven programs tailored to your body.',
        iconColor: colors.weightIcon,
        duration: '7 minutes',
        expectItems: [
            'Doctor reviews your responses within 24 hours',
            'Personalised treatment plan created for you',
            'Medication delivered discreetly to your door',
        ],
        planItems: [
            'Expert physician consultation',
            'Medication options if suitable',
            'Nutritional guidance',
            'Regular check-ins',
        ],
    },
};

export default function IntakeIntroScreen() {
    const { vertical } = useLocalSearchParams<{ vertical: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const info = VERTICAL_INFO[vertical || ''] ?? VERTICAL_INFO['hair-loss'];
    const IconComponent = verticalIcons[vertical || ''] ?? Sparkles;

    const handleStart = () => {
        router.push(`/intake/${vertical}/questions`);
    };

    const handleBack = () => {
        router.back();
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']} testID="intake-intro-screen">
            {/* Header with back button */}
            <Animated.View
                entering={FadeInUp.delay(0).duration(400)}
                style={styles.header}
            >
                <BackButton onPress={handleBack} testID="back-button" />
            </Animated.View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero section */}
                <Animated.View
                    entering={FadeInUp.delay(80).duration(400)}
                    style={styles.heroSection}
                >
                    <View style={styles.iconContainer} testID="vertical-icon">
                        <IconComponent
                            size={40}
                            color={info.iconColor}
                            strokeWidth={1.5}
                        />
                    </View>
                    <Text style={styles.title}>{info.title}</Text>
                    <Text style={styles.subtitle}>{info.subtitle}</Text>
                </Animated.View>

                {/* What to expect section */}
                <Animated.View
                    entering={FadeInUp.delay(160).duration(400)}
                    style={styles.section}
                >
                    <Text style={styles.sectionTitle}>What to expect</Text>
                    {info.expectItems.map((item, index) => (
                        <View
                            key={index}
                            style={styles.expectItem}
                            testID={`expect-item-${index}`}
                        >
                            <View style={styles.checkCircle}>
                                <Check size={14} color={colors.white} strokeWidth={3} />
                            </View>
                            <Text style={styles.expectText}>{item}</Text>
                        </View>
                    ))}
                </Animated.View>

                {/* Your plan includes section */}
                <Animated.View
                    entering={FadeInUp.delay(240).duration(400)}
                    style={styles.section}
                >
                    <Text style={styles.sectionTitle}>Your plan includes</Text>
                    {info.planItems.map((item, index) => (
                        <View
                            key={index}
                            style={styles.planItem}
                            testID={`plan-item-${index}`}
                        >
                            <View style={styles.planDot} />
                            <Text style={styles.planText}>{item}</Text>
                        </View>
                    ))}
                </Animated.View>

                {/* Questionnaire card */}
                <Animated.View
                    entering={FadeInUp.delay(320).duration(400)}
                    style={styles.questionnaireCard}
                    testID="questionnaire-card"
                >
                    <View style={styles.clockContainer} testID="clock-icon">
                        <Clock size={24} color={colors.textSecondary} strokeWidth={1.5} />
                    </View>
                    <View style={styles.cardTextContainer}>
                        <Text style={styles.cardTitle}>Quick questionnaire</Text>
                        <Text style={styles.cardSubtitle}>
                            Takes about {info.duration}
                        </Text>
                    </View>
                </Animated.View>

                {/* Spacer for sticky CTA */}
                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Sticky CTA with gradient fade */}
            <View
                style={[styles.ctaContainer, { paddingBottom: insets.bottom + spacing.lg }]}
                testID="sticky-cta-container"
            >
                <LinearGradient
                    colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
                    style={styles.gradient}
                    testID="cta-gradient"
                />
                <View style={styles.ctaContent}>
                    <PremiumButton
                        title="Start Questionnaire"
                        onPress={handleStart}
                        testID="start-questionnaire-button"
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    header: {
        paddingHorizontal: screenSpacing.horizontal,
        paddingTop: spacing.sm,
        paddingBottom: spacing.md,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: screenSpacing.horizontal,
    },
    heroSection: {
        alignItems: 'center',
        paddingTop: spacing.lg,
        marginBottom: spacing['2xl'],
    },
    iconContainer: {
        marginBottom: spacing.lg,
    },
    title: {
        fontFamily: fontFamilies.serifSemiBold,
        fontSize: fontSizes.title,
        color: colors.textPrimary,
        textAlign: 'center',
        letterSpacing: -0.5,
        marginBottom: spacing.md,
    },
    subtitle: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.body,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: fontSizes.body * 1.5,
        paddingHorizontal: spacing.md,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontFamily: fontFamilies.sansSemiBold,
        fontSize: fontSizes.cardTitle,
        color: colors.textPrimary,
        marginBottom: spacing.md,
    },
    expectItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: spacing.md,
    },
    checkCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.success,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
        marginTop: 2,
    },
    expectText: {
        flex: 1,
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.body,
        color: colors.textPrimary,
        lineHeight: fontSizes.body * 1.5,
    },
    planItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    planDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.accent,
        marginRight: spacing.md,
    },
    planText: {
        flex: 1,
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.body,
        color: colors.textPrimary,
    },
    questionnaireCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    clockContainer: {
        marginRight: spacing.md,
    },
    cardTextContainer: {
        flex: 1,
    },
    cardTitle: {
        fontFamily: fontFamilies.sansSemiBold,
        fontSize: fontSizes.body,
        color: colors.textPrimary,
        marginBottom: 2,
    },
    cardSubtitle: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.label,
        color: colors.textSecondary,
    },
    ctaContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    gradient: {
        height: 40,
    },
    ctaContent: {
        backgroundColor: colors.white,
        paddingHorizontal: screenSpacing.horizontal,
        paddingTop: spacing.sm,
    },
});
