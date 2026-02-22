/**
 * Admin Lab Partner Management Tests
 * Spec: Phase 16 — Lab lifecycle + phlebotomist onboarding
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import LabPartnersPage from '../page';
import { ADMIN_LIST_PARTNER_LABS } from '@/graphql/admin-lab-automation';

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockLabs = [
    {
        id: 'lab-1',
        name: 'SRL Diagnostics',
        city: 'Mumbai',
        status: 'ACTIVE',
        technicianCount: 5,
        createdAt: '2026-01-10T00:00:00Z',
    },
    {
        id: 'lab-2',
        name: 'Metropolis Labs',
        city: 'Mumbai',
        status: 'PENDING_REVIEW',
        technicianCount: 0,
        createdAt: '2026-02-18T00:00:00Z',
    },
];

const labsMock: MockedResponse = {
    request: { query: ADMIN_LIST_PARTNER_LABS },
    result: { data: { listPartnerLabs: mockLabs } },
};

const emptyMock: MockedResponse = {
    request: { query: ADMIN_LIST_PARTNER_LABS },
    result: { data: { listPartnerLabs: [] } },
};

function renderWithProvider(mocks: MockedResponse[] = []) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            <LabPartnersPage />
        </MockedProvider>
    );
}

describe('Admin Lab Partners', () => {
    it('should render lab partners title', async () => {
        renderWithProvider([labsMock]);

        await waitFor(() => {
            expect(screen.getByText(/Lab Partners/)).toBeDefined();
        });
    });

    it('should show lab names and cities', async () => {
        renderWithProvider([labsMock]);

        await waitFor(() => {
            expect(screen.getByText('SRL Diagnostics')).toBeDefined();
            expect(screen.getByText('Metropolis Labs')).toBeDefined();
        });
    });

    it('should show status badges', async () => {
        renderWithProvider([labsMock]);

        await waitFor(() => {
            expect(screen.getByText('Active')).toBeDefined();
            expect(screen.getByText('Pending Review')).toBeDefined();
        });
    });

    it('should show approve button for pending labs', async () => {
        renderWithProvider([labsMock]);

        await waitFor(() => {
            expect(screen.getByText('Metropolis Labs')).toBeDefined();
        });

        expect(screen.getByTestId('approve-lab-2')).toBeDefined();
    });

    it('should show suspend button for active labs', async () => {
        renderWithProvider([labsMock]);

        await waitFor(() => {
            expect(screen.getByText('SRL Diagnostics')).toBeDefined();
        });

        expect(screen.getByTestId('suspend-lab-1')).toBeDefined();
    });

    it('should show technician count', async () => {
        renderWithProvider([labsMock]);

        await waitFor(() => {
            expect(screen.getByText(/5 technicians/)).toBeDefined();
        });
    });

    it('should show empty state when no labs', async () => {
        renderWithProvider([emptyMock]);

        await waitFor(() => {
            expect(screen.getByText(/no lab partners/i)).toBeDefined();
        });
    });
});
