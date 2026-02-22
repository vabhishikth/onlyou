import { gql } from '@apollo/client';

// Spec: master spec Section 8.1 — Pharmacy Portal (pharmacy.onlyou.life)
// Three tabs: New Orders | Preparing | Ready

// =============================================
// QUERIES
// =============================================

export const PHARMACY_INFO = gql`
    query PharmacyInfo {
        pharmacyInfo {
            id
            name
            address
            city
            isActive
        }
    }
`;

export const PHARMACY_TODAY_SUMMARY = gql`
    query PharmacyTodaySummary {
        pharmacyTodaySummary {
            newOrders
            preparing
            ready
        }
    }
`;

export const PHARMACY_NEW_ORDERS = gql`
    query PharmacyNewOrders {
        pharmacyNewOrders {
            id
            orderId
            patientArea
            medications {
                name
                dosage
                quantity
            }
            prescriptionUrl
            status
            createdAt
            deliveryPersonName
            deliveryPersonPhone
        }
    }
`;

export const PHARMACY_PREPARING_ORDERS = gql`
    query PharmacyPreparingOrders {
        pharmacyPreparingOrders {
            id
            orderId
            patientArea
            medications {
                name
                dosage
                quantity
            }
            prescriptionUrl
            status
            createdAt
            deliveryPersonName
            deliveryPersonPhone
        }
    }
`;

export const PHARMACY_READY_ORDERS = gql`
    query PharmacyReadyOrders {
        pharmacyReadyOrders {
            id
            orderId
            patientArea
            medications {
                name
                dosage
                quantity
            }
            prescriptionUrl
            status
            createdAt
            deliveryPersonName
            deliveryPersonPhone
        }
    }
`;

// =============================================
// MUTATIONS
// =============================================

export const PHARMACY_START_PREPARING = gql`
    mutation PharmacyStartPreparing($orderId: String!) {
        pharmacyStartPreparing(orderId: $orderId) {
            id
            orderId
            status
        }
    }
`;

export const PHARMACY_MARK_READY = gql`
    mutation PharmacyMarkReady($orderId: String!) {
        pharmacyMarkReady(orderId: $orderId) {
            id
            orderId
            status
        }
    }
`;

export const PHARMACY_REPORT_STOCK_ISSUE = gql`
    mutation PharmacyReportStockIssue($input: ReportStockIssueInput!) {
        pharmacyReportStockIssue(input: $input) {
            success
            message
        }
    }
`;

// Spec: Phase 15 — Pharmacy accept/reject order
export const PHARMACY_ACCEPT_ORDER = gql`
    mutation PharmacyAcceptOrder($pharmacyOrderId: String!) {
        acceptOrder(pharmacyOrderId: $pharmacyOrderId)
    }
`;

export const PHARMACY_REJECT_ORDER = gql`
    mutation PharmacyRejectOrder($pharmacyOrderId: String!, $reason: String!) {
        rejectOrder(pharmacyOrderId: $pharmacyOrderId, reason: $reason)
    }
`;

// Spec: Phase 15 — Pharmacy propose substitution
export const PHARMACY_PROPOSE_SUBSTITUTION = gql`
    mutation PharmacyProposeSubstitution(
        $pharmacyOrderId: String!
        $substitutionDetails: JSON!
    ) {
        proposeSubstitution(
            pharmacyOrderId: $pharmacyOrderId
            substitutionDetails: $substitutionDetails
        )
    }
`;

// Spec: Phase 15 — Confirm discreet packaging (gate for markReadyForPickup)
export const PHARMACY_CONFIRM_DISCREET_PACKAGING = gql`
    mutation PharmacyConfirmDiscreetPackaging($pharmacyOrderId: String!) {
        confirmDiscreetPackaging(pharmacyOrderId: $pharmacyOrderId)
    }
`;

// Spec: Phase 15 — Mark ready for pickup (requires discreet packaging confirmed)
export const PHARMACY_MARK_READY_FOR_PICKUP = gql`
    mutation PharmacyMarkReadyForPickup($pharmacyOrderId: String!) {
        markReadyForPickup(pharmacyOrderId: $pharmacyOrderId)
    }
`;

// =============================================
// TYPES
// =============================================

export interface PharmacyInfo {
    id: string;
    name: string;
    address: string;
    city: string;
    isActive: boolean;
}

export interface PharmacyTodaySummary {
    newOrders: number;
    preparing: number;
    ready: number;
}

export interface MedicationItem {
    name: string;
    dosage: string;
    quantity: number;
}

export interface PharmacyOrderSummary {
    id: string;
    orderId: string;
    patientArea: string;
    medications: MedicationItem[];
    prescriptionUrl: string | null;
    status: string;
    createdAt: string;
    deliveryPersonName: string | null;
    deliveryPersonPhone: string | null;
}

export interface PharmacyInfoResponse {
    pharmacyInfo: PharmacyInfo;
}

export interface PharmacyTodaySummaryResponse {
    pharmacyTodaySummary: PharmacyTodaySummary;
}

export interface PharmacyNewOrdersResponse {
    pharmacyNewOrders: PharmacyOrderSummary[];
}

export interface PharmacyPreparingOrdersResponse {
    pharmacyPreparingOrders: PharmacyOrderSummary[];
}

export interface PharmacyReadyOrdersResponse {
    pharmacyReadyOrders: PharmacyOrderSummary[];
}

// Status display config
export const PHARMACY_STATUS_CONFIG: Record<
    string,
    { label: string; color: string; bgColor: string }
> = {
    SENT_TO_PHARMACY: { label: 'Incoming', color: 'text-amber-600', bgColor: 'bg-amber-100' },
    PHARMACY_PREPARING: { label: 'In Progress', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    PHARMACY_READY: { label: 'Ready', color: 'text-green-600', bgColor: 'bg-green-100' },
    PICKUP_ARRANGED: { label: 'Pickup Arranged', color: 'text-purple-600', bgColor: 'bg-purple-100' },
    PHARMACY_ISSUE: { label: 'Issue', color: 'text-red-600', bgColor: 'bg-red-100' },
};
