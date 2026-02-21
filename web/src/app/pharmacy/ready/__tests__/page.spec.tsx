/**
 * Pharmacy Portal — Ready Orders Tests
 * PR 28 Task 2: Pharmacy portal tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import ReadyPage from '../page';
import { PHARMACY_READY_ORDERS } from '@/graphql/pharmacy-portal';

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockOrders = [
    {
        id: 'po-1',
        orderId: 'ORD-001',
        patientArea: 'Andheri West',
        medications: [
            { name: 'Finasteride', dosage: '1mg', quantity: 30 },
            { name: 'Minoxidil', dosage: '60ml', quantity: 1 },
        ],
        prescriptionUrl: null,
        status: 'PHARMACY_READY',
        createdAt: '2026-02-21T10:00:00Z',
        deliveryPersonName: 'Raj Kumar',
        deliveryPersonPhone: '+919800000000',
    },
    {
        id: 'po-2',
        orderId: 'ORD-002',
        patientArea: 'Bandra',
        medications: [
            { name: 'Metformin', dosage: '500mg', quantity: 60 },
        ],
        prescriptionUrl: null,
        status: 'PHARMACY_READY',
        createdAt: '2026-02-21T11:00:00Z',
        deliveryPersonName: null,
        deliveryPersonPhone: null,
    },
];

const ordersMock: MockedResponse = {
    request: { query: PHARMACY_READY_ORDERS },
    result: { data: { pharmacyReadyOrders: mockOrders } },
};

const emptyMock: MockedResponse = {
    request: { query: PHARMACY_READY_ORDERS },
    result: { data: { pharmacyReadyOrders: [] } },
};

function renderWithProvider(mocks: MockedResponse[] = []) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            <ReadyPage />
        </MockedProvider>
    );
}

describe('Pharmacy Ready Page', () => {
    it('should render ready for pickup header', async () => {
        renderWithProvider([ordersMock]);

        await waitFor(() => {
            expect(screen.getByText(/Ready for Pickup/)).toBeDefined();
        });
    });

    it('should show empty state when no ready orders', async () => {
        renderWithProvider([emptyMock]);

        await waitFor(() => {
            expect(screen.getByText(/No Orders Waiting/)).toBeDefined();
        });
    });

    it('should show delivery person when assigned', async () => {
        renderWithProvider([ordersMock]);

        await waitFor(() => {
            expect(screen.getByText(/Raj Kumar/)).toBeDefined();
        });
    });

    it('should show waiting message when no delivery person', async () => {
        renderWithProvider([ordersMock]);

        await waitFor(() => {
            expect(screen.getByText(/Waiting for delivery/)).toBeDefined();
        });
    });
});
