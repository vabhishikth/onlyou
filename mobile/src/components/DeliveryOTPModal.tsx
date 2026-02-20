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
import { CONFIRM_DELIVERY_OTP, RATE_DELIVERY } from '@/graphql/tracking';

// Spec: master spec Section 8.2 Step 6 — Patient shows OTP to delivery person

interface DeliveryOTPModalProps {
    visible: boolean;
    onClose: () => void;
    orderId: string;
    otp: string;
    deliveryPersonName?: string | null;
    deliveryPersonPhone?: string | null;
}

type ModalStep = 'show_otp' | 'confirmed' | 'rating';

export default function DeliveryOTPModal({
    visible,
    onClose,
    orderId,
    otp,
    deliveryPersonName,
}: DeliveryOTPModalProps) {
    const [step, setStep] = useState<ModalStep>('show_otp');
    const [selectedRating, setSelectedRating] = useState<number>(0);

    const [confirmOTP, { loading: confirming }] = useMutation(CONFIRM_DELIVERY_OTP, {
        onCompleted: (data) => {
            if (data?.confirmDeliveryOTP?.success) {
                setStep('confirmed');
            }
        },
    });

    const [rateDelivery, { loading: rating }] = useMutation(RATE_DELIVERY, {
        onCompleted: () => {
            handleDone();
        },
    });

    const handleConfirm = async () => {
        await confirmOTP({
            variables: {
                input: { orderId, otp },
            },
            refetchQueries: ['GetActiveTracking'],
        });
    };

    const handleRate = async () => {
        if (selectedRating === 0) {
            handleDone();
            return;
        }
        await rateDelivery({
            variables: {
                input: { orderId, rating: selectedRating },
            },
        });
    };

    const handleDone = () => {
        setStep('show_otp');
        setSelectedRating(0);
        onClose();
    };

    const renderStars = () => {
        const stars = [1, 2, 3, 4, 5];
        return (
            <View style={styles.starsRow}>
                {stars.map((star) => (
                    <TouchableOpacity
                        key={star}
                        onPress={() => setSelectedRating(star)}
                        style={styles.starButton}
                    >
                        <Text style={[
                            styles.starText,
                            selectedRating >= star && styles.starTextSelected,
                        ]}>
                            {selectedRating >= star ? '\u2B50' : '\u2606'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
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
                    {/* Show OTP Step */}
                    {step === 'show_otp' && (
                        <>
                            <View style={styles.iconContainer}>
                                <Text style={styles.icon}>{'\uD83D\uDCE6'}</Text>
                            </View>
                            <Text style={styles.title}>Confirm Delivery</Text>
                            <Text style={styles.subtitle}>
                                Show this OTP to {deliveryPersonName || 'the delivery person'}
                            </Text>

                            {/* OTP Display */}
                            <View style={styles.otpContainer}>
                                {otp.split('').map((digit, index) => (
                                    <View key={index} style={styles.otpDigit}>
                                        <Text style={styles.otpDigitText}>{digit}</Text>
                                    </View>
                                ))}
                            </View>

                            <Text style={styles.otpNote}>
                                The delivery person will enter this code to confirm handover.
                            </Text>

                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={handleConfirm}
                                disabled={confirming}
                            >
                                {confirming ? (
                                    <ActivityIndicator color={colors.primaryText} />
                                ) : (
                                    <Text style={styles.primaryButtonText}>
                                        I've Shown the OTP
                                    </Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
                                <Text style={styles.secondaryButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* Confirmed Step */}
                    {step === 'confirmed' && (
                        <>
                            <View style={[styles.iconContainer, styles.iconContainerSuccess]}>
                                <Text style={styles.icon}>{'\u2705'}</Text>
                            </View>
                            <Text style={styles.title}>Delivery Confirmed!</Text>
                            <Text style={styles.subtitle}>
                                Your treatment kit has been delivered successfully.
                            </Text>

                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={() => setStep('rating')}
                            >
                                <Text style={styles.primaryButtonText}>Rate Delivery</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.secondaryButton} onPress={handleDone}>
                                <Text style={styles.secondaryButtonText}>Skip</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* Rating Step */}
                    {step === 'rating' && (
                        <>
                            <View style={styles.iconContainer}>
                                <Text style={styles.icon}>{'\u2B50'}</Text>
                            </View>
                            <Text style={styles.title}>Rate Your Delivery</Text>
                            <Text style={styles.subtitle}>
                                How was your delivery experience?
                            </Text>

                            {renderStars()}

                            <TouchableOpacity
                                style={[
                                    styles.primaryButton,
                                    selectedRating === 0 && styles.primaryButtonDisabled,
                                ]}
                                onPress={handleRate}
                                disabled={rating}
                            >
                                {rating ? (
                                    <ActivityIndicator color={colors.primaryText} />
                                ) : (
                                    <Text style={styles.primaryButtonText}>
                                        {selectedRating > 0 ? 'Submit Rating' : 'Skip'}
                                    </Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.secondaryButton} onPress={handleDone}>
                                <Text style={styles.secondaryButtonText}>Done</Text>
                            </TouchableOpacity>
                        </>
                    )}
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
    iconContainerSuccess: {
        backgroundColor: colors.successLight,
    },
    icon: {
        fontSize: 36,
    },
    title: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    subtitle: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    otpContainer: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    otpDigit: {
        width: 52,
        height: 60,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        borderWidth: 2,
        borderColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    otpDigitText: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.text,
    },
    otpNote: {
        ...typography.label,
        color: colors.textTertiary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    starsRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.xl,
    },
    starButton: {
        padding: spacing.xs,
    },
    starText: {
        fontSize: 36,
        color: colors.border,
    },
    starTextSelected: {
        color: colors.warning,
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
