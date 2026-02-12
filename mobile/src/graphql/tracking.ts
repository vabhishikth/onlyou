import { gql } from '@apollo/client';

// Lab Order Statuses (12 total)
export type LabOrderStatus =
    | 'ORDERED'
    | 'SLOT_BOOKED'
    | 'PHLEBOTOMIST_ASSIGNED'
    | 'SAMPLE_COLLECTED'
    | 'COLLECTION_FAILED'
    | 'DELIVERED_TO_LAB'
    | 'SAMPLE_RECEIVED'
    | 'SAMPLE_ISSUE'
    | 'PROCESSING'
    | 'RESULTS_READY'
    | 'DOCTOR_REVIEWED'
    | 'RESULTS_UPLOADED'
    | 'CANCELLED'
    | 'EXPIRED'
    | 'CLOSED';

// Delivery Order Statuses (10 total)
export type OrderStatus =
    | 'PRESCRIPTION_CREATED'
    | 'SENT_TO_PHARMACY'
    | 'PHARMACY_PREPARING'
    | 'PHARMACY_READY'
    | 'PICKUP_ARRANGED'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'DELIVERY_FAILED'
    | 'RESCHEDULED'
    | 'CANCELLED';

// Lab Order Type
export interface LabOrder {
    id: string;
    status: LabOrderStatus;
    testPanel: string[];
    panelName?: string;
    bookedDate?: string;
    bookedTimeSlot?: string;
    collectionAddress?: string;
    phlebotomistName?: string;
    phlebotomistPhone?: string;
    resultFileUrl?: string;
    abnormalFlags?: Record<string, { status: string; value: string; normalRange: string }>;
    criticalValues: boolean;
    orderedAt: string;
    slotBookedAt?: string;
    phlebotomistAssignedAt?: string;
    sampleCollectedAt?: string;
    collectionFailedAt?: string;
    collectionFailedReason?: string;
    deliveredToLabAt?: string;
    sampleReceivedAt?: string;
    processingStartedAt?: string;
    resultsUploadedAt?: string;
    doctorReviewedAt?: string;
    doctorNote?: string;
}

// Delivery Order Type
export interface Order {
    id: string;
    status: OrderStatus;
    prescriptionId?: string;
    deliveryPersonName?: string;
    deliveryPersonPhone?: string;
    estimatedDeliveryTime?: string;
    deliveryOtp?: string;
    prescriptionCreatedAt: string;
    sentToPharmacyAt?: string;
    pharmacyPreparingAt?: string;
    pharmacyReadyAt?: string;
    pickupArrangedAt?: string;
    outForDeliveryAt?: string;
    deliveredAt?: string;
    deliveryFailedAt?: string;
    rescheduledAt?: string;
}

// Active tracking summary (for home screen banner)
export interface ActiveTrackingItem {
    id: string;
    type: 'lab' | 'delivery';
    title: string;
    statusLabel: string;
    statusIcon: string;
    lastUpdated: string;
}

export interface ActiveTrackingResponse {
    activeTracking: {
        labOrders: LabOrder[];
        deliveryOrders: Order[];
    };
}

// Queries
export const GET_ACTIVE_TRACKING = gql`
    query GetActiveTracking {
        activeTracking {
            labOrders {
                id
                status
                testPanel
                panelName
                bookedDate
                bookedTimeSlot
                orderedAt
                slotBookedAt
                phlebotomistAssignedAt
                sampleCollectedAt
                deliveredToLabAt
                sampleReceivedAt
                processingStartedAt
                resultsUploadedAt
            }
            deliveryOrders {
                id
                status
                deliveryPersonName
                estimatedDeliveryTime
                prescriptionCreatedAt
                sentToPharmacyAt
                pharmacyPreparingAt
                pharmacyReadyAt
                outForDeliveryAt
            }
        }
    }
`;

export const GET_LAB_ORDER = gql`
    query GetLabOrder($id: ID!) {
        labOrder(id: $id) {
            id
            status
            testPanel
            panelName
            bookedDate
            bookedTimeSlot
            collectionAddress
            phlebotomistName
            phlebotomistPhone
            resultFileUrl
            abnormalFlags
            criticalValues
            orderedAt
            slotBookedAt
            phlebotomistAssignedAt
            sampleCollectedAt
            collectionFailedAt
            collectionFailedReason
            deliveredToLabAt
            sampleReceivedAt
            processingStartedAt
            resultsUploadedAt
            doctorReviewedAt
            doctorNote
        }
    }
`;

