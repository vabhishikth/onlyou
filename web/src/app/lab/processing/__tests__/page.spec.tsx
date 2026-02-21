/**
 * Lab Portal — Processing Page Tests
 * PR 28 Task 1: Lab portal tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import ProcessingPage from '../page';
import { LAB_IN_PROGRESS_SAMPLES } from '@/graphql/lab-portal';

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockSamples = [
    {
        id: 's-1',
        sampleId: 'SAMP-001',
        panelName: 'Hair Loss Basic Panel',
        testsOrdered: ['TSH', 'CBC', 'Ferritin'],
        deliveredBy: 'Amit Singh',
        deliveredAt: '2026-02-21T10:00:00Z',
        status: 'SAMPLE_RECEIVED',
        tubeCount: 3,
        patientInitials: 'RS',
        createdAt: '2026-02-20T10:00:00Z',
    },
    {
        id: 's-2',
        sampleId: 'SAMP-002',
        panelName: 'PCOS Hormone Panel',
        testsOrdered: ['Testosterone', 'LH'],
        deliveredBy: 'Raj Kumar',
        deliveredAt: '2026-02-21T09:00:00Z',
        status: 'PROCESSING',
        tubeCount: 2,
        patientInitials: 'PP',
        createdAt: '2026-02-20T08:00:00Z',
    },
];

const samplesMock: MockedResponse = {
    request: { query: LAB_IN_PROGRESS_SAMPLES },
    result: { data: { labInProgressSamples: mockSamples } },
};

const emptyMock: MockedResponse = {
    request: { query: LAB_IN_PROGRESS_SAMPLES },
    result: { data: { labInProgressSamples: [] } },
};

function renderWithProvider(mocks: MockedResponse[] = []) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            <ProcessingPage />
        </MockedProvider>
    );
}

describe('Lab Processing Page', () => {
    it('should show empty state when no samples', async () => {
        renderWithProvider([emptyMock]);

        await waitFor(() => {
            expect(screen.getByText(/No Samples In Progress/)).toBeDefined();
        });
    });

    it('should show received and processing sections', async () => {
        renderWithProvider([samplesMock]);

        await waitFor(() => {
            expect(screen.getByText(/Received/)).toBeDefined();
            expect(screen.getByText(/Processing/)).toBeDefined();
        });
    });

    it('should show sample panel names', async () => {
        renderWithProvider([samplesMock]);

        await waitFor(() => {
            expect(screen.getByText('Hair Loss Basic Panel')).toBeDefined();
            expect(screen.getByText('PCOS Hormone Panel')).toBeDefined();
        });
    });

    it('should show Start Processing button for received samples', async () => {
        renderWithProvider([samplesMock]);

        await waitFor(() => {
            expect(screen.getByText('Start Processing')).toBeDefined();
        });
    });
});
