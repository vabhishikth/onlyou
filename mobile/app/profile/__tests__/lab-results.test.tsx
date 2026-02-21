/**
 * Lab Results Profile Screen Tests
 * PR 26 Task 2: /profile/lab-results screen (TDD)
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { useQuery } from '@apollo/client';

// Must be named 'mock' prefix for Jest hoisting
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
    useRouter: () => ({
        push: mockPush,
        replace: jest.fn(),
        back: mockBack,
    }),
    useSegments: () => [],
    useLocalSearchParams: () => ({}),
    Slot: ({ children }: { children: React.ReactNode }) => children,
    Stack: {
        Screen: () => null,
    },
    Link: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock lab order data
const mockLabOrders = [
    {
        id: 'lab-1',
        status: 'RESULTS_READY',
        testPanel: ['TSH', 'CBC', 'Ferritin'],
        panelName: 'Hair Loss Basic Panel',
        resultFileUrl: 'https://s3.example.com/lab-1.pdf',
        criticalValues: null,
        orderedAt: '2026-02-01T00:00:00Z',
        sampleCollectedAt: '2026-02-05T00:00:00Z',
        resultsUploadedAt: '2026-02-07T00:00:00Z',
        doctorReviewedAt: null,
    },
    {
        id: 'lab-2',
        status: 'DOCTOR_REVIEWED',
        testPanel: ['Testosterone', 'LH'],
        panelName: 'Hormone Panel',
        resultFileUrl: 'https://s3.example.com/lab-2.pdf',
        criticalValues: null,
        orderedAt: '2026-01-10T00:00:00Z',
        sampleCollectedAt: '2026-01-15T00:00:00Z',
        resultsUploadedAt: '2026-01-17T00:00:00Z',
        doctorReviewedAt: '2026-01-18T00:00:00Z',
    },
];

// Import after mocks
import LabResultsScreen from '../lab-results';

beforeEach(() => {
    jest.clearAllMocks();
});

describe('LabResultsScreen', () => {
    describe('Loading state', () => {
        it('renders loading indicator while fetching', () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: undefined,
                loading: true,
                error: undefined,
            });

            const { getByTestId } = render(<LabResultsScreen />);
            expect(getByTestId('lab-results-loading')).toBeTruthy();
        });
    });

    describe('Lab order list', () => {
        beforeEach(() => {
            (useQuery as jest.Mock).mockReturnValue({
                data: { myLabOrders: mockLabOrders },
                loading: false,
                error: undefined,
            });
        });

        it('renders the screen with header', () => {
            const { getByText } = render(<LabResultsScreen />);
            expect(getByText('Lab Results')).toBeTruthy();
        });

        it('displays lab order cards for each order', () => {
            const { getByTestId } = render(<LabResultsScreen />);
            expect(getByTestId('lab-order-card-lab-1')).toBeTruthy();
            expect(getByTestId('lab-order-card-lab-2')).toBeTruthy();
        });

        it('shows panel name on each card', () => {
            const { getByText } = render(<LabResultsScreen />);
            expect(getByText('Hair Loss Basic Panel')).toBeTruthy();
            expect(getByText('Hormone Panel')).toBeTruthy();
        });

        it('shows status badge on each card', () => {
            const { getByText } = render(<LabResultsScreen />);
            expect(getByText('Results Ready')).toBeTruthy();
            expect(getByText('Doctor Reviewed')).toBeTruthy();
        });

        it('shows test count on each card', () => {
            const { getByText } = render(<LabResultsScreen />);
            expect(getByText('3 tests')).toBeTruthy();
        });
    });

    describe('Empty state', () => {
        it('shows empty state when no lab orders', () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: { myLabOrders: [] },
                loading: false,
                error: undefined,
            });

            const { getByTestId } = render(<LabResultsScreen />);
            expect(getByTestId('lab-results-empty')).toBeTruthy();
        });
    });
});
