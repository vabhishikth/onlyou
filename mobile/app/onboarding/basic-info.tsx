/**
 * Basic Information Screen — Step 2 of 4
 * Full name, date of birth, sex at birth
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { ScreenWrapper, PremiumInput, PremiumButton } from '@/components/ui';
import { OnboardingHeader } from '@/components/onboarding';
import { colors } from '@/theme/colors';
import { fontFamilies, fontSizes } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { useOnboardingStore, Gender } from '@/store/onboardingStore';

interface GenderChipProps {
    label: string;
    value: Gender;
    selected: boolean;
    onPress: () => void;
    testID: string;
}

function GenderChip({ label, value, selected, onPress, testID }: GenderChipProps) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePress = () => {
        scale.value = withSpring(0.95, { damping: 10, stiffness: 300 });
        setTimeout(() => {
            scale.value = withSpring(1, { damping: 10, stiffness: 300 });
        }, 100);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
    };

    return (
        <Pressable onPress={handlePress} testID={testID}>
            <Animated.View
                style={[
                    styles.chip,
                    selected && styles.chipSelected,
                    animatedStyle,
                ]}
            >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {label}
                </Text>
            </Animated.View>
        </Pressable>
    );
}

// Format date as DD-MM-YYYY with auto-insert dashes
function formatDateInput(text: string): string {
    // Remove non-numeric characters
    const digits = text.replace(/\D/g, '');

    // Insert dashes at appropriate positions
    if (digits.length <= 2) {
        return digits;
    } else if (digits.length <= 4) {
        return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    } else {
        return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 8)}`;
    }
}

// Parse DD-MM-YYYY to Date object
function parseDate(dateStr: string): Date | null {
    const match = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!match) return null;

    const [, day, month, year] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    // Validate the date is real
    if (
        date.getDate() !== parseInt(day) ||
        date.getMonth() !== parseInt(month) - 1 ||
        date.getFullYear() !== parseInt(year)
    ) {
        return null;
    }

    return date;
}

// Calculate age from date
function calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
}

export default function BasicInfoScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { basicInfo, setBasicInfo, setCurrentStep } = useOnboardingStore();

    const [dobError, setDobError] = useState<string | undefined>();

    const handleFullNameChange = useCallback((text: string) => {
        setBasicInfo({ fullName: text });
    }, [setBasicInfo]);

    const handleDobChange = useCallback((text: string) => {
        const formatted = formatDateInput(text);
        setBasicInfo({ dateOfBirth: formatted });

        // Clear error while typing
        if (dobError) setDobError(undefined);

        // Validate when complete
        if (formatted.length === 10) {
            const date = parseDate(formatted);
            if (!date) {
                setDobError('Please enter a valid date');
            } else if (calculateAge(date) < 18) {
                setDobError('You must be at least 18 years old');
            }
        }
    }, [setBasicInfo, dobError]);

    const handleGenderSelect = useCallback((gender: Gender) => {
        setBasicInfo({ gender });
    }, [setBasicInfo]);

    const handleNext = () => {
        // Final validation
        if (basicInfo.dateOfBirth.length === 10) {
            const date = parseDate(basicInfo.dateOfBirth);
            if (!date) {
                setDobError('Please enter a valid date');
                return;
            }
            if (calculateAge(date) < 18) {
                setDobError('You must be at least 18 years old');
                return;
            }
        }

        setCurrentStep(3);
        router.push('/onboarding/location');
    };

    const isNextDisabled =
        !basicInfo.fullName.trim() ||
        basicInfo.dateOfBirth.length !== 10 ||
        !basicInfo.gender ||
        !!dobError;

    return (
        <ScreenWrapper
            scrollable={true}
            testID="basic-info-screen"
            style={styles.screen}
        >
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={100}
            >
                {/* Header */}
                <OnboardingHeader
                    currentStep={2}
                    testID="basic-info-header"
                />

                {/* Content */}
                <View style={styles.content}>
                    {/* Heading */}
                    <Animated.Text
                        entering={FadeInUp.delay(0).duration(400)}
                        style={styles.heading}
                    >
                        Tell us about yourself
                    </Animated.Text>

                    {/* Full Name Input */}
                    <Animated.View entering={FadeInUp.delay(80).duration(400)}>
                        <PremiumInput
                            label="Full name"
                            value={basicInfo.fullName}
                            onChangeText={handleFullNameChange}
                            autoCapitalize="words"
                            autoCorrect={false}
                            containerStyle={styles.inputWrapper}
                            testID="basic-info-fullname"
                        />
                    </Animated.View>

                    {/* Date of Birth Input */}
                    <Animated.View entering={FadeInUp.delay(160).duration(400)}>
                        <PremiumInput
                            label="Date of birth (DD-MM-YYYY)"
                            value={basicInfo.dateOfBirth}
                            onChangeText={handleDobChange}
                            keyboardType="numeric"
                            maxLength={10}
                            error={dobError}
                            containerStyle={styles.inputWrapper}
                            testID="basic-info-dob"
                        />
                    </Animated.View>

                    {/* Sex at Birth Chips */}
                    <Animated.View
                        entering={FadeInUp.delay(240).duration(400)}
                        style={styles.genderSection}
                    >
                        <Text style={styles.genderLabel}>Sex at birth</Text>
                        <View style={styles.chipRow}>
                            <GenderChip
                                label="Male"
                                value="MALE"
                                selected={basicInfo.gender === 'MALE'}
                                onPress={() => handleGenderSelect('MALE')}
                                testID="basic-info-gender-male"
                            />
                            <GenderChip
                                label="Female"
                                value="FEMALE"
                                selected={basicInfo.gender === 'FEMALE'}
                                onPress={() => handleGenderSelect('FEMALE')}
                                testID="basic-info-gender-female"
                            />
                            <GenderChip
                                label="Other"
                                value="OTHER"
                                selected={basicInfo.gender === 'OTHER'}
                                onPress={() => handleGenderSelect('OTHER')}
                                testID="basic-info-gender-other"
                            />
                        </View>
                    </Animated.View>
                </View>

                {/* Bottom CTA with gradient fade */}
                <View style={[styles.ctaContainer, { paddingBottom: insets.bottom + spacing.lg }]}>
                    <LinearGradient
                        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
                        style={styles.gradient}
                    />
                    <View style={styles.ctaContent}>
                        <PremiumButton
                            title="Next"
                            onPress={handleNext}
                            disabled={isNextDisabled}
                            testID="basic-info-next-button"
                        />
                    </View>
                </View>
            </KeyboardAvoidingView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    screen: {
        backgroundColor: colors.white,
    },
    flex: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
    },
    heading: {
        fontFamily: fontFamilies.serifSemiBold,
        fontSize: 28,
        color: colors.textPrimary,
        textAlign: 'left',
        marginBottom: spacing.xl,
    },
    inputWrapper: {
        marginBottom: spacing.md,
    },
    genderSection: {
        marginTop: spacing.md,
    },
    genderLabel: {
        fontFamily: fontFamilies.sansMedium,
        fontSize: fontSizes.caption,
        color: colors.textMuted,
        marginBottom: spacing.sm,
        marginLeft: spacing.sm,
    },
    chipRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    chip: {
        height: 44,
        paddingHorizontal: spacing.lg,
        borderRadius: 22,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chipSelected: {
        backgroundColor: colors.ctaPrimary,
        borderColor: colors.ctaPrimary,
    },
    chipText: {
        fontFamily: fontFamilies.sansMedium,
        fontSize: fontSizes.body,
        color: colors.textPrimary,
    },
    chipTextSelected: {
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
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
    },
});