export const GET_DELIVERY_ORDER = gql`
    query GetDeliveryOrder($id: ID!) {
        deliveryOrder(id: $id) {
            id
            status
            prescriptionId
            deliveryPersonName
            deliveryPersonPhone
            estimatedDeliveryTime
            deliveryOtp
            prescriptionCreatedAt
            sentToPharmacyAt
            pharmacyPreparingAt
            pharmacyReadyAt
            pickupArrangedAt
            outForDeliveryAt
            deliveredAt
            deliveryFailedAt
            rescheduledAt
        }
    }
`;

// Helper: Map status to patient-friendly label
export const LAB_STATUS_LABELS: Record<LabOrderStatus, { label: string; icon: string }> = {
    ORDERED: { label: 'Doctor ordered blood tests', icon: '🔬' },
    SLOT_BOOKED: { label: 'Collection scheduled', icon: '📅' },
    PHLEBOTOMIST_ASSIGNED: { label: 'Phlebotomist assigned', icon: '👤' },
    SAMPLE_COLLECTED: { label: 'Sample collected', icon: '✅' },
    COLLECTION_FAILED: { label: 'Collection missed — please reschedule', icon: '⚠️' },
    DELIVERED_TO_LAB: { label: 'Sample delivered to lab', icon: '🏥' },
    SAMPLE_RECEIVED: { label: 'Lab received your sample', icon: '🏥' },
    SAMPLE_ISSUE: { label: 'Sample issue — free recollection scheduled', icon: '⚠️' },
    PROCESSING: { label: 'Tests being processed — results in 24-48hrs', icon: '⏳' },
    RESULTS_READY: { label: 'Results ready! Tap to view', icon: '📄' },
    DOCTOR_REVIEWED: { label: 'Doctor reviewed your results', icon: '👨‍⚕️' },
    RESULTS_UPLOADED: { label: 'Your uploaded results are being reviewed', icon: '📤' },
    CANCELLED: { label: 'Cancelled', icon: '❌' },
    EXPIRED: { label: 'Expired', icon: '⏰' },
    CLOSED: { label: 'Completed', icon: '✅' },
};

export const DELIVERY_STATUS_LABELS: Record<OrderStatus, { label: string; icon: string }> = {
    PRESCRIPTION_CREATED: { label: 'Treatment plan ready', icon: '📋' },
    SENT_TO_PHARMACY: { label: 'Prescription sent to pharmacy', icon: '💊' },
    PHARMACY_PREPARING: { label: 'Medication being prepared', icon: '⏳' },
    PHARMACY_READY: { label: 'Medication ready — arranging delivery', icon: '✅' },
    PICKUP_ARRANGED: { label: 'Delivery person picking up your kit', icon: '🏃' },
    OUT_FOR_DELIVERY: { label: 'On the way!', icon: '🚗' },
    DELIVERED: { label: 'Delivered', icon: '📦' },
    DELIVERY_FAILED: { label: 'Delivery unsuccessful — rescheduling', icon: '⚠️' },
    RESCHEDULED: { label: 'Rescheduled', icon: '📅' },
    CANCELLED: { label: 'Cancelled', icon: '❌' },
};

// Lab Slot Types
export interface LabSlot {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    city: string;
    maxBookings: number;
    currentBookings: number;
}

export interface GetAvailableSlotsResponse {
    availableSlots: LabSlot[];
}

export interface BookSlotResponse {
    bookLabSlot: LabOrder;
}

export interface RescheduleSlotResponse {
    rescheduleLabSlot: LabOrder;
}

export interface CancelLabOrderResponse {
    cancelLabOrder: LabOrder;
}

// Lab Slot Queries & Mutations
export const GET_AVAILABLE_SLOTS = gql`
    query GetAvailableSlots($city: String!, $pincode: String!, $startDate: DateTime!, $endDate: DateTime!) {
        availableSlots(city: $city, pincode: $pincode, startDate: $startDate, endDate: $endDate) {
            id
            date
            startTime
            endTime
            city
            maxBookings
            currentBookings
        }
    }
`;

export const BOOK_LAB_SLOT = gql`
    mutation BookLabSlot($labOrderId: ID!, $slotId: ID!, $collectionAddress: String) {
        bookLabSlot(labOrderId: $labOrderId, slotId: $slotId, collectionAddress: $collectionAddress) {
            id
            status
            bookedDate
            bookedTimeSlot
            slotBookedAt
        }
    }
`;

export const RESCHEDULE_LAB_SLOT = gql`
    mutation RescheduleLabSlot($labOrderId: ID!, $newSlotId: ID!) {
        rescheduleLabSlot(labOrderId: $labOrderId, newSlotId: $newSlotId) {
            id
            status
            bookedDate
            bookedTimeSlot
            slotBookedAt
        }
    }
`;

export const CANCEL_LAB_ORDER = gql`
    mutation CancelLabOrder($labOrderId: ID!, $reason: String!) {
        cancelLabOrder(labOrderId: $labOrderId, reason: $reason) {
            id
            status
        }
    }
`;
