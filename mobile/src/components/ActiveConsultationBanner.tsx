/**
 * ActiveConsultationBanner Component
 * Shows active consultation status on Home screen
 * Spec: master spec Section 3.7 — Consultation lifecycle
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Stethoscope, ChevronRight } from 'lucide-react-native';

import { colors } from '@/theme/colors';
import { fontFamilies, fontSizes } from '@/theme/typography';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import { Consultation } from '@/graphql/intake';

interface ActiveConsultationBannerProps {
    consultations: Consultation[];
}

// Terminal statuses — do not show in banner
const TERMINAL_STATUSES = ['APPROVED', 'REJECTED'];

// Patient-facing status labels
const STATUS_LABELS: Record<string, string> = {
    PENDING_ASSESSMENT: 'Your assessment is being reviewed',
    AI_REVIEWED: 'AI review complete, awaiting doctor',
    DOCTOR_REVIEWING: 'A doctor is reviewing your case',
    VIDEO_SCHEDULED: 'Video consultation scheduled',
    VIDEO_COMPLETED: 'Video complete, awaiting prescription',
    AWAITING_LABS: 'Lab tests required before prescription',
    NEEDS_INFO: 'Doctor needs additional information',
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ActiveConsultationBanner({
    consultations = [],
}: ActiveConsultationBannerProps) {
    const router = useRouter();
    const scale = useSharedValue(1);

    // All hooks must be called before any conditional return (Rules of Hooks)
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    // Find the most recent active consultation — sort by createdAt desc, then pick first active
    const activeConsultation = [...consultations]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .find((c) => !TERMINAL_STATUSES.includes(c.status));

    if (!activeConsultation) {
        return null;
    }

    const statusLabel = STATUS_LABELS[activeConsultation.status] || activeConsultation.status;

    const handlePressIn = () => {
        scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    };

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.push('/(tabs)/activity' as any);
    };

    return (
        <AnimatedPressable
            style={[styles.banner, animatedStyle]}
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            testID="active-consultation-banner"
        >
            <View style={styles.iconContainer} testID="consultation-icon">
                <Stethoscope size={20} color={colors.info} strokeWidth={1.5} />
            </View>
            <View style={styles.content}>
                <Text style={styles.title}>Consultation</Text>
                <Text style={styles.status} numberOfLines={1}>
                    {statusLabel}
                </Text>
            </View>
            <ChevronRight size={20} color={colors.textTertiary} strokeWidth={2} />
        </AnimatedPressable>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        marginBottom: spacing.lg,
        backgroundColor: colors.infoLight,
        borderWidth: 1,
        borderColor: colors.info,
        ...shadows.soft,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
        backgroundColor: colors.white,
    },
    content: {
        flex: 1,
    },
    title: {
        fontFamily: fontFamilies.sansSemiBold,
        fontSize: fontSizes.label,
        color: colors.textPrimary,
        marginBottom: 2,
    },
    status: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.caption,
        color: colors.textSecondary,
    },
});
