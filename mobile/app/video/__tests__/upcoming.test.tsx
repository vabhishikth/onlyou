/**
 * Upcoming Video Sessions Screen Tests
 * Phase 14 Chunk 3: List of upcoming booked video sessions
 * Spec: Phase 13 — myUpcomingVideoSessions query
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockUseQuery = require('@apollo/client').useQuery;
const mockUseMutation = require('@apollo/client').useMutation;

// Mock expo-router
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
    useRouter: () => ({ push: mockPush, back: mockBack }),
    useLocalSearchParams: () => ({}),
    Stack: {
        Screen: () => null,
    },
}));

import UpcomingVideoSessions from '../upcoming';

const mockSessions = [
    {
        id: 'bs-1',
        videoSessionId: 'vs-1',
        doctorId: 'doc-1',
        patientId: 'pat-1',
        consultationId: 'con-1',
        slotDate: '2026-03-01T00:00:00.000Z',
        startTime: '2026-03-01T10:00:00.000Z',
        endTime: '2026-03-01T10:15:00.000Z',
        status: 'BOOKED',
        createdAt: '2026-02-22T12:00:00.000Z',
    },
    {
        id: 'bs-2',
        videoSessionId: 'vs-2',
        doctorId: 'doc-2',
        patientId: 'pat-1',
        consultationId: 'con-2',
        slotDate: '2026-03-02T00:00:00.000Z',
        startTime: '2026-03-02T14:00:00.000Z',
        endTime: '2026-03-02T14:15:00.000Z',
        status: 'BOOKED',
        createdAt: '2026-02-22T14:00:00.000Z',
    },
];

beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({
        data: { myUpcomingVideoSessions: mockSessions },
        loading: false,
        error: null,
        refetch: jest.fn(),
    });
    mockUseMutation.mockReturnValue([jest.fn(), { loading: false }]);
});

describe('UpcomingVideoSessions', () => {
    it('renders the screen title', () => {
        const { getByText } = render(<UpcomingVideoSessions />);
        expect(getByText('Video Sessions')).toBeTruthy();
    });

    it('renders upcoming session cards', () => {
        const { getAllByTestId } = render(<UpcomingVideoSessions />);
        const cards = getAllByTestId(/session-card-/);
        expect(cards.length).toBe(2);
    });

    it('shows session date and time', () => {
        const { getAllByText } = render(<UpcomingVideoSessions />);
        // Both sessions are in March
        const marElements = getAllByText(/Mar/);
        expect(marElements.length).toBeGreaterThanOrEqual(2);
    });

    it('shows status badge for each session', () => {
        const { getAllByText } = render(<UpcomingVideoSessions />);
        const badges = getAllByText('Booked');
        expect(badges.length).toBe(2);
    });

    it('shows loading state when fetching', () => {
        mockUseQuery.mockReturnValue({
            data: null,
            loading: true,
            error: null,
            refetch: jest.fn(),
        });

        const { getByTestId } = render(<UpcomingVideoSessions />);
        expect(getByTestId('loading-indicator')).toBeTruthy();
    });

    it('shows empty state when no sessions', () => {
        mockUseQuery.mockReturnValue({
            data: { myUpcomingVideoSessions: [] },
            loading: false,
            error: null,
            refetch: jest.fn(),
        });

        const { getByText } = render(<UpcomingVideoSessions />);
        expect(getByText(/no upcoming/i)).toBeTruthy();
    });

    it('navigates to session screen when Join is pressed', () => {
        const { getAllByText } = render(<UpcomingVideoSessions />);
        const joinButtons = getAllByText('Join');

        fireEvent.press(joinButtons[0]);
        expect(mockPush).toHaveBeenCalledWith('/video/session/vs-1');
    });

    it('shows Cancel button for booked sessions', () => {
        const { getAllByText } = render(<UpcomingVideoSessions />);
        const cancelButtons = getAllByText('Cancel');
        expect(cancelButtons.length).toBe(2);
    });

    it('shows Reschedule button for booked sessions', () => {
        const { getAllByText } = render(<UpcomingVideoSessions />);
        const rescheduleButtons = getAllByText('Reschedule');
        expect(rescheduleButtons.length).toBe(2);
    });

    it('renders back button', () => {
        const { getByTestId } = render(<UpcomingVideoSessions />);
        expect(getByTestId('back-button')).toBeTruthy();
    });
});
