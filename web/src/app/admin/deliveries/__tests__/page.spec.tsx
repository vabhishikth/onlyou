/**
 * Admin Deliveries Page Tests
 * PR 27 Task 2: Lab orders + deliveries tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import DeliveriesPage from '../page';
import { ADMIN_DELIVERIES } from '@/graphql/admin';

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockDeliveries = [
    {
        id: 'del-1',
        patient: { id: 'p-1', name: 'Rahul Sharma', phone: '+919876543210' },
        medications: [
            { name: 'Finasteride', dosage: '1mg', frequency: 'Once daily' },
            { name: 'Minoxidil 5%', dosage: '1ml', frequency: 'Twice daily' },
        ],
        status: 'PHARMACY_READY',
        pharmacy: { id: 'pharm-1', name: 'MedPlus Pharmacy', address: '123 Main St', phone: '+919811111111' },
        deliveryPersonName: null,
        deliveryPersonPhone: null,
        deliveryMethod: null,
        estimatedDeliveryTime: null,
        deliveryOtp: null,
        deliveryAddress: '456 Park Road, Andheri West',
        deliveryCity: 'Mumbai',
        deliveryPincode: '400058',
        totalAmountPaise: 250000,
        isReorder: false,
        orderedAt: '2026-02-20T10:00:00Z',
        sentToPharmacyAt: '2026-02-20T10:05:00Z',
        pharmacyReadyAt: '2026-02-20T14:00:00Z',
        outForDeliveryAt: null,
        deliveredAt: null,
        pharmacyIssueReason: null,
        deliveryFailedReason: null,
    },
    {
        id: 'del-2',
        patient: { id: 'p-2', name: 'Priya Patel', phone: '+919876000000' },
        medications: [
            { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' },
        ],
        status: 'OUT_FOR_DELIVERY',
        pharmacy: { id: 'pharm-2', name: 'Apollo Pharmacy', address: '789 Elm St', phone: null },
        deliveryPersonName: 'Raj Kumar',
        deliveryPersonPhone: '+919800000000',
        deliveryMethod: 'RAPIDO',
        estimatedDeliveryTime: '30 min',
        deliveryOtp: '4829',
        deliveryAddress: '789 Elm St, Bandra',
        deliveryCity: 'Mumbai',
        deliveryPincode: '400050',
        totalAmountPaise: 120000,
        isReorder: true,
        orderedAt: '2026-02-19T08:00:00Z',
        sentToPharmacyAt: '2026-02-19T08:05:00Z',
        pharmacyReadyAt: '2026-02-19T12:00:00Z',
        outForDeliveryAt: '2026-02-20T15:00:00Z',
        deliveredAt: null,
        pharmacyIssueReason: null,
        deliveryFailedReason: null,
    },
];

const deliveriesMock: MockedResponse = {
    request: {
        query: ADMIN_DELIVERIES,
        variables: {
            filter: {
                statuses: undefined,
                isReorder: undefined,
                search: undefined,
            },
        },
    },
    result: {
        data: {
            adminDeliveries: {
                deliveries: mockDeliveries,
                total: 2,
                page: 1,
                pageSize: 50,
            },
        },
    },
};

function renderWithProvider(mocks: MockedResponse[] = []) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            <DeliveriesPage />
        </MockedProvider>
    );
}

describe('DeliveriesPage', () => {
    it('should render page header', async () => {
        renderWithProvider([deliveriesMock]);

        await waitFor(() => {
            expect(screen.getByText('Deliveries')).toBeDefined();
        });
    });

    it('should display delivery cards with patient names', async () => {
        renderWithProvider([deliveriesMock]);

        await waitFor(() => {
            expect(screen.getByText('Rahul Sharma')).toBeDefined();
            expect(screen.getByText('Priya Patel')).toBeDefined();
        });
    });

    it('should show status badges on delivery cards', async () => {
        renderWithProvider([deliveriesMock]);

        await waitFor(() => {
            expect(screen.getByText('Ready')).toBeDefined();
            expect(screen.getByText('Out for Delivery')).toBeDefined();
        });
    });

    it('should show medication count on cards', async () => {
        renderWithProvider([deliveriesMock]);

        await waitFor(() => {
            expect(screen.getByText('2 medication(s)')).toBeDefined();
            expect(screen.getByText('1 medication(s)')).toBeDefined();
        });
    });

    it('should show auto-reorder badge when applicable', async () => {
        renderWithProvider([deliveriesMock]);

        await waitFor(() => {
            expect(screen.getByText('Auto-Reorder')).toBeDefined();
        });
    });

    it('should show pharmacy name on cards', async () => {
        renderWithProvider([deliveriesMock]);

        await waitFor(() => {
            expect(screen.getByText('MedPlus Pharmacy')).toBeDefined();
            expect(screen.getByText('Apollo Pharmacy')).toBeDefined();
        });
    });

    it('should have search input', async () => {
        renderWithProvider([deliveriesMock]);

        const searchInput = screen.getByPlaceholderText(/search/i);
        expect(searchInput).toBeDefined();
    });
});
