import { gql } from '@apollo/client';

// Spec: Phase 15 — Admin pharmacy management operations

// =============================================
// QUERIES
// =============================================

export const ADMIN_PHARMACIES = gql`
    query AdminPharmacies {
        pharmacies {
            id
            name
            city
            status
            rating
            ordersCompleted
            createdAt
        }
    }
`;

export const ADMIN_PHARMACY_BY_ID = gql`
    query AdminPharmacyById($id: String!) {
        pharmacyById(id: $id) {
            id
            name
            city
            address
            phone
            status
            rating
            ordersCompleted
            createdAt
        }
    }
`;

export const ADMIN_SLA_BREACHES = gql`
    query AdminSlaBreaches {
        slaBreaches {
            id
            pharmacyName
            orderId
            breachType
            delayMinutes
            createdAt
        }
    }
`;

export const ADMIN_PHARMACY_PERFORMANCE = gql`
    query AdminPharmacyPerformance($pharmacyId: String!) {
        pharmacyPerformance(pharmacyId: $pharmacyId) {
            totalOrders
            completedOrders
            avgPrepTimeMinutes
            slaBreachCount
            rating
        }
    }
`;

export const ADMIN_ALL_PHARMACY_ORDERS = gql`
    query AdminAllPharmacyOrders {
        allPharmacyOrders {
            id
            orderId
            pharmacyName
            status
            patientArea
            createdAt
        }
    }
`;

// =============================================
// MUTATIONS
// =============================================

export const ADMIN_REGISTER_PHARMACY = gql`
    mutation AdminRegisterPharmacy($input: RegisterPharmacyInput!) {
        registerPharmacy(input: $input) {
            id
            name
            status
        }
    }
`;

export const ADMIN_REVIEW_PHARMACY = gql`
    mutation AdminReviewPharmacy($pharmacyId: String!, $approved: Boolean!) {
        reviewPharmacy(pharmacyId: $pharmacyId, approved: $approved) {
            id
            status
        }
    }
`;

export const ADMIN_SUSPEND_PHARMACY = gql`
    mutation AdminSuspendPharmacy($pharmacyId: String!, $reason: String!) {
        suspendPharmacy(pharmacyId: $pharmacyId, reason: $reason) {
            id
            status
        }
    }
`;

export const ADMIN_REACTIVATE_PHARMACY = gql`
    mutation AdminReactivatePharmacy($pharmacyId: String!) {
        reactivatePharmacy(pharmacyId: $pharmacyId) {
            id
            status
        }
    }
`;

export const ADMIN_TRIGGER_ASSIGNMENT = gql`
    mutation AdminTriggerAssignment($orderId: String!) {
        triggerAssignment(orderId: $orderId) {
            id
            status
        }
    }
`;

export const ADMIN_MANUAL_REASSIGN = gql`
    mutation AdminManualReassign($orderId: String!, $pharmacyId: String!) {
        manualReassign(orderId: $orderId, pharmacyId: $pharmacyId) {
            id
            status
        }
    }
`;

export const ADMIN_DISPATCH_ORDER = gql`
    mutation AdminDispatchOrder($orderId: String!) {
        dispatchOrder(orderId: $orderId) {
            id
            status
        }
    }
`;

// =============================================
// TYPES
// =============================================

export interface AdminPharmacy {
    id: string;
    name: string;
    city: string;
    status: string;
    rating: number | null;
    ordersCompleted: number;
    createdAt: string;
}

export interface AdminPharmacyOrder {
    id: string;
    orderId: string;
    pharmacyName: string;
    status: string;
    patientArea: string;
    createdAt: string;
}

export interface SLABreach {
    id: string;
    pharmacyName: string;
    orderId: string;
    breachType: string;
    delayMinutes: number;
    createdAt: string;
}

export interface PharmacyPerformance {
    totalOrders: number;
    completedOrders: number;
    avgPrepTimeMinutes: number;
    slaBreachCount: number;
    rating: number;
}

export interface AdminPharmaciesResponse {
    pharmacies: AdminPharmacy[];
}

export interface AdminAllPharmacyOrdersResponse {
    allPharmacyOrders: AdminPharmacyOrder[];
}

export const PHARMACY_STATUS_OPTIONS: Record<string, { label: string; color: string; bgColor: string }> = {
    PENDING_REVIEW: { label: 'Pending Review', color: 'text-amber-600', bgColor: 'bg-amber-100' },
    ACTIVE: { label: 'Active', color: 'text-green-600', bgColor: 'bg-green-100' },
    SUSPENDED: { label: 'Suspended', color: 'text-red-600', bgColor: 'bg-red-100' },
    DEACTIVATED: { label: 'Deactivated', color: 'text-gray-600', bgColor: 'bg-gray-100' },
};
