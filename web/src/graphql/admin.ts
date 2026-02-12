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

// =============================================
// DELIVERY MANAGEMENT
// Spec: master spec Section 8 — Medication Fulfillment & Local Delivery
// =============================================

export const ADMIN_DELIVERIES = gql`
    query AdminDeliveries($filter: AdminDeliveriesFilterInput) {
        adminDeliveries(filter: $filter) {
            deliveries {
                id
                patient {
                    id
                    name
                    phone
                }
                medications {
                    name
                    dosage
                    frequency
                }
                status
                pharmacy {
                    id
                    name
                    address
                    phone
                }
                deliveryPersonName
                deliveryPersonPhone
                deliveryMethod
                estimatedDeliveryTime
                deliveryOtp
                deliveryAddress
                deliveryCity
                deliveryPincode
                totalAmountPaise
                isReorder
                orderedAt
                sentToPharmacyAt
                pharmacyReadyAt
                outForDeliveryAt
                deliveredAt
                pharmacyIssueReason
                deliveryFailedReason
            }
            total
            page
            pageSize
        }
    }
`;

export const AVAILABLE_PHARMACIES = gql`
    query AvailablePharmacies($pincode: String!) {
        availablePharmacies(pincode: $pincode) {
            pharmacies {
                id
                name
                address
                city
                phone
                serviceableAreas
                avgPreparationMinutes
            }
        }
    }
`;

export const SEND_TO_PHARMACY = gql`
    mutation SendToPharmacy($input: SendToPharmacyInput!) {
        sendToPharmacy(input: $input) {
            success
            message
        }
    }
`;

export const ARRANGE_DELIVERY = gql`
    mutation ArrangeDelivery($input: ArrangeDeliveryInput!) {
        arrangeDelivery(input: $input) {
            success
            message
            otp
        }
    }
`;

export const MARK_OUT_FOR_DELIVERY = gql`
    mutation MarkOutForDelivery($orderId: String!) {
        markOutForDelivery(orderId: $orderId) {
            success
            message
        }
    }
`;

export const REGENERATE_DELIVERY_OTP = gql`
    mutation RegenerateDeliveryOtp($orderId: String!) {
        regenerateDeliveryOtp(orderId: $orderId) {
            success
            message
            otp
        }
    }
`;

// Delivery Types
export type OrderStatus =
    | 'PRESCRIPTION_CREATED'
    | 'SENT_TO_PHARMACY'
    | 'PHARMACY_PREPARING'
    | 'PHARMACY_READY'
    | 'PHARMACY_ISSUE'
    | 'PICKUP_ARRANGED'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'DELIVERY_FAILED'
    | 'RESCHEDULED'
    | 'RETURNED'
    | 'CANCELLED';

export interface AdminDeliveryPatient {
    id: string;
    name: string | null;
    phone: string | null;
}

export interface AdminDeliveryMedication {
    name: string;
    dosage: string;
    frequency: string;
}

export interface AdminDeliveryPharmacy {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
}

export interface AdminDelivery {
    id: string;
    patient: AdminDeliveryPatient;
    medications: AdminDeliveryMedication[];
    status: OrderStatus;
    pharmacy: AdminDeliveryPharmacy | null;
    deliveryPersonName: string | null;
    deliveryPersonPhone: string | null;
    deliveryMethod: string | null;
    estimatedDeliveryTime: string | null;
    deliveryOtp: string | null;
    deliveryAddress: string;
    deliveryCity: string;
    deliveryPincode: string;
    totalAmountPaise: number;
    isReorder: boolean;
    orderedAt: string;
    sentToPharmacyAt: string | null;
    pharmacyReadyAt: string | null;
    outForDeliveryAt: string | null;
    deliveredAt: string | null;
    pharmacyIssueReason: string | null;
    deliveryFailedReason: string | null;
}

export interface AdminDeliveriesResponse {
    adminDeliveries: {
        deliveries: AdminDelivery[];
        total: number;
        page: number;
        pageSize: number;
    };
}

export interface AvailablePharmacy {
    id: string;
    name: string;
    address: string;
    city: string;
    phone: string;
    serviceableAreas: string[];
    avgPreparationMinutes: number;
}

export interface AvailablePharmaciesResponse {
    availablePharmacies: {
        pharmacies: AvailablePharmacy[];
    };
}

// Order Status Display Config
export const ORDER_STATUS_CONFIG: Record<
    OrderStatus,
    { label: string; color: string; bgColor: string }
