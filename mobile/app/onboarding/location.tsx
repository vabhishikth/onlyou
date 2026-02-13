/**
 * Location Screen — Step 3 of 4
 * Pincode, state, city, and telehealth consent
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'lucide-react-native';
import { useLazyQuery, useMutation } from '@apollo/client';
import * as Haptics from 'expo-haptics';

import { ScreenWrapper, PremiumInput, PremiumButton } from '@/components/ui';
import { OnboardingHeader } from '@/components/onboarding';
import { colors } from '@/theme/colors';
import { fontFamilies, fontSizes } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { useOnboardingStore } from '@/store/onboardingStore';
import { LOOKUP_PINCODE, UPDATE_ONBOARDING, PincodeLookupResult, UpdateOnboardingInput } from '@/graphql/onboarding';

// Parse DD-MM-YYYY to ISO date string
function parseToISODate(dateStr: string): string {
    const match = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!match) return '';
    const [, day, month, year] = match;
    return `${year}-${month}-${day}T00:00:00.000Z`;
}

interface CheckboxProps {
    checked: boolean;
    onPress: () => void;
    testID: string;
}

function Checkbox({ checked, onPress, testID }: CheckboxProps) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePress = () => {
        scale.value = withSpring(0.9, { damping: 10, stiffness: 300 });
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
                    styles.checkbox,
                    checked && styles.checkboxChecked,
                    animatedStyle,
                ]}
            >
                {checked && <Check size={14} color={colors.white} strokeWidth={3} />}
            </Animated.View>
        </Pressable>
    );
}

export default function LocationScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const {
        basicInfo,
        healthGoals,
        locationInfo,
        setLocationInfo,
        setCurrentStep,
    } = useOnboardingStore();

    const [pincodeError, setPincodeError] = useState<string | undefined>();
    const [isLookingUp, setIsLookingUp] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // GraphQL operations
    const [lookupPincode] = useLazyQuery<{ lookupPincode: PincodeLookupResult }>(LOOKUP_PINCODE);
    const [updateOnboarding] = useMutation(UPDATE_ONBOARDING);

    const handlePincodeChange = useCallback(async (text: string) => {
        // Only allow digits, max 6
        const digits = text.replace(/\D/g, '').slice(0, 6);
        setLocationInfo({ pincode: digits });

        // Clear error while typing
        if (pincodeError) setPincodeError(undefined);

        // Auto-lookup when 6 digits entered
        if (digits.length === 6) {
            setIsLookingUp(true);
            try {
                const { data } = await lookupPincode({ variables: { pincode: digits } });
                if (data?.lookupPincode?.found) {
                    setLocationInfo({
                        state: data.lookupPincode.state || '',
                        city: data.lookupPincode.city || '',
                    });
                } else {
                    // Pincode not found in database - allow manual entry
                    setPincodeError('Pincode not found. Please enter your city and state manually.');
                }
            } catch (error) {
                console.error('Pincode lookup error:', error);
            } finally {
                setIsLookingUp(false);
            }
        } else {
            // Clear state/city if pincode is incomplete
            if (locationInfo.state || locationInfo.city) {
                setLocationInfo({ state: '', city: '' });
            }
        }
    }, [pincodeError, lookupPincode, setLocationInfo, locationInfo.state, locationInfo.city]);

    const handleStateChange = useCallback((text: string) => {
        setLocationInfo({ state: text });
    }, [setLocationInfo]);

    const handleCityChange = useCallback((text: string) => {
        setLocationInfo({ city: text });
    }, [setLocationInfo]);

    const toggleConsent = useCallback(() => {
        setLocationInfo({ telehealthConsent: !locationInfo.telehealthConsent });
    }, [locationInfo.telehealthConsent, setLocationInfo]);

    const handleConsentLinkPress = useCallback(() => {
        Linking.openURL('https://onlyou.life/telehealth-consent');
    }, []);

    const handleNext = async () => {
        if (!basicInfo.gender) return;

        setIsSaving(true);
        try {
            const input: UpdateOnboardingInput = {
                healthGoals,
                fullName: basicInfo.fullName,
                dateOfBirth: parseToISODate(basicInfo.dateOfBirth),
                gender: basicInfo.gender,
                pincode: locationInfo.pincode,
                state: locationInfo.state,
                city: locationInfo.city,
                telehealthConsent: locationInfo.telehealthConsent,
            };

            const { data } = await updateOnboarding({ variables: { input } });

            if (data?.updateOnboarding?.success) {
                setCurrentStep(4);
                router.push('/onboarding/health-snapshot');
            } else {
                // Handle error
                console.error('Onboarding save failed:', data?.updateOnboarding?.message);
            }
        } catch (error) {
            console.error('Onboarding save error:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const isNextDisabled =
        locationInfo.pincode.length !== 6 ||
        !locationInfo.state.trim() ||
        !locationInfo.city.trim() ||
        !locationInfo.telehealthConsent;

    return (
        <ScreenWrapper
            scrollable={true}
            testID="location-screen"
            style={styles.screen}
        >
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={100}
            >
                {/* Header */}
                <OnboardingHeader
                    currentStep={3}
                    testID="location-header"
                />

                {/* Content */}
                <View style={styles.content}>
                    {/* Heading */}
                    <Animated.Text
                        entering={FadeInUp.delay(0).duration(400)}
                        style={styles.heading}
                    >
                        Where do you live?
                    </Animated.Text>

                    {/* Subtitle */}
                    <Animated.Text
                        entering={FadeInUp.delay(80).duration(400)}
                        style={styles.subtitle}
                    >
                        This helps us find doctors and delivery partners near you.
                    </Animated.Text>

                    {/* Pincode Input */}
                    <Animated.View entering={FadeInUp.delay(160).duration(400)}>
                        <View style={styles.pincodeRow}>
                            <PremiumInput
                                label="Pincode"
                                value={locationInfo.pincode}
                                onChangeText={handlePincodeChange}
                                keyboardType="numeric"
                                maxLength={6}
                                error={pincodeError}
                                containerStyle={styles.pincodeInput}
                                testID="location-pincode"
                            />
                            {isLookingUp && (
                                <ActivityIndicator
                                    size="small"
                                    color={colors.accent}
                                    style={styles.loadingIndicator}
                                />
                            )}
                        </View>
                    </Animated.View>

                    {/* State Input */}
                    <Animated.View entering={FadeInUp.delay(240).duration(400)}>
                        <PremiumInput
                            label="State"
                            value={locationInfo.state}
                            onChangeText={handleStateChange}
                            autoCapitalize="words"
                            containerStyle={styles.inputWrapper}
                            testID="location-state"
                        />
                    </Animated.View>

                    {/* City Input */}
                    <Animated.View entering={FadeInUp.delay(320).duration(400)}>
                        <PremiumInput
                            label="City"
                            value={locationInfo.city}
                            onChangeText={handleCityChange}
                            autoCapitalize="words"
                            containerStyle={styles.inputWrapper}
                            testID="location-city"
                        />
                    </Animated.View>

                    {/* Telehealth Consent */}
                    <Animated.View
                        entering={FadeInUp.delay(400).duration(400)}
                        style={styles.consentRow}
                    >
                        <Checkbox
                            checked={locationInfo.telehealthConsent}
                            onPress={toggleConsent}
                            testID="location-consent-checkbox"
                        />
                        <Text style={styles.consentText}>
                            I agree to the{' '}
                            <Text
                                style={styles.consentLink}
                                onPress={handleConsentLinkPress}
                            >
                                Telehealth Consent
                            </Text>
                        </Text>
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
                            loading={isSaving}
                            testID="location-next-button"
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
    },
    subtitle: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: fontSizes.body,
        color: colors.textSecondary,
        marginTop: spacing.sm,
        marginBottom: spacing.xl,
        lineHeight: 22,
    },
    pincodeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pincodeInput: {
        flex: 1,
        marginBottom: spacing.md,
    },
    loadingIndicator: {
        marginLeft: spacing.sm,
        marginBottom: spacing.md,
    },
    inputWrapper: {
        marginBottom: spacing.md,
    },
    consentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.lg,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: colors.ctaPrimary,
        borderColor: colors.ctaPrimary,
    },
    consentText: {
        fontFamily: fontFamilies.sansRegular,
        fontSize: 14,
        color: colors.textPrimary,
        marginLeft: spacing.sm,
        flex: 1,
    },
    consentLink: {
        color: colors.accent,
        textDecorationLine: 'underline',
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
