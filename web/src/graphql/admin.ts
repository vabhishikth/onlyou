import { gql } from '@apollo/client';

// Spec: master spec Section 7, Section 8 — Admin dashboard queries

// Dashboard stats
export const ADMIN_DASHBOARD_STATS = gql`
    query AdminDashboardStats {
        adminDashboardStats {
            labCollections {
                scheduled
                completed
                failed
            }
            deliveries {
                pending
                outForDelivery
                delivered
                failed
            }
            openCases
            slaBreaches
            activePatients
            revenueThisMonthPaise
        }
    }
`;

// SLA escalations
export const SLA_ESCALATIONS = gql`
    query SlaEscalations {
        slaEscalations {
            id
            type
            resourceId
            slaInfo {
                status
                reason
                hoursOverdue
                deadlineAt
            }
            patientName
            vertical
            responsibleParty
            responsibleContact
            createdAt
        }
    }
`;

// Types
export type SLAStatus = 'ON_TIME' | 'APPROACHING' | 'BREACHED';

export interface LabCollectionStats {
    scheduled: number;
    completed: number;
    failed: number;
}

export interface DeliveryStats {
    pending: number;
    outForDelivery: number;
    delivered: number;
    failed: number;
}

export interface AdminDashboardStats {
    labCollections: LabCollectionStats;
    deliveries: DeliveryStats;
    openCases: number;
    slaBreaches: number;
    activePatients: number;
    revenueThisMonthPaise: number;
}

export interface AdminDashboardStatsResponse {
    adminDashboardStats: AdminDashboardStats;
}

export interface SLAInfo {
    status: SLAStatus;
    reason: string | null;
    hoursOverdue: number | null;
    deadlineAt: string | null;
}

export interface SLAEscalation {
    id: string;
    type: 'LAB_ORDER' | 'DELIVERY';
    resourceId: string;
    slaInfo: SLAInfo;
    patientName: string | null;
    vertical: string | null;
    responsibleParty: string;
    responsibleContact: string | null;
    createdAt: string;
}

export interface SLAEscalationsResponse {
    slaEscalations: SLAEscalation[];
}

// Status colors
export const SLA_STATUS_CONFIG: Record<SLAStatus, { label: string; color: string; bgColor: string }> = {
    ON_TIME: {
        label: 'On Time',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
    },
    APPROACHING: {
        label: 'Approaching',
        color: 'text-amber-600',
        bgColor: 'bg-amber-100',
    },
    BREACHED: {
        label: 'Breached',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
    },
};

// =============================================
// LAB ORDERS MANAGEMENT
// Spec: master spec Section 7 — Blood Work & Diagnostics
// =============================================

export const ADMIN_LAB_ORDERS = gql`
    query AdminLabOrders($filter: AdminLabOrdersFilterInput) {
        adminLabOrders(filter: $filter) {
            labOrders {
                id
                patient {
                    id
                    name
                    phone
                }
                vertical
                testPanel
                panelName
                status
                phlebotomist {
                    id
                    name
                    phone
                }
                lab {
                    id
                    name
                    phone
                }
                bookedDate
                bookedTimeSlot
                collectionAddress
                collectionCity
                collectionPincode
                slaInfo {
                    status
                    reason
                    hoursOverdue
                }
                orderedAt
                timeline {
                    status
                    timestamp
                    details
                }
            }
            total
            page
            pageSize
        }
    }
`;

export const AVAILABLE_PHLEBOTOMISTS = gql`
    query AvailablePhlebotomists($pincode: String!, $date: DateTime!) {
        availablePhlebotomists(pincode: $pincode, date: $date) {
            phlebotomists {
                id
                name
                phone
                todayAssignments
                maxDailyCollections
                isAvailable
            }
        }
    }
`;

export const AVAILABLE_LABS = gql`
    query AvailableLabs($city: String!) {
        availableLabs(city: $city) {
            labs {
                id
                name
                address
                city
                avgTurnaroundHours
                testsOffered
            }
        }
    }
`;

export const ASSIGN_PHLEBOTOMIST = gql`
    mutation AssignPhlebotomist($input: AssignPhlebotomistInput!) {
        assignPhlebotomist(input: $input) {
            success
            message
        }
    }
`;

export const BULK_ASSIGN_PHLEBOTOMIST = gql`
    mutation BulkAssignPhlebotomist($input: BulkAssignPhlebotomistInput!) {
        bulkAssignPhlebotomist(input: $input) {
            success
            message
            updatedCount
            failedIds
        }
    }
`;

export const ASSIGN_LAB = gql`
    mutation AssignLab($input: AssignLabInput!) {
        assignLab(input: $input) {
            success
            message
        }
    }
`;

