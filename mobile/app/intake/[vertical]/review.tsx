import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Image,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from '@apollo/client';
import { colors, spacing, borderRadius, typography, shadows } from '@/styles/theme';
import {
    GET_QUESTIONNAIRE_TEMPLATE,
    SUBMIT_INTAKE,
    QuestionnaireSchema,
    PhotoInput,
    HealthVertical,
} from '@/graphql/intake';

// Map URL path to DB enum
const pathToVertical: Record<string, HealthVertical> = {
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

export default function ReviewScreen() {
    const {
        vertical,
        responses: responsesParam,
        photos: photosParam,
    } = useLocalSearchParams<{
        vertical: string;
        responses: string;
        photos?: string;
    }>();
    const router = useRouter();

    const [consentChecked, setConsentChecked] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const dbVertical = pathToVertical[vertical || ''] || 'HAIR_LOSS';
    const responses: Record<string, unknown> = responsesParam ? JSON.parse(responsesParam) : {};
    const photos: PhotoInput[] = photosParam ? JSON.parse(photosParam) : [];

    // Fetch questionnaire template
    const { data } = useQuery(GET_QUESTIONNAIRE_TEMPLATE, {
        variables: { input: { vertical: dbVertical } },
    });

    // Submit mutation
    const [submitIntake] = useMutation(SUBMIT_INTAKE);

    const schema = data?.questionnaireTemplate?.schema as QuestionnaireSchema | undefined;

    // Build question map for displaying answers
    const questionMap = new Map<string, { question: string; sectionTitle: string }>();
    schema?.sections?.forEach((section) => {
        section.questions.forEach((q) => {
            questionMap.set(q.id, { question: q.question, sectionTitle: section.title });
        });
    });

    const handleBack = () => {
        router.back();
    };

    const handleSubmit = async () => {
        if (!consentChecked) {
            Alert.alert('Consent Required', 'Please agree to the terms to continue.');
            return;
        }

        setSubmitting(true);

        try {
            const { data: result } = await submitIntake({
                variables: {
                    input: {
                        vertical: dbVertical,
                        responses,
                        photos: photos.length > 0 ? photos : undefined,
                    },
                },
            });

            if (result?.submitIntake.success) {
                router.push({
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    pathname: `/intake/${vertical}/complete` as any,
                    params: {
                        consultationId: result.submitIntake.consultation?.id,
                    },
                });
            } else {
                Alert.alert('Error', result?.submitIntake.message || 'Failed to submit');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Something went wrong');
        } finally {
            setSubmitting(false);
        }
    };

    // Group responses by section
    const groupedResponses: { sectionTitle: string; items: { question: string; answer: string }[] }[] = [];
    const sectionMap = new Map<string, { question: string; answer: string }[]>();

    Object.entries(responses).forEach(([questionId, answer]) => {
        const qInfo = questionMap.get(questionId);
        if (!qInfo) return;

        const answerText = Array.isArray(answer) ? answer.join(', ') : String(answer);

        if (!sectionMap.has(qInfo.sectionTitle)) {
            sectionMap.set(qInfo.sectionTitle, []);
        }
        sectionMap.get(qInfo.sectionTitle)!.push({
            question: qInfo.question,
            answer: answerText,
        });
    });

    sectionMap.forEach((items, sectionTitle) => {
        groupedResponses.push({ sectionTitle, items });
    });

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Review</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Summary header */}
                <View style={styles.summaryHeader}>
                    <Text style={styles.summaryTitle}>
                        {verticalNames[vertical || ''] || 'Assessment'} Summary
                    </Text>
                    <Text style={styles.summarySubtitle}>
                        Please review your responses before submitting
                    </Text>
                </View>

                {/* Responses by section */}
                {groupedResponses.map((section, sectionIndex) => (
                    <View key={sectionIndex} style={styles.section}>
                        <Text style={styles.sectionTitle}>{section.sectionTitle}</Text>
                        {section.items.map((item, itemIndex) => (
                            <View key={itemIndex} style={styles.responseItem}>
                                <Text style={styles.questionText}>{item.question}</Text>
                                <Text style={styles.answerText}>{item.answer}</Text>
                            </View>
                        ))}
                    </View>
                ))}

                {/* Photos section */}
                {photos.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Photos</Text>
                        <View style={styles.photosGrid}>
                            {photos.map((photo, index) => (
                                <View key={index} style={styles.photoItem}>
                                    <Image
                                        source={{ uri: photo.url }}
                                        style={styles.photoThumbnail}
                                    />
                                    <Text style={styles.photoLabel}>{photo.type}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Consent section */}
                <View style={styles.consentSection}>
                    <TouchableOpacity
                        style={styles.consentRow}
                        onPress={() => setConsentChecked(!consentChecked)}
                        activeOpacity={0.7}
                    >
                        <View style={[
                            styles.checkbox,
                            consentChecked && styles.checkboxChecked,
                        ]}>
                            {consentChecked && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={styles.consentText}>
                            I understand that this is a medical consultation and I agree to the{' '}
                            <Text style={styles.consentLink}>Terms of Service</Text>,{' '}
                            <Text style={styles.consentLink}>Privacy Policy</Text>, and{' '}
                            <Text style={styles.consentLink}>Consent for Telehealth Services</Text>.
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* What happens next */}
                <View style={styles.nextStepsCard}>
                    <Text style={styles.nextStepsTitle}>What happens next?</Text>
                    <View style={styles.nextStep}>
                        <Text style={styles.nextStepIcon}>1️⃣</Text>
                        <Text style={styles.nextStepText}>
                            A specialist doctor reviews your assessment
                        </Text>
                    </View>
                    <View style={styles.nextStep}>
                        <Text style={styles.nextStepIcon}>2️⃣</Text>
                        <Text style={styles.nextStepText}>
                            You receive your personalized treatment plan (usually within 24 hours)
                        </Text>
                    </View>
                    <View style={styles.nextStep}>
                        <Text style={styles.nextStepIcon}>3️⃣</Text>
                        <Text style={styles.nextStepText}>
                            Medications are delivered discreetly to your doorstep
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[
                        styles.submitButton,
                        (!consentChecked || submitting) && styles.submitButtonDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={!consentChecked || submitting}
                    activeOpacity={0.8}
                >
                    {submitting ? (
                        <ActivityIndicator color={colors.primaryText} />
                    ) : (
                        <Text style={styles.submitButtonText}>Submit Assessment</Text>
                    )}
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
    summaryHeader: {
        marginBottom: spacing.xl,
    },
    summaryTitle: {
        ...typography.headingLarge,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    summarySubtitle: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
    },
    section: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    sectionTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.md,
    },
    responseItem: {
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    questionText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    answerText: {
        ...typography.bodyMedium,
        color: colors.text,
        fontWeight: '500',
    },
    photosGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    photoItem: {
        width: '48%',
    },
    photoThumbnail: {
        width: '100%',
        height: 100,
        borderRadius: borderRadius.md,
        marginBottom: spacing.xs,
    },
    photoLabel: {
        ...typography.label,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    consentSection: {
        marginBottom: spacing.xl,
    },
    consentRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: borderRadius.sm,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
        marginTop: 2,
    },
    checkboxChecked: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    checkmark: {
        color: colors.primaryText,
        fontSize: 14,
        fontWeight: '700',
    },
    consentText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        flex: 1,
        lineHeight: 20,
    },
    consentLink: {
        color: colors.primary,
        fontWeight: '500',
    },
    nextStepsCard: {
        backgroundColor: colors.accentLight,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.accent,
    },
    nextStepsTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.md,
    },
    nextStep: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: spacing.sm,
    },
    nextStepIcon: {
        fontSize: 18,
        marginRight: spacing.sm,
    },
    nextStepText: {
        ...typography.bodyMedium,
        color: colors.text,
        flex: 1,
    },
    footer: {
        padding: spacing.lg,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    submitButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md + 2,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.md,
    },
    submitButtonDisabled: {
        backgroundColor: colors.textTertiary,
    },
    submitButtonText: {
        ...typography.button,
        color: colors.primaryText,
    },
});
