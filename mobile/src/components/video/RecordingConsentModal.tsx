import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { useMutation } from '@apollo/client';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme';
import { GIVE_RECORDING_CONSENT } from '@/graphql/video';

// Spec: Phase 14 Chunk 5 — Recording consent modal
// TPG 2020 requires informed consent before recording video consultations

interface RecordingConsentModalProps {
    visible: boolean;
    onClose: () => void;
    onConsent: () => void;
    videoSessionId: string;
}

export default function RecordingConsentModal({
    visible,
    onClose,
    onConsent,
    videoSessionId,
}: RecordingConsentModalProps) {
    const [checked, setChecked] = useState(false);

    const [giveConsent, { loading }] = useMutation(GIVE_RECORDING_CONSENT, {
        onCompleted: () => {
            setChecked(false);
            onConsent();
        },
    });

    const handleConsent = async () => {
        if (!checked) return;
        await giveConsent({
            variables: { videoSessionId },
        });
    };

    const handleCancel = () => {
        setChecked(false);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <View style={styles.iconContainer}>
                        <Text style={styles.icon}>{'\uD83D\uDCF9'}</Text>
                    </View>

                    <Text style={styles.title}>Recording Consent</Text>

                    <Text style={styles.body}>
                        This video consultation will be recorded for quality assurance and
                        medical record-keeping purposes, as required by the Telemedicine
                        Practice Guidelines (TPG) 2020.
                    </Text>

                    <Text style={styles.body}>
                        The recording will be stored securely and only accessible to your
                        healthcare team.
                    </Text>

                    <TouchableOpacity
                        testID="consent-checkbox"
                        style={styles.checkboxRow}
                        onPress={() => setChecked(!checked)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                            {checked && <Text style={styles.checkmark}>{'\u2713'}</Text>}
                        </View>
                        <Text style={styles.checkboxLabel}>
                            I understand and consent to the recording of this consultation
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.primaryButton, !checked && styles.primaryButtonDisabled]}
                        onPress={handleConsent}
                        disabled={!checked || loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.primaryText} />
                        ) : (
                            <Text style={styles.primaryButtonText}>I Consent</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryButton} onPress={handleCancel}>
                        <Text style={styles.secondaryButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    card: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xxl,
        padding: spacing.xl,
        width: '100%',
        maxWidth: 360,
        alignItems: 'center',
        ...shadows.lg,
    },
    iconContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.infoLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    icon: {
        fontSize: 36,
    },
    title: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    body: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.md,
        lineHeight: 20,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: spacing.lg,
        paddingHorizontal: spacing.sm,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: borderRadius.sm,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
        marginTop: 2,
    },
    checkboxChecked: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    checkmark: {
        color: colors.primaryText,
        fontSize: 16,
        fontWeight: '700',
    },
    checkboxLabel: {
        ...typography.bodySmall,
        color: colors.text,
        flex: 1,
    },
    primaryButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginBottom: spacing.sm,
        ...shadows.md,
    },
    primaryButtonDisabled: {
        backgroundColor: colors.border,
    },
    primaryButtonText: {
        ...typography.button,
        color: colors.primaryText,
    },
    secondaryButton: {
        paddingVertical: spacing.sm,
        alignItems: 'center',
    },
    secondaryButtonText: {
        ...typography.buttonSmall,
        color: colors.textSecondary,
    },
});
