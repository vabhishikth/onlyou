import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from '@apollo/client';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme';
import { GET_PROFILE, UPDATE_PROFILE, GetProfileResponse } from '@/graphql/profile';

export default function EditProfileScreen() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | ''>('');
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [addressLine1, setAddressLine1] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [pincode, setPincode] = useState('');

    const { data, loading } = useQuery<GetProfileResponse>(GET_PROFILE, {
        fetchPolicy: 'network-only',
    });

    const [updateProfile, { loading: updating }] = useMutation(UPDATE_PROFILE, {
        onCompleted: (result) => {
            if (result?.updateProfile?.success) {
                Alert.alert('Success', 'Profile updated successfully', [
                    { text: 'OK', onPress: () => router.back() },
                ]);
            } else {
                Alert.alert('Error', result?.updateProfile?.message || 'Failed to update profile');
            }
        },
        onError: (error) => {
            Alert.alert('Error', error.message);
        },
    });

    // Populate form with existing data
    useEffect(() => {
        if (data?.me) {
            setName(data.me.name || '');
            setEmail(data.me.email || '');
            if (data.me.patientProfile) {
                // Convert ISO date to DD/MM/YYYY for display
                const dob = data.me.patientProfile.dateOfBirth;
                if (dob) {
                    const d = new Date(dob);
                    if (!isNaN(d.getTime())) {
                        const dd = String(d.getDate()).padStart(2, '0');
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        const yyyy = d.getFullYear();
                        setDateOfBirth(`${dd}/${mm}/${yyyy}`);
                    } else {
                        setDateOfBirth(dob);
                    }
                } else {
                    setDateOfBirth('');
                }
                setGender(data.me.patientProfile.gender || '');
                setHeight(data.me.patientProfile.height?.toString() || '');
                setWeight(data.me.patientProfile.weight?.toString() || '');
                setAddressLine1(data.me.patientProfile.addressLine1 || '');
                setCity(data.me.patientProfile.city || '');
                setState(data.me.patientProfile.state || '');
                setPincode(data.me.patientProfile.pincode || '');
            }
        }
    }, [data]);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Name is required');
            return;
        }

        // Convert DD/MM/YYYY to ISO date string for the backend
        let dobIso: string | undefined;
        if (dateOfBirth) {
            const ddmmyyyy = dateOfBirth.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            if (ddmmyyyy) {
                dobIso = `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
            } else {
                dobIso = dateOfBirth; // Already ISO or other format
            }
        }

        await updateProfile({
            variables: {
                input: {
                    name: name.trim(),
                    email: email.trim() || undefined,
                    dateOfBirth: dobIso || undefined,
                    gender: gender || undefined,
                    height: height ? parseFloat(height) : undefined,
                    weight: weight ? parseFloat(weight) : undefined,
                    addressLine1: addressLine1.trim() || undefined,
                    city: city.trim() || undefined,
                    state: state.trim() || undefined,
                    pincode: pincode.trim() || undefined,
                },
            },
            refetchQueries: ['GetProfile'],
            awaitRefetchQueries: true,
        });
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>{'<'}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <View style={styles.headerSpacer} />
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Basic Info */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Basic Information</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name *</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Enter your full name"
                                placeholderTextColor={colors.textTertiary}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="Enter your email"
                                placeholderTextColor={colors.textTertiary}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Date of Birth</Text>
                            <TextInput
                                style={styles.input}
                                value={dateOfBirth}
                                onChangeText={setDateOfBirth}
                                placeholder="DD/MM/YYYY"
                                placeholderTextColor={colors.textTertiary}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Gender</Text>
                            <View style={styles.genderButtons}>
                                {(['MALE', 'FEMALE', 'OTHER'] as const).map((g) => (
                                    <TouchableOpacity
                                        key={g}
                                        style={[
                                            styles.genderButton,
                                            gender === g && styles.genderButtonSelected,
                                        ]}
                                        onPress={() => setGender(g)}
                                    >
                                        <Text style={[
                                            styles.genderButtonText,
                                            gender === g && styles.genderButtonTextSelected,
                                        ]}>
                                            {g.charAt(0) + g.slice(1).toLowerCase()}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        <View style={styles.row}>
                            <View style={[styles.inputGroup, styles.halfWidth]}>
                                <Text style={styles.label}>Height (cm)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={height}
                                    onChangeText={setHeight}
                                    placeholder="e.g. 170"
                                    placeholderTextColor={colors.textTertiary}
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={[styles.inputGroup, styles.halfWidth]}>
                                <Text style={styles.label}>Weight (kg)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={weight}
                                    onChangeText={setWeight}
                                    placeholder="e.g. 72"
                                    placeholderTextColor={colors.textTertiary}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
                    </View>

                    {/* Address */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Address</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Address Line</Text>
                            <TextInput
                                style={styles.input}
                                value={addressLine1}
                                onChangeText={setAddressLine1}
                                placeholder="House/flat number, street"
                                placeholderTextColor={colors.textTertiary}
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, styles.halfWidth]}>
                                <Text style={styles.label}>City</Text>
                                <TextInput
                                    style={styles.input}
                                    value={city}
                                    onChangeText={setCity}
                                    placeholder="City"
                                    placeholderTextColor={colors.textTertiary}
                                />
                            </View>

                            <View style={[styles.inputGroup, styles.halfWidth]}>
                                <Text style={styles.label}>State</Text>
                                <TextInput
                                    style={styles.input}
                                    value={state}
                                    onChangeText={setState}
                                    placeholder="State"
                                    placeholderTextColor={colors.textTertiary}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Pincode</Text>
                            <TextInput
                                style={styles.input}
                                value={pincode}
                                onChangeText={setPincode}
                                placeholder="6-digit pincode"
                                placeholderTextColor={colors.textTertiary}
                                keyboardType="number-pad"
                                maxLength={6}
                            />
                        </View>
                    </View>
                </ScrollView>

                {/* Save Button */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.saveButton, updating && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={updating}
                    >
                        {updating ? (
                            <ActivityIndicator color={colors.primaryText} />
                        ) : (
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
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
    keyboardView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.lg,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.md,
    },
    inputGroup: {
        marginBottom: spacing.md,
    },
    label: {
        ...typography.label,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    input: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        ...typography.bodyMedium,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
    },
    row: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    halfWidth: {
        flex: 1,
    },
    genderButtons: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    genderButton: {
        flex: 1,
        paddingVertical: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    genderButtonSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    genderButtonText: {
        ...typography.bodyMedium,
        color: colors.text,
    },
    genderButtonTextSelected: {
        color: colors.primaryText,
    },
    footer: {
        padding: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    saveButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md + 2,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        ...shadows.md,
    },
    saveButtonDisabled: {
        backgroundColor: colors.border,
    },
    saveButtonText: {
        ...typography.button,
        color: colors.primaryText,
    },
});
