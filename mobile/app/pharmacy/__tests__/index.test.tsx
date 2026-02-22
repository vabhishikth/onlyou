/**
 * Spec: Phase 15 — Mobile active pharmacy orders screen
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';

// Mock useQuery to return pharmacy orders
const mockUseQuery = require('@apollo/client').useQuery;

import PharmacyOrdersScreen from '../index';

const mockOrders = [
    {
        id: 'po-1',
        orderNumber: 'PO-100001',
        status: 'PREPARING',
        deliveryAddress: '123 MG Road, Andheri West',
        deliveryCity: 'Mumbai',
        deliveryPincode: '400058',
        createdAt: '2026-02-20T10:00:00Z',
    },
    {
        id: 'po-2',
        orderNumber: 'PO-100002',
        status: 'DISPATCHED',
        deliveryAddress: '456 Hill Road, Bandra',
        deliveryCity: 'Mumbai',
        deliveryPincode: '400050',
        createdAt: '2026-02-21T10:00:00Z',
    },
];

describe('Pharmacy Orders Screen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render screen title', () => {
        mockUseQuery.mockReturnValue({
            data: { myActivePharmacyOrders: mockOrders },
            loading: false,
            error: null,
            refetch: jest.fn(),
        });

        render(<PharmacyOrdersScreen />);
        expect(screen.getByText('My Orders')).toBeTruthy();
    });

    it('should show order cards with order numbers', () => {
        mockUseQuery.mockReturnValue({
            data: { myActivePharmacyOrders: mockOrders },
            loading: false,
            error: null,
            refetch: jest.fn(),
        });

        render(<PharmacyOrdersScreen />);
        expect(screen.getByText('PO-100001')).toBeTruthy();
        expect(screen.getByText('PO-100002')).toBeTruthy();
    });

    it('should show order status badges', () => {
        mockUseQuery.mockReturnValue({
            data: { myActivePharmacyOrders: mockOrders },
            loading: false,
            error: null,
            refetch: jest.fn(),
        });

        render(<PharmacyOrdersScreen />);
        expect(screen.getByText('Preparing')).toBeTruthy();
        expect(screen.getByText('Dispatched')).toBeTruthy();
    });

    it('should show delivery address', () => {
        mockUseQuery.mockReturnValue({
            data: { myActivePharmacyOrders: mockOrders },
            loading: false,
            error: null,
            refetch: jest.fn(),
        });

        render(<PharmacyOrdersScreen />);
        expect(screen.getByText(/Andheri West/)).toBeTruthy();
    });

    it('should show empty state when no orders', () => {
        mockUseQuery.mockReturnValue({
            data: { myActivePharmacyOrders: [] },
            loading: false,
            error: null,
            refetch: jest.fn(),
        });

        render(<PharmacyOrdersScreen />);
        expect(screen.getByText(/no active orders/i)).toBeTruthy();
    });

    it('should show loading indicator', () => {
        mockUseQuery.mockReturnValue({
            data: null,
            loading: true,
            error: null,
            refetch: jest.fn(),
        });

        render(<PharmacyOrdersScreen />);
        expect(screen.getByTestId('pharmacy-loading')).toBeTruthy();
    });
});
