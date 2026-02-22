import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation } from '@apollo/client';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme';
import { useHMS } from '@/hooks/useHMS';
import {
    JOIN_VIDEO_SESSION,
    GIVE_RECORDING_CONSENT,
    type VideoSession,
} from '@/graphql/video';
import RecordingConsentModal from '@/components/video/RecordingConsentModal';

// Spec: Phase 14 Chunk 6+7 — Multi-state video session screen
// State machine: PRE_CALL → CONSENT → WAITING → IN_CALL → POST_CALL

type ScreenState = 'PRE_CALL' | 'CONSENT' | 'WAITING' | 'IN_CALL' | 'POST_CALL';

// Simple query to get session info (reuses the same data shape)
const GET_VIDEO_SESSION_QUERY = `
    query GetVideoSession($videoSessionId: String!) {
        videoSession(videoSessionId: $videoSessionId) {
            id
            consultationId
            doctorId
            patientId
            status
            scheduledStartTime
            scheduledEndTime
            recordingConsentGiven
            roomId
        }
    }
`;

export default function VideoSessionScreen() {
    const router = useRouter();
    const { videoSessionId } = useLocalSearchParams<{ videoSessionId: string }>();

    const [screenState, setScreenState] = useState<ScreenState>('PRE_CALL');
    const [callDuration, setCallDuration] = useState(0);

    const hms = useHMS();

    const { data, loading, refetch } = useQuery(GET_VIDEO_SESSION_QUERY as any, {
        variables: { videoSessionId },
        skip: !videoSessionId,
        pollInterval: screenState === 'WAITING' ? 3000 : 0,
    });

    const session: VideoSession | null = data?.videoSession || null;

    const [joinSession] = useMutation(JOIN_VIDEO_SESSION, {
        onCompleted: async (result) => {
            const { roomId, token } = result.joinVideoSession;
            setScreenState('WAITING');
            try {
                await hms.join(token, 'patient');
                setScreenState('IN_CALL');
            } catch {
                Alert.alert('Connection Error', 'Failed to join the video call. Please try again.');
                setScreenState('PRE_CALL');
            }
        },
        onError: (error) => {
            Alert.alert('Error', error.message);
        },
    });

    // Call duration timer
    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;
        if (screenState === 'IN_CALL') {
            timer = setInterval(() => {
                setCallDuration((prev) => prev + 1);
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [screenState]);

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const formatScheduledTime = (isoStr: string) => {
        const date = new Date(isoStr);
        return date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    };

    const handleJoinCall = useCallback(() => {
        if (!session) return;

        if (!session.recordingConsentGiven) {
            setScreenState('CONSENT');
            return;
        }

        joinSession({ variables: { videoSessionId } });
    }, [session, videoSessionId, joinSession]);

    const handleConsentGiven = useCallback(() => {
        setScreenState('PRE_CALL');
        refetch().then(() => {
            joinSession({ variables: { videoSessionId } });
        });
    }, [videoSessionId, joinSession, refetch]);

    const handleEndCall = useCallback(async () => {
        await hms.leave();
        setScreenState('POST_CALL');
    }, [hms]);

    const handleBack = useCallback(() => {
        if (screenState === 'IN_CALL') {
            Alert.alert('Leave Call', 'Are you sure you want to leave the video call?', [
                { text: 'Stay', style: 'cancel' },
                {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: handleEndCall,
                },
            ]);
        } else {
            router.back();
        }
    }, [screenState, handleEndCall, router]);

    if (loading && !data) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.centerContent}>
                    <ActivityIndicator
                        testID="loading-indicator"
                        size="large"
                        color={colors.primary}
                    />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    testID="back-button"
                    style={styles.backButton}
                    onPress={handleBack}
                >
                    <Text style={styles.backText}>{'\u2190'}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Video Consultation</Text>
                <View style={styles.headerSpacer} />
            </View>

            {/* PRE_CALL State */}
            {screenState === 'PRE_CALL' && (
                <View style={styles.preCallContainer}>
                    <View style={styles.previewContainer}>
                        <View style={styles.cameraPreview}>
                            <Text style={styles.previewIcon}>{'\uD83D\uDCF9'}</Text>
                            <Text style={styles.previewText}>Camera Preview</Text>
                        </View>
                    </View>

                    {session && (
                        <View style={styles.scheduleInfo}>
                            <Text style={styles.scheduleLabel}>Scheduled</Text>
                            <Text style={styles.scheduleTime}>
                                {formatScheduledTime(session.scheduledStartTime)}
                            </Text>
                        </View>
                    )}

                    <View style={styles.controlsRow}>
                        <TouchableOpacity
                            testID="toggle-audio"
                            style={[styles.controlButton, hms.isAudioMuted && styles.controlButtonMuted]}
                            onPress={hms.toggleAudio}
                        >
                            <Text style={styles.controlIcon}>
                                {hms.isAudioMuted ? '\uD83D\uDD07' : '\uD83C\uDFA4'}
                            </Text>
                            <Text style={styles.controlLabel}>
                                {hms.isAudioMuted ? 'Unmute' : 'Mute'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            testID="toggle-video"
                            style={[styles.controlButton, hms.isVideoMuted && styles.controlButtonMuted]}
                            onPress={hms.toggleVideo}
                        >
                            <Text style={styles.controlIcon}>
                                {hms.isVideoMuted ? '\uD83D\uDEAB' : '\uD83D\uDCF7'}
                            </Text>
                            <Text style={styles.controlLabel}>
                                {hms.isVideoMuted ? 'Camera On' : 'Camera Off'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.joinButton}
                        onPress={handleJoinCall}
                    >
                        <Text style={styles.joinButtonText}>Join Call</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* CONSENT State — Modal overlay */}
            {screenState === 'CONSENT' && session && (
                <>
                    <View style={styles.preCallContainer}>
                        <View style={styles.previewContainer}>
                            <View style={styles.cameraPreview}>
                                <Text style={styles.previewIcon}>{'\uD83D\uDCF9'}</Text>
                            </View>
                        </View>
                    </View>
                    <RecordingConsentModal
                        visible={true}
                        videoSessionId={videoSessionId || ''}
                        onConsent={handleConsentGiven}
                        onClose={() => setScreenState('PRE_CALL')}
                    />
                </>
            )}

            {/* WAITING State */}
            {screenState === 'WAITING' && (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.waitingTitle}>Connecting...</Text>
                    <Text style={styles.waitingText}>
                        Your doctor will join shortly
                    </Text>
                    <TouchableOpacity
                        style={styles.leaveButton}
                        onPress={handleEndCall}
                    >
                        <Text style={styles.leaveButtonText}>Leave</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* IN_CALL State */}
            {screenState === 'IN_CALL' && (
                <View style={styles.inCallContainer}>
                    {/* Doctor feed placeholder */}
                    <View style={styles.doctorFeed}>
                        <Text style={styles.feedPlaceholder}>{'\uD83D\uDC68\u200D\u2695\uFE0F'}</Text>
                        <Text style={styles.feedText}>Doctor Video</Text>
                    </View>

                    {/* Self-view PiP */}
                    <View style={styles.selfView}>
                        <Text style={styles.selfViewText}>You</Text>
                    </View>

                    {/* Duration timer */}
                    <View style={styles.durationBadge}>
                        <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
                    </View>

                    {/* In-call controls */}
                    <View style={styles.inCallControls}>
                        <TouchableOpacity
                            testID="toggle-audio"
                            style={[styles.inCallButton, hms.isAudioMuted && styles.inCallButtonMuted]}
                            onPress={hms.toggleAudio}
                        >
                            <Text style={styles.inCallButtonIcon}>
                                {hms.isAudioMuted ? '\uD83D\uDD07' : '\uD83C\uDFA4'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            testID="toggle-video"
                            style={[styles.inCallButton, hms.isVideoMuted && styles.inCallButtonMuted]}
                            onPress={hms.toggleVideo}
                        >
                            <Text style={styles.inCallButtonIcon}>
                                {hms.isVideoMuted ? '\uD83D\uDEAB' : '\uD83D\uDCF7'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.endCallButton}
                            onPress={handleEndCall}
                        >
                            <Text style={styles.endCallIcon}>{'\uD83D\uDCDE'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* POST_CALL State */}
            {screenState === 'POST_CALL' && (
                <View style={styles.centerContent}>
                    <Text style={styles.postCallIcon}>{'\u2705'}</Text>
                    <Text style={styles.postCallTitle}>Call Ended</Text>
                    <Text style={styles.postCallDuration}>
                        Duration: {formatDuration(callDuration)}
                    </Text>
                    <Text style={styles.postCallText}>
                        Your doctor will review the consultation and share next steps.
                    </Text>
                    <TouchableOpacity
                        style={styles.homeButton}
                        onPress={() => router.push('/(tabs)' as never)}
                    >
                        <Text style={styles.homeButtonText}>Return Home</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backText: {
        fontSize: 20,
        color: colors.text,
    },
    headerTitle: {
        ...typography.headingSmall,
        color: colors.text,
        flex: 1,
        textAlign: 'center',
    },
    headerSpacer: {
        width: 40,
    },
    centerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    // PRE_CALL
    preCallContainer: {
        flex: 1,
        padding: spacing.lg,
    },
    previewContainer: {
        flex: 1,
        marginBottom: spacing.lg,
    },
    cameraPreview: {
        flex: 1,
        backgroundColor: '#1A1A1A',
        borderRadius: borderRadius.xxl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewIcon: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    previewText: {
        ...typography.bodySmall,
        color: '#888',
    },
    scheduleInfo: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
        gap: spacing.sm,
    },
    scheduleLabel: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    scheduleTime: {
        ...typography.bodySmall,
        fontWeight: '600',
        color: colors.text,
    },
    controlsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.xl,
        marginBottom: spacing.lg,
    },
    controlButton: {
        alignItems: 'center',
        padding: spacing.md,
    },
    controlButtonMuted: {
        opacity: 0.5,
    },
    controlIcon: {
        fontSize: 28,
        marginBottom: spacing.xs,
    },
    controlLabel: {
        ...typography.label,
        color: colors.textSecondary,
    },
    joinButton: {
        backgroundColor: colors.success,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        ...shadows.md,
    },
    joinButtonText: {
        ...typography.button,
        color: '#FFFFFF',
    },
    // WAITING
    waitingTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    waitingText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginBottom: spacing.xl,
    },
    leaveButton: {
        backgroundColor: colors.error,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.full,
    },
    leaveButtonText: {
        ...typography.button,
        color: '#FFFFFF',
        fontSize: 14,
    },
    // IN_CALL
    inCallContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    doctorFeed: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    feedPlaceholder: {
        fontSize: 64,
        marginBottom: spacing.md,
    },
    feedText: {
        ...typography.bodySmall,
        color: '#888',
    },
    selfView: {
        position: 'absolute',
        top: spacing.lg,
        right: spacing.lg,
        width: 100,
        height: 140,
        backgroundColor: '#333',
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selfViewText: {
        ...typography.label,
        color: '#888',
    },
    durationBadge: {
        position: 'absolute',
        top: spacing.lg,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    durationText: {
        ...typography.label,
        color: '#FFF',
        fontWeight: '600',
    },
    inCallControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.lg,
        paddingVertical: spacing.xl,
        paddingBottom: spacing.xl + 20,
    },
    inCallButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    inCallButtonMuted: {
        backgroundColor: 'rgba(255,0,0,0.3)',
    },
    inCallButtonIcon: {
        fontSize: 24,
    },
    endCallButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.error,
        alignItems: 'center',
        justifyContent: 'center',
    },
    endCallIcon: {
        fontSize: 28,
    },
    // POST_CALL
    postCallIcon: {
        fontSize: 64,
        marginBottom: spacing.lg,
    },
    postCallTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    postCallDuration: {
        ...typography.bodySmall,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    postCallText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    homeButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.full,
        ...shadows.md,
    },
    homeButtonText: {
        ...typography.button,
        color: colors.primaryText,
    },
});
