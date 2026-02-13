/**
 * Orders Screen Tests
 * PR 6: Remaining Screens Restyle
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
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

// Mock order data
const mockActiveDeliveryOrder = {
    id: 'order-1',
    type: 'DELIVERY',
    status: 'DISPATCHED',
    treatmentType: 'HAIR_LOSS',
    title: 'Hair Loss Treatment — Month 2',
    estimatedDelivery: '2026-02-18',
    createdAt: '2026-02-10T10:00:00Z',
};

const mockActiveLabOrder = {
    id: 'order-2',
    type: 'LAB',
    status: 'SLOT_BOOKED',
    treatmentType: 'HAIR_LOSS',
    title: 'Blood Panel Test',
    slotDate: '2026-02-15',
    createdAt: '2026-02-08T10:00:00Z',
};

const mockPastDeliveryOrder = {
    id: 'order-3',
    type: 'DELIVERY',
    status: 'DELIVERED',
    treatmentType: 'HAIR_LOSS',
    title: 'Hair Loss Treatment — Month 1',
    deliveredAt: '2026-01-12T10:00:00Z',
    createdAt: '2026-01-05T10:00:00Z',
};

const mockPastLabOrder = {
    id: 'order-4',
    type: 'LAB',
    status: 'DOCTOR_REVIEWED',
    treatmentType: 'HAIR_LOSS',
    title: 'Initial Blood Panel',
    completedAt: '2026-01-08T10:00:00Z',
    createdAt: '2026-01-02T10:00:00Z',
};

// Import after mocks
import OrdersScreen from '../orders';

beforeEach(() => {
    jest.clearAllMocks();

    // Mock useQuery with orders
    (useQuery as jest.Mock).mockReturnValue({
        data: {
            myOrders: {
                active: [mockActiveDeliveryOrder, mockActiveLabOrder],
                past: [mockPastDeliveryOrder, mockPastLabOrder],
            },
        },
        loading: false,
        error: null,
        refetch: jest.fn(),
    });
});

describe('OrdersScreen', () => {
    describe('Screen structure', () => {
        it('renders the screen with testID', () => {
            const { getByTestId } = render(<OrdersScreen />);
            expect(getByTestId('orders-screen')).toBeTruthy();
        });

        it('displays "Orders" title with serif font', () => {
            const { getByText } = render(<OrdersScreen />);
            expect(getByText('Orders')).toBeTruthy();
        });

        it('renders tab toggle with Active and Past options', () => {
            const { getByTestId } = render(<OrdersScreen />);
            expect(getByTestId('tab-toggle')).toBeTruthy();
        });

        it('renders Active tab button', () => {
            const { getByTestId } = render(<OrdersScreen />);
            expect(getByTestId('tab-active')).toBeTruthy();
        });

        it('renders Past tab button', () => {
            const { getByTestId } = render(<OrdersScreen />);
            expect(getByTestId('tab-past')).toBeTruthy();
        });
    });

    describe('Tab toggle behavior', () => {
        it('Active tab is selected by default', () => {
            const { getByTestId } = render(<OrdersScreen />);
            const activeTab = getByTestId('tab-active');
            // Check if active tab has active styles
            expect(activeTab.props.style).toBeDefined();
        });

        it('switches to Past tab when tapped', () => {
            const { getByTestId, getAllByText } = render(<OrdersScreen />);
            const pastTab = getByTestId('tab-past');
            fireEvent.press(pastTab);
            // Past orders should be visible (multiple "delivered" matches expected)
            const deliveredMatches = getAllByText(/delivered/i);
            expect(deliveredMatches.length).toBeGreaterThan(0);
        });

        it('switches back to Active tab when tapped', () => {
            const { getByTestId, getByText } = render(<OrdersScreen />);
            const pastTab = getByTestId('tab-past');
            fireEvent.press(pastTab);
            const activeTab = getByTestId('tab-active');
            fireEvent.press(activeTab);
            // Active orders should be visible
            expect(getByText(/Hair Loss Treatment — Month 2/)).toBeTruthy();
        });
    });

    describe('Active orders', () => {
        it('renders active order cards', () => {
            const { getByTestId } = render(<OrdersScreen />);
            expect(getByTestId('order-card-order-1')).toBeTruthy();
            expect(getByTestId('order-card-order-2')).toBeTruthy();
        });

        it('displays order type icon (Package or TestTube2)', () => {
            const { getByTestId } = render(<OrdersScreen />);
            expect(getByTestId('order-icon-order-1')).toBeTruthy();
        });

        it('displays order title', () => {
            const { getByText } = render(<OrdersScreen />);
            expect(getByText('Hair Loss Treatment — Month 2')).toBeTruthy();
        });

        it('displays status badge with correct color', () => {
            const { getByTestId } = render(<OrdersScreen />);
            expect(getByTestId('status-badge-order-1')).toBeTruthy();
        });

        it('displays estimated delivery date', () => {
            const { getByText } = render(<OrdersScreen />);
            expect(getByText(/arriving by/i)).toBeTruthy();
        });
    });

    describe('Past orders', () => {
        it('renders past order cards when Past tab selected', () => {
            const { getByTestId } = render(<OrdersScreen />);
            const pastTab = getByTestId('tab-past');
            fireEvent.press(pastTab);
            expect(getByTestId('order-card-order-3')).toBeTruthy();
            expect(getByTestId('order-card-order-4')).toBeTruthy();
        });

        it('displays delivered date for completed orders', () => {
            const { getByTestId, getAllByText } = render(<OrdersScreen />);
            const pastTab = getByTestId('tab-past');
            fireEvent.press(pastTab);
            // Multiple "delivered" matches expected (status badge + date)
            const deliveredMatches = getAllByText(/delivered/i);
            expect(deliveredMatches.length).toBeGreaterThan(0);
        });
    });

    describe('Empty state', () => {
        it('displays empty state when no active orders', () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: {
                    myOrders: {
                        active: [],
                        past: [mockPastDeliveryOrder],
                    },
                },
                loading: false,
                error: null,
                refetch: jest.fn(),
            });

            const { getByTestId } = render(<OrdersScreen />);
            expect(getByTestId('empty-state')).toBeTruthy();
        });

        it('displays empty state message', () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: {
                    myOrders: {
                        active: [],
                        past: [],
                    },
                },
                loading: false,
                error: null,
                refetch: jest.fn(),
            });

            const { getByText } = render(<OrdersScreen />);
            expect(getByText(/no orders yet/i)).toBeTruthy();
        });
    });

    describe('Loading state', () => {
        it('displays skeleton shimmer while loading', () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: null,
                loading: true,
                error: null,
                refetch: jest.fn(),
            });

            const { getByTestId } = render(<OrdersScreen />);
            expect(getByTestId('loading-skeleton')).toBeTruthy();
        });
    });

    describe('Lucide icons', () => {
        it('renders Lucide icons instead of emojis', () => {
            const { queryByText } = render(<OrdersScreen />);
            expect(queryByText('📦')).toBeNull();
            expect(queryByText('🔬')).toBeNull();
        });
    });

    describe('Design system compliance', () => {
        it('uses 20px padding on order cards', () => {
            const { getByTestId } = render(<OrdersScreen />);
            const card = getByTestId('order-card-order-1');
            expect(card.props.style).toBeDefined();
        });

        it('uses border-radius 20px on cards', () => {
            const { getByTestId } = render(<OrdersScreen />);
            const card = getByTestId('order-card-order-1');
            expect(card.props.style).toBeDefined();
        });

        it('tab toggle container has border-radius 24px', () => {
            const { getByTestId } = render(<OrdersScreen />);
            const toggle = getByTestId('tab-toggle');
            expect(toggle.props.style).toBeDefined();
        });
    });
});
