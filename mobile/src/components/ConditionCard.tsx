import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme';
import { HealthVertical } from '@/graphql/intake';

interface ConditionCardProps {
    id: HealthVertical;
    name: string;
    tagline: string;
    icon: string;
    color: string;
    pricePerMonth: number;
}

// Map vertical ID to URL-friendly path
const verticalToPath: Record<HealthVertical, string> = {
    HAIR_LOSS: 'hair-loss',
    SEXUAL_HEALTH: 'sexual-health',
    PCOS: 'pcos',
    WEIGHT_MANAGEMENT: 'weight-management',
};

export default function ConditionCard({
    id,
    name,
    tagline,
    icon,
    color,
    pricePerMonth,
}: ConditionCardProps) {
    const router = useRouter();

    const handlePress = () => {
        const path = verticalToPath[id];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.push(`/intake/${path}` as any);
    };

    return (
        <TouchableOpacity
            style={[styles.card, { borderLeftColor: color }]}
            onPress={handlePress}
            activeOpacity={0.85}
        >
            <View style={styles.cardContent}>
                <Text style={styles.icon}>{icon}</Text>
                <View style={styles.textContent}>
                    <Text style={styles.name}>{name}</Text>
                    <Text style={styles.tagline} numberOfLines={2}>
                        {tagline}
                    </Text>
                    <View style={styles.priceRow}>
                        <Text style={styles.price}>
                            From ₹{pricePerMonth.toLocaleString('en-IN')}/mo
                        </Text>
                    </View>
                </View>
            </View>
            <View style={styles.ctaSection}>
                <Text style={styles.ctaText}>Start Assessment</Text>
                <Text style={styles.ctaArrow}>→</Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xl,
        borderLeftWidth: 4,
        marginBottom: spacing.md,
        ...shadows.md,
    },
    cardContent: {
        flexDirection: 'row',
        padding: spacing.lg,
        paddingBottom: spacing.md,
    },
    icon: {
        fontSize: 40,
        marginRight: spacing.md,
    },
    textContent: {
        flex: 1,
    },
    name: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    tagline: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    price: {
        ...typography.label,
        color: colors.textTertiary,
    },
    ctaSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomLeftRadius: borderRadius.xl,
        borderBottomRightRadius: borderRadius.xl,
    },
    ctaText: {
        ...typography.buttonSmall,
        color: colors.primary,
    },
    ctaArrow: {
        fontSize: 18,
        color: colors.primary,
    },
});
