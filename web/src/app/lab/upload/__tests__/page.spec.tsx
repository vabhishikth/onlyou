/**
 * Lab Portal — Upload Results Tests
 * PR 28 Task 1: Lab portal tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import UploadPage from '../page';
import { LAB_IN_PROGRESS_SAMPLES, LAB_COMPLETED_SAMPLES } from '@/graphql/lab-portal';

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockProcessingSamples = [
    {
        id: 's-1',
        sampleId: 'SAMP-001',
        panelName: 'Hair Loss Basic Panel',
        testsOrdered: ['TSH', 'CBC', 'Ferritin'],
        deliveredBy: 'Amit Singh',
        deliveredAt: '2026-02-21T10:00:00Z',
        status: 'PROCESSING',
        tubeCount: 3,
        patientInitials: 'RS',
        createdAt: '2026-02-20T10:00:00Z',
    },
];

const mockCompletedSamples = [
    {
        id: 's-2',
        sampleId: 'SAMP-002',
        panelName: 'PCOS Panel',
        testsOrdered: ['LH', 'FSH'],
        deliveredBy: 'Raj Kumar',
        deliveredAt: '2026-02-21T09:00:00Z',
        status: 'RESULTS_UPLOADED',
        tubeCount: 2,
        patientInitials: 'PP',
        createdAt: '2026-02-20T08:00:00Z',
    },
];

const processingMock: MockedResponse = {
    request: { query: LAB_IN_PROGRESS_SAMPLES },
    result: { data: { labInProgressSamples: mockProcessingSamples } },
};

const completedMock: MockedResponse = {
    request: { query: LAB_COMPLETED_SAMPLES },
    result: { data: { labCompletedSamples: mockCompletedSamples } },
};

const emptyProcessingMock: MockedResponse = {
    request: { query: LAB_IN_PROGRESS_SAMPLES },
    result: { data: { labInProgressSamples: [] } },
};

const emptyCompletedMock: MockedResponse = {
    request: { query: LAB_COMPLETED_SAMPLES },
    result: { data: { labCompletedSamples: [] } },
};

function renderWithProvider(mocks: MockedResponse[] = []) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            <UploadPage />
        </MockedProvider>
    );
}

describe('Lab Upload Page', () => {
    it('should show empty state when no samples to upload', async () => {
        renderWithProvider([emptyProcessingMock, emptyCompletedMock]);

        await waitFor(() => {
            expect(screen.getByText(/No Samples to Upload/)).toBeDefined();
        });
    });

    it('should show ready for upload section with processing samples', async () => {
        renderWithProvider([processingMock, completedMock]);

        await waitFor(() => {
            expect(screen.getByText(/Ready for Upload/)).toBeDefined();
            expect(screen.getByText('Hair Loss Basic Panel')).toBeDefined();
        });
    });

    it('should show completed today section', async () => {
        renderWithProvider([processingMock, completedMock]);

        await waitFor(() => {
            expect(screen.getByText(/Completed Today/)).toBeDefined();
            expect(screen.getByText('PCOS Panel')).toBeDefined();
        });
    });

    it('should show Upload Results button for processing samples', async () => {
        renderWithProvider([processingMock, completedMock]);

        await waitFor(() => {
            expect(screen.getByText('Upload Results')).toBeDefined();
        });
    });

    it('should show sample IDs', async () => {
        renderWithProvider([processingMock, completedMock]);

        await waitFor(() => {
            expect(screen.getByText('SAMP-001')).toBeDefined();
            expect(screen.getByText('SAMP-002')).toBeDefined();
        });
    });
});
