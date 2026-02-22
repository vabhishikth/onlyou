import { gql } from '@apollo/client';

// Spec: Phase 15 — Doctor substitution approval endpoints

export const PENDING_SUBSTITUTION_APPROVALS = gql`
    query PendingSubstitutionApprovals {
        pendingSubstitutionApprovals
    }
`;

export const APPROVE_SUBSTITUTION = gql`
    mutation ApproveSubstitution($pharmacyOrderId: String!) {
        approveSubstitution(pharmacyOrderId: $pharmacyOrderId)
    }
`;

export const REJECT_SUBSTITUTION = gql`
    mutation RejectSubstitution($pharmacyOrderId: String!, $reason: String!) {
        rejectSubstitution(pharmacyOrderId: $pharmacyOrderId, reason: $reason)
    }
`;

// Types for the JSON response from pendingSubstitutionApprovals
export interface SubstitutionDetails {
    originalMedication: string;
    proposedSubstitution: string;
    reason: string;
}

export interface PendingSubstitution {
    id: string;
    orderNumber: string;
    patientId: string;
    consultationId: string;
    status: string;
    substitutionDetails: SubstitutionDetails;
    substitutionProposedByStaffId: string;
    createdAt: string;
}
