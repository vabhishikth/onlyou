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
