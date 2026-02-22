/**
 * Pharmacy Portal — New Orders Tests
 * PR 28 Task 2: Pharmacy portal tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import PharmacyDashboard from '../page';
import {
    PHARMACY_TODAY_SUMMARY,
    PHARMACY_NEW_ORDERS,
    PHARMACY_ACCEPT_ORDER,
    PHARMACY_REJECT_ORDER,
} from '@/graphql/pharmacy-portal';

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockSummary = { newOrders: 2, preparing: 1, ready: 3 };

const mockOrders = [
    {
        id: 'po-1',
        orderId: 'ORD-001',
        patientArea: 'Andheri West',
        medications: [
            { name: 'Finasteride', dosage: '1mg', quantity: 30 },
            { name: 'Minoxidil 5%', dosage: '60ml', quantity: 1 },
        ],
        prescriptionUrl: 'https://s3.example.com/rx.pdf',
        status: 'SENT_TO_PHARMACY',
        createdAt: '2026-02-21T10:00:00Z',
        deliveryPersonName: null,
        deliveryPersonPhone: null,
    },
];

const summaryMock: MockedResponse = {
    request: { query: PHARMACY_TODAY_SUMMARY },
    result: { data: { pharmacyTodaySummary: mockSummary } },
};

const ordersMock: MockedResponse = {
    request: { query: PHARMACY_NEW_ORDERS },
    result: { data: { pharmacyNewOrders: mockOrders } },
};

const emptyOrdersMock: MockedResponse = {
    request: { query: PHARMACY_NEW_ORDERS },
    result: { data: { pharmacyNewOrders: [] } },
};

function renderWithProvider(mocks: MockedResponse[] = []) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            <PharmacyDashboard />
        </MockedProvider>
    );
}

describe('Pharmacy Dashboard — New Orders', () => {
    it('should render summary stat cards', async () => {
        renderWithProvider([summaryMock, ordersMock]);

        await waitFor(() => {
            expect(screen.getByText('New')).toBeDefined();
            expect(screen.getByText('Preparing')).toBeDefined();
            expect(screen.getByText('Ready')).toBeDefined();
        });
    });

    it('should show new orders header', async () => {
        renderWithProvider([summaryMock, ordersMock]);

        await waitFor(() => {
            expect(screen.getByText(/New Orders/)).toBeDefined();
        });
    });

    it('should display order cards with medications', async () => {
        renderWithProvider([summaryMock, ordersMock]);

        await waitFor(() => {
            expect(screen.getByText('Finasteride')).toBeDefined();
            expect(screen.getByText(/Minoxidil/)).toBeDefined();
        });
    });

    it('should show empty state when no orders', async () => {
        renderWithProvider([summaryMock, emptyOrdersMock]);

        await waitFor(() => {
            expect(screen.getByText(/No New Orders/)).toBeDefined();
        });
    });

    it('should show Start Preparing button', async () => {
        renderWithProvider([summaryMock, ordersMock]);

        await waitFor(() => {
            expect(screen.getByText('Start Preparing')).toBeDefined();
        });
    });

    // Phase 15: Accept/Reject flow
    it('should show accept and reject buttons on new orders', async () => {
        renderWithProvider([summaryMock, ordersMock]);

        await waitFor(() => {
            expect(screen.getByText('ORD-001')).toBeDefined();
        });

        expect(screen.getByTestId('accept-po-1')).toBeDefined();
        expect(screen.getByTestId('reject-po-1')).toBeDefined();
    });

    it('should show rejection reason input when reject clicked', async () => {
        const { fireEvent: fe } = require('@testing-library/react');
        renderWithProvider([summaryMock, ordersMock]);

        await waitFor(() => {
            expect(screen.getByText('ORD-001')).toBeDefined();
        });

        const rejectBtn = screen.getByTestId('reject-po-1');
        fe.click(rejectBtn);

        expect(screen.getByTestId('reject-reason-input')).toBeDefined();
        expect(screen.getByTestId('confirm-reject-po-1')).toBeDefined();
    });
});
