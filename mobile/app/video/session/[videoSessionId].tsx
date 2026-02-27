/**
 * VIDEO CONSULTATION — DEV BYPASS ACTIVE
 *
 * The real HMS video session screen is commented out while the video
 * consultation feature is being stabilised. The backend auto-completes
 * every video session (VIDEO_AUTO_COMPLETE=true in backend/.env), so
 * this screen will never be reached with a pending session in normal dev flow.
 *
 * To restore full video:
 *  1. Set VIDEO_AUTO_COMPLETE=false in backend/.env
 *  2. Replace this file with the original from git:
 *     git checkout HEAD -- mobile/app/video/session/\[videoSessionId\].tsx
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '@/theme';

export default function VideoSessionScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.content}>
                <Text style={styles.icon}>✅</Text>
                <Text style={styles.title}>Video Consultation</Text>
                <Text style={styles.subtitle}>Completed</Text>
                <Text style={styles.body}>
                    Your video consultation has been completed.{'\n'}
                    Your doctor will review your case and share next steps soon.
                </Text>
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => router.push('/(tabs)' as never)}
                >
                    <Text style={styles.buttonText}>Return Home</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    icon: { fontSize: 64, marginBottom: spacing.lg },
    title: { ...typography.headingSmall, color: colors.text, marginBottom: spacing.xs },
    subtitle: {
        ...typography.headingSmall,
        color: colors.success,
        marginBottom: spacing.lg,
    },
    body: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
        lineHeight: 22,
    },
    button: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.full,
    },
    buttonText: { ...typography.button, color: colors.primaryText },
});
