import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme';

// Spec: Phase 14 Chunk 8 — Home screen banner for upcoming video session

interface UpcomingSessionBannerProps {
    videoSessionId: string;
    scheduledTime: string;
    doctorName?: string;
}

export default function UpcomingSessionBanner({
    videoSessionId,
    scheduledTime,
    doctorName,
}: UpcomingSessionBannerProps) {
    const router = useRouter();

    const formatTime = (isoStr: string) => {
        const date = new Date(isoStr);
        return date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    };

    return (
        <View style={styles.banner}>
            <View style={styles.iconContainer}>
                <Text style={styles.icon}>{'\uD83D\uDCF9'}</Text>
            </View>
            <View style={styles.infoContainer}>
                <Text style={styles.title}>Video Consultation</Text>
                <Text style={styles.subtitle}>
                    {doctorName ? `with ${doctorName} ` : ''}at {formatTime(scheduledTime)}
                </Text>
            </View>
            <TouchableOpacity
                style={styles.joinButton}
                onPress={() => router.push(`/video/session/${videoSessionId}` as never)}
            >
                <Text style={styles.joinButtonText}>Join</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.accentLight,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        ...shadows.sm,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    icon: {
        fontSize: 22,
    },
    infoContainer: {
        flex: 1,
    },
    title: {
        ...typography.bodySmall,
        fontWeight: '600',
        color: colors.text,
    },
    subtitle: {
        ...typography.label,
        color: colors.textSecondary,
        marginTop: 2,
    },
    joinButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.full,
    },
    joinButtonText: {
        ...typography.buttonSmall,
        color: colors.primaryText,
    },
});
