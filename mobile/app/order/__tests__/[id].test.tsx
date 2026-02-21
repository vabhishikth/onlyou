/**
 * Order Detail Screen Tests
 * PR 26 Task 4: /order/[id] detail screen (TDD)
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useQuery } from '@apollo/client';

// Must be named 'mock' prefix for Jest hoisting
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockLocalSearchParams = jest.fn();

jest.mock('expo-router', () => ({
    useRouter: () => ({
        push: mockPush,
        replace: jest.fn(),
        back: mockBack,
    }),
    useLocalSearchParams: () => mockLocalSearchParams(),
    useSegments: () => [],
    Slot: ({ children }: { children: React.ReactNode }) => children,
    Stack: {
        Screen: () => null,
    },
    Link: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock order detail data
const mockOrderDetail = {
    id: 'order-1',
    orderNumber: 'ORD-20260215-001',
    status: 'PHARMACY_PREPARING',
    deliveryAddress: '123 Main Street, Andheri West',
    deliveryCity: 'Mumbai',
    deliveryPincode: '400058',
    deliveryPersonName: null,
    deliveryPersonPhone: null,
    estimatedDeliveryTime: null,
    deliveryOtp: null,
    medicationCost: 150000,
    deliveryCost: 5000,
    totalAmount: 155000,
    orderedAt: '2026-02-15T10:00:00Z',
    sentToPharmacyAt: '2026-02-15T10:05:00Z',
    pharmacyReadyAt: null,
    deliveredAt: null,
    cancelledAt: null,
    deliveryFailedReason: null,
};

const mockOutForDeliveryOrder = {
    ...mockOrderDetail,
    id: 'order-2',
    status: 'OUT_FOR_DELIVERY',
    deliveryPersonName: 'Rahul K.',
    deliveryPersonPhone: '+919876543210',
    estimatedDeliveryTime: '30 min',
    deliveryOtp: '4829',
    pharmacyReadyAt: '2026-02-15T14:00:00Z',
};

// Import after mocks
import OrderDetailScreen from '../[id]';

beforeEach(() => {
    jest.clearAllMocks();
    mockLocalSearchParams.mockReturnValue({ id: 'order-1' });
});

describe('OrderDetailScreen', () => {
    describe('Loading state', () => {
        it('renders loading indicator while fetching', () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: undefined,
                loading: true,
                error: undefined,
            });

            const { getByTestId } = render(<OrderDetailScreen />);
            expect(getByTestId('order-detail-loading')).toBeTruthy();
        });
    });

    describe('Order summary', () => {
        beforeEach(() => {
            (useQuery as jest.Mock).mockReturnValue({
                data: {
                    order: {
                        success: true,
                        message: 'Order found',
                        order: mockOrderDetail,
                    },
                },
                loading: false,
                error: undefined,
            });
        });

        it('renders the header with Order Details title', () => {
            const { getByText } = render(<OrderDetailScreen />);
            expect(getByText('Order Details')).toBeTruthy();
        });

        it('displays order number', () => {
            const { getByText } = render(<OrderDetailScreen />);
            expect(getByText('ORD-20260215-001')).toBeTruthy();
        });

        it('displays delivery address', () => {
            const { getByText } = render(<OrderDetailScreen />);
            expect(getByText(/123 Main Street/)).toBeTruthy();
        });

        it('displays total amount in rupees', () => {
            const { getByText } = render(<OrderDetailScreen />);
            // 155000 paise = Rs 1,550
            expect(getByText(/1,550/)).toBeTruthy();
        });
    });

    describe('Delivery stepper', () => {
        it('shows current status label', () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: {
                    order: {
                        success: true,
                        message: 'Order found',
                        order: mockOrderDetail,
                    },
                },
                loading: false,
                error: undefined,
            });

            const { getByText } = render(<OrderDetailScreen />);
            expect(getByText('Medication Being Prepared')).toBeTruthy();
        });

        it('shows delivery person info when out for delivery', () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: {
                    order: {
                        success: true,
                        message: 'Order found',
                        order: mockOutForDeliveryOrder,
                    },
                },
                loading: false,
                error: undefined,
            });

            const { getByText } = render(<OrderDetailScreen />);
            expect(getByText(/Rahul K/)).toBeTruthy();
        });
    });

    describe('Delivery OTP', () => {
        it('shows OTP section when order is out for delivery', () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: {
                    order: {
                        success: true,
                        message: 'Order found',
                        order: mockOutForDeliveryOrder,
                    },
                },
                loading: false,
                error: undefined,
            });

            const { getByTestId } = render(<OrderDetailScreen />);
            expect(getByTestId('delivery-otp-section')).toBeTruthy();
        });
    });

    describe('Error / not found state', () => {
        it('shows error state when order not found', () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: {
                    order: {
                        success: false,
                        message: 'Order not found',
                        order: null,
                    },
                },
                loading: false,
                error: undefined,
            });

            const { getByTestId } = render(<OrderDetailScreen />);
            expect(getByTestId('order-detail-error')).toBeTruthy();
        });
    });
});
