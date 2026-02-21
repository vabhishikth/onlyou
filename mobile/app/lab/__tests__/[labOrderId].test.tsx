/**
 * Lab Booking Screen Tests
 * PR 29 Task 2: Lab detail/booking screen tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { useQuery, useMutation } from '@apollo/client';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        back: mockBack,
    }),
    useSegments: () => [],
    useLocalSearchParams: () => ({ labOrderId: 'lab-order-1' }),
    Slot: ({ children }: { children: React.ReactNode }) => children,
    Stack: { Screen: () => null },
    Link: ({ children }: { children: React.ReactNode }) => children,
}));

const mockLabOrder = {
    id: 'lab-order-1',
    status: 'ORDERED',
    testPanel: ['Complete Blood Count', 'Lipid Profile', 'Liver Function Tests', 'Thyroid Profile'],
    panelName: 'Comprehensive Health Checkup',
    collectionAddress: '123 Main St, Mumbai, Maharashtra 400001',
    orderedAt: '2026-02-21T10:00:00Z',
};

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

const mockSlots = [
    {
        id: 'slot-1',
        date: tomorrow.toISOString(),
        startTime: '6:00 AM',
        endTime: '7:00 AM',
        city: 'Mumbai',
        maxBookings: 5,
        currentBookings: 2,
    },
    {
        id: 'slot-2',
        date: tomorrow.toISOString(),
        startTime: '7:00 AM',
        endTime: '8:00 AM',
        city: 'Mumbai',
        maxBookings: 5,
        currentBookings: 5, // Full
    },
];

const mockBookSlot = jest.fn().mockResolvedValue({ data: {} });

import LabBookingScreen from '../[labOrderId]/index';

beforeEach(() => {
    jest.clearAllMocks();
    (useMutation as jest.Mock).mockReturnValue([mockBookSlot, { loading: false }]);
});

describe('LabBookingScreen', () => {
    describe('Loading state', () => {
        it('shows loading while fetching order and slots', () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: undefined,
                loading: true,
                error: undefined,
            });

            const { getByText } = render(<LabBookingScreen />);
            expect(getByText('Loading available slots...')).toBeTruthy();
        });
    });

    describe('Order display', () => {
        beforeEach(() => {
            (useQuery as jest.Mock)
                .mockReturnValueOnce({
                    data: { labOrder: mockLabOrder },
                    loading: false,
                    error: undefined,
                })
                .mockReturnValueOnce({
                    data: { availableSlots: mockSlots },
                    loading: false,
                    error: undefined,
                });
        });

        it('renders schedule collection header', () => {
            const { getByText } = render(<LabBookingScreen />);
            expect(getByText('Schedule Collection')).toBeTruthy();
        });

        it('shows panel name', () => {
            const { getByText } = render(<LabBookingScreen />);
            expect(getByText('Comprehensive Health Checkup')).toBeTruthy();
        });

        it('shows test names with truncation', () => {
            const { getByText } = render(<LabBookingScreen />);
            expect(getByText(/Complete Blood Count.*Lipid Profile.*Liver Function Tests.*\+1 more/)).toBeTruthy();
        });

        it('shows slot selection section', () => {
            const { getByText } = render(<LabBookingScreen />);
            expect(getByText('Select a slot')).toBeTruthy();
        });

        it('shows instructions for fasting', () => {
            const { getByText } = render(<LabBookingScreen />);
            expect(getByText(/Choose a morning slot.*fasting blood tests/)).toBeTruthy();
        });

        it('shows confirm booking button', () => {
            const { getByText } = render(<LabBookingScreen />);
            expect(getByText('Confirm Booking')).toBeTruthy();
        });
    });

    describe('Error state', () => {
        it('shows error when lab order not found', () => {
            (useQuery as jest.Mock)
                .mockReturnValueOnce({
                    data: { labOrder: null },
                    loading: false,
                    error: undefined,
                })
                .mockReturnValueOnce({
                    data: { availableSlots: [] },
                    loading: false,
                    error: undefined,
                });

            const { getByText } = render(<LabBookingScreen />);
            expect(getByText('Lab order not found')).toBeTruthy();
        });
    });
});
