import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@apollo/client';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme';
import {
    GET_AVAILABLE_PLANS,
    SubscriptionPlan,
    formatAmount,
    calculateSavings,
    getPlanDurationLabel,
    getMonthlyEquivalent,
} from '@/graphql/payment';

// Spec: master spec Section 3.6 — Review & Consent → Plan Selection → Payment

// Map URL path to DB enum
const pathToVertical: Record<string, string> = {
    'hair-loss': 'HAIR_LOSS',
    'sexual-health': 'SEXUAL_HEALTH',
    'pcos': 'PCOS',
    'weight-management': 'WEIGHT_MANAGEMENT',
};

const verticalNames: Record<string, string> = {
    'hair-loss': 'Hair Loss',
    'sexual-health': 'Sexual Health',
    'pcos': 'PCOS',
    'weight-management': 'Weight Management',
};

export default function PlanSelectionScreen() {
    const {
        vertical,
        responses,
        photos,
    } = useLocalSearchParams<{
        vertical: string;
        responses: string;
        photos?: string;
    }>();
    const router = useRouter();

    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

    const dbVertical = pathToVertical[vertical || ''] || 'HAIR_LOSS';
    const verticalName = verticalNames[vertical || ''] || 'Treatment';

    // Fetch available plans
    const { data, loading, error } = useQuery(GET_AVAILABLE_PLANS, {
        variables: { vertical: dbVertical },
    });

    const plans: SubscriptionPlan[] = data?.availablePlans || [];
    const monthlyPlan = plans.find((p) => p.durationMonths === 1);
    const selectedPlan = plans.find((p) => p.id === selectedPlanId);

    const handleBack = () => {
        router.back();
    };

    const handleContinue = () => {
        if (!selectedPlan) return;

        router.push({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            pathname: `/intake/${vertical}/payment` as any,
            params: {
                vertical,
                responses,
                photos: photos || '[]',
                planId: selectedPlan.id,
                amountPaise: String(selectedPlan.priceInPaise),
                planName: selectedPlan.name,
                durationMonths: String(selectedPlan.durationMonths),
            },
        });
    };

    // Loading state
    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading plans...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Error state
    if (error || plans.length === 0) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.errorText}>Unable to load plans</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={handleBack}>
                        <Text style={styles.retryButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Text style={styles.backText}>{'<'}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Choose Your Plan</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Intro */}
                <View style={styles.introSection}>
                    <Text style={styles.introTitle}>{verticalName} Treatment</Text>
                    <Text style={styles.introSubtitle}>
                        Select a plan to begin your personalized treatment journey
                    </Text>
                </View>

                {/* Plan Cards */}
                {plans.map((plan) => {
                    const isSelected = selectedPlanId === plan.id;
                    const isMonthly = plan.durationMonths === 1;
                    const savings = monthlyPlan && !isMonthly
                        ? calculateSavings(monthlyPlan.priceInPaise, plan.priceInPaise, plan.durationMonths)
                        : null;
                    const monthlyEquivalent = getMonthlyEquivalent(plan.priceInPaise, plan.durationMonths);
                    const durationLabel = getPlanDurationLabel(plan.durationMonths);

                    return (
                        <TouchableOpacity
                            key={plan.id}
                            testID={`plan-card-${plan.durationMonths}`}
                            style={[
                                styles.planCard,
                                isSelected && styles.planCardSelected,
                            ]}
                            onPress={() => setSelectedPlanId(plan.id)}
                            activeOpacity={0.7}
                        >
                            {/* Savings badge */}
                            {savings && savings.savingsPercent > 0 && (
                                <View style={styles.savingsBadge}>
                                    <Text style={styles.savingsBadgeText}>
                                        Save {savings.savingsPercent}%
                                    </Text>
                                </View>
                            )}

                            <View style={styles.planHeader}>
                                {/* Radio button */}
                                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                                    {isSelected && <View style={styles.radioInner} />}
                                </View>

                                <View style={styles.planInfo}>
                                    <Text style={[styles.planName, isSelected && styles.planNameSelected]}>
                                        {durationLabel}
                                    </Text>
                                    <Text style={styles.planDuration}>
                                        {plan.durationMonths} {plan.durationMonths === 1 ? 'month' : 'months'}
                                    </Text>
                                </View>

                                {!isSelected && (
                                    <View style={styles.priceContainer}>
                                        <Text style={styles.planPrice}>
                                            {formatAmount(plan.priceInPaise)}
                                        </Text>
                                        {!isMonthly && (
                                            <Text style={styles.monthlyEquivalent}>
                                                {formatAmount(monthlyEquivalent)}/mo
                                            </Text>
                                        )}
                                    </View>
                                )}
                            </View>

                            {/* Features */}
                            {isSelected && (
                                <View style={styles.featuresContainer}>
                                    {plan.features.map((feature, index) => (
                                        <View key={index} style={styles.featureRow}>
                                            <Text style={styles.featureCheck}>✓</Text>
                                            <Text style={styles.featureText}>{feature}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}

                {/* What's included card */}
                <View style={styles.includedCard}>
                    <Text style={styles.includedTitle}>What's included</Text>
                    <View style={styles.includedItem}>
                        <Text style={styles.includedIcon}>👨‍⚕️</Text>
                        <Text style={styles.includedText}>Specialist doctor consultation</Text>
                    </View>
                    <View style={styles.includedItem}>
                        <Text style={styles.includedIcon}>💊</Text>
                        <Text style={styles.includedText}>Monthly medication delivery</Text>
                    </View>
                    <View style={styles.includedItem}>
                        <Text style={styles.includedIcon}>💬</Text>
                        <Text style={styles.includedText}>Unlimited chat with your doctor</Text>
                    </View>
                    <View style={styles.includedItem}>
                        <Text style={styles.includedIcon}>📊</Text>
                        <Text style={styles.includedText}>Progress tracking & follow-ups</Text>
                    </View>
                    <View style={styles.includedItem}>
                        <Text style={styles.includedIcon}>🔬</Text>
                        <Text style={styles.includedText}>First blood panel included</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[
                        styles.continueButton,
                        !selectedPlan && styles.continueButtonDisabled,
                    ]}
                    onPress={handleContinue}
                    disabled={!selectedPlan}
                    activeOpacity={0.8}
                    testID="continue-to-payment"
                >
                    <Text style={styles.continueButtonText}>
                        {selectedPlan
                            ? `Continue to Payment · ${formatAmount(selectedPlan.priceInPaise)}`
                            : 'Select a plan to continue'}
                    </Text>
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
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        marginTop: spacing.md,
    },
    errorText: {
        ...typography.bodyMedium,
        color: colors.error,
        marginBottom: spacing.md,
    },
    retryButton: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    retryButtonText: {
        ...typography.button,
        color: colors.primary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backText: {
        fontSize: 24,
        color: colors.text,
    },
    headerTitle: {
        ...typography.headingSmall,
        color: colors.text,
        flex: 1,
        textAlign: 'center',
    },
    headerSpacer: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.lg,
    },
    introSection: {
        marginBottom: spacing.xl,
    },
    introTitle: {
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        fontSize: 28,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    introSubtitle: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
    },
    planCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 2,
        borderColor: colors.border,
    },
    planCardSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.accentLight,
    },
    savingsBadge: {
        position: 'absolute',
        top: -10,
        right: spacing.lg,
        backgroundColor: colors.success,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    savingsBadgeText: {
        ...typography.label,
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 11,
    },
    planHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    radio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    radioSelected: {
        borderColor: colors.primary,
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.primary,
    },
    planInfo: {
        flex: 1,
    },
    planName: {
        ...typography.bodyMedium,
        fontWeight: '600',
        color: colors.text,
    },
    planNameSelected: {
        color: colors.primary,
    },
    planDuration: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    planPrice: {
        ...typography.headingSmall,
        color: colors.text,
    },
    planPriceSelected: {
        color: colors.primary,
    },
    monthlyEquivalent: {
        ...typography.label,
        color: colors.textSecondary,
    },
    featuresContainer: {
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    featureCheck: {
        color: colors.success,
        fontSize: 14,
        marginRight: spacing.sm,
        fontWeight: '700',
    },
    featureText: {
        ...typography.bodySmall,
        color: colors.text,
    },
    includedCard: {
        backgroundColor: colors.accentLight,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginTop: spacing.md,
        borderWidth: 1,
        borderColor: colors.accent,
    },
    includedTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.md,
    },
    includedItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    includedIcon: {
        fontSize: 18,
        marginRight: spacing.sm,
    },
    includedText: {
        ...typography.bodyMedium,
        color: colors.text,
    },
    footer: {
        padding: spacing.lg,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    continueButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md + 2,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.md,
    },
    continueButtonDisabled: {
        backgroundColor: colors.textTertiary,
    },
    continueButtonText: {
        ...typography.button,
        color: colors.primaryText,
    },
});
