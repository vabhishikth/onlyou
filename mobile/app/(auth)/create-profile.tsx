import React, { useState } from 'react';
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
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@apollo/client';
import { UPDATE_PROFILE, UpdateProfileResponse, UpdateProfileInput } from '@/graphql/user';
import { useAuth } from '@/lib/auth';
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

export default function CreateProfileScreen() {
    const { logout } = useAuth();
    const [updateProfile, { loading: updating }] = useMutation<UpdateProfileResponse>(UPDATE_PROFILE);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | ''>('');

    const isValid = name.trim().length > 0 && email.trim().length > 0 && gender !== '';

    const handleSave = async () => {
        if (!isValid) return;

        const input: UpdateProfileInput = {
            name,
            email,
            gender: gender as 'MALE' | 'FEMALE' | 'OTHER',
        };

        try {
            const { data: result } = await updateProfile({
                variables: { input },
            });
            if (result?.updateProfile.success) {
                // Profile completed, navigate to home
                router.replace('/(tabs)');
            } else {
                Alert.alert('Error', result?.updateProfile.message || 'Failed to update profile');
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

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Profile Setup</Text>
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>Tell us about{'\n'}yourself</Text>

                    <Text style={styles.subtitle}>
                        This helps us personalize your experience
                    </Text>

                    {/* Form Section */}
                    <View style={styles.section}>
                        <FloatingInput
                            label="Full Name"
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                            placeholder="Enter your full name"
                        />

                        <FloatingInput
                            label="Email Address"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            placeholder="Enter your email"
                        />

                        <GenderSelector value={gender} onChange={setGender} />
                    </View>

                    {/* Save Button */}
                    <TouchableOpacity
                        style={[
                            styles.saveButton,
                            (!isValid || updating) && styles.saveButtonDisabled
                        ]}
                        onPress={handleSave}
                        disabled={!isValid || updating}
                        activeOpacity={0.8}
                    >
                        {updating ? (
                            <ActivityIndicator color={colors.primaryText} />
                        ) : (
                            <Text style={styles.saveButtonText}>Complete Profile</Text>
                        )}
                    </TouchableOpacity>

                    {/* Logout Button (in case they want to switch accounts) */}
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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        flexGrow: 1,
    },

    // Header
    header: {
        marginBottom: spacing.lg,
        alignItems: 'center',
    },
    headerTitle: {
        ...typography.bodyMedium,
        fontWeight: '500',
        color: colors.text,
        textAlign: 'center',
    },

    // Title
    title: {
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        fontSize: 26,
        fontWeight: '400',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    subtitle: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        marginBottom: spacing.xl,
    },

    // Sections
    section: {
        marginBottom: spacing.xl,
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

    // Buttons
    saveButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.full,
        paddingVertical: spacing.md + 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
        ...shadows.md,
        marginTop: spacing.md,
    },
    saveButtonDisabled: {
        backgroundColor: '#E5E5E5',
    },
    saveButtonText: {
        ...typography.button,
        color: colors.primaryText,
    },
    logoutButton: {
        paddingVertical: spacing.md,
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    logoutButtonText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
    },

    bottomPadding: {
        height: spacing.xxl,
    },
});
