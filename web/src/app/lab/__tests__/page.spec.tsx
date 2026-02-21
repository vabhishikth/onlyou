/**
 * Lab Portal — Incoming Samples Tests
 * PR 28 Task 1: Lab portal tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import LabDashboard from '../page';
import { LAB_TODAY_SUMMARY, LAB_INCOMING_SAMPLES } from '@/graphql/lab-portal';

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockSummary = { incoming: 3, inProgress: 2, completed: 5 };

const mockSamples = [
    {
        id: 's-1',
        sampleId: 'SAMP-001',
        panelName: 'Hair Loss Basic Panel',
        testsOrdered: ['TSH', 'CBC', 'Ferritin'],
        deliveredBy: 'Amit Singh',
        deliveredAt: '2026-02-21T10:00:00Z',
        status: 'DELIVERED_TO_LAB',
        tubeCount: 3,
        patientInitials: 'RS',
        createdAt: '2026-02-20T10:00:00Z',
    },
];

const summaryMock: MockedResponse = {
    request: { query: LAB_TODAY_SUMMARY },
    result: { data: { labTodaySummary: mockSummary } },
};

const samplesMock: MockedResponse = {
    request: { query: LAB_INCOMING_SAMPLES },
    result: { data: { labIncomingSamples: mockSamples } },
};

const emptySamplesMock: MockedResponse = {
    request: { query: LAB_INCOMING_SAMPLES },
    result: { data: { labIncomingSamples: [] } },
};

function renderWithProvider(mocks: MockedResponse[] = []) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            <LabDashboard />
        </MockedProvider>
    );
}

describe('Lab Dashboard — Incoming Samples', () => {
    it('should render summary stat cards', async () => {
        renderWithProvider([summaryMock, samplesMock]);

        await waitFor(() => {
            expect(screen.getByText('Incoming')).toBeDefined();
            expect(screen.getByText('In Progress')).toBeDefined();
            expect(screen.getByText('Completed')).toBeDefined();
        });
    });

    it('should show incoming samples header', async () => {
        renderWithProvider([summaryMock, samplesMock]);

        await waitFor(() => {
            expect(screen.getByText(/Incoming Samples/)).toBeDefined();
        });
    });

    it('should display sample cards with panel name', async () => {
        renderWithProvider([summaryMock, samplesMock]);

        await waitFor(() => {
            expect(screen.getByText('Hair Loss Basic Panel')).toBeDefined();
        });
    });

    it('should show sample ID on cards', async () => {
        renderWithProvider([summaryMock, samplesMock]);

        await waitFor(() => {
            expect(screen.getByText('SAMP-001')).toBeDefined();
        });
    });

    it('should show all-clear when no samples', async () => {
        renderWithProvider([summaryMock, emptySamplesMock]);

        await waitFor(() => {
            expect(screen.getByText('All Clear')).toBeDefined();
        });
    });

    it('should show delivery person info', async () => {
        renderWithProvider([summaryMock, samplesMock]);

        await waitFor(() => {
            expect(screen.getByText(/Amit Singh/)).toBeDefined();
        });
    });
});
