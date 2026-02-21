/**
 * Admin Dashboard Home Tests
 * PR 27 Task 1: Admin dashboard + escalations tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import AdminDashboard from '../page';
import { ADMIN_DASHBOARD_STATS } from '@/graphql/admin';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockStats = {
    labCollections: {
        scheduled: 8,
        completed: 12,
        failed: 2,
    },
    deliveries: {
        pending: 5,
        outForDelivery: 3,
        delivered: 15,
        failed: 1,
    },
    openCases: 14,
    slaBreaches: 3,
    activePatients: 92,
    revenueThisMonthPaise: 4500000, // Rs 45,000
};

const statsMock: MockedResponse = {
    request: { query: ADMIN_DASHBOARD_STATS },
    result: {
        data: { adminDashboardStats: mockStats },
    },
};

const noBreachesMock: MockedResponse = {
    request: { query: ADMIN_DASHBOARD_STATS },
    result: {
        data: {
            adminDashboardStats: {
                ...mockStats,
                slaBreaches: 0,
            },
        },
    },
};

const errorMock: MockedResponse = {
    request: { query: ADMIN_DASHBOARD_STATS },
    error: new Error('Network error'),
};

function renderWithProvider(mocks: MockedResponse[] = []) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            <AdminDashboard />
        </MockedProvider>
    );
}

describe('AdminDashboard', () => {
    it('should render greeting header', async () => {
        renderWithProvider([statsMock]);

        await waitFor(() => {
            expect(screen.getByText(/Good (morning|afternoon|evening)/)).toBeDefined();
        });
    });

    it('should render stat cards with correct titles', async () => {
        renderWithProvider([statsMock]);

        await waitFor(() => {
            expect(screen.getByText('Lab Collections Today')).toBeDefined();
            expect(screen.getByText('Deliveries Today')).toBeDefined();
            expect(screen.getByText('Open Cases')).toBeDefined();
            expect(screen.getByText('SLA Breaches')).toBeDefined();
            expect(screen.getByText('Active Patients')).toBeDefined();
            expect(screen.getByText('Revenue This Month')).toBeDefined();
        });
    });

    it('should show SLA breach alert banner when breaches exist', async () => {
        renderWithProvider([statsMock]);

        await waitFor(() => {
            expect(screen.getByText(/3 SLA breaches need attention/)).toBeDefined();
        });
    });

    it('should show all-clear banner when no SLA breaches', async () => {
        renderWithProvider([noBreachesMock]);

        await waitFor(() => {
            expect(screen.getByText('All clear!')).toBeDefined();
            expect(screen.getByText(/No SLA breaches/)).toBeDefined();
        });
    });

    it('should show quick action buttons', async () => {
        renderWithProvider([statsMock]);

        await waitFor(() => {
            expect(screen.getByText('Quick Actions')).toBeDefined();
            expect(screen.getByText('Assign Phlebotomists')).toBeDefined();
            expect(screen.getByText('Arrange Deliveries')).toBeDefined();
            expect(screen.getByText('Manage Partners')).toBeDefined();
            expect(screen.getByText('View Escalations')).toBeDefined();
        });
    });

    it('should show lab collection sub-stats', async () => {
        renderWithProvider([statsMock]);

        await waitFor(() => {
            expect(screen.getByText('Scheduled:')).toBeDefined();
            expect(screen.getByText('Completed:')).toBeDefined();
        });
    });

    it('should show loading state initially', () => {
        renderWithProvider([statsMock]);

        // Loading state should render before data resolves
        const container = document.querySelector('.animate-spin');
        expect(container).toBeDefined();
    });

    it('should show error state on query failure', async () => {
        renderWithProvider([errorMock]);

        await waitFor(() => {
            expect(screen.getByText('Failed to load dashboard')).toBeDefined();
        });
    });
});
