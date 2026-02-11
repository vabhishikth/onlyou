import { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '@/styles/theme';

export default function BirthdateScreen() {
    const { state } = useLocalSearchParams<{ state: string }>();
    const [dob, setDob] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    // Format DOB as DD-MM-YYYY
    const formatDob = (text: string) => {
        const digits = text.replace(/\D/g, '');
        let formatted = '';

        if (digits.length > 0) {
            formatted = digits.substring(0, 2);
        }
        if (digits.length > 2) {
            formatted += '-' + digits.substring(2, 4);
        }
        if (digits.length > 4) {
            formatted += '-' + digits.substring(4, 8);
        }

        return formatted;
    };

    const handleDobChange = (text: string) => {
        setDob(formatDob(text));
    };

    // Validate DOB (DD-MM-YYYY format)
    const isValidDob = () => {
        if (dob.length !== 10) return false;

        const [day, month, year] = dob.split('-').map(Number);
        if (!day || !month || !year) return false;
        if (day < 1 || day > 31) return false;
        if (month < 1 || month > 12) return false;
        if (year < 1900 || year > new Date().getFullYear()) return false;

        return true;
    };

    const canProceed = isValidDob();

    const handleNext = () => {
        router.push({
            pathname: '/(auth)/signup',
            params: { state: state || '', dob }
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.content}>
                    {/* Back Button */}
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.backButtonText}>←</Text>
                    </TouchableOpacity>

                    {/* Header */}
                    <Text style={styles.headerTitle}>Getting started</Text>

                    {/* Title */}
                    <Text style={styles.title}>When were you born?</Text>

                    {/* DOB Input */}
                    <View style={[
                        styles.inputContainer,
                        isFocused && styles.inputContainerFocused,
                    ]}>
                        <Text style={styles.inputLabel}>Date of Birth (DD-MM-YYYY)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="18-02-1995"
                            placeholderTextColor={colors.textTertiary}
                            keyboardType="number-pad"
                            maxLength={10}
                            value={dob}
                            onChangeText={handleDobChange}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            autoFocus
                        />
                    </View>

                    {/* Next Button */}
                    <TouchableOpacity
                        style={[
                            styles.nextButton,
                            !canProceed && styles.nextButtonDisabled
                        ]}
                        onPress={handleNext}
                        disabled={!canProceed}
                        activeOpacity={0.8}
                    >
                        <Text style={[
                            styles.nextButtonText,
                            !canProceed && styles.nextButtonTextDisabled
                        ]}>
                            Next
                        </Text>
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
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        justifyContent: 'center',
    },

    // Back Button
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    backButtonText: {
        fontSize: 20,
        color: colors.text,
    },

    // Header
    headerTitle: {
        ...typography.bodyMedium,
        fontWeight: '500',
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },

    // Title
    title: {
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        fontSize: 26,
        fontWeight: '400',
        color: colors.text,
        marginBottom: spacing.xl,
    },

    // Input
    inputContainer: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginBottom: spacing.lg,
    },
    inputContainerFocused: {
        borderColor: colors.primary,
        borderWidth: 2,
    },
    inputLabel: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    input: {
        ...typography.bodyLarge,
        color: colors.text,
        paddingVertical: spacing.xs,
    },

    // Next Button
    nextButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.full,
        paddingVertical: spacing.md + 2,
        alignItems: 'center',
    },
    nextButtonDisabled: {
        backgroundColor: '#E5E5E5',
    },
    nextButtonText: {
        ...typography.button,
        color: colors.primaryText,
    },
    nextButtonTextDisabled: {
        color: colors.textTertiary,
    },
});
