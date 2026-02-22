import { gql } from '@apollo/client';

// Spec: Phase 16 — Admin lab partner management operations

// =============================================
// QUERIES
// =============================================

export const ADMIN_LIST_PARTNER_LABS = gql`
    query AdminListPartnerLabs {
        listPartnerLabs {
            id
            name
            city
            status
            technicianCount
            createdAt
        }
    }
`;

export const ADMIN_PARTNER_LAB_BY_ID = gql`
    query AdminPartnerLabById($id: String!) {
        partnerLabById(id: $id) {
            id
            name
            city
            address
            phone
            status
            technicianCount
            phlebotomists {
                id
                name
                phone
                status
                credentialExpiry
            }
            createdAt
        }
    }
`;

// =============================================
// MUTATIONS
// =============================================

export const ADMIN_REGISTER_PARTNER_LAB = gql`
    mutation AdminRegisterPartnerLab($input: RegisterPartnerLabInput!) {
        registerPartnerLab(input: $input) {
            id
            name
            status
        }
    }
`;

export const ADMIN_REVIEW_PARTNER_LAB = gql`
    mutation AdminReviewPartnerLab($labId: String!, $approved: Boolean!) {
        reviewPartnerLab(labId: $labId, approved: $approved) {
            id
            status
        }
    }
`;

export const ADMIN_SUSPEND_PARTNER_LAB = gql`
    mutation AdminSuspendPartnerLab($labId: String!, $reason: String!) {
        suspendPartnerLab(labId: $labId, reason: $reason) {
            id
            status
        }
    }
`;

export const ADMIN_REACTIVATE_PARTNER_LAB = gql`
    mutation AdminReactivatePartnerLab($labId: String!) {
        reactivatePartnerLab(labId: $labId) {
            id
            status
        }
    }
`;

export const ADMIN_REGISTER_PHLEBOTOMIST = gql`
    mutation AdminRegisterPhlebotomist($input: RegisterPhlebotomistInput!) {
        registerPhlebotomist(input: $input) {
            id
            name
            status
        }
    }
`;

export const ADMIN_ACTIVATE_PHLEBOTOMIST = gql`
    mutation AdminActivatePhlebotomist($phlebotomistId: String!) {
        activatePhlebotomist(phlebotomistId: $phlebotomistId) {
            id
            status
        }
    }
`;

// =============================================
// TYPES
// =============================================

export interface PartnerLab {
    id: string;
    name: string;
    city: string;
    status: string;
    technicianCount: number;
    createdAt: string;
}

export interface PartnerLabDetail extends PartnerLab {
    address: string;
    phone: string;
    phlebotomists: Phlebotomist[];
}

export interface Phlebotomist {
    id: string;
    name: string;
    phone: string;
    status: string;
    credentialExpiry: string | null;
}

export interface ListPartnerLabsResponse {
    listPartnerLabs: PartnerLab[];
}

export interface PartnerLabByIdResponse {
    partnerLabById: PartnerLabDetail;
}

export const LAB_STATUS_OPTIONS: Record<string, { label: string; color: string; bgColor: string }> = {
    PENDING_REVIEW: { label: 'Pending Review', color: 'text-amber-600', bgColor: 'bg-amber-100' },
    ACTIVE: { label: 'Active', color: 'text-green-600', bgColor: 'bg-green-100' },
    SUSPENDED: { label: 'Suspended', color: 'text-red-600', bgColor: 'bg-red-100' },
    DEACTIVATED: { label: 'Deactivated', color: 'text-gray-600', bgColor: 'bg-gray-100' },
};
