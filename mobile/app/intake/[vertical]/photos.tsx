/**
 * Photo Upload Screen
 * PR 5: Treatment + Questionnaire + Photo Restyle
 * Restyled with Clinical Luxe design system
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    ScrollView,
    Image,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from '@apollo/client';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Image as ImageIcon, X, Lock } from 'lucide-react-native';

import { colors } from '@/theme/colors';
import { fontFamilies, fontSizes } from '@/theme/typography';
import { spacing, borderRadius, screenSpacing } from '@/theme/spacing';
import { BackButton, PremiumButton } from '@/components/ui';
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

// Warm cream background for tips card
const TIPS_BG_COLOR = '#FAF7F0';

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
    const insets = useSafeAreaInsets();

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
        const uploadedPhotos = Object.entries(photos)
            .filter(([_, photo]) => photo.uploadedUrl)
            .map(([type, photo]) => ({
                type,
                url: photo.uploadedUrl!,
                localUri: photo.localUri,
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

    return (
        <SafeAreaView style={styles.container} edges={['top']} testID="photos-screen">
            {/* Header */}
            <View style={styles.header}>
                <BackButton onPress={handleBack} testID="back-button" />
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Title */}
                <Animated.View entering={FadeInUp.duration(300)}>
                    <Text style={styles.title}>Add photos</Text>
                    <Text style={styles.subtitle}>
                        Clear photos help our doctors provide accurate assessments
                    </Text>
                </Animated.View>

                {/* Photo Tips Card */}
                <Animated.View
                    entering={FadeInUp.delay(100).duration(300)}
                    style={styles.tipsCard}
                    testID="photo-tips-card"
                >
                    <View style={styles.tipsIconContainer}>
                        <Lock size={18} color={colors.accent} strokeWidth={2} />
                    </View>
                    <View style={styles.tipsContent}>
                        <Text style={styles.tipsTitle}>Photo tips for best results</Text>
                        <Text style={styles.tipsText}>
                            • Use good lighting (natural light is best){'\n'}
                            • Keep the camera steady{'\n'}
                            • Follow the specific instructions for each photo
                        </Text>
                    </View>
                </Animated.View>

                {/* Photo Requirements */}
                <View style={styles.photosSection}>
                    {photoRequirements.map((requirement, index) => {
                        const photo = photos[requirement.id];
                        const isUploading = photo?.uploading;
                        const hasPhoto = photo?.localUri || photo?.uploadedUrl;

                        return (
                            <Animated.View
                                key={requirement.id}
                                entering={FadeInUp.delay(150 + index * 50).duration(300)}
                                style={styles.photoCard}
                                testID={`photo-card-${requirement.id}`}
                            >
                                <View style={styles.photoHeader}>
                                    <View style={styles.labelRow}>
                                        <Text style={styles.photoLabel}>{requirement.label}</Text>
                                        {requirement.required && (
                                            <Text
                                                style={styles.requiredIndicator}
                                                testID={`required-indicator-${requirement.id}`}
                                            >
                                                *
                                            </Text>
                                        )}
                                    </View>
                                    <View style={[
                                        styles.badge,
                                        requirement.required ? styles.badgeRequired : styles.badgeOptional,
                                    ]}>
                                        <Text style={[
                                            styles.badgeText,
                                            requirement.required ? styles.badgeTextRequired : styles.badgeTextOptional,
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
                                                <ActivityIndicator color={colors.white} />
                                                <Text style={styles.uploadingText}>Uploading...</Text>
                                            </View>
                                        ) : (
                                            <Pressable
                                                style={styles.removeButton}
                                                onPress={() => handleRemovePhoto(requirement.id)}
                                            >
                                                <X size={14} color={colors.white} strokeWidth={2.5} />
                                            </Pressable>
                                        )}
                                        {photo.uploadedUrl && !isUploading && (
                                            <View style={styles.uploadedBadge}>
                                                <Text style={styles.uploadedBadgeText}>✓ Uploaded</Text>
                                            </View>
                                        )}
                                    </View>
                                ) : (
                                    <View style={styles.photoActions}>
                                        <Pressable
                                            style={styles.photoButton}
                                            onPress={() => handleTakePhoto(requirement)}
                                            testID={`camera-button-${requirement.id}`}
                                        >
                                            <Camera size={22} color={colors.textSecondary} strokeWidth={1.5} />
                                            <Text style={styles.photoButtonText}>Camera</Text>
                                        </Pressable>
                                        <Pressable
                                            style={styles.photoButton}
                                            onPress={() => handleChoosePhoto(requirement)}
                                            testID={`gallery-button-${requirement.id}`}
                                        >
                                            <ImageIcon size={22} color={colors.textSecondary} strokeWidth={1.5} />
                                            <Text style={styles.photoButtonText}>Gallery</Text>
                                        </Pressable>
                                    </View>
                                )}
                            </Animated.View>
                        );
                    })}
                </View>

                {/* Spacer for sticky CTA */}
                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Sticky CTA */}
            <View style={[styles.ctaContainer, { paddingBottom: insets.bottom + spacing.lg }]}>
                <LinearGradient
                    colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
                    style={styles.gradient}
                />
                <View style={styles.ctaContent}>
                    <PremiumButton
                        title="Continue"
                        onPress={handleContinue}
                        disabled={!allRequiredUploaded}
                        testID="continue-button"
                    />
                    {!allRequiredUploaded && requiredPhotos.length > 0 && (
                        <Text style={styles.helperText}>
                            Please add all required photos to continue
                        </Text>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: screenSpacing.horizontal,
        paddingVertical: spacing.md,
    },
    headerSpacer: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: screenSpacing.horizontal,
    },
    title: {
        fontFamily: fontFamilies.serifSemiBold,
        fontSize: 28,
        color: colors.textPrimary,
        letterSpacing: -0.5,
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.body,
        color: colors.textSecondary,
        marginBottom: spacing.xl,
    },
    tipsCard: {
        backgroundColor: TIPS_BG_COLOR,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginBottom: spacing.xl,
        flexDirection: 'row',
    },
    tipsIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    tipsContent: {
        flex: 1,
    },
    tipsTitle: {
        fontFamily: fontFamilies.sansSemiBold,
        fontSize: fontSizes.label,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    tipsText: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.caption,
        color: colors.textSecondary,
        lineHeight: fontSizes.caption * 1.5,
    },
    photosSection: {
        gap: spacing.md,
    },
    photoCard: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 20,
        padding: spacing.lg,
    },
    photoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    photoLabel: {
        fontFamily: fontFamilies.sansSemiBold,
        fontSize: fontSizes.body,
        color: colors.textPrimary,
    },
    requiredIndicator: {
        fontFamily: fontFamilies.sansSemiBold,
        fontSize: fontSizes.body,
        color: colors.error,
        marginLeft: 2,
    },
    badge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.md,
    },
    badgeRequired: {
        backgroundColor: `${colors.error}15`,
    },
    badgeOptional: {
        backgroundColor: colors.surfaceAlt,
    },
    badgeText: {
        fontFamily: fontFamilies.sansMedium,
        fontSize: fontSizes.caption,
    },
    badgeTextRequired: {
        color: colors.error,
    },
    badgeTextOptional: {
        color: colors.textTertiary,
    },
    photoInstructions: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.caption,
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
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        gap: spacing.xs,
    },
    photoButtonText: {
        fontFamily: fontFamilies.sansMedium,
        fontSize: fontSizes.label,
        color: colors.textSecondary,
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
        fontFamily: fontFamilies.sansMedium,
        fontSize: fontSizes.caption,
        color: colors.white,
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
        fontFamily: fontFamilies.sansMedium,
        fontSize: fontSizes.caption,
        color: colors.white,
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
    helperText: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.caption,
        color: colors.textTertiary,
        textAlign: 'center',
        marginTop: spacing.sm,
    },
});
