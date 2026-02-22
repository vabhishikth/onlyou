import { gql } from '@apollo/client';

// Spec: Phase 15 — Patient pharmacy order operations

export const MY_PHARMACY_ORDER_STATUS = gql`
    query MyPharmacyOrderStatus($pharmacyOrderId: String!) {
        myPharmacyOrderStatus(pharmacyOrderId: $pharmacyOrderId)
    }
`;

export const MY_ACTIVE_PHARMACY_ORDERS = gql`
    query MyActivePharmacyOrders {
        myActivePharmacyOrders
    }
`;

export const MY_AUTO_REFILLS = gql`
    query MyAutoRefills {
        myAutoRefills
    }
`;

export const UPDATE_DELIVERY_ADDRESS = gql`
    mutation UpdateDeliveryAddress(
        $pharmacyOrderId: String!
        $newAddress: String!
        $newPincode: String!
    ) {
        updateDeliveryAddress(
            pharmacyOrderId: $pharmacyOrderId
            newAddress: $newAddress
            newPincode: $newPincode
        )
    }
`;

export const CREATE_AUTO_REFILL = gql`
    mutation CreateAutoRefill($prescriptionId: String!, $intervalDays: Int) {
        createAutoRefill(prescriptionId: $prescriptionId, intervalDays: $intervalDays)
    }
`;

export const CANCEL_AUTO_REFILL = gql`
    mutation CancelAutoRefill($autoRefillConfigId: String!) {
        cancelAutoRefill(autoRefillConfigId: $autoRefillConfigId)
    }
`;

export const REPORT_DAMAGED_ORDER = gql`
    mutation ReportDamagedOrder(
        $pharmacyOrderId: String!
        $photos: [String!]!
        $description: String!
    ) {
        reportDamagedOrder(
            pharmacyOrderId: $pharmacyOrderId
            photos: $photos
            description: $description
        )
    }
`;

export const PROCESS_RETURN = gql`
    mutation ProcessReturn($pharmacyOrderId: String!, $reason: String!) {
        processReturn(pharmacyOrderId: $pharmacyOrderId, reason: $reason)
    }
`;

// Types
export interface PharmacyOrder {
    id: string;
    orderNumber: string;
    status: string;
    deliveryAddress: string;
    deliveryCity: string;
    deliveryPincode: string;
    createdAt: string;
    assignedAt?: string;
    acceptedAt?: string;
    preparingAt?: string;
    readyForPickupAt?: string;
    dispatchedAt?: string;
    deliveredAt?: string;
}

export interface AutoRefillConfig {
    id: string;
    prescriptionId: string;
    intervalDays: number;
    nextRefillDate: string;
    isActive: boolean;
}
