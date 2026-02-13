/**
 * TreatmentCard Component
 * Premium treatment vertical card for Home screen
 * Uses Clinical Luxe design system
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Sparkles, Heart, Scale, Flower2, ChevronRight } from 'lucide-react-native';

import { colors } from '@/theme/colors';
import { fontFamilies, fontSizes } from '@/theme/typography';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import { HealthVertical } from '@/graphql/intake';

// Map icon names to components
const ICONS = {
    Sparkles,
    Heart,
    Scale,
    Flower2,
} as const;

type IconName = keyof typeof ICONS;

interface TreatmentCardProps {
    id: HealthVertical;
    name: string;
    tagline: string;
    icon: IconName;
    pricePerMonth: number;
}

// Map vertical ID to URL-friendly path
const verticalToPath: Record<HealthVertical, string> = {
    HAIR_LOSS: 'hair-loss',
    SEXUAL_HEALTH: 'sexual-health',
    PCOS: 'pcos',
    WEIGHT_MANAGEMENT: 'weight-management',
};

// Vertical-specific styling
const verticalStyles: Record<HealthVertical, { tint: string; iconColor: string }> = {
    HAIR_LOSS: { tint: colors.hairLossTint, iconColor: colors.hairLossIcon },
    SEXUAL_HEALTH: { tint: colors.sexualHealthTint, iconColor: colors.sexualHealthIcon },
    PCOS: { tint: colors.pcosTint, iconColor: colors.pcosIcon },
    WEIGHT_MANAGEMENT: { tint: colors.weightTint, iconColor: colors.weightIcon },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function TreatmentCard({
    id,
    name,
    tagline,
    icon,
    pricePerMonth,
}: TreatmentCardProps) {
    const router = useRouter();
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    };

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const path = verticalToPath[id];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.push(`/intake/${path}` as any);
    };

    const IconComponent = ICONS[icon];
    const { tint, iconColor } = verticalStyles[id];

    return (
        <AnimatedPressable
            style={[styles.card, { backgroundColor: tint }, animatedStyle]}
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            testID={`treatment-card-${id}`}
        >
            {/* Icon Badge */}
            <View style={[styles.iconBadge, { backgroundColor: colors.white }]} testID={`treatment-icon-${id}`}>
                <IconComponent size={24} color={iconColor} strokeWidth={1.5} />
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Text style={styles.name}>{name}</Text>
                <Text style={styles.tagline} numberOfLines={2}>
                    {tagline}
                </Text>
                <Text style={styles.price}>
                    From ₹{pricePerMonth.toLocaleString('en-IN')}/mo
                </Text>
            </View>

            {/* CTA Row */}
            <View style={styles.ctaRow}>
                <Text style={styles.ctaText}>Start Assessment</Text>
                <ChevronRight size={18} color={colors.textPrimary} strokeWidth={2} />
            </View>
        </AnimatedPressable>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: borderRadius['2xl'],
        marginBottom: spacing.md,
        overflow: 'hidden',
        ...shadows.soft,
    },
    iconBadge: {
        position: 'absolute',
        top: spacing.lg,
        right: spacing.lg,
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.sm,
    },
    content: {
        padding: spacing.lg,
        paddingTop: spacing.xl,
        paddingRight: 80, // Space for icon badge
    },
    name: {
        fontFamily: fontFamilies.sansSemiBold,
        fontSize: fontSizes.cardTitle,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    tagline: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.label,
        color: colors.textSecondary,
        lineHeight: 20,
        marginBottom: spacing.sm,
    },
    price: {
        fontFamily: fontFamilies.sansMedium,
        fontSize: fontSizes.caption,
        color: colors.textTertiary,
    },
    ctaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    ctaText: {
        fontFamily: fontFamilies.sansSemiBold,
        fontSize: fontSizes.label,
        color: colors.textPrimary,
    },
});
