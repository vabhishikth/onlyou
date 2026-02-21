/**
 * Wallet Screen Tests
 * PR 29 Task 1: Wallet screen tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { useQuery } from '@apollo/client';

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

const mockWalletData = {
    myWallet: {
        balance: 500000, // 5000 rupees in paise
        referralCode: 'REF123ABC',
        totalReferrals: 3,
        transactions: [
            {
                id: 'txn-1',
                type: 'DEBIT',
                amount: 100000,
                description: 'Consultation payment',
                createdAt: '2026-02-20T10:00:00Z',
            },
            {
                id: 'txn-2',
                type: 'CREDIT',
                amount: 50000,
                description: 'Referral bonus',
                createdAt: '2026-02-18T10:00:00Z',
            },
            {
                id: 'txn-3',
                type: 'REFUND',
                amount: 20000,
                description: 'Order refund',
                createdAt: '2026-02-14T10:00:00Z',
            },
        ],
    },
};

import WalletScreen from '../wallet';

beforeEach(() => {
    jest.clearAllMocks();
});

describe('WalletScreen', () => {
    describe('Wallet display', () => {
        beforeEach(() => {
            (useQuery as jest.Mock).mockReturnValue({
                data: mockWalletData,
                loading: false,
                error: undefined,
            });
        });

        it('renders wallet header', () => {
            const { getByText } = render(<WalletScreen />);
            expect(getByText('Wallet')).toBeTruthy();
        });

        it('displays available balance', () => {
            const { getByText } = render(<WalletScreen />);
            expect(getByText('Available Balance')).toBeTruthy();
        });

        it('shows referral code', () => {
            const { getByText } = render(<WalletScreen />);
            expect(getByText('Refer & Earn')).toBeTruthy();
            expect(getByText('REF123ABC')).toBeTruthy();
        });

        it('shows referral stats', () => {
            const { getByText } = render(<WalletScreen />);
            expect(getByText(/3 friends referred/)).toBeTruthy();
        });

        it('shows transaction history', () => {
            const { getByText } = render(<WalletScreen />);
            expect(getByText('Transaction History')).toBeTruthy();
            expect(getByText('Consultation payment')).toBeTruthy();
            expect(getByText('Referral bonus')).toBeTruthy();
            expect(getByText('Order refund')).toBeTruthy();
        });

        it('shows share button', () => {
            const { getByText } = render(<WalletScreen />);
            expect(getByText('Share')).toBeTruthy();
        });
    });

    describe('Empty wallet', () => {
        it('shows empty transactions when no transactions', () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: {
                    myWallet: {
                        balance: 0,
                        referralCode: 'REF000',
                        totalReferrals: 0,
                        transactions: [],
                    },
                },
                loading: false,
                error: undefined,
            });

            const { getByText } = render(<WalletScreen />);
            expect(getByText('No transactions yet')).toBeTruthy();
        });
    });
});
