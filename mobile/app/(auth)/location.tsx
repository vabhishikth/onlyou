import { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    Platform,
    Modal,
    FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '@/styles/theme';

const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli',
    'Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh',
    'Lakshadweep', 'Puducherry',
];

export default function LocationScreen() {
    const [selectedState, setSelectedState] = useState('');
    const [consentChecked, setConsentChecked] = useState(false);
    const [showPicker, setShowPicker] = useState(false);

    const canProceed = selectedState && consentChecked;

    const handleNext = () => {
        router.push({
            pathname: '/(auth)/birthdate',
            params: { state: selectedState }
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <View style={styles.content}>
                {/* Header */}
                <Text style={styles.headerTitle}>Getting started</Text>

                {/* Title */}
                <Text style={styles.title}>
                    Where do you currently{'\n'}call home?
                </Text>
                <Text style={styles.subtitle}>
                    This lets us find local providers.
                </Text>

                {/* State Picker */}
                <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowPicker(true)}
                    activeOpacity={0.7}
                >
                    <View>
                        <Text style={styles.pickerLabel}>Choose a state</Text>
                        <Text style={[
                            styles.pickerValue,
                            !selectedState && styles.pickerPlaceholder
                        ]}>
                            {selectedState || 'Select'}
                        </Text>
                    </View>
                    <Text style={styles.pickerArrow}>▼</Text>
                </TouchableOpacity>

                {/* Telehealth Consent */}
                <TouchableOpacity
                    style={styles.consentRow}
                    onPress={() => setConsentChecked(!consentChecked)}
                    activeOpacity={0.7}
                >
                    <View style={[
                        styles.checkbox,
                        consentChecked && styles.checkboxChecked
                    ]}>
                        {consentChecked && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.consentText}>
                        I agree to the{' '}
                        <Text style={styles.consentLink}>Telehealth Consent</Text>
                    </Text>
                </TouchableOpacity>

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

            {/* State Picker Modal */}
            <Modal
                visible={showPicker}
                transparent
                animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setShowPicker(false)}>
                                <Text style={styles.modalDone}>Done</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.modalPickerHeader}>
                            <Text style={styles.modalPickerTitle}>Choose a state</Text>
                        </View>
                        <FlatList
                            data={INDIAN_STATES}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.stateItem,
                                        selectedState === item && styles.stateItemSelected
                                    ]}
                                    onPress={() => {
                                        setSelectedState(item);
                                        setShowPicker(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.stateItemText,
                                        selectedState === item && styles.stateItemTextSelected
                                    ]}>
                                        {item}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
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
        marginBottom: spacing.sm,
    },
    subtitle: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        marginBottom: spacing.xl,
    },

    // State Picker
    pickerButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        marginBottom: spacing.lg,
    },
    pickerLabel: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    pickerValue: {
        ...typography.bodyLarge,
        color: colors.text,
        fontWeight: '500',
    },
    pickerPlaceholder: {
        color: colors.textTertiary,
    },
    pickerArrow: {
        color: colors.textSecondary,
        fontSize: 12,
    },

    // Consent
    consentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: colors.border,
        marginRight: spacing.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    checkmark: {
        color: colors.primaryText,
        fontSize: 14,
        fontWeight: '700',
    },
    consentText: {
        ...typography.bodyMedium,
        color: colors.text,
        flex: 1,
    },
    consentLink: {
        color: '#8B7FC7',
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

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.background,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        maxHeight: '60%',
    },
    modalHeader: {
        alignItems: 'flex-end',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalDone: {
        ...typography.bodyMedium,
        color: '#8B7FC7',
        fontWeight: '600',
    },
    modalPickerHeader: {
        padding: spacing.md,
        backgroundColor: colors.surfaceSecondary,
    },
    modalPickerTitle: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    stateItem: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    stateItemSelected: {
        backgroundColor: colors.surfaceSecondary,
    },
    stateItemText: {
        ...typography.bodyLarge,
        color: colors.text,
        textAlign: 'center',
    },
    stateItemTextSelected: {
        fontWeight: '600',
    },
});
