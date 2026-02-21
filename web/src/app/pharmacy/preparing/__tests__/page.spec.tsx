/**
 * Pharmacy Portal — Preparing Orders Tests
 * PR 28 Task 2: Pharmacy portal tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import PreparingPage from '../page';
import { PHARMACY_PREPARING_ORDERS } from '@/graphql/pharmacy-portal';

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
        ],
        prescriptionUrl: 'https://s3.example.com/rx.pdf',
        status: 'PHARMACY_PREPARING',
        createdAt: '2026-02-21T10:00:00Z',
        deliveryPersonName: null,
        deliveryPersonPhone: null,
    },
];

const ordersMock: MockedResponse = {
    request: { query: PHARMACY_PREPARING_ORDERS },
    result: { data: { pharmacyPreparingOrders: mockOrders } },
};

const emptyMock: MockedResponse = {
    request: { query: PHARMACY_PREPARING_ORDERS },
    result: { data: { pharmacyPreparingOrders: [] } },
};

function renderWithProvider(mocks: MockedResponse[] = []) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            <PreparingPage />
        </MockedProvider>
    );
}

describe('Pharmacy Preparing Page', () => {
    it('should render preparing header', async () => {
        renderWithProvider([ordersMock]);

        await waitFor(() => {
            expect(screen.getByText(/Preparing/)).toBeDefined();
        });
    });

    it('should show empty state when no orders', async () => {
        renderWithProvider([emptyMock]);

        await waitFor(() => {
            expect(screen.getByText(/No Orders Preparing/)).toBeDefined();
        });
    });

    it('should show order cards with medications', async () => {
        renderWithProvider([ordersMock]);

        await waitFor(() => {
            expect(screen.getByText('Finasteride')).toBeDefined();
        });
    });

    it('should show Ready for Pickup button', async () => {
        renderWithProvider([ordersMock]);

        await waitFor(() => {
            expect(screen.getByText(/Ready for Pickup/)).toBeDefined();
        });
    });
});
