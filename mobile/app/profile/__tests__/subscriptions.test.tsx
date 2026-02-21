/**
 * Subscriptions Screen Tests
 * PR 29 Task 2: Subscriptions screen tests
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
    useLocalSearchParams: () => ({}),
    Slot: ({ children }: { children: React.ReactNode }) => children,
    Stack: { Screen: () => null },
    Link: ({ children }: { children: React.ReactNode }) => children,
}));

const mockSubscriptions = {
    mySubscriptions: [
        {
            id: 'sub-1',
            vertical: 'HAIR_LOSS',
            plan: 'Basic Plan',
            status: 'ACTIVE',
            startDate: '2025-01-15',
            nextBillingDate: '2025-02-15',
            amount: 99900, // 999 rupees in paise
            autoRenew: true,
        },
        {
            id: 'sub-2',
            vertical: 'WEIGHT_MANAGEMENT',
            plan: 'Premium Plan',
            status: 'PAUSED',
            startDate: '2024-12-01',
            nextBillingDate: null,
            amount: 149900, // 1499 rupees
            autoRenew: true,
        },
    ],
};

const mockToggle = jest.fn().mockResolvedValue({ data: {} });
const mockCancel = jest.fn().mockResolvedValue({ data: {} });

import SubscriptionsScreen from '../subscriptions';

beforeEach(() => {
    jest.clearAllMocks();
    (useMutation as jest.Mock)
        .mockReturnValueOnce([mockToggle, { loading: false }])
        .mockReturnValueOnce([mockCancel, { loading: false }]);
});

describe('SubscriptionsScreen', () => {
    describe('Subscription list', () => {
        beforeEach(() => {
            (useQuery as jest.Mock).mockReturnValue({
                data: mockSubscriptions,
                loading: false,
                error: undefined,
                refetch: jest.fn(),
            });
        });

        it('renders subscriptions header', () => {
            const { getByText } = render(<SubscriptionsScreen />);
            expect(getByText('Subscriptions')).toBeTruthy();
        });

        it('shows subscription vertical names', () => {
            const { getByText } = render(<SubscriptionsScreen />);
            expect(getByText('Hair Loss')).toBeTruthy();
            expect(getByText('Weight Management')).toBeTruthy();
        });

        it('shows plan names', () => {
            const { getByText } = render(<SubscriptionsScreen />);
            expect(getByText('Basic Plan')).toBeTruthy();
            expect(getByText('Premium Plan')).toBeTruthy();
        });

        it('shows status badges', () => {
            const { getByText } = render(<SubscriptionsScreen />);
            expect(getByText('Active')).toBeTruthy();
            expect(getByText('Paused')).toBeTruthy();
        });

        it('shows pause button for active subscription', () => {
            const { getByText } = render(<SubscriptionsScreen />);
            expect(getByText('Pause')).toBeTruthy();
        });

        it('shows resume button for paused subscription', () => {
            const { getByText } = render(<SubscriptionsScreen />);
            expect(getByText('Resume')).toBeTruthy();
        });
    });

    describe('Empty state', () => {
        it('shows empty state when no subscriptions', () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: { mySubscriptions: [] },
                loading: false,
                error: undefined,
                refetch: jest.fn(),
            });

            (useMutation as jest.Mock)
                .mockReturnValueOnce([mockToggle, { loading: false }])
                .mockReturnValueOnce([mockCancel, { loading: false }]);

            const { getByText } = render(<SubscriptionsScreen />);
            expect(getByText('No subscriptions')).toBeTruthy();
        });
    });
});
