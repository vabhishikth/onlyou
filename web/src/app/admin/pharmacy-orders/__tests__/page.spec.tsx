/**
 * Admin Pharmacy Orders Tests
 * Spec: Phase 15 — Order list, assignment trigger, reassign, dispatch
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import PharmacyOrdersPage from '../page';
import { ADMIN_ALL_PHARMACY_ORDERS } from '@/graphql/admin-pharmacy';

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockOrders = [
    {
        id: 'po-1',
        orderId: 'ORD-101',
        pharmacyName: 'MedPlus Pharmacy',
        status: 'SENT_TO_PHARMACY',
        patientArea: 'Andheri West',
        createdAt: '2026-02-21T10:00:00Z',
    },
    {
        id: 'po-2',
        orderId: 'ORD-102',
        pharmacyName: 'Apollo Pharmacy',
        status: 'READY_FOR_PICKUP',
        patientArea: 'Bandra',
        createdAt: '2026-02-21T11:00:00Z',
    },
];

const ordersMock: MockedResponse = {
    request: { query: ADMIN_ALL_PHARMACY_ORDERS },
    result: { data: { allPharmacyOrders: mockOrders } },
};

const emptyMock: MockedResponse = {
    request: { query: ADMIN_ALL_PHARMACY_ORDERS },
    result: { data: { allPharmacyOrders: [] } },
};

function renderWithProvider(mocks: MockedResponse[] = []) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            <PharmacyOrdersPage />
        </MockedProvider>
    );
}

describe('Admin Pharmacy Orders', () => {
    it('should render pharmacy orders title', async () => {
        renderWithProvider([ordersMock]);

        await waitFor(() => {
            expect(screen.getByText(/Pharmacy Orders/)).toBeDefined();
        });
    });

    it('should show order IDs and pharmacy names', async () => {
        renderWithProvider([ordersMock]);

        await waitFor(() => {
            expect(screen.getByText('ORD-101')).toBeDefined();
            expect(screen.getByText('MedPlus Pharmacy')).toBeDefined();
        });
    });

    it('should show dispatch button for ready orders', async () => {
        renderWithProvider([ordersMock]);

        await waitFor(() => {
            expect(screen.getByText('ORD-102')).toBeDefined();
        });

        expect(screen.getByTestId('dispatch-po-2')).toBeDefined();
    });

    it('should show reassign button on sent orders', async () => {
        renderWithProvider([ordersMock]);

        await waitFor(() => {
            expect(screen.getByText('ORD-101')).toBeDefined();
        });

        expect(screen.getByTestId('reassign-po-1')).toBeDefined();
    });

    it('should show empty state when no orders', async () => {
        renderWithProvider([emptyMock]);

        await waitFor(() => {
            expect(screen.getByText(/no pharmacy orders/i)).toBeDefined();
        });
    });

    it('should show patient area on orders', async () => {
        renderWithProvider([ordersMock]);

        await waitFor(() => {
            expect(screen.getByText(/Andheri West/)).toBeDefined();
        });
    });
});
