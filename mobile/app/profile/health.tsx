import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@apollo/client';
import { colors, spacing, borderRadius, typography } from '@/theme';
import { GET_PROFILE, GetProfileResponse } from '@/graphql/profile';

// Spec: Phase 11 — Health profile display screen

const GENDER_LABELS: Record<string, string> = {
    MALE: 'Male',
    FEMALE: 'Female',
    OTHER: 'Other',
};

export default function HealthProfileScreen() {
    const router = useRouter();
    const { data, loading } = useQuery<GetProfileResponse>(GET_PROFILE);

    const profile = data?.me?.patientProfile;

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer} testID="health-profile-loading">
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const buildAddress = () => {
        if (!profile) return null;
        const parts = [
            profile.addressLine1,
            profile.addressLine2,
            profile.city,
            profile.state,
            profile.pincode,
        ].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : null;
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>{'<'}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Health Profile</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {!profile ? (
                    <View style={styles.incompleteContainer} testID="health-profile-incomplete">
                        <Text style={styles.incompleteTitle}>Profile Incomplete</Text>
                        <Text style={styles.incompleteText}>
                            Complete your health profile to get personalized treatment recommendations
                        </Text>
                        <TouchableOpacity
                            style={styles.completeButton}
                            onPress={() => router.push('/profile/edit' as any)}
                        >
                            <Text style={styles.completeButtonText}>Complete Profile</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {/* Personal Details */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Personal Details</Text>

                            {profile.gender && (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Gender</Text>
                                    <Text style={styles.infoValue}>
                                        {GENDER_LABELS[profile.gender] || profile.gender}
                                    </Text>
                                </View>
                            )}

                            {profile.dateOfBirth && (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Date of Birth</Text>
                                    <Text style={styles.infoValue}>
                                        {formatDate(profile.dateOfBirth)}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Address */}
                        {buildAddress() && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Address</Text>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoValue}>{buildAddress()}</Text>
                                </View>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
    backButtonText: {
        fontSize: 24,
        color: colors.text,
    },
    headerTitle: {
        ...typography.headingSmall,
        color: colors.text,
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
    incompleteContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    incompleteTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    incompleteText: {
        ...typography.bodyMedium,
        color: colors.textTertiary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    completeButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.full,
    },
    completeButtonText: {
        ...typography.buttonSmall,
        color: colors.primaryText,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.md,
    },
    infoRow: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    infoLabel: {
        ...typography.label,
        color: colors.textTertiary,
        marginBottom: spacing.xs,
    },
    infoValue: {
        ...typography.bodyMedium,
        color: colors.text,
    },
});
