import { gql } from '@apollo/client';
import { HealthVertical } from './dashboard';

// Spec: master spec Section 7 (Blood Work & Diagnostics)

// Get available test panels for a vertical
export const AVAILABLE_TEST_PANELS = gql`
    query AvailableTestPanels($vertical: HealthVertical!) {
        availableTestPanels(vertical: $vertical) {
            vertical
            panels {
                name
                tests
                description
            }
        }
    }
`;

// Get all lab orders for the logged-in doctor
// Spec: master spec Section 7 — Doctor lab orders list
export const DOCTOR_LAB_ORDERS = gql`
    query DoctorLabOrders($filters: DoctorLabOrdersFilterInput) {
        doctorLabOrders(filters: $filters) {
            id
            consultationId
            patientName
            vertical
            testPanel
            panelName
            status
            criticalValues
            orderedAt
            resultFileUrl
        }
    }
`;

// Get lab orders for a consultation
export const LAB_ORDERS_BY_CONSULTATION = gql`
    query LabOrdersByConsultation($consultationId: String!) {
        labOrdersByConsultation(consultationId: $consultationId) {
            id
            patientId
            consultationId
            doctorId
            testPanel
            panelName
            doctorNotes
            status
            bookedDate
            bookedTimeSlot
            collectionAddress
            collectionCity
            collectionPincode
            resultFileUrl
            criticalValues
            orderedAt
            slotBookedAt
            sampleCollectedAt
            resultsUploadedAt
            doctorReviewedAt
            closedAt
            patientName
            patientPhone
        }
    }
`;

// Create a new lab order
export const CREATE_LAB_ORDER = gql`
    mutation CreateLabOrder($input: CreateLabOrderInput!) {
        createLabOrder(input: $input) {
            success
            message
            labOrder {
                id
                testPanel
                panelName
                status
                orderedAt
            }
        }
    }
`;

// Review lab results
export const REVIEW_LAB_RESULTS = gql`
    mutation ReviewLabResults($input: ReviewLabResultsInput!) {
        reviewLabResults(input: $input) {
            success
            message
            labOrder {
                id
                status
                doctorReviewedAt
            }
        }
    }
`;

// Types
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
    | 'RESULTS_UPLOADED'
    | 'DOCTOR_REVIEWED'
    | 'CLOSED'
    | 'CANCELLED'
    | 'EXPIRED';

export interface TestPanel {
    name: string;
    tests: string[];
    description: string;
}

export interface AvailableTestPanelsResponse {
    availableTestPanels: {
        vertical: HealthVertical;
        panels: TestPanel[];
    };
}

export interface LabOrder {
    id: string;
    patientId: string;
    consultationId: string;
    doctorId: string;
    testPanel: string[];
    panelName?: string;
    doctorNotes?: string;
    status: LabOrderStatus;
    bookedDate?: string;
    bookedTimeSlot?: string;
    collectionAddress: string;
    collectionCity: string;
    collectionPincode: string;
    resultFileUrl?: string;
    criticalValues?: boolean;
    orderedAt: string;
    slotBookedAt?: string;
    sampleCollectedAt?: string;
    resultsUploadedAt?: string;
    doctorReviewedAt?: string;
    closedAt?: string;
    patientName?: string;
    patientPhone?: string;
}

export interface DoctorLabOrderItem {
    id: string;
    consultationId: string;
    patientName?: string;
    vertical: string;
    testPanel: string[];
    panelName?: string;
    status: LabOrderStatus;
    criticalValues: boolean;
    orderedAt: string;
    resultFileUrl?: string;
}

export interface DoctorLabOrdersResponse {
    doctorLabOrders: DoctorLabOrderItem[];
}

export interface LabOrdersByConsultationResponse {
    labOrdersByConsultation: LabOrder[];
}

export interface CreateLabOrderResponse {
    createLabOrder: {
        success: boolean;
        message: string;
        labOrder?: LabOrder;
    };
}

export interface ReviewLabResultsResponse {
    reviewLabResults: {
        success: boolean;
        message: string;
        labOrder?: LabOrder;
    };
}

// Status display config
export const LAB_ORDER_STATUS_CONFIG: Record<
    LabOrderStatus,
    { label: string; color: string; description: string }
> = {
    ORDERED: {
        label: 'Ordered',
        color: 'bg-blue-500',
        description: 'Waiting for patient to book collection slot',
    },
    SLOT_BOOKED: {
        label: 'Slot Booked',
        color: 'bg-indigo-500',
        description: 'Collection slot booked by patient',
    },
    PHLEBOTOMIST_ASSIGNED: {
        label: 'Assigned',
        color: 'bg-purple-500',
        description: 'Phlebotomist assigned for collection',
    },
    SAMPLE_COLLECTED: {
        label: 'Collected',
        color: 'bg-cyan-500',
        description: 'Sample collected successfully',
    },
    COLLECTION_FAILED: {
        label: 'Collection Failed',
        color: 'bg-red-500',
        description: 'Collection failed - needs rebooking',
    },
    DELIVERED_TO_LAB: {
        label: 'At Lab',
        color: 'bg-teal-500',
        description: 'Sample delivered to diagnostic centre',
    },
    SAMPLE_RECEIVED: {
        label: 'Received',
        color: 'bg-emerald-500',
        description: 'Sample received and verified by lab',
    },
    SAMPLE_ISSUE: {
        label: 'Sample Issue',
        color: 'bg-orange-500',
        description: 'Sample issue - recollection needed',
    },
    PROCESSING: {
        label: 'Processing',
        color: 'bg-yellow-500',
        description: 'Tests being processed',
    },
    RESULTS_READY: {
        label: 'Results Ready',
        color: 'bg-green-500',
        description: 'Results ready for doctor review',
    },
    RESULTS_UPLOADED: {
        label: 'Uploaded',
        color: 'bg-green-500',
        description: 'Patient uploaded external results',
    },
    DOCTOR_REVIEWED: {
        label: 'Reviewed',
        color: 'bg-primary',
        description: 'Doctor has reviewed the results',
    },
    CLOSED: {
        label: 'Closed',
        color: 'bg-gray-500',
        description: 'Lab order completed',
    },
    CANCELLED: {
        label: 'Cancelled',
        color: 'bg-gray-400',
        description: 'Lab order cancelled',
    },
    EXPIRED: {
        label: 'Expired',
        color: 'bg-gray-400',
        description: 'Lab order expired',
    },
};
