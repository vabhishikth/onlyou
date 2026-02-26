/**
 * Video Session Screen Tests (Pre-call + Waiting Room + Video Call)
 * Phase 14 Chunk 6+7: Multi-state video session screen
 * Spec: Phase 13 — joinVideoSession, giveRecordingConsent
 * Task 2.2: Real video rendering with HmsView, auto-transition, disconnect handling
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

const mockUseQuery = require('@apollo/client').useQuery;
const mockUseMutation = require('@apollo/client').useMutation;

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
    useRouter: () => ({ push: mockPush, back: mockBack }),
    useLocalSearchParams: () => ({ videoSessionId: 'vs-1' }),
    Stack: { Screen: () => null },
}));

// Mock useHMS hook — mutable state for per-test control
const mockJoin = jest.fn().mockResolvedValue(undefined);
const mockLeave = jest.fn().mockResolvedValue(undefined);
const mockToggleAudio = jest.fn().mockResolvedValue(undefined);
const mockToggleVideo = jest.fn().mockResolvedValue(undefined);

let mockHMSState: any;
const resetMockHMSState = () => {
    mockHMSState = {
        join: mockJoin,
        leave: mockLeave,
        toggleAudio: mockToggleAudio,
        toggleVideo: mockToggleVideo,
        peers: [],
        remotePeers: [],
        localVideoTrackId: null,
        isAudioMuted: false,
        isVideoMuted: false,
        connectionState: 'DISCONNECTED',
        error: null,
    };
};
resetMockHMSState();

jest.mock('@/hooks/useHMS', () => ({
    useHMS: () => mockHMSState,
}));

import VideoSessionScreen from '../[videoSessionId]';

const mockSession = {
    id: 'vs-1',
    consultationId: 'con-1',
    doctorId: 'doc-1',
    patientId: 'pat-1',
    status: 'SCHEDULED',
    scheduledStartTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    scheduledEndTime: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    recordingConsentGiven: false,
    roomId: 'room-1',
};

beforeEach(() => {
    jest.clearAllMocks();
    resetMockHMSState();
    mockUseQuery.mockReturnValue({
        data: { videoSession: mockSession },
        loading: false,
        error: null,
        refetch: jest.fn(),
    });
    mockUseMutation.mockReturnValue([
        jest.fn().mockResolvedValue({
            data: { joinVideoSession: { roomId: 'room-1', token: 'test-token' } },
        }),
        { loading: false },
    ]);
});

describe('VideoSessionScreen', () => {
    describe('Pre-call state', () => {
        it('renders the pre-call screen', () => {
            const { getByText } = render(<VideoSessionScreen />);
            expect(getByText(/Video Consultation/i)).toBeTruthy();
        });

        it('shows Join Call button', () => {
            const { getByText } = render(<VideoSessionScreen />);
            expect(getByText('Join Call')).toBeTruthy();
        });

        it('shows camera and microphone toggle buttons', () => {
            const { getByTestId } = render(<VideoSessionScreen />);
            expect(getByTestId('toggle-audio')).toBeTruthy();
            expect(getByTestId('toggle-video')).toBeTruthy();
        });

        it('shows scheduled time', () => {
            const { getByText } = render(<VideoSessionScreen />);
            expect(getByText(/Scheduled/i)).toBeTruthy();
        });

        it('shows back button', () => {
            const { getByTestId } = render(<VideoSessionScreen />);
            expect(getByTestId('back-button')).toBeTruthy();
        });
    });

    describe('Consent flow', () => {
        it('shows consent modal when Join Call tapped and consent not given', () => {
            const { getByText, queryByText } = render(<VideoSessionScreen />);

            fireEvent.press(getByText('Join Call'));
            // Consent modal should appear
            expect(queryByText('Recording Consent')).toBeTruthy();
        });

        it('skips consent modal when consent already given', () => {
            mockUseQuery.mockReturnValue({
                data: {
                    videoSession: { ...mockSession, recordingConsentGiven: true },
                },
                loading: false,
                error: null,
                refetch: jest.fn(),
            });

            const { getByText, queryByText } = render(<VideoSessionScreen />);

            fireEvent.press(getByText('Join Call'));
            // Should NOT show consent modal
            expect(queryByText('Recording Consent')).toBeNull();
        });
    });

    describe('Loading state', () => {
        it('shows loading indicator when fetching session', () => {
            mockUseQuery.mockReturnValue({
                data: null,
                loading: true,
                error: null,
                refetch: jest.fn(),
            });

            const { getByTestId } = render(<VideoSessionScreen />);
            expect(getByTestId('loading-indicator')).toBeTruthy();
        });
    });

    describe('Audio/Video toggles', () => {
        it('toggles audio when mic button is pressed', () => {
            const { getByTestId } = render(<VideoSessionScreen />);
            fireEvent.press(getByTestId('toggle-audio'));
            expect(mockToggleAudio).toHaveBeenCalled();
        });

        it('toggles video when camera button is pressed', () => {
            const { getByTestId } = render(<VideoSessionScreen />);
            fireEvent.press(getByTestId('toggle-video'));
            expect(mockToggleVideo).toHaveBeenCalled();
        });
    });

    describe('Leave/Back navigation', () => {
        it('navigates back when back button pressed', () => {
            const { getByTestId } = render(<VideoSessionScreen />);
            fireEvent.press(getByTestId('back-button'));
            expect(mockBack).toHaveBeenCalled();
        });
    });

    // ============================================================
    // Task 2.2: IN_CALL rendering with real video
    // ============================================================

    describe('IN_CALL video rendering', () => {
        // Helper: set up mocks so pressing Join Call triggers the full join flow
        const setupJoinableSession = () => {
            // Session is within join window and consent given
            mockUseQuery.mockReturnValue({
                data: {
                    videoSession: {
                        ...mockSession,
                        recordingConsentGiven: true,
                        scheduledStartTime: new Date(Date.now() - 60000).toISOString(),
                    },
                },
                loading: false,
                error: null,
                refetch: jest.fn(),
            });

            // useMutation calls onCompleted with join result
            mockUseMutation.mockImplementation((_mutation: any, options: any) => {
                const mutate = jest.fn(async () => {
                    const resultData = { joinVideoSession: { roomId: 'room-1', token: 'test-token' } };
                    if (options?.onCompleted) {
                        await options.onCompleted(resultData);
                    }
                    return { data: resultData };
                });
                return [mutate, { loading: false }];
            });
        };

        it('transitions from WAITING to IN_CALL when remote peers appear', async () => {
            setupJoinableSession();

            // When hms.join() resolves, simulate doctor already in room
            mockJoin.mockImplementation(async () => {
                mockHMSState.connectionState = 'CONNECTED';
                mockHMSState.remotePeers = [
                    { id: 'doc-1', name: 'Dr. Smith', videoTrackId: 'vt-1', audioTrackId: 'at-1' },
                ];
            });

            const { getByText } = render(<VideoSessionScreen />);

            await act(async () => {
                fireEvent.press(getByText('Join Call'));
            });

            // Should transition to IN_CALL (showing call duration timer)
            await waitFor(() => {
                expect(getByText(/00:00/)).toBeTruthy();
            });
        });

        it('stays in WAITING when no remote peers after join', async () => {
            setupJoinableSession();

            // hms.join resolves but no peers yet
            mockJoin.mockImplementation(async () => {
                mockHMSState.connectionState = 'CONNECTED';
                mockHMSState.remotePeers = [];
            });

            const { getByText } = render(<VideoSessionScreen />);

            await act(async () => {
                fireEvent.press(getByText('Join Call'));
            });

            await waitFor(() => {
                expect(getByText('Waiting for doctor...')).toBeTruthy();
            });
        });

        it('renders HmsView with doctor video track when remote peer has video', async () => {
            setupJoinableSession();

            mockJoin.mockImplementation(async () => {
                mockHMSState.connectionState = 'CONNECTED';
                mockHMSState.remotePeers = [
                    { id: 'doc-1', name: 'Dr. Smith', videoTrackId: 'doctor-video-track', audioTrackId: 'at-1' },
                ];
            });

            const { getByTestId, getByText } = render(<VideoSessionScreen />);

            await act(async () => {
                fireEvent.press(getByText('Join Call'));
            });

            await waitFor(() => {
                expect(getByTestId('doctor-video')).toBeTruthy();
            });
        });

        it('renders doctor avatar fallback when remote peer has no video track', async () => {
            setupJoinableSession();

            mockJoin.mockImplementation(async () => {
                mockHMSState.connectionState = 'CONNECTED';
                mockHMSState.remotePeers = [
                    { id: 'doc-1', name: 'Dr. Smith' }, // No videoTrackId
                ];
            });

            const { getByTestId, getByText } = render(<VideoSessionScreen />);

            await act(async () => {
                fireEvent.press(getByText('Join Call'));
            });

            await waitFor(() => {
                expect(getByTestId('doctor-avatar')).toBeTruthy();
            });
        });

        it('renders self-view PiP with local video track', async () => {
            setupJoinableSession();

            mockJoin.mockImplementation(async () => {
                mockHMSState.connectionState = 'CONNECTED';
                mockHMSState.localVideoTrackId = 'local-video-track';
                mockHMSState.remotePeers = [
                    { id: 'doc-1', name: 'Dr. Smith', videoTrackId: 'vt-1' },
                ];
            });

            const { getByTestId, getByText } = render(<VideoSessionScreen />);

            await act(async () => {
                fireEvent.press(getByText('Join Call'));
            });

            await waitFor(() => {
                expect(getByTestId('self-video')).toBeTruthy();
            });
        });

        it('renders self-view placeholder when no local video track', async () => {
            setupJoinableSession();

            mockJoin.mockImplementation(async () => {
                mockHMSState.connectionState = 'CONNECTED';
                mockHMSState.localVideoTrackId = null;
                mockHMSState.remotePeers = [
                    { id: 'doc-1', name: 'Dr. Smith', videoTrackId: 'vt-1' },
                ];
            });

            const { getByTestId, getByText } = render(<VideoSessionScreen />);

            await act(async () => {
                fireEvent.press(getByText('Join Call'));
            });

            await waitFor(() => {
                expect(getByTestId('self-avatar')).toBeTruthy();
            });
        });

        it('shows "Doctor disconnected" banner when remote peers drop to zero during IN_CALL', async () => {
            setupJoinableSession();

            // Initial join: doctor is present
            mockJoin.mockImplementation(async () => {
                mockHMSState.connectionState = 'CONNECTED';
                mockHMSState.remotePeers = [
                    { id: 'doc-1', name: 'Dr. Smith', videoTrackId: 'vt-1' },
                ];
            });

            const { getByText, rerender } = render(<VideoSessionScreen />);

            await act(async () => {
                fireEvent.press(getByText('Join Call'));
            });

            // Verify we're in IN_CALL
            await waitFor(() => {
                expect(getByText(/00:00/)).toBeTruthy();
            });

            // Now simulate doctor leaving
            await act(async () => {
                mockHMSState.remotePeers = [];
            });

            // Re-render to pick up the state change
            rerender(<VideoSessionScreen />);

            await waitFor(() => {
                expect(getByText(/Doctor disconnected/i)).toBeTruthy();
            });
        });

        it('shows call duration timer in IN_CALL state', async () => {
            setupJoinableSession();

            mockJoin.mockImplementation(async () => {
                mockHMSState.connectionState = 'CONNECTED';
                mockHMSState.remotePeers = [
                    { id: 'doc-1', name: 'Dr. Smith', videoTrackId: 'vt-1' },
                ];
            });

            const { getByTestId, getByText } = render(<VideoSessionScreen />);

            await act(async () => {
                fireEvent.press(getByText('Join Call'));
            });

            await waitFor(() => {
                expect(getByTestId('duration-badge')).toBeTruthy();
            });
        });
    });

    // ============================================================
    // Task 2.3: Patient Reconnection UI
    // ============================================================

    describe('Reconnection UI', () => {
        // Helper: get into IN_CALL state for reconnection tests
        const setupInCallState = () => {
            // Session is joinable
            mockUseQuery.mockReturnValue({
                data: {
                    videoSession: {
                        ...mockSession,
                        recordingConsentGiven: true,
                        scheduledStartTime: new Date(Date.now() - 60000).toISOString(),
                    },
                },
                loading: false,
                error: null,
                refetch: jest.fn(),
            });

            // useMutation with onCompleted support
            mockUseMutation.mockImplementation((_mutation: any, options: any) => {
                const mutate = jest.fn(async () => {
                    const resultData = { joinVideoSession: { roomId: 'room-1', token: 'test-token' } };
                    if (options?.onCompleted) {
                        await options.onCompleted(resultData);
                    }
                    return { data: resultData };
                });
                return [mutate, { loading: false }];
            });

            // Start connected with peers
            mockJoin.mockImplementation(async () => {
                mockHMSState.connectionState = 'CONNECTED';
                mockHMSState.remotePeers = [
                    { id: 'doc-1', name: 'Dr. Smith', videoTrackId: 'vt-1' },
                ];
            });
        };

        it('shows RECONNECTING state when HMS connectionState is RECONNECTING', async () => {
            setupInCallState();
            const { getByText, rerender } = render(<VideoSessionScreen />);

            // Enter IN_CALL
            await act(async () => {
                fireEvent.press(getByText('Join Call'));
            });

            await waitFor(() => {
                expect(getByText(/00:00/)).toBeTruthy();
            });

            // Simulate HMS reconnecting
            await act(async () => {
                mockHMSState.connectionState = 'RECONNECTING';
            });
            rerender(<VideoSessionScreen />);

            await waitFor(() => {
                expect(getByText(/Reconnecting/i)).toBeTruthy();
            });
        });

        it('shows spinner during reconnection', async () => {
            setupInCallState();
            const { getByText, getByTestId, rerender } = render(<VideoSessionScreen />);

            await act(async () => {
                fireEvent.press(getByText('Join Call'));
            });

            await waitFor(() => {
                expect(getByText(/00:00/)).toBeTruthy();
            });

            // Simulate reconnecting
            await act(async () => {
                mockHMSState.connectionState = 'RECONNECTING';
            });
            rerender(<VideoSessionScreen />);

            await waitFor(() => {
                expect(getByTestId('reconnecting-spinner')).toBeTruthy();
            });
        });

        it('shows manual Reconnect button when in RECONNECTING state', async () => {
            setupInCallState();
            const { getByText, rerender } = render(<VideoSessionScreen />);

            await act(async () => {
                fireEvent.press(getByText('Join Call'));
            });

            await waitFor(() => {
                expect(getByText(/00:00/)).toBeTruthy();
            });

            // Simulate reconnecting
            await act(async () => {
                mockHMSState.connectionState = 'RECONNECTING';
            });
            rerender(<VideoSessionScreen />);

            await waitFor(() => {
                expect(getByText('Reconnect')).toBeTruthy();
            });
        });

        it('returns to IN_CALL when HMS auto-reconnects (RECONNECTING → CONNECTED)', async () => {
            setupInCallState();
            const { getByText, queryByText, rerender } = render(<VideoSessionScreen />);

            await act(async () => {
                fireEvent.press(getByText('Join Call'));
            });

            await waitFor(() => {
                expect(getByText(/00:00/)).toBeTruthy();
            });

            // Enter reconnecting
            await act(async () => {
                mockHMSState.connectionState = 'RECONNECTING';
            });
            rerender(<VideoSessionScreen />);

            await waitFor(() => {
                expect(getByText(/Reconnecting/i)).toBeTruthy();
            });

            // HMS auto-reconnects
            await act(async () => {
                mockHMSState.connectionState = 'CONNECTED';
                mockHMSState.remotePeers = [
                    { id: 'doc-1', name: 'Dr. Smith', videoTrackId: 'vt-1' },
                ];
            });
            rerender(<VideoSessionScreen />);

            await waitFor(() => {
                // Should be back in IN_CALL — reconnecting text gone
                expect(queryByText(/Reconnecting/i)).toBeNull();
                // Duration badge visible again
                expect(getByText(/00:0/)).toBeTruthy();
            });
        });

        it('shows Leave Call button in RECONNECTING state', async () => {
            setupInCallState();
            const { getByText, rerender } = render(<VideoSessionScreen />);

            await act(async () => {
                fireEvent.press(getByText('Join Call'));
            });

            await waitFor(() => {
                expect(getByText(/00:00/)).toBeTruthy();
            });

            await act(async () => {
                mockHMSState.connectionState = 'RECONNECTING';
            });
            rerender(<VideoSessionScreen />);

            await waitFor(() => {
                expect(getByText('Leave Call')).toBeTruthy();
            });
        });
    });

    // ============================================================
    // Task 4.1: Post-call summary for patient
    // ============================================================

    describe('POST_CALL state', () => {
        // Helper: get into IN_CALL then transition to POST_CALL via "End Call"
        const setupPostCallState = () => {
            mockUseQuery.mockReturnValue({
                data: {
                    videoSession: {
                        ...mockSession,
                        recordingConsentGiven: true,
                        status: 'COMPLETED',
                        scheduledStartTime: new Date(Date.now() - 60000).toISOString(),
                    },
                    videoSessionSummary: {
                        doctorName: 'Dr. Sharma',
                        durationSeconds: 750,
                        status: 'COMPLETED',
                        recordingAvailable: true,
                        notes: null,
                    },
                },
                loading: false,
                error: null,
                refetch: jest.fn(),
            });

            // useMutation with onCompleted for join flow
            mockUseMutation.mockImplementation((_mutation: any, options: any) => {
                const mutate = jest.fn(async () => {
                    const resultData = { joinVideoSession: { roomId: 'room-1', token: 'test-token' } };
                    if (options?.onCompleted) {
                        await options.onCompleted(resultData);
                    }
                    return { data: resultData };
                });
                return [mutate, { loading: false }];
            });
        };

        it('shows POST_CALL screen when session status is COMPLETED', () => {
            setupPostCallState();
            const { getByText } = render(<VideoSessionScreen />);
            expect(getByText(/Call Ended/i)).toBeTruthy();
        });

        it('shows doctor name in post-call summary', () => {
            setupPostCallState();
            const { getByText } = render(<VideoSessionScreen />);
            expect(getByText(/Dr. Sharma/)).toBeTruthy();
        });

        it('shows call duration in post-call summary', () => {
            setupPostCallState();
            const { getByText } = render(<VideoSessionScreen />);
            // 750 seconds = 12 min 30 sec → "12:30"
            expect(getByText(/12:30/)).toBeTruthy();
        });

        it('shows "Your doctor is reviewing your case" message', () => {
            setupPostCallState();
            const { getByText } = render(<VideoSessionScreen />);
            expect(getByText(/reviewing your case/i)).toBeTruthy();
        });

        it('shows Go Back button in post-call', () => {
            setupPostCallState();
            const { getByText } = render(<VideoSessionScreen />);
            expect(getByText(/Go Back/i)).toBeTruthy();
        });
    });
});
