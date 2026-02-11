import { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Image,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation } from '@apollo/client';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, borderRadius, typography } from '@/styles/theme';
import {
    GET_QUESTIONNAIRE_TEMPLATE,
    GET_PRESIGNED_UPLOAD_URL,
    HealthVertical,
    QuestionnaireTemplate,
    PhotoRequirement,
    PresignedUrlResponse,
} from '@/graphql/intake';

interface CapturedPhoto {
    id: string;
    uri: string;
    base64?: string;
}

export default function PhotosScreen() {
    const { vertical, responses: responsesParam } = useLocalSearchParams<{
        vertical: string;
        responses: string;
    }>();
    const verticalKey = vertical?.toUpperCase().replace('-', '_') as HealthVertical;
    const responses = responsesParam ? JSON.parse(responsesParam) : {};

    const [capturedPhotos, setCapturedPhotos] = useState<Record<string, CapturedPhoto>>({});
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');

    const { data } = useQuery<{ questionnaireTemplate: QuestionnaireTemplate }>(
        GET_QUESTIONNAIRE_TEMPLATE,
        {
            variables: { input: { vertical: verticalKey } },
            skip: !verticalKey,
        }
    );

    const [getPresignedUrl] = useMutation<{ getPresignedUploadUrl: PresignedUrlResponse }>(
        GET_PRESIGNED_UPLOAD_URL
    );

    const photoRequirements: PhotoRequirement[] =
        data?.questionnaireTemplate?.schema?.photoRequirements || [];

    const requiredPhotos = photoRequirements.filter((p) => p.required);
    const allRequiredCaptured = requiredPhotos.every((p) => capturedPhotos[p.id]);

    const requestPermissions = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                'Camera Permission Required',
                'Please allow camera access to take photos for your assessment.',
                [{ text: 'OK' }]
            );
            return false;
        }
        return true;
    };

    const handleTakePhoto = async (requirement: PhotoRequirement) => {
        const hasPermission = await requestPermissions();
        if (!hasPermission) return;

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
            base64: true,
        });

        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            const photo: CapturedPhoto = {
                id: requirement.id,
                uri: asset.uri,
            };
            if (asset.base64) photo.base64 = asset.base64;
            setCapturedPhotos((prev) => ({ ...prev, [requirement.id]: photo }));
        }
    };

    const handleChooseFromLibrary = async (requirement: PhotoRequirement) => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
            base64: true,
        });

        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            const photo: CapturedPhoto = {
                id: requirement.id,
                uri: asset.uri,
            };
            if (asset.base64) photo.base64 = asset.base64;
            setCapturedPhotos((prev) => ({ ...prev, [requirement.id]: photo }));
        }
    };

    const handlePhotoAction = (requirement: PhotoRequirement) => {
        Alert.alert('Add Photo', 'Choose how to add your photo', [
            { text: 'Take Photo', onPress: () => handleTakePhoto(requirement) },
            { text: 'Choose from Library', onPress: () => handleChooseFromLibrary(requirement) },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const handleRemovePhoto = (requirementId: string) => {
        setCapturedPhotos((prev) => {
            const updated = { ...prev };
            delete updated[requirementId];
            return updated;
        });
    };

    // Upload a single photo to S3
    const uploadPhotoToS3 = async (photo: CapturedPhoto): Promise<{ type: string; url: string } | null> => {
        try {
            if (!photo.base64) {
                console.error('No base64 data for', photo.id);
                return null;
            }

            // Get presigned URL from backend
            console.log('[Photos] Getting presigned URL for', photo.id, '...');
            const startPresigned = Date.now();
            let presignedData;
            try {
                const result = await getPresignedUrl({
                    variables: {
                        input: {
                            fileType: photo.id,
                            contentType: 'image/jpeg',
                        },
                    },
                });
                presignedData = result.data;
                console.log('[Photos] Presigned URL call took', Date.now() - startPresigned, 'ms');
            } catch (gqlError) {
                console.error('[Photos] GraphQL error getting presigned URL:', gqlError);
                return null;
            }

            if (!presignedData?.getPresignedUploadUrl) {
                console.error('Failed to get presigned URL for', photo.id);
                return null;
            }

            const { uploadUrl, fileUrl } = presignedData.getPresignedUploadUrl;

            // Convert base64 to Blob for proper upload
            const response = await fetch(`data:image/jpeg;base64,${photo.base64}`);
            const blob = await response.blob();

            console.log('Uploading to presigned URL:', uploadUrl.substring(0, 100) + '...');
            console.log('Blob size:', blob.size, 'type:', blob.type);

            // Set up timeout for S3 upload (60 seconds for large images)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);

            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'image/jpeg',
                },
                body: blob,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!uploadResponse.ok) {
                let errorText = '';
                try {
                    errorText = await uploadResponse.text();
                } catch (e) {
                    errorText = 'Could not read error response';
                }
                console.error('S3 upload failed:', {
                    photoId: photo.id,
                    status: uploadResponse.status,
                    statusText: uploadResponse.statusText,
                    error: errorText,
                });
                return null;
            }

            console.log('Uploaded', photo.id, 'to', fileUrl);
            return { type: photo.id, url: fileUrl };
        } catch (error: unknown) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.error('S3 upload timeout for', photo.id, '- exceeded 60 seconds');
            } else {
                console.error('Error uploading photo', photo.id, error);
            }
            return null;
        }
    };

    const handleContinue = async () => {
        const photosToUpload = Object.values(capturedPhotos);

        if (photosToUpload.length === 0) {
            // No photos to upload, go directly to review
            router.push({
                pathname: `/intake/${vertical}/review` as never,
                params: {
                    responses: JSON.stringify(responses),
                    photos: JSON.stringify([]),
                },
            });
            return;
        }

        setIsUploading(true);
        setUploadProgress(`Uploading photos (0/${photosToUpload.length})...`);

        try {
            const uploadedPhotos: { type: string; url: string }[] = [];

            for (let i = 0; i < photosToUpload.length; i++) {
                const photo = photosToUpload[i];
                if (!photo) continue;
                setUploadProgress(`Uploading photos (${i + 1}/${photosToUpload.length})...`);
                const result = await uploadPhotoToS3(photo);
                if (result) {
                    uploadedPhotos.push(result);
                }
            }

            if (uploadedPhotos.length !== photosToUpload.length) {
                Alert.alert(
                    'Upload Error',
                    'Some photos failed to upload. Please try again.',
                    [{ text: 'OK' }]
                );
                setIsUploading(false);
                return;
            }

            console.log('All photos uploaded:', uploadedPhotos);

            router.push({
                pathname: `/intake/${vertical}/review` as never,
                params: {
                    responses: JSON.stringify(responses),
                    photos: JSON.stringify(uploadedPhotos),
                },
            });
        } catch (error) {
            console.error('Error uploading photos:', error);
            Alert.alert(
                'Upload Error',
                'Failed to upload photos. Please check your connection and try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsUploading(false);
        }
    };

    const handleSkip = () => {
        if (requiredPhotos.length > 0) {
            Alert.alert(
                'Required Photos Missing',
                'Some photos are required for your assessment. Please capture them to continue.',
                [{ text: 'OK' }]
            );
            return;
        }

        router.push({
            pathname: `/intake/${vertical}/review` as never,
            params: {
                responses: JSON.stringify(responses),
                photos: JSON.stringify([]),
            },
        });
    };

    const handleBack = () => {
        router.back();
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Upload Overlay */}
            {isUploading && (
                <View style={styles.uploadOverlay}>
                    <View style={styles.uploadModal}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.uploadText}>{uploadProgress}</Text>
                    </View>
                </View>
            )}

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerIcon}>📸</Text>
                    <Text style={styles.headerTitle}>Add Photos</Text>
                    <Text style={styles.headerSubtitle}>
                        Photos help your doctor make a more accurate assessment
                    </Text>
                </View>

                {/* Photo Requirements */}
                <View style={styles.photosContainer}>
                    {photoRequirements.map((requirement) => {
                        const captured = capturedPhotos[requirement.id];
                        return (
                            <View key={requirement.id} style={styles.photoCard}>
                                <View style={styles.photoHeader}>
                                    <Text style={styles.photoLabel}>{requirement.label}</Text>
                                    <View
                                        style={[
                                            styles.badge,
                                            requirement.required
                                                ? styles.requiredBadge
                                                : styles.optionalBadge,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.badgeText,
                                                requirement.required
                                                    ? styles.requiredBadgeText
                                                    : styles.optionalBadgeText,
                                            ]}
                                        >
                                            {requirement.required ? 'Required' : 'Optional'}
                                        </Text>
                                    </View>
                                </View>

                                {requirement.instructions && (
                                    <Text style={styles.photoInstructions}>
                                        {requirement.instructions}
                                    </Text>
                                )}

                                {captured ? (
                                    <View style={styles.capturedContainer}>
                                        <Image
                                            source={{ uri: captured.uri }}
                                            style={styles.capturedImage}
                                        />
                                        <View style={styles.capturedActions}>
                                            <TouchableOpacity
                                                style={styles.retakeButton}
                                                onPress={() => handlePhotoAction(requirement)}
                                            >
                                                <Text style={styles.retakeButtonText}>Retake</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.removeButton}
                                                onPress={() => handleRemovePhoto(requirement.id)}
                                            >
                                                <Text style={styles.removeButtonText}>Remove</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={styles.addPhotoButton}
                                        onPress={() => handlePhotoAction(requirement)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.addPhotoIcon}>📷</Text>
                                        <Text style={styles.addPhotoText}>Tap to add photo</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* Privacy Note */}
                <View style={styles.privacyNote}>
                    <Text style={styles.privacyIcon}>🔒</Text>
                    <Text style={styles.privacyText}>
                        Your photos are encrypted and only visible to your assigned doctor.
                    </Text>
                </View>
            </ScrollView>

            {/* Bottom Actions */}
            <View style={styles.bottomActions}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack} disabled={isUploading}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>

                {requiredPhotos.length === 0 && Object.keys(capturedPhotos).length === 0 && (
                    <TouchableOpacity style={styles.skipButton} onPress={handleSkip} disabled={isUploading}>
                        <Text style={styles.skipButtonText}>Skip</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.continueButton, (!allRequiredCaptured || isUploading) && styles.continueButtonDisabled]}
                    onPress={handleContinue}
                    disabled={!allRequiredCaptured || isUploading}
                    activeOpacity={0.8}
                >
                    <Text style={styles.continueButtonText}>
                        {isUploading ? 'Uploading...' : 'Continue'}
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.lg,
        paddingBottom: spacing.xxl,
    },

    // Upload Overlay
    uploadOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    uploadModal: {
        backgroundColor: colors.surface,
        padding: spacing.xl,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        minWidth: 200,
    },
    uploadText: {
        ...typography.bodyMedium,
        color: colors.text,
        marginTop: spacing.md,
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

    // Photos Container
    photosContainer: {
        gap: spacing.md,
    },
    photoCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
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
        ...typography.headingSmall,
        color: colors.text,
        flex: 1,
    },
    badge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.sm,
    },
    requiredBadge: {
        backgroundColor: '#FDECEA',
    },
    optionalBadge: {
        backgroundColor: colors.surfaceSecondary,
    },
    badgeText: {
        ...typography.caption,
        fontWeight: '600',
    },
    requiredBadgeText: {
        color: colors.error,
    },
    optionalBadgeText: {
        color: colors.textSecondary,
    },
    photoInstructions: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },

    // Add Photo Button
    addPhotoButton: {
        backgroundColor: colors.surfaceSecondary,
        borderRadius: borderRadius.md,
        padding: spacing.xl,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: 'dashed',
    },
    addPhotoIcon: {
        fontSize: 32,
        marginBottom: spacing.sm,
    },
    addPhotoText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
    },

    // Captured Photo
    capturedContainer: {
        gap: spacing.sm,
    },
    capturedImage: {
        width: '100%',
        height: 200,
        borderRadius: borderRadius.md,
        backgroundColor: colors.surfaceSecondary,
    },
    capturedActions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    retakeButton: {
        flex: 1,
        paddingVertical: spacing.sm,
        backgroundColor: colors.surfaceSecondary,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    retakeButtonText: {
        ...typography.bodyMedium,
        color: colors.text,
        fontWeight: '500',
    },
    removeButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    removeButtonText: {
        ...typography.bodyMedium,
        color: colors.error,
        fontWeight: '500',
    },

    // Privacy
    privacyNote: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.successLight,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginTop: spacing.xl,
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
    skipButton: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
    },
    skipButtonText: {
        ...typography.button,
        color: colors.textSecondary,
    },
    continueButton: {
        flex: 1,
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    continueButtonDisabled: {
        backgroundColor: colors.surfaceSecondary,
    },
    continueButtonText: {
        ...typography.button,
        color: colors.primaryText,
    },
});
