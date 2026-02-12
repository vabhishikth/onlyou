import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Platform,
    ScrollView,
    KeyboardAvoidingView,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from '@apollo/client';
import { colors, spacing, borderRadius, typography, shadows } from '@/styles/theme';
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
    const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;

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

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading questions...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error || !currentQuestion) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorIcon}>😕</Text>
                    <Text style={styles.errorTitle}>Unable to load questions</Text>
                    <Text style={styles.errorText}>
                        {error?.message || 'No questions available for this assessment'}
                    </Text>
                    <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
                        <Text style={styles.errorButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Header with progress */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                        <Text style={styles.backText}>←</Text>
                    </TouchableOpacity>
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${progress}%` }]} />
                        </View>
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
                    <Text style={styles.questionText}>{currentQuestion.question}</Text>

                    {/* Single choice options */}
                    {currentQuestion.type === 'single_choice' && currentQuestion.options && (
                        <View style={styles.optionsContainer}>
                            {currentQuestion.options.map((option) => {
                                const isSelected = responses[currentQuestion.id] === option;
                                return (
                                    <TouchableOpacity
                                        key={option}
                                        style={[
                                            styles.optionButton,
                                            isSelected && styles.optionButtonSelected,
                                        ]}
                                        onPress={() => handleSelectOption(option)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[
                                            styles.optionRadio,
                                            isSelected && styles.optionRadioSelected,
                                        ]}>
                                            {isSelected && <View style={styles.optionRadioInner} />}
                                        </View>
                                        <Text style={[
                                            styles.optionText,
                                            isSelected && styles.optionTextSelected,
                                        ]}>
                                            {option}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    {/* Multiple choice options */}
                    {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                        <View style={styles.optionsContainer}>
                            {currentQuestion.options.map((option) => {
                                const selections = (responses[currentQuestion.id] as string[]) || [];
                                const isSelected = selections.includes(option);
                                return (
                                    <TouchableOpacity
                                        key={option}
                                        style={[
                                            styles.optionButton,
                                            isSelected && styles.optionButtonSelected,
                                        ]}
                                        onPress={() => handleMultiSelect(option)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[
                                            styles.optionCheckbox,
                                            isSelected && styles.optionCheckboxSelected,
                                        ]}>
                                            {isSelected && <Text style={styles.checkmark}>✓</Text>}
                                        </View>
                                        <Text style={[
                                            styles.optionText,
                                            isSelected && styles.optionTextSelected,
                                        ]}>
                                            {option}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                            <Text style={styles.helperText}>Select all that apply</Text>
                        </View>
                    )}

                    {/* Text input */}
                    {currentQuestion.type === 'text' && (
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.textInput}
                                value={textValue}
                                onChangeText={setTextValue}
                                placeholder={currentQuestion.placeholder || 'Type your answer...'}
                                placeholderTextColor={colors.textTertiary}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                        </View>
                    )}

                    {/* Number input */}
                    {currentQuestion.type === 'number' && (
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.numberInput}
                                value={textValue}
                                onChangeText={setTextValue}
                                placeholder={currentQuestion.placeholder || 'Enter a number...'}
                                placeholderTextColor={colors.textTertiary}
                                keyboardType="numeric"
                            />
                        </View>
                    )}
                </ScrollView>

                {/* Footer with continue button */}
                {(currentQuestion.type !== 'single_choice' || !currentQuestion.options) && (
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[
                                styles.continueButton,
                                !isAnswered() && styles.continueButtonDisabled,
                            ]}
                            onPress={() => {
                                if (currentQuestion.type === 'text' || currentQuestion.type === 'number') {
                                    handleTextSubmit();
                                } else {
                                    handleNext();
                                }
                            }}
                            disabled={currentQuestion.required && !isAnswered()}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.continueButtonText}>
                                {currentIndex === totalQuestions - 1 ? 'Continue' : 'Next'}
                            </Text>
                        </TouchableOpacity>
                        {!currentQuestion.required && !isAnswered() && (
                            <TouchableOpacity
                                style={styles.skipButton}
                                onPress={() => handleNext()}
                            >
                                <Text style={styles.skipButtonText}>Skip this question</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    keyboardView: {
        flex: 1,
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
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    errorIcon: {
        fontSize: 64,
        marginBottom: spacing.lg,
    },
    errorTitle: {
        ...typography.headingMedium,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    errorText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    errorButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.full,
    },
    errorButtonText: {
        ...typography.button,
        color: colors.primaryText,
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
    progressContainer: {
        flex: 1,
        alignItems: 'center',
    },
    progressBar: {
        width: '80%',
        height: 4,
        backgroundColor: colors.border,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary,
    },
    progressText: {
        ...typography.label,
        color: colors.textTertiary,
        marginTop: spacing.xs,
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
    questionText: {
        ...typography.headingMedium,
        color: colors.text,
        marginBottom: spacing.xl,
    },
    optionsContainer: {
        gap: spacing.sm,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
    },
    optionButtonSelected: {
        borderColor: colors.primary,
        borderWidth: 2,
        backgroundColor: colors.accentLight,
    },
    optionRadio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    optionRadioSelected: {
        borderColor: colors.primary,
    },
    optionRadioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.primary,
    },
    optionCheckbox: {
        width: 22,
        height: 22,
        borderRadius: borderRadius.sm,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    optionCheckboxSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primary,
    },
    checkmark: {
        color: colors.primaryText,
        fontSize: 14,
        fontWeight: '700',
    },
    optionText: {
        ...typography.bodyMedium,
        color: colors.text,
        flex: 1,
    },
    optionTextSelected: {
        fontWeight: '500',
    },
    helperText: {
        ...typography.bodySmall,
        color: colors.textTertiary,
        marginTop: spacing.sm,
    },
    inputContainer: {
        marginTop: spacing.md,
    },
    textInput: {
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        minHeight: 120,
        ...typography.bodyMedium,
        color: colors.text,
    },
    numberInput: {
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        ...typography.headingMedium,
        color: colors.text,
        textAlign: 'center',
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
    skipButton: {
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    skipButtonText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
    },
});
