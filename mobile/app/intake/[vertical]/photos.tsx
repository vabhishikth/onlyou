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
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, borderRadius, typography, shadows } from '@/styles/theme';
import {
    GET_QUESTIONNAIRE_TEMPLATE,
    GET_PRESIGNED_UPLOAD_URL,
    QuestionnaireSchema,
    PhotoRequirement,
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

interface PhotoState {
    [key: string]: {
        localUri?: string;
        uploadedUrl?: string;
        uploading?: boolean;
    };
}

export default function PhotosScreen() {
    const { vertical, responses: responsesParam } = useLocalSearchParams<{
        vertical: string;
        responses: string;
    }>();
    const router = useRouter();

    const [photos, setPhotos] = useState<PhotoState>({});

    const dbVertical = pathToVertical[vertical || ''] || 'HAIR_LOSS';
    const responses = responsesParam ? JSON.parse(responsesParam) : {};

    // Fetch questionnaire template for photo requirements
    const { data } = useQuery(GET_QUESTIONNAIRE_TEMPLATE, {
        variables: { input: { vertical: dbVertical } },
    });

    // Get presigned URL mutation
    const [getPresignedUrl] = useMutation(GET_PRESIGNED_UPLOAD_URL);

    const schema = data?.questionnaireTemplate?.schema as QuestionnaireSchema | undefined;
    const photoRequirements = schema?.photoRequirements || [];

    // Check if all required photos are uploaded
    const requiredPhotos = photoRequirements.filter((p) => p.required);
    const allRequiredUploaded = requiredPhotos.every(
        (p) => photos[p.id]?.uploadedUrl
    );

    const handleTakePhoto = async (requirement: PhotoRequirement) => {
        // Request camera permission
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                'Permission Required',
                'Camera access is needed to take photos. Please enable it in your settings.'
            );
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            await uploadPhoto(requirement.id, asset.uri);
        }
    };

    const handleChoosePhoto = async (requirement: PhotoRequirement) => {
        // Request media library permission
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                'Permission Required',
                'Photo library access is needed. Please enable it in your settings.'
            );
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            await uploadPhoto(requirement.id, asset.uri);
        }
    };

    const uploadPhoto = async (photoId: string, localUri: string) => {
        setPhotos((prev) => ({
            ...prev,
            [photoId]: { localUri, uploading: true },
        }));

        try {
            // Get presigned URL
            const { data: presignedData } = await getPresignedUrl({
                variables: {
                    input: {
                        fileType: 'intake-photo',
                        contentType: 'image/jpeg',
                    },
                },
            });

            if (!presignedData?.getPresignedUploadUrl) {
                throw new Error('Failed to get upload URL');
            }

            const { uploadUrl, fileUrl } = presignedData.getPresignedUploadUrl;

            // Upload to S3
            const response = await fetch(localUri);
            const blob = await response.blob();

            await fetch(uploadUrl, {
                method: 'PUT',
                body: blob,
                headers: {
                    'Content-Type': 'image/jpeg',
                },
            });

            setPhotos((prev) => ({
                ...prev,
                [photoId]: { localUri, uploadedUrl: fileUrl, uploading: false },
            }));
        } catch (error) {
            console.error('Upload error:', error);
            Alert.alert('Upload Failed', 'Failed to upload photo. Please try again.');
            setPhotos((prev) => ({
                ...prev,
                [photoId]: { localUri, uploading: false },
            }));
        }
    };

    const handleRemovePhoto = (photoId: string) => {
        setPhotos((prev) => {
            const newPhotos = { ...prev };
            delete newPhotos[photoId];
            return newPhotos;
        });
    };

    const handleContinue = () => {
        // Collect uploaded photos
        const uploadedPhotos: PhotoInput[] = Object.entries(photos)
            .filter(([_, photo]) => photo.uploadedUrl)
            .map(([type, photo]) => ({
                type,
                url: photo.uploadedUrl!,
            }));

        router.push({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            pathname: `/intake/${vertical}/review` as any,
            params: {
                responses: JSON.stringify(responses),
                photos: JSON.stringify(uploadedPhotos),
            },
        });
    };

    const handleBack = () => {
        router.back();
    };

    const handleSkip = () => {
        if (requiredPhotos.length > 0) {
            Alert.alert(
                'Required Photos',
                'Some photos are required for your assessment. Please upload them to continue.',
                [{ text: 'OK' }]
            );
        } else {
            handleContinue();
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Upload Photos</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Instructions */}
                <View style={styles.instructionsCard}>
                    <Text style={styles.instructionsIcon}>📷</Text>
                    <Text style={styles.instructionsTitle}>Photo Guidelines</Text>
                    <Text style={styles.instructionsText}>
                        Clear photos help our doctors provide accurate assessments. Use good lighting and follow the instructions for each photo.
                    </Text>
                </View>

                {/* Photo requirements */}
                <View style={styles.photosSection}>
                    {photoRequirements.map((requirement) => {
                        const photo = photos[requirement.id];
                        const isUploading = photo?.uploading;
                        const hasPhoto = photo?.localUri || photo?.uploadedUrl;

                        return (
                            <View key={requirement.id} style={styles.photoCard}>
                                <View style={styles.photoHeader}>
                                    <Text style={styles.photoLabel}>{requirement.label}</Text>
                                    <View style={[
                                        styles.requiredBadge,
                                        requirement.required ? styles.requiredBadgeRequired : styles.requiredBadgeOptional,
                                    ]}>
                                        <Text style={[
                                            styles.requiredBadgeText,
                                            requirement.required ? styles.requiredTextRequired : styles.requiredTextOptional,
                                        ]}>
                                            {requirement.required ? 'Required' : 'Optional'}
                                        </Text>
                                    </View>
                                </View>

                                {requirement.instructions && (
                                    <Text style={styles.photoInstructions}>
                                        {requirement.instructions}
                                    </Text>
                                )}

                                {hasPhoto ? (
                                    <View style={styles.photoPreviewContainer}>
                                        <Image
                                            source={{ uri: photo.localUri || photo.uploadedUrl }}
                                            style={styles.photoPreview}
                                        />
                                        {isUploading ? (
                                            <View style={styles.uploadingOverlay}>
                                                <ActivityIndicator color={colors.primaryText} />
                                                <Text style={styles.uploadingText}>Uploading...</Text>
                                            </View>
                                        ) : (
                                            <TouchableOpacity
                                                style={styles.removeButton}
                                                onPress={() => handleRemovePhoto(requirement.id)}
                                            >
                                                <Text style={styles.removeButtonText}>✕</Text>
                                            </TouchableOpacity>
                                        )}
                                        {photo.uploadedUrl && !isUploading && (
                                            <View style={styles.uploadedBadge}>
                                                <Text style={styles.uploadedBadgeText}>✓ Uploaded</Text>
                                            </View>
                                        )}
                                    </View>
                                ) : (
                                    <View style={styles.photoActions}>
                                        <TouchableOpacity
                                            style={styles.photoButton}
                                            onPress={() => handleTakePhoto(requirement)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.photoButtonIcon}>📷</Text>
                                            <Text style={styles.photoButtonText}>Take Photo</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.photoButton, styles.photoButtonSecondary]}
                                            onPress={() => handleChoosePhoto(requirement)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.photoButtonIcon}>🖼️</Text>
                                            <Text style={[styles.photoButtonText, styles.photoButtonTextSecondary]}>
                                                Choose Photo
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[
                        styles.continueButton,
                        !allRequiredUploaded && styles.continueButtonDisabled,
                    ]}
                    onPress={handleContinue}
                    disabled={!allRequiredUploaded}
                    activeOpacity={0.8}
                >
                    <Text style={styles.continueButtonText}>Continue</Text>
                </TouchableOpacity>
                {!allRequiredUploaded && requiredPhotos.length === 0 && (
                    <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                        <Text style={styles.skipButtonText}>Skip photos</Text>
                    </TouchableOpacity>
                )}
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
    instructionsCard: {
        backgroundColor: colors.infoLight,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.info,
    },
    instructionsIcon: {
        fontSize: 32,
        marginBottom: spacing.sm,
    },
    instructionsTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    instructionsText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    photosSection: {
        gap: spacing.lg,
    },
    photoCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    photoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    photoLabel: {
        ...typography.bodyLarge,
        fontWeight: '600',
        color: colors.text,
    },
    requiredBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    requiredBadgeRequired: {
        backgroundColor: colors.errorLight,
    },
    requiredBadgeOptional: {
        backgroundColor: colors.surface,
    },
    requiredBadgeText: {
        ...typography.label,
    },
    requiredTextRequired: {
        color: colors.error,
    },
    requiredTextOptional: {
        color: colors.textTertiary,
    },
    photoInstructions: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    photoActions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    photoButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        gap: spacing.xs,
    },
    photoButtonSecondary: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    photoButtonIcon: {
        fontSize: 18,
    },
    photoButtonText: {
        ...typography.buttonSmall,
        color: colors.primaryText,
    },
    photoButtonTextSecondary: {
        color: colors.text,
    },
    photoPreviewContainer: {
        position: 'relative',
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },
    photoPreview: {
        width: '100%',
        height: 200,
        borderRadius: borderRadius.lg,
    },
    uploadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadingText: {
        ...typography.bodySmall,
        color: colors.primaryText,
        marginTop: spacing.xs,
    },
    removeButton: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.error,
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeButtonText: {
        color: colors.primaryText,
        fontSize: 14,
        fontWeight: '700',
    },
    uploadedBadge: {
        position: 'absolute',
        bottom: spacing.sm,
        left: spacing.sm,
        backgroundColor: colors.success,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.sm,
    },
    uploadedBadgeText: {
        ...typography.label,
        color: colors.primaryText,
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
