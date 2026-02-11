import { useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    SafeAreaView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation } from '@apollo/client';
import { colors, spacing, borderRadius, typography } from '@/styles/theme';
import {
    GET_QUESTIONNAIRE_TEMPLATE,
    SAVE_INTAKE_DRAFT,
    HealthVertical,
    QuestionnaireTemplate,
} from '@/graphql/intake';

export default function QuestionsScreen() {
    const { vertical } = useLocalSearchParams<{ vertical: string }>();
    const verticalKey = vertical?.toUpperCase().replace('-', '_') as HealthVertical;

    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [responses, setResponses] = useState<Record<string, string | string[]>>({});

    const { loading, error, data } = useQuery<{ questionnaireTemplate: QuestionnaireTemplate }>(
        GET_QUESTIONNAIRE_TEMPLATE,
        {
            variables: { input: { vertical: verticalKey } },
            skip: !verticalKey,
        }
    );

    const [saveDraft] = useMutation(SAVE_INTAKE_DRAFT);

    const sections = data?.questionnaireTemplate?.schema?.sections || [];
    const currentSection = sections[currentSectionIndex];
    const currentQuestion = currentSection?.questions?.[currentQuestionIndex];

    // Calculate progress
    const totalQuestions = sections.reduce((acc, s) => acc + s.questions.length, 0);
    const answeredQuestions = Object.keys(responses).length;
    const progress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

    // Get current question number (1-indexed, across all sections)
    const currentQuestionNumber = sections
        .slice(0, currentSectionIndex)
        .reduce((acc, s) => acc + s.questions.length, 0) + currentQuestionIndex + 1;

    const handleSelectOption = (option: string) => {
        if (!currentQuestion) return;

        if (currentQuestion.type === 'multiple_choice') {
            const current = (responses[currentQuestion.id] as string[]) || [];
            if (option === 'None of the above') {
                setResponses({ ...responses, [currentQuestion.id]: [option] });
            } else {
                const filtered = current.filter(o => o !== 'None of the above');
                if (filtered.includes(option)) {
                    setResponses({ ...responses, [currentQuestion.id]: filtered.filter(o => o !== option) });
                } else {
                    setResponses({ ...responses, [currentQuestion.id]: [...filtered, option] });
                }
            }
        } else {
            setResponses({ ...responses, [currentQuestion.id]: option });
        }
    };

    const handleTextChange = (text: string) => {
        if (!currentQuestion) return;
        setResponses({ ...responses, [currentQuestion.id]: text });
    };

    const isCurrentAnswered = useCallback(() => {
        if (!currentQuestion) return false;
        const answer = responses[currentQuestion.id];
        if (!answer) return false;
        if (Array.isArray(answer)) return answer.length > 0;
        return answer.trim().length > 0;
    }, [currentQuestion, responses]);

    const goToNext = async () => {
        if (!currentSection) return;

        // Save draft periodically
        if (answeredQuestions % 3 === 0 && answeredQuestions > 0) {
            try {
                await saveDraft({
                    variables: {
                        input: {
                            vertical: verticalKey,
                            responses,
                        },
                    },
                });
            } catch (e) {
                // Silently fail draft save
            }
        }

        // Move to next question
        if (currentQuestionIndex < currentSection.questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else if (currentSectionIndex < sections.length - 1) {
            // Move to next section
            setCurrentSectionIndex(currentSectionIndex + 1);
            setCurrentQuestionIndex(0);
        } else {
            // All questions answered - check if photos needed
            const photoRequirements = data?.questionnaireTemplate?.schema?.photoRequirements || [];
            if (photoRequirements.length > 0) {
                // Go to photos screen
                router.push({
                    pathname: `/intake/${vertical}/photos` as never,
                    params: { responses: JSON.stringify(responses) },
                });
            } else {
                // Skip photos, go directly to review
                router.push({
                    pathname: `/intake/${vertical}/review` as never,
                    params: { responses: JSON.stringify(responses), photos: JSON.stringify([]) },
                });
            }
        }
    };

    const goToPrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        } else if (currentSectionIndex > 0) {
            const prevSection = sections[currentSectionIndex - 1];
            setCurrentSectionIndex(currentSectionIndex - 1);
            setCurrentQuestionIndex(prevSection?.questions?.length ? prevSection.questions.length - 1 : 0);
        } else {
            // First question, confirm exit
            Alert.alert(
                'Exit Assessment?',
                'Your progress will be saved as a draft.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Exit',
                        style: 'destructive',
                        onPress: async () => {
                            if (Object.keys(responses).length > 0) {
                                try {
                                    await saveDraft({
                                        variables: {
                                            input: {
                                                vertical: verticalKey,
                                                responses,
                                            },
                                        },
                                    });
                                } catch (e) {
                                    // Silently fail
                                }
                            }
                            router.back();
                        },
                    },
                ]
            );
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (error || !currentQuestion) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Failed to load questions</Text>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={styles.errorLink}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${progress}%` }]} />
                    </View>
                    <Text style={styles.progressText}>
                        {currentQuestionNumber} of {totalQuestions}
                    </Text>
                </View>

                {/* Section Header */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{currentSection.title}</Text>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Question */}
                    <Text style={styles.questionText}>{currentQuestion.question}</Text>

                    {/* Answer Options */}
                    {currentQuestion.type === 'single_choice' && currentQuestion.options && (
                        <View style={styles.optionsContainer}>
                            {currentQuestion.options.map((option, index) => {
                                const isSelected = responses[currentQuestion.id] === option;
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                                        onPress={() => handleSelectOption(option)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                                            {isSelected && <View style={styles.radioInner} />}
                                        </View>
                                        <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                                            {option}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                        <View style={styles.optionsContainer}>
                            {currentQuestion.options.map((option, index) => {
                                const selected = (responses[currentQuestion.id] as string[]) || [];
                                const isSelected = selected.includes(option);
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                                        onPress={() => handleSelectOption(option)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                            {isSelected && <Text style={styles.checkmark}>✓</Text>}
                                        </View>
                                        <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                                            {option}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                            <Text style={styles.multiSelectHint}>Select all that apply</Text>
                        </View>
                    )}

                    {currentQuestion.type === 'text' && (
                        <View style={styles.textInputContainer}>
                            <TextInput
                                style={styles.textInput}
                                placeholder={currentQuestion.placeholder || 'Type your answer...'}
                                placeholderTextColor={colors.textTertiary}
                                value={(responses[currentQuestion.id] as string) || ''}
                                onChangeText={handleTextChange}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                        </View>
                    )}
                </ScrollView>

                {/* Navigation Buttons */}
                <View style={styles.navigationContainer}>
                    <TouchableOpacity style={styles.backButton} onPress={goToPrevious} activeOpacity={0.7}>
                        <Text style={styles.backButtonText}>← Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.nextButton, !isCurrentAnswered() && styles.nextButtonDisabled]}
                        onPress={goToNext}
                        disabled={!isCurrentAnswered()}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.nextButtonText}>
                            {currentSectionIndex === sections.length - 1 &&
                            currentQuestionIndex === currentSection.questions.length - 1
                                ? 'Review'
                                : 'Next'}
                        </Text>
                    </TouchableOpacity>
                </View>
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    errorText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    errorLink: {
        ...typography.bodyMedium,
        color: colors.primary,
        fontWeight: '600',
    },

    // Progress
    progressContainer: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
    },
    progressBar: {
        height: 4,
        backgroundColor: colors.surfaceSecondary,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.accent,
        borderRadius: 2,
    },
    progressText: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: spacing.xs,
        textAlign: 'right',
    },

    // Section
    sectionHeader: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    sectionTitle: {
        ...typography.label,
        color: colors.accent,
        textTransform: 'uppercase',
    },

    // Content
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.lg,
        paddingTop: spacing.sm,
    },

    // Question
    questionText: {
        ...typography.headingMedium,
        color: colors.text,
        marginBottom: spacing.xl,
    },

    // Options
    optionsContainer: {
        gap: spacing.sm,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    optionButtonSelected: {
        borderColor: colors.accent,
        backgroundColor: colors.accentLight + '20',
    },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: colors.border,
        marginRight: spacing.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioOuterSelected: {
        borderColor: colors.accent,
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.accent,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: colors.border,
        marginRight: spacing.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: {
        borderColor: colors.accent,
        backgroundColor: colors.accent,
    },
    checkmark: {
        color: colors.primaryText,
        fontSize: 14,
        fontWeight: '700',
    },
    optionText: {
        ...typography.bodyLarge,
        color: colors.text,
        flex: 1,
    },
    optionTextSelected: {
        fontWeight: '500',
    },
    multiSelectHint: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: spacing.sm,
        textAlign: 'center',
    },

    // Text Input
    textInputContainer: {
        marginTop: spacing.sm,
    },
    textInput: {
        ...typography.bodyLarge,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        minHeight: 120,
        color: colors.text,
    },

    // Navigation
    navigationContainer: {
        flexDirection: 'row',
        padding: spacing.lg,
        paddingBottom: spacing.xl,
        gap: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    backButton: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
    },
    backButtonText: {
        ...typography.button,
        color: colors.textSecondary,
    },
    nextButton: {
        flex: 1,
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    nextButtonDisabled: {
        backgroundColor: colors.surfaceSecondary,
    },
    nextButtonText: {
        ...typography.button,
        color: colors.primaryText,
    },
});
