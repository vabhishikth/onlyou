import { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ActivityIndicator,
    Alert,
    Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation } from '@apollo/client';
import { colors, spacing, borderRadius, typography } from '@/styles/theme';
import {
    GET_QUESTIONNAIRE_TEMPLATE,
    SUBMIT_INTAKE,
    HealthVertical,
    QuestionnaireTemplate,
    PhotoInput,
} from '@/graphql/intake';

// Photo data passed from photos screen (S3 URLs already uploaded)
interface PhotoData {
    type: string;
    url: string;
}

export default function ReviewScreen() {
    const { vertical, responses: responsesParam, photos: photosParam } = useLocalSearchParams<{
        vertical: string;
        responses: string;
        photos?: string;
    }>();
    const verticalKey = vertical?.toUpperCase().replace('-', '_') as HealthVertical;
    const responses: Record<string, string | string[]> = responsesParam
        ? JSON.parse(responsesParam)
        : {};
    const photoData: PhotoData[] = photosParam ? JSON.parse(photosParam) : [];

    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data } = useQuery<{ questionnaireTemplate: QuestionnaireTemplate }>(
        GET_QUESTIONNAIRE_TEMPLATE,
        {
            variables: { input: { vertical: verticalKey } },
            skip: !verticalKey,
        }
    );

    const [submitIntake] = useMutation(SUBMIT_INTAKE);

    const sections = data?.questionnaireTemplate?.schema?.sections || [];
    const photoRequirements = data?.questionnaireTemplate?.schema?.photoRequirements || [];

    // Map photo type to label
    const getPhotoLabel = (type: string): string => {
        const requirement = photoRequirements.find((p) => p.id === type);
        return requirement?.label || type;
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            // Photos are already uploaded to S3, just pass them directly
            const photosForSubmit: PhotoInput[] = photoData.map((p) => ({
                type: p.type,
                url: p.url,
            }));

            const result = await submitIntake({
                variables: {
                    input: {
                        vertical: verticalKey,
                        responses,
                        photos: photosForSubmit.length > 0 ? photosForSubmit : undefined,
                    },
                },
            });

            if (result.data?.submitIntake?.success) {
                router.replace(`/intake/${vertical}/complete` as never);
            } else {
                Alert.alert('Error', result.data?.submitIntake?.message || 'Failed to submit');
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Something went wrong';
            Alert.alert('Error', message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = () => {
        router.back();
    };

    const formatAnswer = (answer: string | string[]): string => {
        if (Array.isArray(answer)) {
            return answer.join(', ');
        }
        return answer;
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerIcon}>📋</Text>
                    <Text style={styles.headerTitle}>Review Your Answers</Text>
                    <Text style={styles.headerSubtitle}>
                        Please review your responses before submitting to the doctor.
                    </Text>
                </View>

                {/* Answers by Section */}
                {sections.map((section) => (
                    <View key={section.id} style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>

                        {section.questions.map((question) => {
                            const answer = responses[question.id];
                            if (!answer) return null;

                            return (
                                <View key={question.id} style={styles.answerItem}>
                                    <Text style={styles.questionLabel}>{question.question}</Text>
                                    <Text style={styles.answerText}>{formatAnswer(answer)}</Text>
                                </View>
                            );
                        })}
                    </View>
                ))}

                {/* Photos Section */}
                {photoData.length > 0 && (
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Photos</Text>
                        <View style={styles.photosGrid}>
                            {photoData.map((photo, index) => (
                                <View key={index} style={styles.photoItem}>
                                    <Image
                                        source={{ uri: photo.url }}
                                        style={styles.photoThumbnail}
                                    />
                                    <Text style={styles.photoLabel}>{getPhotoLabel(photo.type)}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Privacy Note */}
                <View style={styles.privacyNote}>
                    <Text style={styles.privacyIcon}>🔒</Text>
                    <Text style={styles.privacyText}>
                        Your answers are protected by doctor-patient confidentiality and encrypted
                        in transit.
                    </Text>
                </View>
            </ScrollView>

            {/* Bottom Actions */}
            <View style={styles.bottomActions}>
                <TouchableOpacity
                    style={styles.editButton}
                    onPress={handleEdit}
                    disabled={isSubmitting}
                >
                    <Text style={styles.editButtonText}>Edit Answers</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                    activeOpacity={0.8}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color={colors.primaryText} />
                    ) : (
                        <Text style={styles.submitButtonText}>Submit to Doctor</Text>
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.lg,
        paddingBottom: spacing.xxl,
    },

    // Header
    header: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    headerIcon: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    headerTitle: {
        ...typography.headingLarge,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    headerSubtitle: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        textAlign: 'center',
    },

    // Section Card
    sectionCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    sectionTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.md,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },

    // Answer Item
    answerItem: {
        marginBottom: spacing.md,
    },
    questionLabel: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    answerText: {
        ...typography.bodyLarge,
        color: colors.text,
        fontWeight: '500',
    },

    // Photos
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
        backgroundColor: colors.surfaceSecondary,
    },
    photoLabel: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: spacing.xs,
        textAlign: 'center',
    },

    // Privacy
    privacyNote: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.successLight,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginTop: spacing.md,
    },
    privacyIcon: {
        fontSize: 20,
        marginRight: spacing.sm,
    },
    privacyText: {
        ...typography.bodySmall,
        color: colors.text,
        flex: 1,
    },

    // Bottom Actions
    bottomActions: {
        padding: spacing.lg,
        paddingBottom: spacing.xl,
        gap: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    editButton: {
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    editButtonText: {
        ...typography.button,
        color: colors.textSecondary,
    },
    submitButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    submitButtonDisabled: {
        backgroundColor: colors.surfaceSecondary,
    },
    submitButtonText: {
        ...typography.button,
        color: colors.primaryText,
    },
});
