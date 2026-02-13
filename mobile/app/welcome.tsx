/**
 * Welcome Screen — Onlyou Design System
 * Hero with category cards, staggered entry animations
 */

import React from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Heart, Sparkles, Scale, Flower2, ChevronRight, Truck } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { textStyles, fontFamilies } from '@/theme/typography';
import { spacing, screenSpacing, borderRadius } from '@/theme/spacing';
import { PremiumButton } from '@/components/ui';

const CARD_WIDTH = 160;
const CARD_HEIGHT = 140;
const CARD_GAP = 12;

interface CategoryCard {
    id: string;
    icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
    prefix: string;
    highlight: string;
    route: string;
}

const categories: CategoryCard[] = [
    {
        id: 'sexual-health',
        icon: Heart,
        prefix: 'Have great',
        highlight: 'sex',
        route: '/intake/sexual-health',
    },
    {
        id: 'hair-loss',
        icon: Sparkles,
        prefix: 'Grow thicker',
        highlight: 'hair',
        route: '/intake/hair-loss',
    },
    {
        id: 'weight-management',
        icon: Scale,
        prefix: 'Reach your',
        highlight: 'weight goals',
        route: '/intake/weight-management',
    },
    {
        id: 'pcos',
        icon: Flower2,
        prefix: 'Balance your',
        highlight: 'hormones',
        route: '/intake/pcos',
    },
];

export default function WelcomeScreen() {
    const router = useRouter();

    const handleCategoryPress = (route: string) => {
        router.push(route as any);
    };

    const handleGetStarted = () => {
        router.push('/(auth)/phone');
    };

    const handleLogin = () => {
        router.push('/(auth)/phone');
    };

    return (
        <View style={styles.container} testID="welcome-screen">
            {/* Logo */}
            <Animated.Text
                entering={FadeInUp.delay(0).duration(400)}
                style={styles.logo}
                testID="welcome-logo"
            >
                onlyou
            </Animated.Text>

            {/* Hero Text */}
            <Animated.View
                entering={FadeInUp.delay(80).duration(400)}
                style={styles.heroContainer}
            >
                <Text style={styles.heroText}>
                    Get your{' '}
                    <Text style={styles.heroAccent}>personalized</Text>
                    {'\n'}treatment plan
                </Text>
            </Animated.View>

            {/* Subtitle */}
            <Animated.Text
                entering={FadeInUp.delay(160).duration(400)}
                style={styles.subtitle}
            >
                Your free online visit starts here.
            </Animated.Text>

            {/* Category Cards - Horizontal Scroll */}
            <Animated.View
                entering={FadeInUp.delay(240).duration(400)}
                style={styles.cardsContainer}
            >
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.cardsContent}
                    snapToInterval={CARD_WIDTH + CARD_GAP}
                    decelerationRate="fast"
                >
                    {categories.map((category) => (
                        <TouchableOpacity
                            key={category.id}
                            style={styles.card}
                            onPress={() => handleCategoryPress(category.route)}
                            activeOpacity={0.8}
                            testID={`category-card-${category.id}`}
                        >
                            <View style={styles.cardContent}>
                                <category.icon
                                    size={28}
                                    color={colors.accent}
                                    strokeWidth={1.5}
                                />
                                <View style={styles.cardTextContainer}>
                                    <Text style={styles.cardPrefix}>{category.prefix}</Text>
                                    <Text style={styles.cardHighlight}>{category.highlight}</Text>
                                </View>
                                <ChevronRight
                                    size={16}
                                    color={colors.textMuted}
                                    strokeWidth={2}
                                />
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </Animated.View>

            {/* Buttons */}
            <Animated.View
                entering={FadeInUp.delay(320).duration(400)}
                style={styles.buttonsContainer}
            >
                <PremiumButton
                    title="Get started"
                    onPress={handleGetStarted}
                    variant="primary"
                    testID="get-started-button"
                />
                <View style={styles.buttonSpacer} />
                <PremiumButton
                    title="Log in"
                    onPress={handleLogin}
                    variant="secondary"
                    testID="login-button"
                />
            </Animated.View>

            {/* Footer */}
            <Animated.View
                entering={FadeInUp.delay(400).duration(400)}
                style={styles.footer}
            >
                <Text style={styles.privacyText}>Your privacy choices</Text>
                <View style={styles.shippingContainer}>
                    <Truck size={16} color={colors.accent} strokeWidth={1.5} />
                    <Text style={styles.shippingText}>Free shipping for all prescriptions</Text>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
        paddingTop: 60,
        paddingHorizontal: screenSpacing.horizontal,
    },
    logo: {
        ...textStyles.h2,
        color: colors.textPrimary,
        marginBottom: spacing.xl,
    },
    heroContainer: {
        marginBottom: spacing.md,
    },
    heroText: {
        fontFamily: fontFamilies.serifSemiBold,
        fontSize: 30,
        lineHeight: 38,
        color: colors.textPrimary,
    },
    heroAccent: {
        fontFamily: fontFamilies.sansItalic,
        color: colors.accent,
    },
    subtitle: {
        ...textStyles.body,
        color: colors.textSecondary,
        marginBottom: spacing.xl,
    },
    cardsContainer: {
        marginHorizontal: -screenSpacing.horizontal,
        marginBottom: spacing.xl,
    },
    cardsContent: {
        paddingHorizontal: screenSpacing.horizontal,
        gap: CARD_GAP,
    },
    card: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: colors.surface,
        borderRadius: borderRadius['2xl'],
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
    },
    cardContent: {
        flex: 1,
        justifyContent: 'space-between',
    },
    cardTextContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    cardPrefix: {
        ...textStyles.bodySmall,
        color: colors.textSecondary,
    },
    cardHighlight: {
        ...textStyles.bodySmall,
        fontFamily: fontFamilies.sansSemiBold,
        color: colors.accent,
    },
    buttonsContainer: {
        marginBottom: spacing.xl,
    },
    buttonSpacer: {
        height: spacing.sm,
    },
    footer: {
        alignItems: 'center',
        paddingBottom: spacing.xl,
    },
    privacyText: {
        fontSize: 13,
        color: colors.textMuted,
        marginBottom: spacing.md,
    },
    shippingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    shippingText: {
        fontSize: 14,
        color: colors.accent,
    },
});
