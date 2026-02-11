import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import { useAuth } from '@/lib/auth';
import { GET_ME, UPDATE_PROFILE, GetMeResponse, UpdateProfileResponse, UpdateProfileInput } from '@/graphql/user';
import { colors, spacing, borderRadius, typography, shadows } from '@/styles/theme';

// Floating Label Input Component
const FloatingInput = ({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType = 'default',
    autoCapitalize = 'sentences',
}: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasValue = value && value.length > 0;

    return (
        <View style={[
            styles.inputContainer,
            isFocused && styles.inputContainerFocused,
        ]}>
            <Text style={[
                styles.floatingLabel,
                (isFocused || hasValue) && styles.floatingLabelActive,
            ]}>
                {label}
            </Text>
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChangeText}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={!isFocused && !hasValue ? placeholder : ''}
                placeholderTextColor={colors.textTertiary}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
            />
        </View>
    );
};

// Gender Selection Component
const GenderSelector = ({
    value,
    onChange,
}: {
    value: 'MALE' | 'FEMALE' | 'OTHER' | '';
    onChange: (gender: 'MALE' | 'FEMALE' | 'OTHER') => void;
}) => {
    const options = [
        { key: 'MALE' as const, label: 'Male' },
        { key: 'FEMALE' as const, label: 'Female' },
        { key: 'OTHER' as const, label: 'Other' },
    ];

    return (
        <View style={styles.genderContainer}>
            <Text style={styles.sectionLabel}>Gender</Text>
            <View style={styles.genderOptions}>
                {options.map((option) => (
                    <TouchableOpacity
                        key={option.key}
                        style={[
                            styles.genderOption,
                            value === option.key && styles.genderOptionSelected,
                        ]}
                        onPress={() => onChange(option.key)}
                        activeOpacity={0.7}
                    >
                        <View style={[
                            styles.genderRadio,
                            value === option.key && styles.genderRadioSelected,
                        ]}>
                            {value === option.key && <View style={styles.genderRadioInner} />}
                        </View>
                        <Text style={[
                            styles.genderLabel,
                            value === option.key && styles.genderLabelSelected,
                        ]}>
                            {option.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

export default function ProfileScreen() {
    const { logout } = useAuth();
    const { data, loading } = useQuery<GetMeResponse>(GET_ME);
    const [updateProfile, { loading: updating }] = useMutation<UpdateProfileResponse>(UPDATE_PROFILE);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | ''>('');
    const [addressLine1, setAddressLine1] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [pincode, setPincode] = useState('');

    // Load existing profile data
    useEffect(() => {
        if (data?.me) {
            setName(data.me.name || '');
            setEmail(data.me.email || '');
            if (data.me.patientProfile) {
                setGender(data.me.patientProfile.gender || '');
                setAddressLine1(data.me.patientProfile.addressLine1 || '');
                setCity(data.me.patientProfile.city || '');
                setState(data.me.patientProfile.state || '');
                setPincode(data.me.patientProfile.pincode || '');
            }
        }
    }, [data]);

    const handleSave = async () => {
        const input: UpdateProfileInput = {};
        if (name) input.name = name;
        if (email) input.email = email;
        if (gender) input.gender = gender as 'MALE' | 'FEMALE' | 'OTHER';
        if (addressLine1) input.addressLine1 = addressLine1;
        if (city) input.city = city;
        if (state) input.state = state;
        if (pincode) input.pincode = pincode;

        try {
            const { data: result } = await updateProfile({
                variables: { input },
                refetchQueries: [{ query: GET_ME }],
                awaitRefetchQueries: true,
            });
            if (result?.updateProfile.success) {
                Alert.alert('Success', 'Profile updated successfully');
            } else {
                Alert.alert('Error', result?.updateProfile.message || 'Failed to update');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Something went wrong');
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: logout },
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
            </View>
        );
    }

    const isProfileComplete = data?.me?.isProfileComplete;

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Your Profile</Text>
                    <Text style={styles.subtitle}>
                        Complete your profile to get personalized care
                    </Text>
                </View>

                {/* Profile Completion Banner */}
                {!isProfileComplete && (
                    <View style={styles.completionBanner}>
                        <View style={styles.completionIcon}>
                            <Text style={styles.completionIconText}>!</Text>
                        </View>
                        <View style={styles.completionTextContainer}>
                            <Text style={styles.completionTitle}>Complete your profile</Text>
                            <Text style={styles.completionSubtitle}>
                                Fill in all details to book consultations
                            </Text>
                        </View>
                    </View>
                )}

                {/* Personal Information Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>

                    <FloatingInput
                        label="Full Name"
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                    />

                    <FloatingInput
                        label="Email Address"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <GenderSelector value={gender} onChange={setGender} />
                </View>

                {/* Phone Display */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Contact</Text>
                    <View style={styles.phoneContainer}>
                        <Text style={styles.phoneLabel}>Phone Number</Text>
                        <Text style={styles.phoneValue}>{data?.me?.phone || 'Not set'}</Text>
                        <Text style={styles.phoneVerified}>✓ Verified</Text>
                    </View>
                </View>

                {/* Address Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Address</Text>

                    <FloatingInput
                        label="Street Address"
                        value={addressLine1}
                        onChangeText={setAddressLine1}
                    />

                    <View style={styles.row}>
                        <View style={styles.halfInput}>
                            <FloatingInput
                                label="City"
                                value={city}
                                onChangeText={setCity}
                            />
                        </View>
                        <View style={styles.halfInput}>
                            <FloatingInput
                                label="State"
                                value={state}
                                onChangeText={setState}
                            />
                        </View>
                    </View>

                    <FloatingInput
                        label="Pincode"
                        value={pincode}
                        onChangeText={setPincode}
                        keyboardType="numeric"
                    />
                </View>

                {/* Save Button */}
                <TouchableOpacity
                    style={[styles.saveButton, updating && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={updating}
                    activeOpacity={0.8}
                >
                    {updating ? (
                        <ActivityIndicator color={colors.primaryText} />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Profile</Text>
                    )}
                </TouchableOpacity>

                {/* Logout Button */}
                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={handleLogout}
                    activeOpacity={0.7}
                >
                    <Text style={styles.logoutButtonText}>Log out</Text>
                </TouchableOpacity>

                <View style={styles.bottomPadding} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
    },

    // Header
    header: {
        marginBottom: spacing.xl,
    },
    title: {
        ...typography.headingLarge,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    subtitle: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
    },

    // Completion Banner
    completionBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.accentLight,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: colors.accent,
    },
    completionIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    completionIconText: {
        color: colors.primaryText,
        fontSize: 18,
        fontWeight: '700',
    },
    completionTextContainer: {
        flex: 1,
    },
    completionTitle: {
        ...typography.bodyLarge,
        fontWeight: '600',
        color: colors.text,
    },
    completionSubtitle: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginTop: 2,
    },

    // Sections
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.md,
    },
    sectionLabel: {
        ...typography.label,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },

    // Floating Input
    inputContainer: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.lg,
        paddingBottom: spacing.sm,
        marginBottom: spacing.md,
        minHeight: 64,
    },
    inputContainerFocused: {
        borderColor: colors.accent,
        borderWidth: 2,
    },
    floatingLabel: {
        position: 'absolute',
        left: spacing.md,
        top: 22,
        ...typography.bodyMedium,
        color: colors.textTertiary,
    },
    floatingLabelActive: {
        top: 8,
        ...typography.label,
        color: colors.textSecondary,
    },
    input: {
        ...typography.bodyLarge,
        color: colors.text,
        paddingVertical: 0,
        marginTop: spacing.xs,
    },

    // Gender Selector
    genderContainer: {
        marginBottom: spacing.md,
    },
    genderOptions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    genderOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
    },
    genderOptionSelected: {
        borderColor: colors.accent,
        borderWidth: 2,
        backgroundColor: colors.accentLight,
    },
    genderRadio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.border,
        marginRight: spacing.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    genderRadioSelected: {
        borderColor: colors.accent,
    },
    genderRadioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.accent,
    },
    genderLabel: {
        ...typography.bodyMedium,
        color: colors.text,
    },
    genderLabelSelected: {
        fontWeight: '600',
    },

    // Phone Container
    phoneContainer: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
    },
    phoneLabel: {
        ...typography.label,
        color: colors.textSecondary,
        marginRight: spacing.sm,
    },
    phoneValue: {
        ...typography.bodyLarge,
        color: colors.text,
        flex: 1,
    },
    phoneVerified: {
        ...typography.bodySmall,
        color: colors.success,
        fontWeight: '600',
    },

    // Row Layout
    row: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    halfInput: {
        flex: 1,
    },

    // Buttons
    saveButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.full,
        paddingVertical: spacing.md + 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
        ...shadows.md,
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        ...typography.button,
        color: colors.primaryText,
    },
    logoutButton: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.full,
        paddingVertical: spacing.md,
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    logoutButtonText: {
        ...typography.button,
        color: colors.text,
    },

    bottomPadding: {
        height: spacing.xxl,
    },
});
