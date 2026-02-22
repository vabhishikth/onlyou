import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import LabOrdersPage from '../page';
import { DOCTOR_LAB_ORDERS, ACKNOWLEDGE_CRITICAL_VALUE } from '@/graphql/lab-order';

// Spec: master spec Section 7 — Blood Work & Diagnostics
// Spec: Phase 16 — Doctor acknowledge critical value

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('next/link', () => {
    return ({ children, href, ...props }: any) => (
        <a href={href} {...props}>{children}</a>
    );
});

const mockLabOrders = [
    {
        id: 'lab-1',
        consultationId: 'consult-1',
        patientName: 'Rahul Sharma',
        vertical: 'HAIR_LOSS',
        testPanel: ['TSH', 'CBC', 'Ferritin'],
        panelName: 'Hair Loss Basic Panel',
        status: 'RESULTS_READY',
        criticalValues: true,
        orderedAt: '2026-02-20T00:00:00Z',
        resultFileUrl: 'https://s3.example/result.pdf',
    },
    {
        id: 'lab-2',
        consultationId: 'consult-2',
        patientName: 'Priya Patel',
        vertical: 'PCOS',
        testPanel: ['FSH', 'LH', 'Free_Testosterone'],
        panelName: 'PCOS Basic Panel',
        status: 'ORDERED',
        criticalValues: false,
        orderedAt: '2026-02-21T00:00:00Z',
        resultFileUrl: null,
    },
    {
        id: 'lab-3',
        consultationId: 'consult-3',
        patientName: 'Amit Kumar',
        vertical: 'SEXUAL_HEALTH',
        testPanel: ['Total_Testosterone'],
        panelName: 'ED Basic Panel',
        status: 'CLOSED',
        criticalValues: false,
        orderedAt: '2026-02-19T00:00:00Z',
        resultFileUrl: null,
    },
];

const labOrdersMock: MockedResponse = {
    request: {
        query: DOCTOR_LAB_ORDERS,
        variables: {},
    },
    result: {
        data: { doctorLabOrders: mockLabOrders },
    },
};

const emptyMock: MockedResponse = {
    request: {
        query: DOCTOR_LAB_ORDERS,
        variables: {},
    },
    result: {
        data: { doctorLabOrders: [] },
    },
};

function renderWithProvider(mocks: MockedResponse[] = []) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            <LabOrdersPage />
        </MockedProvider>
    );
}

describe('LabOrdersPage', () => {
    it('should render loading skeleton', () => {
        renderWithProvider([labOrdersMock]);
        expect(screen.getByTestId('lab-orders-loading')).toBeDefined();
    });

    it('should render lab order list', async () => {
        renderWithProvider([labOrdersMock]);

        await waitFor(() => {
            expect(screen.getByText('Rahul Sharma')).toBeDefined();
            expect(screen.getByText('Priya Patel')).toBeDefined();
            expect(screen.getByText('Amit Kumar')).toBeDefined();
        });
    });

    it('should render empty state when no lab orders', async () => {
        renderWithProvider([emptyMock]);

        await waitFor(() => {
            expect(screen.getByText(/no lab orders/i)).toBeDefined();
        });
    });

    it('should filter by patient name search', async () => {
        renderWithProvider([labOrdersMock]);

        await waitFor(() => {
            expect(screen.getByText('Rahul Sharma')).toBeDefined();
        });

        const searchInput = screen.getByPlaceholderText(/search/i);
        fireEvent.change(searchInput, { target: { value: 'Priya' } });

        expect(screen.queryByText('Rahul Sharma')).toBeNull();
        expect(screen.getByText('Priya Patel')).toBeDefined();
    });

    it('should have status filter chips', () => {
        renderWithProvider([labOrdersMock]);

        expect(screen.getByText('All')).toBeDefined();
        expect(screen.getByText('Results Ready')).toBeDefined();
    });

    it('should show patient name, panel, status badge, and date', async () => {
        renderWithProvider([labOrdersMock]);

        await waitFor(() => {
            expect(screen.getByText('Rahul Sharma')).toBeDefined();
            expect(screen.getByText('Hair Loss Basic Panel')).toBeDefined();
            // 'Results Ready' appears in both filter chip and status badge
            expect(screen.getAllByText('Results Ready').length).toBeGreaterThanOrEqual(2);
        });
    });

    it('should show critical values warning indicator', async () => {
        renderWithProvider([labOrdersMock]);

        await waitFor(() => {
            expect(screen.getByText('Rahul Sharma')).toBeDefined();
        });

        // lab-1 has criticalValues: true
        const criticalIndicators = screen.getAllByTestId('critical-indicator');
        expect(criticalIndicators.length).toBe(1);
    });

    it('should link cards to case detail', async () => {
        renderWithProvider([labOrdersMock]);

        await waitFor(() => {
            expect(screen.getByText('Rahul Sharma')).toBeDefined();
        });

        const links = screen.getAllByRole('link');
        const caseLink = links.find((l) => l.getAttribute('href')?.includes('/doctor/case/consult-1'));
        expect(caseLink).toBeDefined();
    });

    it('should highlight Results Ready orders', async () => {
        renderWithProvider([labOrdersMock]);

        await waitFor(() => {
            expect(screen.getByText('Rahul Sharma')).toBeDefined();
        });

        // The Results Ready card should have a special highlight class or indicator
        const resultsReadyCards = screen.getAllByTestId('results-ready-highlight');
        expect(resultsReadyCards.length).toBe(1);
    });

    it('should show acknowledge button for critical value orders', async () => {
        renderWithProvider([labOrdersMock]);

        await waitFor(() => {
            expect(screen.getByText('Rahul Sharma')).toBeDefined();
        });

        // lab-1 has criticalValues: true and status RESULTS_READY
        const ackButton = screen.getByTestId('acknowledge-lab-1');
        expect(ackButton).toBeDefined();
    });

    it('should not show acknowledge button for non-critical orders', async () => {
        renderWithProvider([labOrdersMock]);

        await waitFor(() => {
            expect(screen.getByText('Priya Patel')).toBeDefined();
        });

        // lab-2 has criticalValues: false
        expect(screen.queryByTestId('acknowledge-lab-2')).toBeNull();
    });

    it('should show acknowledge form when button clicked', async () => {
        const ackMock: MockedResponse = {
            request: {
                query: ACKNOWLEDGE_CRITICAL_VALUE,
                variables: {
                    labOrderId: 'lab-1',
                    labResultId: 'lab-1',
                    notes: 'Patient contacted',
                },
            },
            result: {
                data: { acknowledgeCriticalValue: { success: true } },
            },
        };

        renderWithProvider([labOrdersMock, ackMock]);

        await waitFor(() => {
            expect(screen.getByText('Rahul Sharma')).toBeDefined();
        });

        const ackButton = screen.getByTestId('acknowledge-lab-1');
        fireEvent.click(ackButton);

        expect(screen.getByTestId('acknowledge-notes-input')).toBeDefined();
        expect(screen.getByTestId('confirm-acknowledge')).toBeDefined();
    });
});
