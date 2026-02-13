/**
 * Health Goals Screen — Step 1 of 4
 * Multi-select health verticals with 2-column grid
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Heart, Sparkles, Scale, Flower2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { ScreenWrapper, SelectionCard, PremiumButton } from '@/components/ui';
import { OnboardingHeader } from '@/components/onboarding';
import { colors } from '@/theme/colors';
import { fontFamilies, fontSizes } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { useOnboardingStore, HealthGoal } from '@/store/onboardingStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - CARD_GAP) / 2;

interface GoalOption {
    id: HealthGoal;
    title: string;
    subtitle: string;
    icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
    iconColor: string;
}

const GOAL_OPTIONS: GoalOption[] = [
    {
        id: 'HAIR_LOSS',
        title: 'Hair Loss',
        subtitle: 'Regrow thicker hair',
        icon: Sparkles,
        iconColor: colors.hairLossIcon,
    },
    {
        id: 'SEXUAL_HEALTH',
        title: 'Sexual Wellness',
        subtitle: 'Perform confidently',
        icon: Heart,
        iconColor: colors.sexualHealthIcon,
    },
    {
        id: 'WEIGHT_MANAGEMENT',
        title: 'Weight',
        subtitle: 'Reach your goals',
        icon: Scale,
        iconColor: colors.weightIcon,
    },
    {
        id: 'PCOS',
        title: 'PCOS & Hormones',
        subtitle: 'Balance your health',
        icon: Flower2,
        iconColor: colors.pcosIcon,
    },
];

export default function HealthGoalsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { healthGoals, toggleHealthGoal, setCurrentStep } = useOnboardingStore();

    const handleNext = () => {
        setCurrentStep(2);
        router.push('/onboarding/basic-info');
    };

    const isNextDisabled = healthGoals.length === 0;

    return (
        <ScreenWrapper
            scrollable={true}
            testID="health-goals-screen"
            style={styles.screen}
        >
            {/* Header */}
            <OnboardingHeader
                currentStep={1}
                showBackButton={true}
                testID="health-goals-header"
            />

            {/* Content */}
            <View style={styles.content}>
                {/* Heading */}
                <Animated.Text
                    entering={FadeInUp.delay(0).duration(400)}
                    style={styles.heading}
                >
                    What would you like to focus on?
                </Animated.Text>

                {/* Subtitle */}
                <Animated.Text
                    entering={FadeInUp.delay(80).duration(400)}
                    style={styles.subtitle}
                >
                    Select all that apply. You can always explore more later.
                </Animated.Text>

                {/* 2-column grid */}
                <Animated.View
                    entering={FadeInUp.delay(160).duration(400)}
                    style={styles.grid}
                >
                    {GOAL_OPTIONS.map((option, index) => {
                        const IconComponent = option.icon;
                        const isSelected = healthGoals.includes(option.id);

                        return (
                            <View key={option.id} style={styles.cardWrapper}>
                                <SelectionCard
                                    title={option.title}
                                    subtitle={option.subtitle}
                                    icon={
                                        <IconComponent
                                            size={24}
                                            color={option.iconColor}
                                            strokeWidth={1.5}
                                        />
                                    }
                                    selected={isSelected}
                                    onPress={() => toggleHealthGoal(option.id)}
                                    testID={`goal-card-${option.id.toLowerCase().replace('_', '-')}`}
                                    style={styles.card}
                                />
                            </View>
                        );
                    })}
                </Animated.View>
            </View>

            {/* Bottom CTA with gradient fade */}
            <View style={[styles.ctaContainer, { paddingBottom: insets.bottom + spacing.lg }]}>
                <LinearGradient
                    colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
                    style={styles.gradient}
                />
                <View style={styles.ctaContent}>
                    <PremiumButton
                        title="Next"
                        onPress={handleNext}
                        disabled={isNextDisabled}
                        testID="health-goals-next-button"
                    />
                </View>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    screen: {
        backgroundColor: colors.white,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
    },
    heading: {
        fontFamily: fontFamilies.serifSemiBold,
        fontSize: 28,
        color: colors.textPrimary,
        textAlign: 'left',
    },
    subtitle: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.body,
        color: colors.textSecondary,
        marginTop: spacing.sm,
        lineHeight: 22,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: spacing.xl,
        marginHorizontal: -CARD_GAP / 2,
    },
    cardWrapper: {
        width: '50%',
        paddingHorizontal: CARD_GAP / 2,
        marginBottom: CARD_GAP,
    },
    card: {
        minHeight: 120,
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
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
    },
});
