/**
 * Admin Escalations Page Tests
 * PR 27 Task 1: Admin dashboard + escalations tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import EscalationsPage from '../page';
import { SLA_ESCALATIONS } from '@/graphql/admin';

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockEscalations = [
    {
        id: 'esc-1',
        type: 'LAB_ORDER',
        resourceId: 'lab-order-1',
        slaInfo: {
            status: 'BREACHED',
            reason: 'Sample collection overdue by 4 hours',
            hoursOverdue: 4,
            deadlineAt: '2026-02-20T14:00:00Z',
        },
        patientName: 'Rahul Sharma',
        vertical: 'HAIR_LOSS',
        responsibleParty: 'Dr. Mehta Lab',
        responsibleContact: '+919876543210',
        createdAt: '2026-02-20T10:00:00Z',
    },
    {
        id: 'esc-2',
        type: 'DELIVERY',
        resourceId: 'order-1',
        slaInfo: {
            status: 'BREACHED',
            reason: 'Delivery delayed beyond 48h window',
            hoursOverdue: 6,
            deadlineAt: '2026-02-19T18:00:00Z',
        },
        patientName: 'Priya Patel',
        vertical: 'PCOS',
        responsibleParty: 'MedPlus Pharmacy',
        responsibleContact: '+919876000000',
        createdAt: '2026-02-19T12:00:00Z',
    },
];

const escalationsMock: MockedResponse = {
    request: { query: SLA_ESCALATIONS },
    result: {
        data: { slaEscalations: mockEscalations },
    },
};

const emptyMock: MockedResponse = {
    request: { query: SLA_ESCALATIONS },
    result: {
        data: { slaEscalations: [] },
    },
};

function renderWithProvider(mocks: MockedResponse[] = []) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            <EscalationsPage />
        </MockedProvider>
    );
}

describe('EscalationsPage', () => {
    it('should render the escalations page header', async () => {
        renderWithProvider([escalationsMock]);

        await waitFor(() => {
            expect(screen.getByText('SLA Escalations')).toBeDefined();
        });
    });

    it('should display escalation cards with patient names', async () => {
        renderWithProvider([escalationsMock]);

        await waitFor(() => {
            expect(screen.getByText('Rahul Sharma')).toBeDefined();
            expect(screen.getByText('Priya Patel')).toBeDefined();
        });
    });

    it('should show SLA breach reason on cards', async () => {
        renderWithProvider([escalationsMock]);

        await waitFor(() => {
            expect(screen.getByText('Sample collection overdue by 4 hours')).toBeDefined();
        });
    });

    it('should show summary filter cards with counts', async () => {
        renderWithProvider([escalationsMock]);

        await waitFor(() => {
            expect(screen.getByText('Total')).toBeDefined();
            expect(screen.getByText('Lab Orders')).toBeDefined();
            expect(screen.getByText('Deliveries')).toBeDefined();
        });
    });

    it('should show all-clear state when no escalations', async () => {
        renderWithProvider([emptyMock]);

        await waitFor(() => {
            expect(screen.getByText('All Clear!')).toBeDefined();
            expect(screen.getByText(/Everything is running smoothly/)).toBeDefined();
        });
    });

    it('should show overdue hours on escalation cards', async () => {
        renderWithProvider([escalationsMock]);

        await waitFor(() => {
            expect(screen.getByText('4h overdue')).toBeDefined();
            expect(screen.getByText('6h overdue')).toBeDefined();
        });
    });

    it('should show type badge on each card', async () => {
        renderWithProvider([escalationsMock]);

        await waitFor(() => {
            expect(screen.getByText('Lab Order')).toBeDefined();
            expect(screen.getByText('Delivery')).toBeDefined();
        });
    });
});
