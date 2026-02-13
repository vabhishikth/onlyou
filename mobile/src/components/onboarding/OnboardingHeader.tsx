/**
 * OnboardingHeader — Onlyou Design System
 * Shared header for onboarding screens with micro-header, back button, and progress
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { BackButton, ProgressIndicator } from '@/components/ui';
import { colors } from '@/theme/colors';
import { fontFamilies, fontSizes } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

interface OnboardingHeaderProps {
    currentStep: number;
    totalSteps?: number;
    showBackButton?: boolean;
    testID?: string;
}

export function OnboardingHeader({
    currentStep,
    totalSteps = 4,
    showBackButton = true,
    testID,
}: OnboardingHeaderProps) {
    const router = useRouter();

    const handleBack = () => {
        router.back();
    };

    return (
        <View style={styles.container} testID={testID}>
            {/* Back button row */}
            <View style={styles.backRow}>
                {showBackButton ? (
                    <BackButton onPress={handleBack} testID={`${testID}-back`} />
                ) : (
                    <View style={styles.backPlaceholder} />
                )}
            </View>

            {/* Micro header */}
            <Text style={styles.microHeader}>GETTING STARTED</Text>

            {/* Progress indicator */}
            <ProgressIndicator
                totalSteps={totalSteps}
                currentStep={currentStep - 1}
                style={styles.progress}
                testID={`${testID}-progress`}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop: spacing.sm,
        paddingHorizontal: spacing.lg,
    },
    backRow: {
        height: 44,
        justifyContent: 'center',
    },
    backPlaceholder: {
        width: 44,
        height: 44,
    },
    microHeader: {
        fontFamily: fontFamilies.sansMedium,
        fontSize: 12,
        color: colors.textTertiary,
        letterSpacing: 1.5,
        textAlign: 'center',
        marginTop: spacing.md,
    },
    progress: {
        marginTop: spacing.md,
    },
});

export default OnboardingHeader;
