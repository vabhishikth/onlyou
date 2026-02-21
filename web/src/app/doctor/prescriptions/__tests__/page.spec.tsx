import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import PrescriptionsPage from '../page';
import { DOCTOR_PRESCRIPTIONS } from '@/graphql/prescription';

// Spec: master spec Section 5.4 — Prescriptions List

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

const mockPrescriptions = [
    {
        id: 'rx-1',
        consultationId: 'consult-1',
        patientName: 'Rahul Sharma',
        vertical: 'HAIR_LOSS',
        pdfUrl: 'https://s3.example/rx-1.pdf',
        medications: [
            { name: 'Finasteride', dosage: '1mg' },
            { name: 'Minoxidil', dosage: '5%' },
        ],
        instructions: 'Apply daily',
        validUntil: '2026-08-21T00:00:00Z',
        issuedAt: '2026-02-21T00:00:00Z',
        createdAt: '2026-02-21T00:00:00Z',
    },
    {
        id: 'rx-2',
        consultationId: 'consult-2',
        patientName: 'Priya Patel',
        vertical: 'PCOS',
        pdfUrl: null,
        medications: [{ name: 'Metformin', dosage: '500mg' }],
        instructions: null,
        validUntil: '2026-08-21T00:00:00Z',
        issuedAt: '2026-02-20T00:00:00Z',
        createdAt: '2026-02-20T00:00:00Z',
    },
];

const prescriptionsMock: MockedResponse = {
    request: {
        query: DOCTOR_PRESCRIPTIONS,
        variables: {},
    },
    result: {
        data: { doctorPrescriptions: mockPrescriptions },
    },
};

const emptyMock: MockedResponse = {
    request: {
        query: DOCTOR_PRESCRIPTIONS,
        variables: {},
    },
    result: {
        data: { doctorPrescriptions: [] },
    },
};

function renderWithProvider(mocks: MockedResponse[] = []) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            <PrescriptionsPage />
        </MockedProvider>
    );
}

describe('PrescriptionsPage', () => {
    it('should render loading skeleton', () => {
        renderWithProvider([prescriptionsMock]);
        expect(screen.getByTestId('prescriptions-loading')).toBeDefined();
    });

    it('should render prescription list', async () => {
        renderWithProvider([prescriptionsMock]);

        await waitFor(() => {
            expect(screen.getByText('Rahul Sharma')).toBeDefined();
            expect(screen.getByText('Priya Patel')).toBeDefined();
        });
    });

    it('should render empty state when no prescriptions', async () => {
        renderWithProvider([emptyMock]);

        await waitFor(() => {
            expect(screen.getByText(/no prescriptions/i)).toBeDefined();
        });
    });

    it('should filter by patient name search', async () => {
        renderWithProvider([prescriptionsMock]);

        await waitFor(() => {
            expect(screen.getByText('Rahul Sharma')).toBeDefined();
        });

        const searchInput = screen.getByPlaceholderText(/search/i);
        fireEvent.change(searchInput, { target: { value: 'Priya' } });

        expect(screen.queryByText('Rahul Sharma')).toBeNull();
        expect(screen.getByText('Priya Patel')).toBeDefined();
    });

    it('should show patient name, med count, date, and vertical badge', async () => {
        renderWithProvider([prescriptionsMock]);

        await waitFor(() => {
            expect(screen.getByText('Rahul Sharma')).toBeDefined();
            // Should show medication count
            expect(screen.getByText(/2 medications/i)).toBeDefined();
            // Should show vertical badge (also appears in filter tabs)
            expect(screen.getAllByText(/hair loss/i).length).toBeGreaterThanOrEqual(2);
        });
    });

    it('should link cards to case detail', async () => {
        renderWithProvider([prescriptionsMock]);

        await waitFor(() => {
            expect(screen.getByText('Rahul Sharma')).toBeDefined();
        });

        // Find the link to the case
        const links = screen.getAllByRole('link');
        const caseLink = links.find((l) => l.getAttribute('href')?.includes('/doctor/case/consult-1'));
        expect(caseLink).toBeDefined();
    });

    it('should show PDF icon when pdfUrl exists', async () => {
        renderWithProvider([prescriptionsMock]);

        await waitFor(() => {
            expect(screen.getByText('Rahul Sharma')).toBeDefined();
        });

        // rx-1 has pdfUrl, rx-2 does not
        const pdfIndicators = screen.getAllByTestId('pdf-indicator');
        expect(pdfIndicators.length).toBe(1);
    });

    it('should show vertical filter tabs', () => {
        renderWithProvider([prescriptionsMock]);

        expect(screen.getByText('All')).toBeDefined();
        expect(screen.getByText('Hair Loss')).toBeDefined();
    });
});
