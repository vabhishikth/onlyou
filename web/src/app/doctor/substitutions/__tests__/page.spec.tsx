import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import SubstitutionsPage from '../page';
import {
    PENDING_SUBSTITUTION_APPROVALS,
    APPROVE_SUBSTITUTION,
    REJECT_SUBSTITUTION,
} from '@/graphql/doctor-pharmacy';

// Spec: Phase 15 — Doctor substitution approval queue

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

const mockApprovals = [
    {
        id: 'po-1',
        orderNumber: 'PO-100001',
        patientId: 'patient-1',
        consultationId: 'consult-1',
        status: 'AWAITING_SUBSTITUTION_APPROVAL',
        substitutionDetails: {
            originalMedication: 'Finasteride 1mg',
            proposedSubstitution: 'Dutasteride 0.5mg',
            reason: 'Original medication out of stock',
        },
        substitutionProposedByStaffId: 'staff-1',
        createdAt: new Date().toISOString(),
    },
    {
        id: 'po-2',
        orderNumber: 'PO-100002',
        patientId: 'patient-2',
        consultationId: 'consult-2',
        status: 'AWAITING_SUBSTITUTION_APPROVAL',
        substitutionDetails: {
            originalMedication: 'Minoxidil 5%',
            proposedSubstitution: 'Minoxidil 10%',
            reason: 'Higher strength available and beneficial',
        },
        substitutionProposedByStaffId: 'staff-2',
        createdAt: new Date().toISOString(),
    },
];

const approvalsMock: MockedResponse = {
    request: {
        query: PENDING_SUBSTITUTION_APPROVALS,
    },
    result: {
        data: { pendingSubstitutionApprovals: mockApprovals },
    },
};

const emptyApprovalsMock: MockedResponse = {
    request: {
        query: PENDING_SUBSTITUTION_APPROVALS,
    },
    result: {
        data: { pendingSubstitutionApprovals: [] },
    },
};

const approveMock: MockedResponse = {
    request: {
        query: APPROVE_SUBSTITUTION,
        variables: { pharmacyOrderId: 'po-1' },
    },
    result: {
        data: {
            approveSubstitution: { id: 'po-1', status: 'PREPARING' },
        },
    },
};

const rejectMock: MockedResponse = {
    request: {
        query: REJECT_SUBSTITUTION,
        variables: { pharmacyOrderId: 'po-1', reason: 'Not therapeutically equivalent' },
    },
    result: {
        data: {
            rejectSubstitution: { id: 'po-1', status: 'STOCK_ISSUE' },
        },
    },
};

function renderWithProvider(mocks: MockedResponse[] = []) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            <SubstitutionsPage />
        </MockedProvider>
    );
}

describe('SubstitutionsPage', () => {
    it('should render loading state', () => {
        renderWithProvider([approvalsMock]);
        expect(screen.getByTestId('substitutions-loading')).toBeDefined();
    });

    it('should render pending substitutions with medication details', async () => {
        renderWithProvider([approvalsMock]);

        await waitFor(() => {
            expect(screen.getByText('PO-100001')).toBeDefined();
            expect(screen.getByText('PO-100002')).toBeDefined();
        });

        expect(screen.getByText('Finasteride 1mg')).toBeDefined();
        expect(screen.getByText('Dutasteride 0.5mg')).toBeDefined();
    });

    it('should show original vs proposed medication comparison', async () => {
        renderWithProvider([approvalsMock]);

        await waitFor(() => {
            expect(screen.getByText('Finasteride 1mg')).toBeDefined();
        });

        // Both original and proposed should be visible
        expect(screen.getByText('Dutasteride 0.5mg')).toBeDefined();
        expect(screen.getByText(/out of stock/i)).toBeDefined();
    });

    it('should render empty state when no pending approvals', async () => {
        renderWithProvider([emptyApprovalsMock]);

        await waitFor(() => {
            expect(screen.getByText(/no pending substitutions/i)).toBeDefined();
        });
    });

    it('should show approve and reject buttons for each substitution', async () => {
        renderWithProvider([approvalsMock, approveMock]);

        await waitFor(() => {
            expect(screen.getByText('PO-100001')).toBeDefined();
        });

        expect(screen.getByTestId('approve-po-1')).toBeDefined();
        expect(screen.getByTestId('reject-po-1')).toBeDefined();
    });

    it('should show rejection reason input when rejecting', async () => {
        renderWithProvider([approvalsMock, rejectMock]);

        await waitFor(() => {
            expect(screen.getByText('PO-100001')).toBeDefined();
        });

        const rejectButton = screen.getByTestId('reject-po-1');
        fireEvent.click(rejectButton);

        expect(screen.getByTestId('rejection-reason-input')).toBeDefined();
        expect(screen.getByTestId('confirm-reject-po-1')).toBeDefined();
    });

    it('should show badge count in page header', async () => {
        renderWithProvider([approvalsMock]);

        await waitFor(() => {
            expect(screen.getByTestId('pending-count')).toBeDefined();
        });

        expect(screen.getByTestId('pending-count').textContent).toBe('2');
    });
});
