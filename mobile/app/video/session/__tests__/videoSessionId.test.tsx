/**
 * Video Session Screen Tests (Pre-call + Waiting Room + Video Call)
 * Phase 14 Chunk 6+7: Multi-state video session screen
 * Spec: Phase 13 — joinVideoSession, giveRecordingConsent
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockUseQuery = require('@apollo/client').useQuery;
const mockUseMutation = require('@apollo/client').useMutation;

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
    useRouter: () => ({ push: mockPush, back: mockBack }),
    useLocalSearchParams: () => ({ videoSessionId: 'vs-1' }),
    Stack: { Screen: () => null },
}));

// Mock useHMS hook
const mockJoin = jest.fn().mockResolvedValue(undefined);
const mockLeave = jest.fn().mockResolvedValue(undefined);
const mockToggleAudio = jest.fn().mockResolvedValue(undefined);
const mockToggleVideo = jest.fn().mockResolvedValue(undefined);

jest.mock('@/hooks/useHMS', () => ({
    useHMS: () => ({
        join: mockJoin,
        leave: mockLeave,
        toggleAudio: mockToggleAudio,
        toggleVideo: mockToggleVideo,
        peers: [],
        isAudioMuted: false,
        isVideoMuted: false,
        connectionState: 'DISCONNECTED',
        error: null,
    }),
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
});
