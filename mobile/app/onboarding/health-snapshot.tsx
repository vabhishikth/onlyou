/**
 * Health Snapshot Screen — Step 4 of 4
 * Multi-question flow for each selected health goal
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation } from '@apollo/client';

import { ScreenWrapper, SelectionCard, PremiumButton, BackButton } from '@/components/ui';
import { colors } from '@/theme/colors';
import { fontFamilies, fontSizes } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { useOnboardingStore, HealthGoal } from '@/store/onboardingStore';
import { getQuestionsForCondition, Question, QuestionOption } from '@/data/healthQuestions';
import { UPSERT_HEALTH_PROFILE, COMPLETE_ONBOARDING } from '@/graphql/onboarding';

export default function HealthSnapshotScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { healthGoals, setHealthSnapshot, reset } = useOnboardingStore();

    // Track current condition and question indices
    const [conditionIndex, setConditionIndex] = useState(0);
    const [questionIndex, setQuestionIndex] = useState(0);

    // Responses for current condition
    const [currentResponses, setCurrentResponses] = useState<Record<string, string | string[] | number>>({});
    const [isSaving, setIsSaving] = useState(false);

    // GraphQL mutations
    const [upsertHealthProfile] = useMutation(UPSERT_HEALTH_PROFILE);
    const [completeOnboarding] = useMutation(COMPLETE_ONBOARDING);

    // Get all questions organized by condition
    const allConditions = useMemo(() => {
        return healthGoals.map((goal) => ({
            condition: goal,
            questions: getQuestionsForCondition(goal),
        }));
    }, [healthGoals]);

    const currentCondition = allConditions[conditionIndex];
    const currentQuestion = currentCondition?.questions[questionIndex];

    // Calculate total questions and current position
    const totalQuestions = useMemo(() => {
        return allConditions.reduce((sum, c) => sum + c.questions.length, 0);
    }, [allConditions]);

    const currentQuestionNumber = useMemo(() => {
        let count = 0;
        for (let i = 0; i < conditionIndex; i++) {
            count += allConditions[i].questions.length;
        }
        return count + questionIndex + 1;
    }, [allConditions, conditionIndex, questionIndex]);

    const isLastQuestion = conditionIndex === allConditions.length - 1 &&
        questionIndex === currentCondition?.questions.length - 1;

    const handleSingleSelect = useCallback((optionId: string) => {
        setCurrentResponses((prev) => ({
            ...prev,
            [currentQuestion!.id]: optionId,
        }));
    }, [currentQuestion]);

    const handleMultiSelect = useCallback((optionId: string) => {
        setCurrentResponses((prev) => {
            const current = (prev[currentQuestion!.id] as string[]) || [];
            const updated = current.includes(optionId)
                ? current.filter((id) => id !== optionId)
                : [...current, optionId];
            return { ...prev, [currentQuestion!.id]: updated };
        });
    }, [currentQuestion]);

    const handleNumberChange = useCallback((value: string) => {
        const num = parseFloat(value) || 0;
        setCurrentResponses((prev) => ({
            ...prev,
            [currentQuestion!.id]: num,
        }));
    }, [currentQuestion]);

    const saveCurrentCondition = async () => {
        if (!currentCondition) return;

        try {
            await upsertHealthProfile({
                variables: {
                    input: {
                        condition: currentCondition.condition,
                        responses: currentResponses,
                    },
                },
            });
            setHealthSnapshot(currentCondition.condition, currentResponses);
        } catch (error) {
            console.error('Error saving health profile:', error);
            throw error;
        }
    };

    const handleNext = async () => {
        const isLastQuestionInCondition = questionIndex === currentCondition?.questions.length - 1;

        if (isLastQuestionInCondition) {
            // Save current condition's responses
            setIsSaving(true);
            try {
                await saveCurrentCondition();

                if (isLastQuestion) {
                    // Complete onboarding
                    await completeOnboarding();
                    // Navigate to main app
                    router.replace('/(tabs)' as any);
                    reset();
                } else {
                    // Move to next condition
                    setConditionIndex((prev) => prev + 1);
                    setQuestionIndex(0);
                    setCurrentResponses({});
                }
            } catch (error) {
                console.error('Error saving:', error);
            } finally {
                setIsSaving(false);
            }
        } else {
            // Move to next question in same condition
            setQuestionIndex((prev) => prev + 1);
        }
    };

    const handleBack = () => {
        if (questionIndex > 0) {
            setQuestionIndex((prev) => prev - 1);
        } else if (conditionIndex > 0) {
            // Go back to previous condition's last question
            const prevCondition = allConditions[conditionIndex - 1];
            setConditionIndex((prev) => prev - 1);
            setQuestionIndex(prevCondition.questions.length - 1);
        } else {
            // Go back to location screen
            router.back();
        }
    };

    // Check if current question is answered
    const isAnswered = useMemo(() => {
        if (!currentQuestion) return false;
        const response = currentResponses[currentQuestion.id];

        if (currentQuestion.type === 'single') {
            return !!response;
        }
        if (currentQuestion.type === 'multi') {
            return Array.isArray(response) && response.length > 0;
        }
        if (currentQuestion.type === 'number' || currentQuestion.type === 'number_toggle') {
            return typeof response === 'number' && response > 0;
        }
        return false;
    }, [currentQuestion, currentResponses]);

    if (!currentCondition || !currentQuestion) {
        return null;
    }

    const conditionLabel = {
        HAIR_LOSS: 'Hair Loss',
        SEXUAL_HEALTH: 'Sexual Wellness',
        WEIGHT_MANAGEMENT: 'Weight Management',
        PCOS: 'PCOS & Hormones',
    }[currentCondition.condition];

    return (
        <ScreenWrapper
            scrollable={true}
            testID="health-snapshot-screen"
            style={styles.screen}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.backRow}>
                    <BackButton onPress={handleBack} testID="health-snapshot-back" />
                </View>

                {/* Step indicator */}
                <Text style={styles.microHeader}>HEALTH SNAPSHOT</Text>

                {/* Progress text */}
                <Text style={styles.progressText}>
                    Question {currentQuestionNumber} of {totalQuestions}
                </Text>

                {/* Condition badge */}
                <View style={styles.conditionBadge}>
                    <Text style={styles.conditionText}>{conditionLabel}</Text>
                </View>
            </View>

            {/* Question Content */}
            <Animated.View
                key={`${currentCondition.condition}-${currentQuestion.id}`}
                entering={FadeInRight.duration(300)}
                exiting={FadeOutLeft.duration(200)}
                style={styles.content}
            >
                {/* Question */}
                <Text style={styles.question}>{currentQuestion.text}</Text>

                {/* Multi-select hint */}
                {currentQuestion.type === 'multi' && (
                    <Text style={styles.multiHint}>(Select all that apply)</Text>
                )}

                {/* Options for single/multi select */}
                {(currentQuestion.type === 'single' || currentQuestion.type === 'multi') &&
                    currentQuestion.options && (
                        <View style={styles.options}>
                            {currentQuestion.options.map((option) => {
                                const response = currentResponses[currentQuestion.id];
                                const isSelected =
                                    currentQuestion.type === 'single'
                                        ? response === option.id
                                        : Array.isArray(response) && response.includes(option.id);

                                return (
                                    <SelectionCard
                                        key={option.id}
                                        title={option.label}
                                        selected={isSelected}
                                        onPress={() =>
                                            currentQuestion.type === 'single'
                                                ? handleSingleSelect(option.id)
                                                : handleMultiSelect(option.id)
                                        }
                                        style={styles.optionCard}
                                        testID={`option-${option.id}`}
                                    />
                                );
                            })}
                        </View>
                    )}

                {/* Number input */}
                {currentQuestion.type === 'number' && (
                    <View style={styles.numberInputContainer}>
                        <TextInput
                            style={styles.numberInput}
                            value={
                                currentResponses[currentQuestion.id]?.toString() || ''
                            }
                            onChangeText={handleNumberChange}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={colors.textMuted}
                            testID="number-input"
                        />
                        {currentQuestion.numberSuffix && (
                            <Text style={styles.numberSuffix}>
                                {currentQuestion.numberSuffix}
                            </Text>
                        )}
                    </View>
                )}
            </Animated.View>

            {/* Bottom CTA */}
            <View style={[styles.ctaContainer, { paddingBottom: insets.bottom + spacing.lg }]}>
                <LinearGradient
                    colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
                    style={styles.gradient}
                />
                <View style={styles.ctaContent}>
                    <PremiumButton
                        title={isLastQuestion ? 'Complete' : 'Next'}
                        onPress={handleNext}
                        disabled={!isAnswered}
                        loading={isSaving}
                        testID="health-snapshot-next-button"
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
    header: {
        paddingTop: spacing.sm,
        paddingHorizontal: spacing.lg,
    },
    backRow: {
        height: 44,
        justifyContent: 'center',
    },
    microHeader: {
        fontFamily: fontFamilies.sansMedium,
        fontSize: 12,
        color: colors.textTertiary,
        letterSpacing: 1.5,
        textAlign: 'center',
        marginTop: spacing.md,
    },
    progressText: {
        fontFamily: fontFamilies.sansMedium,
        fontSize: 13,
        color: colors.textTertiary,
        textAlign: 'center',
        marginTop: spacing.xs,
    },
    conditionBadge: {
        alignSelf: 'center',
        marginTop: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.full,
    },
    conditionText: {
        fontFamily: fontFamilies.sansMedium,
        fontSize: fontSizes.caption,
        color: colors.textSecondary,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
    },
    question: {
        fontFamily: fontFamilies.serifSemiBold,
        fontSize: 26,
        color: colors.textPrimary,
        lineHeight: 34,
    },
    multiHint: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.caption,
        color: colors.textTertiary,
        marginTop: spacing.sm,
    },
    options: {
        marginTop: spacing.xl,
        gap: spacing.sm,
    },
    optionCard: {
        marginBottom: 0,
    },
    numberInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.xxl,
    },
    numberInput: {
        fontFamily: fontFamilies.sansSemiBold,
        fontSize: 48,
        color: colors.textPrimary,
        textAlign: 'center',
        minWidth: 120,
    },
    numberSuffix: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: 24,
        color: colors.textTertiary,
        marginLeft: spacing.sm,
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
