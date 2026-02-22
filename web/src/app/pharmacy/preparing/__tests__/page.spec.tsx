/**
 * Pharmacy Portal — Preparing Orders Tests
 * PR 28 Task 2: Pharmacy portal tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import PreparingPage from '../page';
import {
    PHARMACY_PREPARING_ORDERS,
    PHARMACY_PROPOSE_SUBSTITUTION,
    PHARMACY_CONFIRM_DISCREET_PACKAGING,
} from '@/graphql/pharmacy-portal';

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

    // Phase 15: Substitution proposal
    it('should show propose substitution button on order cards', async () => {
        renderWithProvider([ordersMock]);

        await waitFor(() => {
            expect(screen.getByText('Finasteride')).toBeDefined();
        });

        expect(screen.getByTestId('propose-sub-po-1')).toBeDefined();
    });

    it('should show substitution form when button clicked', async () => {
        const { fireEvent: fe } = require('@testing-library/react');
        renderWithProvider([ordersMock]);

        await waitFor(() => {
            expect(screen.getByText('Finasteride')).toBeDefined();
        });

        fe.click(screen.getByTestId('propose-sub-po-1'));
        expect(screen.getByTestId('sub-original-input')).toBeDefined();
        expect(screen.getByTestId('sub-proposed-input')).toBeDefined();
        expect(screen.getByTestId('sub-reason-input')).toBeDefined();
    });

    // Phase 15: Discreet packaging checkbox
    it('should show discreet packaging confirmation checkbox', async () => {
        renderWithProvider([ordersMock]);

        await waitFor(() => {
            expect(screen.getByText('Finasteride')).toBeDefined();
        });

        expect(screen.getByTestId('discreet-packaging-po-1')).toBeDefined();
    });
});
