/**
 * Video Slot Picker Screen Tests
 * Phase 14 Chunk 4: Slot booking for video consultations
 * Spec: Phase 13 — availableVideoSlots query + bookVideoSlot mutation
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockUseQuery = require('@apollo/client').useQuery;
const mockUseMutation = require('@apollo/client').useMutation;

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
    useRouter: () => ({ push: mockPush, back: mockBack }),
    useLocalSearchParams: () => ({ consultationId: 'con-1' }),
    Stack: { Screen: () => null },
}));

import VideoSlotPicker from '../[consultationId]';

const mockSlots = {
    availableVideoSlots: {
        doctorId: 'doc-1',
        slots: [
            { date: '2026-03-01', startTime: '10:00', endTime: '10:15' },
            { date: '2026-03-01', startTime: '10:15', endTime: '10:30' },
            { date: '2026-03-01', startTime: '10:30', endTime: '10:45' },
            { date: '2026-03-02', startTime: '14:00', endTime: '14:15' },
            { date: '2026-03-02', startTime: '14:15', endTime: '14:30' },
        ],
        connectivityWarning: 'Ensure stable internet for best experience',
    },
};

beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({
        data: mockSlots,
        loading: false,
        error: null,
        refetch: jest.fn(),
    });
    mockUseMutation.mockReturnValue([
        jest.fn().mockResolvedValue({ data: { bookVideoSlot: { bookedSlot: { id: 'bs-1' } } } }),
        { loading: false },
    ]);
});

describe('VideoSlotPicker', () => {
    it('renders the screen title', () => {
        const { getByText } = render(<VideoSlotPicker />);
        expect(getByText('Pick a Slot')).toBeTruthy();
    });

    it('displays connectivity warning banner', () => {
        const { getByText } = render(<VideoSlotPicker />);
        expect(getByText(/stable internet/i)).toBeTruthy();
    });

    it('renders date tabs for available dates', () => {
        const { getAllByText } = render(<VideoSlotPicker />);
        // Should show "Mar" for both dates
        const marElements = getAllByText(/Mar/);
        expect(marElements.length).toBeGreaterThanOrEqual(2);
    });

    it('renders time slot chips', () => {
        const { getByText } = render(<VideoSlotPicker />);
        expect(getByText('10:00')).toBeTruthy();
        expect(getByText('10:15')).toBeTruthy();
        expect(getByText('10:30')).toBeTruthy();
    });

    it('allows selecting a time slot chip', () => {
        const { getByText } = render(<VideoSlotPicker />);
        const chip = getByText('10:00');
        fireEvent.press(chip);
        // After pressing, the confirm button should appear/become active
        expect(getByText(/Confirm/i)).toBeTruthy();
    });

    it('shows loading state when fetching slots', () => {
        mockUseQuery.mockReturnValue({
            data: null,
            loading: true,
            error: null,
            refetch: jest.fn(),
        });

        const { getByTestId } = render(<VideoSlotPicker />);
        expect(getByTestId('loading-indicator')).toBeTruthy();
    });

    it('shows empty state when no slots available', () => {
        mockUseQuery.mockReturnValue({
            data: { availableVideoSlots: { doctorId: 'doc-1', slots: [], connectivityWarning: '' } },
            loading: false,
            error: null,
            refetch: jest.fn(),
        });

        const { getByText } = render(<VideoSlotPicker />);
        expect(getByText(/no slots/i)).toBeTruthy();
    });

    it('calls bookVideoSlot mutation when confirmed', () => {
        const mockBook = jest.fn().mockResolvedValue({
            data: { bookVideoSlot: { bookedSlot: { id: 'bs-1' } } },
        });
        mockUseMutation.mockReturnValue([mockBook, { loading: false }]);

        const { getByText } = render(<VideoSlotPicker />);

        // Select a slot
        fireEvent.press(getByText('10:00'));
        // Press confirm
        fireEvent.press(getByText(/Confirm/i));

        expect(mockBook).toHaveBeenCalled();
    });

    it('renders back button', () => {
        const { getByTestId } = render(<VideoSlotPicker />);
        expect(getByTestId('back-button')).toBeTruthy();
    });

    it('navigates back when back button pressed', () => {
        const { getByTestId } = render(<VideoSlotPicker />);
        fireEvent.press(getByTestId('back-button'));
        expect(mockBack).toHaveBeenCalled();
    });
});
