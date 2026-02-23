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
            planId: 'plan-1',
            status: 'ACTIVE',
            currentPeriodStart: '2025-01-15T00:00:00Z',
            currentPeriodEnd: '2025-02-15T00:00:00Z',
            cancelledAt: null,
            plan: {
                id: 'plan-1',
                vertical: 'HAIR_LOSS',
                name: 'Basic Plan',
                priceInPaise: 99900,
                durationMonths: 1,
            },
        },
        {
            id: 'sub-2',
            planId: 'plan-2',
            status: 'PAUSED',
            currentPeriodStart: '2024-12-01T00:00:00Z',
            currentPeriodEnd: '2025-03-01T00:00:00Z',
            cancelledAt: null,
            plan: {
                id: 'plan-2',
                vertical: 'WEIGHT_MANAGEMENT',
                name: 'Premium Plan',
                priceInPaise: 149900,
                durationMonths: 3,
            },
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
