/**
 * Collect Portal (Phlebotomist) Tests
 * PR 28 Task 3: Collect portal tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import CollectPage from '../page';
import { COLLECT_TODAY_SUMMARY, TODAY_ASSIGNMENTS } from '@/graphql/collect-portal';

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockSummary = {
    total: 6,
    completed: 3,
    pending: 2,
    failed: 1,
};

const mockAssignments = [
    {
        id: 'a-1',
        patientFirstName: 'Rahul',
        patientPhone: '+919876543210',
        patientArea: 'Andheri West',
        fullAddress: '123 Main St, Andheri West, Mumbai 400058',
        timeWindow: '8:00 - 10:00 AM',
        panelName: 'Hair Loss Basic Panel',
        testsOrdered: ['TSH', 'CBC', 'Ferritin'],
        status: 'PENDING',
        tubeCount: 3,
        collectedAt: null,
        notes: null,
    },
    {
        id: 'a-2',
        patientFirstName: 'Priya',
        patientPhone: '+919876000000',
        patientArea: 'Bandra',
        fullAddress: '456 Park Road, Bandra, Mumbai 400050',
        timeWindow: '9:00 - 11:00 AM',
        panelName: 'PCOS Panel',
        testsOrdered: ['LH', 'FSH'],
        status: 'COLLECTED',
        tubeCount: 2,
        collectedAt: '2026-02-21T09:30:00Z',
        notes: null,
    },
];

const summaryMock: MockedResponse = {
    request: { query: COLLECT_TODAY_SUMMARY },
    result: { data: { collectTodaySummary: mockSummary } },
};

const assignmentsMock: MockedResponse = {
    request: { query: TODAY_ASSIGNMENTS },
    result: { data: { todayAssignments: mockAssignments } },
};

const emptyAssignmentsMock: MockedResponse = {
    request: { query: TODAY_ASSIGNMENTS },
    result: { data: { todayAssignments: [] } },
};

function renderWithProvider(mocks: MockedResponse[] = []) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            <CollectPage />
        </MockedProvider>
    );
}

describe('Collect Portal (Phlebotomist)', () => {
    it('should render summary pills', async () => {
        renderWithProvider([summaryMock, assignmentsMock]);

        await waitFor(() => {
            expect(screen.getByText('Total')).toBeDefined();
            expect(screen.getByText('Pending')).toBeDefined();
            expect(screen.getByText('Done')).toBeDefined();
        });
    });

    it('should show today collections header', async () => {
        renderWithProvider([summaryMock, assignmentsMock]);

        await waitFor(() => {
            expect(screen.getByText(/Today's Collections/)).toBeDefined();
        });
    });

    it('should show patient name and area on cards', async () => {
        renderWithProvider([summaryMock, assignmentsMock]);

        await waitFor(() => {
            expect(screen.getByText(/Rahul/)).toBeDefined();
            expect(screen.getByText(/Andheri West/)).toBeDefined();
        });
    });

    it('should show panel names', async () => {
        renderWithProvider([summaryMock, assignmentsMock]);

        await waitFor(() => {
            expect(screen.getByText('Hair Loss Basic Panel')).toBeDefined();
        });
    });

    it('should show empty state when no assignments', async () => {
        renderWithProvider([summaryMock, emptyAssignmentsMock]);

        await waitFor(() => {
            expect(screen.getByText(/No Collections Today/)).toBeDefined();
        });
    });

    it('should show Running Late button', async () => {
        renderWithProvider([summaryMock, assignmentsMock]);

        await waitFor(() => {
            expect(screen.getByText(/Running Late/)).toBeDefined();
        });
    });
});
