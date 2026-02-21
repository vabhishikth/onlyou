/**
 * Prescriptions Profile Screen Tests
 * PR 26 Task 1: /profile/prescriptions screen (TDD)
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

// Mock prescription data
const mockPrescriptions = [
    {
        id: 'rx-1',
        consultationId: 'consult-1',
        vertical: 'HAIR_LOSS',
        doctorName: 'Dr. Rahul Sharma',
        pdfUrl: 'https://s3.example.com/rx-1.pdf',
        medications: [
            { name: 'Finasteride', dosage: '1mg', frequency: 'Once daily' },
            { name: 'Minoxidil 5%', dosage: '1ml', frequency: 'Twice daily' },
        ],
        instructions: 'Take with food',
        validUntil: '2026-08-01T00:00:00Z',
        issuedAt: '2026-02-01T00:00:00Z',
        createdAt: '2026-02-01T00:00:00Z',
    },
    {
        id: 'rx-2',
        consultationId: 'consult-2',
        vertical: 'SEXUAL_HEALTH',
        doctorName: 'Dr. Priya Patel',
        pdfUrl: null,
        medications: [
            { name: 'Tadalafil', dosage: '5mg', frequency: 'Once daily' },
        ],
        instructions: null,
        validUntil: '2026-09-15T00:00:00Z',
        issuedAt: '2026-03-15T00:00:00Z',
        createdAt: '2026-03-15T00:00:00Z',
    },
];

// Import after mocks
import PrescriptionsScreen from '../prescriptions';

beforeEach(() => {
    jest.clearAllMocks();
});

describe('PrescriptionsScreen', () => {
    describe('Loading state', () => {
        it('renders loading indicator while fetching', () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: undefined,
                loading: true,
                error: undefined,
            });

            const { getByTestId } = render(<PrescriptionsScreen />);
            expect(getByTestId('prescriptions-loading')).toBeTruthy();
        });
    });

    describe('Prescription list', () => {
        beforeEach(() => {
            (useQuery as jest.Mock).mockReturnValue({
                data: { myPrescriptions: mockPrescriptions },
                loading: false,
                error: undefined,
            });
        });

        it('renders the screen with header', () => {
            const { getByText } = render(<PrescriptionsScreen />);
            expect(getByText('My Prescriptions')).toBeTruthy();
        });

        it('displays prescription cards for each prescription', () => {
            const { getByTestId } = render(<PrescriptionsScreen />);
            expect(getByTestId('prescription-card-rx-1')).toBeTruthy();
            expect(getByTestId('prescription-card-rx-2')).toBeTruthy();
        });

        it('shows vertical badge on each prescription', () => {
            const { getByText } = render(<PrescriptionsScreen />);
            expect(getByText('Hair Loss')).toBeTruthy();
            expect(getByText('Sexual Health')).toBeTruthy();
        });

        it('displays doctor name on prescription cards', () => {
            const { getByText } = render(<PrescriptionsScreen />);
            expect(getByText('Dr. Rahul Sharma')).toBeTruthy();
            expect(getByText('Dr. Priya Patel')).toBeTruthy();
        });

        it('shows medication count on each card', () => {
            const { getByText } = render(<PrescriptionsScreen />);
            expect(getByText('2 medications')).toBeTruthy();
            expect(getByText('1 medication')).toBeTruthy();
        });

        it('displays issued date on each card', () => {
            const { getAllByText } = render(<PrescriptionsScreen />);
            // Should display dates in a readable format
            const dateElements = getAllByText(/Feb|Mar/);
            expect(dateElements.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Empty state', () => {
        it('shows empty state when no prescriptions', () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: { myPrescriptions: [] },
                loading: false,
                error: undefined,
            });

            const { getByTestId } = render(<PrescriptionsScreen />);
            expect(getByTestId('prescriptions-empty')).toBeTruthy();
        });
    });
});
