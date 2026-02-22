import { gql } from '@apollo/client';

// Spec: master spec Section 7.2 — Collection Portal (collect.onlyou.life)
// THE SIMPLEST PORTAL. Used on the road, one hand, between collections.

// =============================================
// QUERIES
// =============================================

export const PHLEBOTOMIST_INFO = gql`
    query PhlebotomistInfo {
        phlebotomistInfo {
            id
            name
            phone
            currentCity
            isActive
        }
    }
`;

export const COLLECT_TODAY_SUMMARY = gql`
    query CollectTodaySummary {
        collectTodaySummary {
            total
            completed
            pending
            failed
        }
    }
`;

export const TODAY_ASSIGNMENTS = gql`
    query TodayAssignments {
        todayAssignments {
            id
            patientFirstName
            patientPhone
            patientArea
            fullAddress
            timeWindow
            panelName
            testsOrdered
            status
            tubeCount
            collectedAt
            notes
            requiresFasting
        }
    }
`;

export const NEARBY_LABS = gql`
    query NearbyLabs {
        nearbyLabs {
            id
            name
            address
            city
            phone
        }
    }
`;

// =============================================
// MUTATIONS
// =============================================

export const COLLECT_MARK_COLLECTED = gql`
    mutation CollectMarkCollected($input: MarkCollectedInput!) {
        collectMarkCollected(input: $input) {
            id
            status
            tubeCount
            collectedAt
        }
    }
`;

export const COLLECT_MARK_UNAVAILABLE = gql`
    mutation CollectMarkUnavailable($input: MarkUnavailableInput!) {
        collectMarkUnavailable(input: $input) {
            success
            message
        }
    }
`;

export const COLLECT_REPORT_LATE = gql`
    mutation CollectReportLate($input: ReportLateInput!) {
        collectReportLate(input: $input) {
            success
            message
        }
    }
`;

export const COLLECT_DELIVER_TO_LAB = gql`
    mutation CollectDeliverToLab($input: DeliverToLabInput!) {
        collectDeliverToLab(input: $input) {
            id
            status
        }
    }
`;

// Spec: Phase 16 — Enhanced collection operations

export const COLLECT_MARK_EN_ROUTE = gql`
    mutation CollectMarkEnRoute($labOrderId: String!) {
        markEnRoute(labOrderId: $labOrderId) {
            id
            status
        }
    }
`;

export const COLLECT_VERIFY_FASTING = gql`
    mutation CollectVerifyFasting($labOrderId: String!, $fastingConfirmed: Boolean!) {
        verifyFastingStatus(labOrderId: $labOrderId, fastingConfirmed: $fastingConfirmed) {
            id
            fastingVerified
        }
    }
`;

export const COLLECT_MARK_IN_TRANSIT = gql`
    mutation CollectMarkInTransit($labOrderId: String!) {
        markSampleInTransit(labOrderId: $labOrderId) {
            id
            status
        }
    }
`;

export const COLLECT_MY_DAILY_ROSTER = gql`
    query CollectMyDailyRoster($date: String!) {
        myDailyRoster(date: $date) {
            id
            patientFirstName
            patientPhone
            patientArea
            fullAddress
            timeWindow
            panelName
            testsOrdered
            status
            requiresFasting
        }
    }
`;

export interface DailyRosterItem {
    id: string;
    patientFirstName: string;
    patientPhone: string;
    patientArea: string;
    fullAddress: string;
    timeWindow: string;
    panelName: string;
    testsOrdered: string[];
    status: string;
    requiresFasting: boolean;
}

// =============================================
// TYPES
// =============================================

export interface PhlebotomistInfo {
    id: string;
    name: string;
    phone: string;
    currentCity: string;
    isActive: boolean;
}

export interface CollectTodaySummary {
    total: number;
    completed: number;
    pending: number;
    failed: number;
}

export interface TodayAssignment {
    id: string;
    patientFirstName: string;
    patientPhone: string;
    patientArea: string;
    fullAddress: string;
    timeWindow: string;
    panelName: string;
    testsOrdered: string[];
    status: string;
    tubeCount: number | null;
    collectedAt: string | null;
    notes: string | null;
    requiresFasting?: boolean;
}

export interface NearbyLab {
    id: string;
    name: string;
    address: string;
    city: string;
    phone: string;
}

export interface PhlebotomistInfoResponse {
    phlebotomistInfo: PhlebotomistInfo;
}

export interface CollectTodaySummaryResponse {
    collectTodaySummary: CollectTodaySummary;
}

export interface TodayAssignmentsResponse {
    todayAssignments: TodayAssignment[];
}

export interface NearbyLabsResponse {
    nearbyLabs: NearbyLab[];
}

// Status display config
export const COLLECT_STATUS_CONFIG: Record<
    string,
    { label: string; color: string; bgColor: string; icon: string }
> = {
    PHLEBOTOMIST_ASSIGNED: { label: 'Upcoming', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: '🔵' },
    PENDING: { label: 'Upcoming', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: '🔵' },
    SAMPLE_COLLECTED: { label: 'Collected', color: 'text-green-600', bgColor: 'bg-green-100', icon: '✅' },
    COLLECTED: { label: 'Collected', color: 'text-green-600', bgColor: 'bg-green-100', icon: '✅' },
    DELIVERED_TO_LAB: { label: 'Delivered', color: 'text-purple-600', bgColor: 'bg-purple-100', icon: '🏥' },
    COLLECTION_FAILED: { label: 'Failed', color: 'text-red-600', bgColor: 'bg-red-100', icon: '❌' },
};

// Unavailable reasons
export const UNAVAILABLE_REASONS = [
    { value: 'NOT_HOME', label: 'Patient not home' },
    { value: 'REFUSED', label: 'Patient refused collection' },
    { value: 'WRONG_ADDRESS', label: 'Wrong address' },
    { value: 'FASTING_BROKEN', label: 'Patient broke fasting' },
    { value: 'UNWELL', label: 'Patient unwell' },
    { value: 'OTHER', label: 'Other reason' },
];
