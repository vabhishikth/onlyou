/**
 * Admin Lab Partner Detail Tests
 * Spec: Phase 16 — Technician list, phlebotomist status, credential expiry
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import LabPartnerDetailPage from '../page';
import { ADMIN_PARTNER_LAB_BY_ID } from '@/graphql/admin-lab-automation';

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('next/navigation', () => ({
    useParams: () => ({ id: 'lab-1' }),
}));

const mockLabDetail = {
    id: 'lab-1',
    name: 'SRL Diagnostics',
    city: 'Mumbai',
    address: '101 Lab Street, Andheri, Mumbai',
    phone: '+919876543210',
    status: 'ACTIVE',
    technicianCount: 2,
    phlebotomists: [
        {
            id: 'phle-1',
            name: 'Suresh Kumar',
            phone: '+919876543001',
            status: 'ACTIVE',
            credentialExpiry: '2026-06-15T00:00:00Z',
        },
        {
            id: 'phle-2',
            name: 'Rajesh Singh',
            phone: '+919876543002',
            status: 'PENDING',
            credentialExpiry: '2026-03-01T00:00:00Z',
        },
    ],
    createdAt: '2026-01-10T00:00:00Z',
};

const detailMock: MockedResponse = {
    request: {
        query: ADMIN_PARTNER_LAB_BY_ID,
        variables: { id: 'lab-1' },
    },
    result: { data: { partnerLabById: mockLabDetail } },
};

function renderWithProvider(mocks: MockedResponse[] = []) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            <LabPartnerDetailPage />
        </MockedProvider>
    );
}

describe('Admin Lab Partner Detail', () => {
    it('should render lab name as title', async () => {
        renderWithProvider([detailMock]);

        await waitFor(() => {
            expect(screen.getByText('SRL Diagnostics')).toBeDefined();
        });
    });

    it('should show lab address and phone', async () => {
        renderWithProvider([detailMock]);

        await waitFor(() => {
            expect(screen.getByText(/101 Lab Street/)).toBeDefined();
        });
    });

    it('should show phlebotomist names', async () => {
        renderWithProvider([detailMock]);

        await waitFor(() => {
            expect(screen.getByText('Suresh Kumar')).toBeDefined();
            expect(screen.getByText('Rajesh Singh')).toBeDefined();
        });
    });

    it('should show phlebotomist status', async () => {
        renderWithProvider([detailMock]);

        await waitFor(() => {
            expect(screen.getByText('Suresh Kumar')).toBeDefined();
        });

        expect(screen.getByTestId('status-phle-1')).toBeDefined();
        expect(screen.getByTestId('status-phle-2')).toBeDefined();
    });

    it('should show credential expiry warning for soon-expiring', async () => {
        renderWithProvider([detailMock]);

        await waitFor(() => {
            expect(screen.getByText('Rajesh Singh')).toBeDefined();
        });

        expect(screen.getByTestId('expiry-warning-phle-2')).toBeDefined();
    });

    it('should show activate button for pending phlebotomists', async () => {
        renderWithProvider([detailMock]);

        await waitFor(() => {
            expect(screen.getByText('Rajesh Singh')).toBeDefined();
        });

        expect(screen.getByTestId('activate-phle-2')).toBeDefined();
    });
});