export const OVERRIDE_LAB_ORDER_STATUS = gql`
    mutation OverrideLabOrderStatus($input: OverrideLabOrderStatusInput!) {
        overrideLabOrderStatus(input: $input) {
            success
            message
        }
    }
`;

// Types for lab orders
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

export type HealthVertical = 'HAIR_LOSS' | 'SEXUAL_HEALTH' | 'PCOS' | 'WEIGHT_MANAGEMENT';

export interface AdminLabOrderPatient {
    id: string;
    name: string | null;
    phone: string | null;
}

export interface AdminLabOrderPhlebotomist {
    id: string;
    name: string;
    phone: string;
}

export interface AdminLabOrderLab {
    id: string;
    name: string;
    phone: string | null;
}

export interface AdminLabOrderSLA {
    status: SLAStatus;
    reason: string | null;
    hoursOverdue: number | null;
}

export interface AdminLabOrderTimelineEvent {
    status: string;
    timestamp: string;
    details: string | null;
}

export interface AdminLabOrder {
    id: string;
    patient: AdminLabOrderPatient;
    vertical: HealthVertical | null;
    testPanel: string[];
    panelName: string | null;
    status: LabOrderStatus;
    phlebotomist: AdminLabOrderPhlebotomist | null;
    lab: AdminLabOrderLab | null;
    bookedDate: string | null;
    bookedTimeSlot: string | null;
    collectionAddress: string;
    collectionCity: string;
    collectionPincode: string;
    slaInfo: AdminLabOrderSLA;
    orderedAt: string;
    timeline: AdminLabOrderTimelineEvent[];
}

export interface AdminLabOrdersResponse {
    adminLabOrders: {
        labOrders: AdminLabOrder[];
        total: number;
        page: number;
        pageSize: number;
    };
}

export interface AvailablePhlebotomist {
    id: string;
    name: string;
    phone: string;
    todayAssignments: number;
    maxDailyCollections: number;
    isAvailable: boolean;
}

export interface AvailablePhlebotomistsResponse {
    availablePhlebotomists: {
        phlebotomists: AvailablePhlebotomist[];
    };
}

export interface AvailableLab {
    id: string;
    name: string;
    address: string;
    city: string;
    avgTurnaroundHours: number;
    testsOffered: string[];
}

export interface AvailableLabsResponse {
    availableLabs: {
        labs: AvailableLab[];
    };
}

// Lab Order Status Display Config
export const LAB_ORDER_STATUS_CONFIG: Record<
    LabOrderStatus,
    { label: string; color: string; bgColor: string }
> = {
    ORDERED: { label: 'Ordered', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    SLOT_BOOKED: { label: 'Slot Booked', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
    PHLEBOTOMIST_ASSIGNED: { label: 'Assigned', color: 'text-purple-600', bgColor: 'bg-purple-100' },
    SAMPLE_COLLECTED: { label: 'Collected', color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
    COLLECTION_FAILED: { label: 'Failed', color: 'text-red-600', bgColor: 'bg-red-100' },
    DELIVERED_TO_LAB: { label: 'At Lab', color: 'text-teal-600', bgColor: 'bg-teal-100' },
    SAMPLE_RECEIVED: { label: 'Received', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
    SAMPLE_ISSUE: { label: 'Issue', color: 'text-orange-600', bgColor: 'bg-orange-100' },
    PROCESSING: { label: 'Processing', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    RESULTS_READY: { label: 'Results Ready', color: 'text-green-600', bgColor: 'bg-green-100' },
    RESULTS_UPLOADED: { label: 'Uploaded', color: 'text-green-600', bgColor: 'bg-green-100' },
    DOCTOR_REVIEWED: { label: 'Reviewed', color: 'text-primary', bgColor: 'bg-primary/10' },
    CLOSED: { label: 'Closed', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    CANCELLED: { label: 'Cancelled', color: 'text-gray-400', bgColor: 'bg-gray-100' },
    EXPIRED: { label: 'Expired', color: 'text-gray-400', bgColor: 'bg-gray-100' },
};

// Vertical Display Config
export const VERTICAL_CONFIG: Record<HealthVertical, { label: string; color: string }> = {
    HAIR_LOSS: { label: 'Hair Loss', color: 'text-amber-600' },
    SEXUAL_HEALTH: { label: 'Sexual Health', color: 'text-rose-600' },
    PCOS: { label: 'PCOS', color: 'text-purple-600' },
    WEIGHT_MANAGEMENT: { label: 'Weight', color: 'text-emerald-600' },
};