> = {
    PRESCRIPTION_CREATED: { label: 'Created', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    SENT_TO_PHARMACY: { label: 'At Pharmacy', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
    PHARMACY_PREPARING: { label: 'Preparing', color: 'text-purple-600', bgColor: 'bg-purple-100' },
    PHARMACY_READY: { label: 'Ready', color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
    PHARMACY_ISSUE: { label: 'Issue', color: 'text-orange-600', bgColor: 'bg-orange-100' },
    PICKUP_ARRANGED: { label: 'Pickup Arranged', color: 'text-teal-600', bgColor: 'bg-teal-100' },
    OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    DELIVERED: { label: 'Delivered', color: 'text-green-600', bgColor: 'bg-green-100' },
    DELIVERY_FAILED: { label: 'Failed', color: 'text-red-600', bgColor: 'bg-red-100' },
    RESCHEDULED: { label: 'Rescheduled', color: 'text-amber-600', bgColor: 'bg-amber-100' },
    RETURNED: { label: 'Returned', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    CANCELLED: { label: 'Cancelled', color: 'text-gray-400', bgColor: 'bg-gray-100' },
};

// =============================================
// PARTNER MANAGEMENT
// Spec: master spec Section 7.5 — Partner Models
// =============================================

// --- Diagnostic Centres ---

export const DIAGNOSTIC_CENTRES = gql`
    query DiagnosticCentres($page: Int, $pageSize: Int, $city: String, $search: String) {
        diagnosticCentres(page: $page, pageSize: $pageSize, city: $city, search: $search) {
            centres {
                id
                name
                address
                city
                state
                pincode
                phone
                email
                contactPerson
                testsOffered
                avgTurnaroundHours
                rating
                isActive
                createdAt
            }
            total
        }
    }
`;

export const CREATE_DIAGNOSTIC_CENTRE = gql`
    mutation CreateDiagnosticCentre($input: CreateDiagnosticCentreInput!) {
        createDiagnosticCentre(input: $input) {
            id
            name
            city
            isActive
        }
    }
`;

export const UPDATE_DIAGNOSTIC_CENTRE = gql`
    mutation UpdateDiagnosticCentre($input: UpdateDiagnosticCentreInput!) {
        updateDiagnosticCentre(input: $input) {
            id
            name
            city
            isActive
        }
    }
`;

export const TOGGLE_DIAGNOSTIC_CENTRE_ACTIVE = gql`
    mutation ToggleDiagnosticCentreActive($id: String!, $isActive: Boolean!) {
        toggleDiagnosticCentreActive(id: $id, isActive: $isActive) {
            success
            message
        }
    }
`;

// --- Phlebotomists ---

export const PHLEBOTOMISTS = gql`
    query Phlebotomists($page: Int, $pageSize: Int, $city: String, $search: String) {
        phlebotomists(page: $page, pageSize: $pageSize, city: $city, search: $search) {
            phlebotomists {
                id
                name
                phone
                email
                certification
                availableDays
                availableTimeStart
                availableTimeEnd
                maxDailyCollections
                currentCity
                serviceableAreas
                completedCollections
                failedCollections
                rating
                isActive
                createdAt
                todayAssignments
            }
            total
        }
    }
`;

export const CREATE_PHLEBOTOMIST = gql`
    mutation CreatePhlebotomist($input: CreatePhlebotomistInput!) {
        createPhlebotomist(input: $input) {
            id
            name
            phone
            currentCity
            isActive
            todayAssignments
        }
    }
`;

export const UPDATE_PHLEBOTOMIST = gql`
    mutation UpdatePhlebotomist($input: UpdatePhlebotomistInput!) {
        updatePhlebotomist(input: $input) {
            id
            name
            phone
            isActive
            todayAssignments
        }
    }
`;

export const TOGGLE_PHLEBOTOMIST_ACTIVE = gql`
    mutation TogglePhlebotomistActive($id: String!, $isActive: Boolean!) {
        togglePhlebotomistActive(id: $id, isActive: $isActive) {
            success
            message
        }
    }
`;

// --- Pharmacies ---

export const PHARMACIES = gql`
    query Pharmacies($page: Int, $pageSize: Int, $city: String, $search: String) {
        pharmacies(page: $page, pageSize: $pageSize, city: $city, search: $search) {
            pharmacies {
                id
                name
                address
                city
                state
                pincode
                phone
                email
                contactPerson
                drugLicenseNumber
                gstNumber
                serviceableAreas
                avgPreparationMinutes
                rating
                isActive
                createdAt
            }
            total
        }
    }
`;

export const CREATE_PHARMACY = gql`
    mutation CreatePharmacy($input: CreatePharmacyInput!) {
        createPharmacy(input: $input) {
            id
            name
            city
            isActive
        }
    }
`;

export const UPDATE_PHARMACY = gql`
    mutation UpdatePharmacy($input: UpdatePharmacyInput!) {
        updatePharmacy(input: $input) {
            id
            name
            city
            isActive
        }
    }
`;

export const TOGGLE_PHARMACY_ACTIVE = gql`
    mutation TogglePharmacyActive($id: String!, $isActive: Boolean!) {
        togglePharmacyActive(id: $id, isActive: $isActive) {
            success
            message
        }
    }
`;

// Partner Types

export interface DiagnosticCentre {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
    email: string | null;
    contactPerson: string | null;
    testsOffered: string[];
    avgTurnaroundHours: number;
    rating: number | null;
    isActive: boolean;
    createdAt: string;
}

export interface DiagnosticCentresResponse {
    diagnosticCentres: {
        centres: DiagnosticCentre[];
        total: number;
    };
}

export interface PhlebotomistDetails {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    certification: string | null;
    availableDays: string[];
    availableTimeStart: string | null;
    availableTimeEnd: string | null;
    maxDailyCollections: number;
    currentCity: string;
    serviceableAreas: string[];
    completedCollections: number;
    failedCollections: number;
    rating: number | null;
    isActive: boolean;
    createdAt: string;
    todayAssignments: number;
}

export interface PhlebotomistsResponse {
    phlebotomists: {
        phlebotomists: PhlebotomistDetails[];
        total: number;
    };
}

export interface PharmacyDetails {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
    email: string | null;
    contactPerson: string | null;
    drugLicenseNumber: string;
    gstNumber: string | null;
    serviceableAreas: string[];
    avgPreparationMinutes: number;
    rating: number | null;
    isActive: boolean;
    createdAt: string;
}

export interface PharmaciesResponse {
    pharmacies: {
        pharmacies: PharmacyDetails[];
        total: number;
    };
}

export interface PartnerMutationResponse {
    success: boolean;
    message: string;
}

// =============================================
// PATIENT MANAGEMENT
// Spec: master spec Section 3.2 — Patient Profiles
// =============================================

export const ADMIN_PATIENTS = gql`
    query AdminPatients($filter: AdminPatientsFilterInput) {
        adminPatients(filter: $filter) {
            patients {
                id
                phone
                name
                email
                dateOfBirth
                gender
                city
                state
                createdAt
                activeConsultations
                pendingLabOrders
                pendingDeliveries
                lastActivityAt
            }
            total
            page
            pageSize
        }
    }
`;

export const ADMIN_PATIENT_DETAIL = gql`
    query AdminPatientDetail($patientId: String!) {
        adminPatientDetail(patientId: $patientId) {
            id
            phone
            name
            email
            dateOfBirth
            gender
            address
            city
            state
            pincode
            createdAt
            consultations {
                id
                vertical
                status
                createdAt
                doctorName
            }
            labOrders {
                id
                status
                bookedDate
                panelName
                createdAt
            }
            orders {
                id
                status
                totalAmountPaise
                createdAt
            }
            notes {
                id
                content
                createdBy
                createdAt
            }
        }
    }
`;

// Patient Types

export interface AdminPatientSummary {
    id: string;
    phone: string;
    name: string | null;
    email: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    city: string | null;
    state: string | null;
    createdAt: string;
    activeConsultations: number;
    pendingLabOrders: number;
    pendingDeliveries: number;
    lastActivityAt: string | null;
}

export interface AdminPatientsResponse {
    adminPatients: {
        patients: AdminPatientSummary[];
        total: number;
        page: number;
        pageSize: number;
    };
}

export interface PatientConsultationSummary {
    id: string;
    vertical: string;
    status: string;
    createdAt: string;
    doctorName: string | null;
}

export interface PatientLabOrderSummary {
    id: string;
    status: string;
    bookedDate: string | null;
    panelName: string | null;
    createdAt: string;
}

export interface PatientOrderSummary {
    id: string;
    status: string;
    totalAmountPaise: number;
    createdAt: string;
}

export interface PatientNote {
    id: string;
    content: string;
    createdBy: string;
    createdAt: string;
}

export interface AdminPatientDetail {
    id: string;
    phone: string;
    name: string | null;
    email: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    createdAt: string;
    consultations: PatientConsultationSummary[];
    labOrders: PatientLabOrderSummary[];
    orders: PatientOrderSummary[];
    notes: PatientNote[];
}

export interface AdminPatientDetailResponse {
    adminPatientDetail: AdminPatientDetail | null;
}

// Consultation status display config
export const CONSULTATION_STATUS_CONFIG: Record<
    string,
    { label: string; color: string; bgColor: string }
> = {
    PENDING: { label: 'Pending', color: 'text-amber-600', bgColor: 'bg-amber-100' },
    ASSIGNED: { label: 'Assigned', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    IN_REVIEW: { label: 'In Review', color: 'text-purple-600', bgColor: 'bg-purple-100' },
    COMPLETED: { label: 'Completed', color: 'text-green-600', bgColor: 'bg-green-100' },
    CANCELLED: { label: 'Cancelled', color: 'text-gray-400', bgColor: 'bg-gray-100' },
};
