/**
 * Questionnaire Screen
 * PR 5: Treatment + Questionnaire + Photo Restyle
 * Restyled with Clinical Luxe design system
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from '@apollo/client';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { colors } from '@/theme/colors';
import { fontFamilies, fontSizes } from '@/theme/typography';
import { spacing, borderRadius, screenSpacing } from '@/theme/spacing';
import { BackButton, PremiumButton, SelectionCard, ProgressIndicator } from '@/components/ui';
import {
    GET_QUESTIONNAIRE_TEMPLATE,
    SAVE_INTAKE_DRAFT,
    Question,
    QuestionnaireSchema,
    HealthVertical,
} from '@/graphql/intake';

// Map URL path to DB enum
const pathToVertical: Record<string, HealthVertical> = {
    'hair-loss': 'HAIR_LOSS',
    'sexual-health': 'SEXUAL_HEALTH',
    'pcos': 'PCOS',
    'weight-management': 'WEIGHT_MANAGEMENT',
};

// Evaluate skip logic
function shouldShowQuestion(
    question: Question,
    responses: Record<string, unknown>
): boolean {
    if (!question.skipLogic) return true;

    const { showIf } = question.skipLogic;
    const dependentValue = responses[showIf.questionId];

    if (Array.isArray(showIf.value)) {
        return showIf.value.includes(dependentValue as string);
    }
    return dependentValue === showIf.value;
}

// Flatten all questions from sections
function flattenQuestions(schema: QuestionnaireSchema | undefined): Question[] {
    if (!schema?.sections) return [];
    return schema.sections.flatMap((section) => section.questions);
}

export default function QuestionsScreen() {
    const { vertical } = useLocalSearchParams<{ vertical: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [responses, setResponses] = useState<Record<string, unknown>>({});
    const [textValue, setTextValue] = useState('');

    const dbVertical = pathToVertical[vertical || ''] || 'HAIR_LOSS';

    // Fetch questionnaire template
    const { data, loading, error } = useQuery(GET_QUESTIONNAIRE_TEMPLATE, {
        variables: { input: { vertical: dbVertical } },
    });

    // Save draft mutation
    const [saveDraft] = useMutation(SAVE_INTAKE_DRAFT);

    const schema = data?.questionnaireTemplate?.schema as QuestionnaireSchema | undefined;
    const allQuestions = useMemo(() => flattenQuestions(schema), [schema]);

    // Filter questions based on skip logic
    const visibleQuestions = useMemo(() => {
        return allQuestions.filter((q) => shouldShowQuestion(q, responses));
    }, [allQuestions, responses]);

    const currentQuestion = visibleQuestions[currentIndex];
    const totalQuestions = visibleQuestions.length;

    // Sync text value with current question's response
    useEffect(() => {
        if (currentQuestion && responses[currentQuestion.id]) {
            const value = responses[currentQuestion.id];
            if (typeof value === 'string' || typeof value === 'number') {
                setTextValue(String(value));
            }
        } else {
            setTextValue('');
        }
    }, [currentIndex, currentQuestion?.id]);

    // Auto-save draft every 3 questions
    useEffect(() => {
        if (currentIndex > 0 && currentIndex % 3 === 0) {
            saveDraft({
                variables: {
                    input: {
                        vertical: dbVertical,
                        responses,
                    },
                },
            }).catch(console.error);
        }
    }, [currentIndex]);

    const handleSelectOption = (option: string) => {
        if (!currentQuestion) return;
        const newResponses = { ...responses, [currentQuestion.id]: option };
        setResponses(newResponses);

        // Auto-advance for single choice
        if (currentQuestion.type === 'single_choice') {
            setTimeout(() => handleNext(newResponses), 300);
        }
    };

    const handleMultiSelect = (option: string) => {
        if (!currentQuestion) return;
        const current = (responses[currentQuestion.id] as string[]) || [];
        const newValue = current.includes(option)
            ? current.filter((o) => o !== option)
            : [...current, option];
        setResponses({ ...responses, [currentQuestion.id]: newValue });
    };

    const handleTextSubmit = () => {
        if (!currentQuestion) return;
        if (textValue.trim()) {
            const value = currentQuestion.type === 'number' ? Number(textValue) : textValue;
            const newResponses = { ...responses, [currentQuestion.id]: value };
            setResponses(newResponses);
            handleNext(newResponses);
        }
    };

    const handleNext = (currentResponses = responses) => {
        // Recalculate visible questions with updated responses
        const newVisibleQuestions = allQuestions.filter((q) =>
            shouldShowQuestion(q, currentResponses)
        );

        if (currentIndex < newVisibleQuestions.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            // All questions answered, go to photos or review
            const photoRequirements = schema?.photoRequirements || [];

            if (photoRequirements.length > 0) {
                router.push({
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    pathname: `/intake/${vertical}/photos` as any,
                    params: { responses: JSON.stringify(currentResponses) },
                });
            } else {
                router.push({
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    pathname: `/intake/${vertical}/review` as any,
                    params: { responses: JSON.stringify(currentResponses) },
                });
            }
        }
    };

    const handleBack = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        } else {
            router.back();
        }
    };

    const isAnswered = () => {
        if (!currentQuestion) return false;
        const answer = responses[currentQuestion.id];

        switch (currentQuestion.type) {
            case 'single_choice':
                return !!answer;
            case 'multiple_choice':
                return Array.isArray(answer) && answer.length > 0;
            case 'text':
                return !!textValue.trim();
            case 'number':
                return textValue.trim() !== '' && !isNaN(Number(textValue));
            default:
                return false;
        }
    };

    // Loading state
    if (loading) {
        return (
            <SafeAreaView style={styles.container} testID="questions-screen">
                <View style={styles.centerContainer} testID="loading-indicator">
                    <ActivityIndicator size="large" color={colors.accent} />
                    <Text style={styles.loadingText}>Loading questions...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Error state
    if (error || !currentQuestion) {
        return (
            <SafeAreaView style={styles.container} testID="questions-screen">
                <View style={styles.centerContainer}>
                    <Text style={styles.errorTitle}>Unable to load questions</Text>
                    <Text style={styles.errorText}>
                        {error?.message || 'No questions available for this assessment'}
                    </Text>
                    <PremiumButton
                        title="Go Back"
                        onPress={() => router.back()}
                        variant="secondary"
                    />
                </View>
            </SafeAreaView>
        );
    }

    const showContinueButton = currentQuestion.type !== 'single_choice' || !currentQuestion.options;

    return (
        <SafeAreaView style={styles.container} edges={['top']} testID="questions-screen">
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Header */}
                <View style={styles.header}>
                    <BackButton onPress={handleBack} testID="back-button" />
                    <View style={styles.progressWrapper} testID="progress-indicator">
                        <ProgressIndicator
                            currentStep={currentIndex}
                            totalSteps={totalQuestions}
                        />
                        <Text style={styles.progressText}>
                            {currentIndex + 1} of {totalQuestions}
                        </Text>
                    </View>
                    <View style={styles.headerSpacer} />
                </View>

                {/* Question content */}
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View entering={FadeInRight.duration(300)}>
                        <Text style={styles.questionText} testID="question-text">
                            {currentQuestion.question}
                        </Text>
                    </Animated.View>

                    {/* Single choice options with SelectionCard */}
                    {currentQuestion.type === 'single_choice' && currentQuestion.options && (
                        <Animated.View
                            entering={FadeInUp.delay(100).duration(300)}
                            style={styles.optionsContainer}
                        >
                            {currentQuestion.options.map((option, index) => {
                                const isSelected = responses[currentQuestion.id] === option;
                                return (
                                    <Animated.View
                                        key={option}
                                        entering={FadeInUp.delay(150 + index * 50).duration(300)}
                                    >
                                        <SelectionCard
                                            title={option}
                                            selected={isSelected}
                                            onPress={() => handleSelectOption(option)}
                                            testID={`option-${option}`}
                                            style={styles.optionCard}
                                        />
                                    </Animated.View>
                                );
                            })}
                        </Animated.View>
                    )}

                    {/* Multiple choice options with SelectionCard */}
                    {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                        <Animated.View
                            entering={FadeInUp.delay(100).duration(300)}
                            style={styles.optionsContainer}
                        >
                            {currentQuestion.options.map((option, index) => {
                                const selections = (responses[currentQuestion.id] as string[]) || [];
                                const isSelected = selections.includes(option);
                                return (
                                    <Animated.View
                                        key={option}
                                        entering={FadeInUp.delay(150 + index * 50).duration(300)}
                                    >
                                        <SelectionCard
                                            title={option}
                                            selected={isSelected}
                                            onPress={() => handleMultiSelect(option)}
                                            testID={`option-${option}`}
                                            style={styles.optionCard}
                                        />
                                    </Animated.View>
                                );
                            })}
                            <Text style={styles.helperText}>Select all that apply</Text>
                        </Animated.View>
                    )}

                    {/* Text input */}
                    {currentQuestion.type === 'text' && (
                        <Animated.View
                            entering={FadeInUp.delay(100).duration(300)}
                            style={styles.inputContainer}
                        >
                            <TextInput
                                style={styles.textInput}
                                value={textValue}
                                onChangeText={setTextValue}
                                placeholder={currentQuestion.placeholder || 'Type your answer...'}
                                placeholderTextColor={colors.textMuted}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                                testID="text-input"
                            />
                        </Animated.View>
                    )}

                    {/* Number input */}
                    {currentQuestion.type === 'number' && (
                        <Animated.View
                            entering={FadeInUp.delay(100).duration(300)}
                            style={styles.inputContainer}
                        >
                            <TextInput
                                style={styles.numberInput}
                                value={textValue}
                                onChangeText={setTextValue}
                                placeholder={currentQuestion.placeholder || 'Enter a number'}
                                placeholderTextColor={colors.textMuted}
                                keyboardType="numeric"
                                testID="number-input"
                            />
                        </Animated.View>
                    )}

                    {/* Spacer for sticky CTA */}
                    <View style={{ height: 120 }} />
                </ScrollView>

                {/* Sticky CTA */}
                {showContinueButton && (
                    <View style={[styles.ctaContainer, { paddingBottom: insets.bottom + spacing.lg }]}>
                        <LinearGradient
                            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
                            style={styles.gradient}
                        />
                        <View style={styles.ctaContent}>
                            <PremiumButton
                                title={currentIndex === totalQuestions - 1 ? 'Continue' : 'Next'}
                                onPress={() => {
                                    if (currentQuestion.type === 'text' || currentQuestion.type === 'number') {
                                        handleTextSubmit();
                                    } else {
                                        handleNext();
                                    }
                                }}
                                disabled={currentQuestion.required && !isAnswered()}
                                testID="continue-button"
                            />
                            {!currentQuestion.required && !isAnswered() && (
                                <PremiumButton
                                    title="Skip this question"
                                    onPress={() => handleNext()}
                                    variant="ghost"
                                    style={styles.skipButton}
                                />
                            )}
                        </View>
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    keyboardView: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: screenSpacing.horizontal,
    },
    loadingText: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.body,
        color: colors.textSecondary,
        marginTop: spacing.md,
    },
    errorTitle: {
        fontFamily: fontFamilies.serifSemiBold,
        fontSize: fontSizes.sectionH,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    errorText: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: screenSpacing.horizontal,
        paddingVertical: spacing.md,
    },
    progressWrapper: {
        flex: 1,
        alignItems: 'center',
    },
    progressText: {
        fontFamily: fontFamilies.sansMedium,
        fontSize: fontSizes.caption,
        color: colors.textTertiary,
        marginTop: spacing.xs,
    },
    headerSpacer: {
        width: 44,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: screenSpacing.horizontal,
        paddingTop: spacing.xl,
    },
    questionText: {
        fontFamily: fontFamilies.serifSemiBold,
        fontSize: 26,
        color: colors.textPrimary,
        letterSpacing: -0.5,
        lineHeight: 26 * 1.3,
        marginBottom: spacing.xl,
    },
    optionsContainer: {
        gap: spacing.md,
    },
    optionCard: {
        marginBottom: 0,
    },
    helperText: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.label,
        color: colors.textTertiary,
        marginTop: spacing.sm,
    },
    inputContainer: {
        marginTop: spacing.md,
    },
    textInput: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        minHeight: 120,
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.body,
        color: colors.textPrimary,
    },
    numberInput: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        fontFamily: fontFamilies.sansSemiBold,
        fontSize: fontSizes.sectionH,
        color: colors.textPrimary,
        textAlign: 'center',
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
    skipButton: {
        marginTop: spacing.sm,
    },
});
