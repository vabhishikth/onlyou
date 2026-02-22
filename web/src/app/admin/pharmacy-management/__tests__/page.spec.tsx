/**
 * Admin Pharmacy Management Tests
 * Spec: Phase 15 — Pharmacy lifecycle + performance stats
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import PharmacyManagementPage from '../page';
import { ADMIN_PHARMACIES } from '@/graphql/admin-pharmacy';

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockPharmacies = [
    {
        id: 'p-1',
        name: 'MedPlus Pharmacy',
        city: 'Mumbai',
        status: 'ACTIVE',
        rating: 4.5,
        ordersCompleted: 120,
        createdAt: '2026-01-15T00:00:00Z',
    },
    {
        id: 'p-2',
        name: 'Apollo Pharmacy',
        city: 'Mumbai',
        status: 'PENDING_REVIEW',
        rating: null,
        ordersCompleted: 0,
        createdAt: '2026-02-20T00:00:00Z',
    },
];

const pharmaciesMock: MockedResponse = {
    request: { query: ADMIN_PHARMACIES },
    result: { data: { pharmacies: mockPharmacies } },
};

const emptyMock: MockedResponse = {
    request: { query: ADMIN_PHARMACIES },
    result: { data: { pharmacies: [] } },
};

function renderWithProvider(mocks: MockedResponse[] = []) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            <PharmacyManagementPage />
        </MockedProvider>
    );
}

describe('Admin Pharmacy Management', () => {
    it('should render pharmacy management title', async () => {
        renderWithProvider([pharmaciesMock]);

        await waitFor(() => {
            expect(screen.getByText(/Pharmacy Management/)).toBeDefined();
        });
    });

    it('should show pharmacy names and cities', async () => {
        renderWithProvider([pharmaciesMock]);

        await waitFor(() => {
            expect(screen.getByText('MedPlus Pharmacy')).toBeDefined();
            expect(screen.getByText('Apollo Pharmacy')).toBeDefined();
        });
    });

    it('should show status badges', async () => {
        renderWithProvider([pharmaciesMock]);

        await waitFor(() => {
            expect(screen.getByText('Active')).toBeDefined();
            expect(screen.getByText('Pending Review')).toBeDefined();
        });
    });

    it('should show suspend button for active pharmacies', async () => {
        renderWithProvider([pharmaciesMock]);

        await waitFor(() => {
            expect(screen.getByText('MedPlus Pharmacy')).toBeDefined();
        });

        expect(screen.getByTestId('suspend-p-1')).toBeDefined();
    });

    it('should show approve button for pending pharmacies', async () => {
        renderWithProvider([pharmaciesMock]);

        await waitFor(() => {
            expect(screen.getByText('Apollo Pharmacy')).toBeDefined();
        });

        expect(screen.getByTestId('approve-p-2')).toBeDefined();
    });

    it('should show empty state when no pharmacies', async () => {
        renderWithProvider([emptyMock]);

        await waitFor(() => {
            expect(screen.getByText(/no pharmacies/i)).toBeDefined();
        });
    });

    it('should show orders completed count', async () => {
        renderWithProvider([pharmaciesMock]);

        await waitFor(() => {
            expect(screen.getByText(/120/)).toBeDefined();
        });
    });
});
