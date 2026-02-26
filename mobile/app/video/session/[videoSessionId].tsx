import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { gql, useQuery, useMutation } from '@apollo/client';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme';
import { useHMS } from '@/hooks/useHMS';
import { HmsView } from '@100mslive/react-native-hms';
import {
    JOIN_VIDEO_SESSION,
    REJOIN_VIDEO_SESSION,
    GIVE_RECORDING_CONSENT,
    type VideoSession,
} from '@/graphql/video';
import RecordingConsentModal from '@/components/video/RecordingConsentModal';

// Spec: Phase 14 Chunk 6+7 — Multi-state video session screen
// State machine: PRE_CALL → CONSENT → WAITING → IN_CALL → POST_CALL
// Task 2.3: Added RECONNECTING state between IN_CALL states

type ScreenState = 'PRE_CALL' | 'CONSENT' | 'WAITING' | 'IN_CALL' | 'RECONNECTING' | 'POST_CALL';

const GET_VIDEO_SESSION_QUERY = gql`
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

// Join window: allow joining 2 minutes before scheduled time
const JOIN_WINDOW_MS = 2 * 60 * 1000;

export default function VideoSessionScreen() {
    const router = useRouter();
    const { videoSessionId } = useLocalSearchParams<{ videoSessionId: string }>();

    const [screenState, setScreenState] = useState<ScreenState>('PRE_CALL');
    const [callDuration, setCallDuration] = useState(0);
    const [secondsUntilStart, setSecondsUntilStart] = useState<number | null>(null);
    const [waitingElapsed, setWaitingElapsed] = useState(0);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const hms = useHMS();

    // Poll in PRE_CALL to detect "doctor is waiting" status, and in WAITING for status changes
    const shouldPoll = screenState === 'PRE_CALL' || screenState === 'WAITING';

    const { data, loading, refetch } = useQuery(GET_VIDEO_SESSION_QUERY, {
        variables: { videoSessionId },
        skip: !videoSessionId,
        pollInterval: shouldPoll ? 3000 : 0,
    });

    const session: VideoSession | null = data?.videoSession || null;

    const [doctorDisconnected, setDoctorDisconnected] = useState(false);

    const [joinSession] = useMutation(JOIN_VIDEO_SESSION, {
        onCompleted: async (result) => {
            const { token } = result.joinVideoSession;
            setScreenState('WAITING');
            try {
                await hms.join(token, 'patient');
                // Stay in WAITING — useEffect transitions to IN_CALL when remotePeers appear
            } catch {
                Alert.alert('Connection Error', 'Failed to join the video call. Please try again.');
                setScreenState('PRE_CALL');
            }
        },
        onError: (error) => {
            Alert.alert('Error', error.message);
        },
    });

    // Spec: Task 2.3 — Rejoin mutation for manual reconnection
    const [rejoinSession] = useMutation(REJOIN_VIDEO_SESSION, {
        onCompleted: async (result) => {
            const { token } = result.rejoinVideoSession;
            try {
                await hms.leave();
                await hms.join(token, 'patient');
                // useEffect handles RECONNECTING → IN_CALL when connection restores
            } catch {
                Alert.alert('Reconnection Failed', 'Could not reconnect. Please try again.');
            }
        },
        onError: (error) => {
            Alert.alert('Reconnection Error', error.message);
        },
    });

    const handleManualReconnect = useCallback(() => {
        if (!videoSessionId) return;
        rejoinSession({ variables: { videoSessionId } });
    }, [videoSessionId, rejoinSession]);

    // Countdown timer to scheduled start
    useEffect(() => {
        if (!session?.scheduledStartTime || screenState !== 'PRE_CALL') return;

        const updateCountdown = () => {
            const now = Date.now();
            const start = new Date(session.scheduledStartTime).getTime();
            const diff = Math.floor((start - now) / 1000);
            setSecondsUntilStart(diff);
        };

        updateCountdown();
        const timer = setInterval(updateCountdown, 1000);
        return () => clearInterval(timer);
    }, [session?.scheduledStartTime, screenState]);

    // Call duration timer — keep counting during RECONNECTING
    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;
        if (screenState === 'IN_CALL' || screenState === 'RECONNECTING') {
            timer = setInterval(() => {
                setCallDuration((prev) => prev + 1);
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [screenState]);

    // Waiting elapsed timer
    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;
        if (screenState === 'WAITING') {
            setWaitingElapsed(0);
            timer = setInterval(() => {
                setWaitingElapsed((prev) => prev + 1);
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [screenState]);

    // Spec: Task 2.2 — Auto-transition from WAITING to IN_CALL when remote peers join
    useEffect(() => {
        if (screenState === 'WAITING' && hms.remotePeers.length > 0) {
            setScreenState('IN_CALL');
            setDoctorDisconnected(false);
        }
    }, [screenState, hms.remotePeers.length]);

    // Spec: Task 2.2 — Detect doctor disconnect during IN_CALL
    useEffect(() => {
        if (screenState === 'IN_CALL') {
            if (hms.remotePeers.length === 0) {
                setDoctorDisconnected(true);
            } else {
                setDoctorDisconnected(false);
            }
        }
    }, [screenState, hms.remotePeers.length]);

    // Spec: Task 2.3 — Transition to RECONNECTING when HMS SDK reports reconnecting
    useEffect(() => {
        if (screenState === 'IN_CALL' && hms.connectionState === 'RECONNECTING') {
            setScreenState('RECONNECTING');
        }
    }, [screenState, hms.connectionState]);

    // Spec: Task 2.3 — Auto-recover from RECONNECTING when HMS SDK reconnects
    useEffect(() => {
        if (screenState === 'RECONNECTING' && hms.connectionState === 'CONNECTED') {
            setScreenState('IN_CALL');
        }
    }, [screenState, hms.connectionState]);

    // Pulse animation for "Doctor is waiting" indicator
    useEffect(() => {
        if (session?.status === 'WAITING_FOR_PATIENT') {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                ]),
            );
            pulse.start();
            return () => pulse.stop();
        }
    }, [session?.status, pulseAnim]);

    const isDoctorWaiting = session?.status === 'WAITING_FOR_PATIENT';
    const canJoin = secondsUntilStart !== null && secondsUntilStart <= JOIN_WINDOW_MS / 1000;

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const formatCountdown = (seconds: number) => {
        if (seconds <= 0) return 'Now';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        if (m > 60) {
            const h = Math.floor(m / 60);
            const rm = m % 60;
            return `${h}h ${rm}m`;
        }
        return `${m}:${s.toString().padStart(2, '0')}`;
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

        // Always allow consent flow regardless of time
        if (!session.recordingConsentGiven) {
            setScreenState('CONSENT');
            return;
        }

        // After consent, check time window
        if (!canJoin && !isDoctorWaiting) {
            Alert.alert('Too Early', 'You can join 2 minutes before the scheduled time.');
            return;
        }

        joinSession({ variables: { videoSessionId } });
    }, [session, videoSessionId, joinSession, canJoin, isDoctorWaiting]);

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
        if (screenState === 'IN_CALL' || screenState === 'RECONNECTING') {
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

                    {/* Doctor is waiting banner */}
                    {isDoctorWaiting && (
                        <Animated.View style={[styles.doctorWaitingBanner, { opacity: pulseAnim }]}>
                            <Text style={styles.doctorWaitingText}>
                                Your doctor is waiting — Join now!
                            </Text>
                        </Animated.View>
                    )}

                    {session && (
                        <>
                            <View style={styles.scheduleInfo}>
                                {secondsUntilStart !== null && secondsUntilStart > 0 ? (
                                    <>
                                        <Text style={styles.scheduleLabel}>Starts in</Text>
                                        <Text style={styles.countdownText}>
                                            {formatCountdown(secondsUntilStart)}
                                        </Text>
                                    </>
                                ) : (
                                    <>
                                        <Text style={styles.scheduleLabel}>Scheduled</Text>
                                        <Text style={styles.scheduleTime}>
                                            {formatScheduledTime(session.scheduledStartTime)}
                                        </Text>
                                    </>
                                )}
                            </View>

                            {/* Step-by-step instructions */}
                            <View style={styles.instructionsBox}>
                                <Text style={styles.instructionsTitle}>How it works</Text>
                                <View style={styles.instructionStep}>
                                    <Text style={styles.stepNumber}>1</Text>
                                    <Text style={styles.stepText}>Tap &quot;Join Call&quot; when the button turns green</Text>
                                </View>
                                <View style={styles.instructionStep}>
                                    <Text style={styles.stepNumber}>2</Text>
                                    <Text style={styles.stepText}>Allow recording consent (required by law)</Text>
                                </View>
                                <View style={styles.instructionStep}>
                                    <Text style={styles.stepNumber}>3</Text>
                                    <Text style={styles.stepText}>Wait for your doctor to join the call</Text>
                                </View>
                                <View style={styles.instructionStep}>
                                    <Text style={styles.stepNumber}>4</Text>
                                    <Text style={styles.stepText}>Ensure good lighting and a quiet space</Text>
                                </View>
                            </View>
                        </>
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
                        testID="join-button"
                        style={[
                            styles.joinButton,
                            !canJoin && !isDoctorWaiting && session?.recordingConsentGiven && styles.joinButtonDisabled,
                        ]}
                        onPress={handleJoinCall}
                    >
                        <Text style={[
                            styles.joinButtonText,
                            !canJoin && !isDoctorWaiting && session?.recordingConsentGiven && styles.joinButtonTextDisabled,
                        ]}>
                            Join Call
                        </Text>
                    </TouchableOpacity>

                    {!canJoin && !isDoctorWaiting && (
                        <Text style={styles.joinHint}>
                            Join opens 2 minutes before scheduled time
                        </Text>
                    )}
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
                    <Text style={styles.waitingTitle}>
                        {hms.connectionState === 'CONNECTED'
                            ? 'Waiting for doctor...'
                            : 'Connecting...'}
                    </Text>
                    <Text style={styles.waitingText}>
                        {hms.connectionState === 'CONNECTED'
                            ? `Waiting ${formatDuration(waitingElapsed)}`
                            : 'Setting up your connection'}
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
                    {/* Doctor video feed — HmsView or avatar fallback */}
                    {hms.remotePeers.length > 0 && hms.remotePeers[0].videoTrackId ? (
                        <View testID="doctor-video" style={styles.doctorFeed}>
                            <HmsView
                                trackId={hms.remotePeers[0].videoTrackId}
                                style={styles.fullVideo}
                            />
                        </View>
                    ) : (
                        <View testID="doctor-avatar" style={styles.doctorFeed}>
                            <Text style={styles.feedPlaceholder}>{'\uD83D\uDC68\u200D\u2695\uFE0F'}</Text>
                            <Text style={styles.feedText}>
                                {hms.remotePeers.length > 0
                                    ? hms.remotePeers[0].name
                                    : 'Waiting for doctor...'}
                            </Text>
                        </View>
                    )}

                    {/* Doctor disconnected banner */}
                    {doctorDisconnected && (
                        <View style={styles.disconnectBanner}>
                            <Text style={styles.disconnectText}>
                                Doctor disconnected — waiting for reconnection...
                            </Text>
                        </View>
                    )}

                    {/* Self-view PiP — HmsView or avatar fallback */}
                    {hms.localVideoTrackId ? (
                        <View testID="self-video" style={styles.selfView}>
                            <HmsView
                                trackId={hms.localVideoTrackId}
                                style={styles.selfVideo}
                            />
                        </View>
                    ) : (
                        <View testID="self-avatar" style={styles.selfView}>
                            <Text style={styles.selfViewText}>You</Text>
                        </View>
                    )}

                    {/* Duration timer */}
                    <View testID="duration-badge" style={styles.durationBadge}>
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

            {/* RECONNECTING State — Task 2.3 */}
            {screenState === 'RECONNECTING' && (
                <View style={styles.reconnectContainer}>
                    <ActivityIndicator
                        testID="reconnecting-spinner"
                        size="large"
                        color={colors.primary}
                    />
                    <Text style={styles.reconnectTitle}>Reconnecting...</Text>
                    <Text style={styles.reconnectText}>
                        Your connection was interrupted. Attempting to reconnect automatically.
                    </Text>
                    <Text style={styles.reconnectDuration}>
                        Call time: {formatDuration(callDuration)}
                    </Text>

                    <TouchableOpacity
                        style={styles.reconnectButton}
                        onPress={handleManualReconnect}
                    >
                        <Text style={styles.reconnectButtonText}>Reconnect</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.reconnectLeaveButton}
                        onPress={handleEndCall}
                    >
                        <Text style={styles.reconnectLeaveText}>Leave Call</Text>
                    </TouchableOpacity>
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
    doctorWaitingBanner: {
        backgroundColor: '#059669',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
        alignItems: 'center',
    },
    doctorWaitingText: {
        ...typography.bodySmall,
        color: '#FFFFFF',
        fontWeight: '700',
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
    countdownText: {
        ...typography.headingSmall,
        fontWeight: '700',
        color: colors.primary,
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
    joinButtonDisabled: {
        backgroundColor: '#D1D5DB',
    },
    joinButtonText: {
        ...typography.button,
        color: '#FFFFFF',
    },
    joinButtonTextDisabled: {
        color: '#9CA3AF',
    },
    joinHint: {
        ...typography.label,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.sm,
    },
    instructionsBox: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        marginBottom: spacing.lg,
    },
    instructionsTitle: {
        ...typography.bodySmall,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    instructionStep: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
        gap: spacing.sm,
    },
    stepNumber: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: colors.primary,
        color: '#FFFFFF',
        textAlign: 'center',
        lineHeight: 22,
        fontSize: 12,
        fontWeight: '700',
        overflow: 'hidden',
    },
    stepText: {
        ...typography.label,
        color: colors.textSecondary,
        flex: 1,
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
    fullVideo: {
        flex: 1,
        width: '100%',
    },
    selfVideo: {
        flex: 1,
        width: '100%',
        borderRadius: borderRadius.lg,
    },
    disconnectBanner: {
        position: 'absolute',
        top: 60,
        left: spacing.lg,
        right: spacing.lg,
        backgroundColor: 'rgba(239, 68, 68, 0.9)',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        zIndex: 10,
    },
    disconnectText: {
        ...typography.bodySmall,
        color: '#FFFFFF',
        fontWeight: '600',
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
    // RECONNECTING
    reconnectContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        backgroundColor: colors.background,
    },
    reconnectTitle: {
        ...typography.headingSmall,
        color: colors.text,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    reconnectText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    reconnectDuration: {
        ...typography.bodySmall,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: spacing.xl,
    },
    reconnectButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.full,
        marginBottom: spacing.md,
        ...shadows.md,
    },
    reconnectButtonText: {
        ...typography.button,
        color: colors.primaryText,
    },
    reconnectLeaveButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xl,
    },
    reconnectLeaveText: {
        ...typography.button,
        color: colors.error,
        fontSize: 14,
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
