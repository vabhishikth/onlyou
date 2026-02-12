import { gql } from '@apollo/client';

// Spec: master spec Section 5 (Doctor Dashboard)

// Get doctor's case queue
export const DOCTOR_QUEUE = gql`
    query DoctorQueue($filters: QueueFiltersInput) {
        doctorQueue(filters: $filters) {
            cases {
                id
                patientName
                patientAge
                patientSex
                vertical
                createdAt
                aiAttentionLevel
                dashboardStatus
                statusBadge
                isFollowUp
            }
        }
    }
`;

// Get admin's full case queue
export const ADMIN_QUEUE = gql`
    query AdminQueue($filters: QueueFiltersInput) {
        adminQueue(filters: $filters) {
            cases {
                id
                patientName
                patientAge
                patientSex
                vertical
                createdAt
                aiAttentionLevel
                dashboardStatus
                statusBadge
                isFollowUp
            }
        }
    }
`;

// Get unassigned cases (for admin)
export const UNASSIGNED_CASES = gql`
    query UnassignedCases($filters: QueueFiltersInput) {
        unassignedCases(filters: $filters) {
            cases {
                id
                patientName
                patientAge
                patientSex
                vertical
                createdAt
                aiAttentionLevel
                dashboardStatus
                statusBadge
                isFollowUp
            }
        }
    }
`;

// Get full case detail
export const CASE_DETAIL = gql`
    query CaseDetail($consultationId: String!) {
        caseDetail(consultationId: $consultationId) {
            consultation {
                id
                status
                vertical
                createdAt
                doctorNotes
            }
            patient {
                name
                age
                sex
                city
                phone
            }
            questionnaire {
                responses
                template
            }
            aiAssessment {
                summary
                riskLevel
                flags
                rawResponse
            }
            photos {
                id
                type
                url
            }
            messages {
                id
                content
                senderId
                createdAt
            }
            prescription {
                id
                pdfUrl
                medications
                instructions
                validUntil
                issuedAt
            }
        }
    }
`;

// Get queue statistics
export const QUEUE_STATS = gql`
    query QueueStats {
        queueStats {
            new
            inReview
            awaitingResponse
            labResultsReady
            followUp
            completed
            referred
            totalActive
        }
    }
`;

// Types
export type HealthVertical = 'HAIR_LOSS' | 'SEXUAL_HEALTH' | 'PCOS' | 'WEIGHT_MANAGEMENT';

export type DashboardStatus =
    | 'NEW'
    | 'IN_REVIEW'
    | 'AWAITING_RESPONSE'
    | 'LAB_RESULTS_READY'
    | 'FOLLOW_UP'
    | 'COMPLETED'
    | 'REFERRED';

export interface CaseCard {
    id: string;
    patientName: string;
    patientAge: number | null;
    patientSex: string | null;
    vertical: HealthVertical;
    createdAt: string;
    aiAttentionLevel: string | null;
    dashboardStatus: DashboardStatus;
    statusBadge: string;
    isFollowUp: boolean;
}

export interface QueueResponse {
    cases: CaseCard[];
}

export interface DoctorQueueResponse {
    doctorQueue: QueueResponse;
}

export interface AdminQueueResponse {
    adminQueue: QueueResponse;
}

export interface UnassignedCasesResponse {
    unassignedCases: QueueResponse;
}

export interface QueueFiltersInput {
    vertical?: HealthVertical;
    dashboardStatus?: DashboardStatus;
    attentionLevel?: string;
}

export interface QueueStats {
    new: number;
    inReview: number;
    awaitingResponse: number;
    labResultsReady: number;
    followUp: number;
    completed: number;
    referred: number;
    totalActive: number;
}

export interface QueueStatsResponse {
    queueStats: QueueStats;
}

export interface CasePatient {
    name: string | null;
    age: number | null;
    sex: string | null;
    city: string | null;
    phone: string;
}

export interface CaseAIAssessment {
    summary: string;
    riskLevel: string;
    flags: string[];
    rawResponse?: Record<string, unknown>;
}

export interface CasePhoto {
    id: string;
    type: string;
    url: string;
}

export interface CaseMessage {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
}

export interface CasePrescription {
    id: string;
    pdfUrl: string | null;
    medications: Record<string, unknown>;
    instructions: string | null;
    validUntil: string;
    issuedAt: string;
}

export interface CaseConsultation {
    id: string;
    status: string;
    vertical: HealthVertical;
    createdAt: string;
    doctorNotes: string | null;
}

export interface CaseQuestionnaire {
    responses: Record<string, unknown>;
    template: Record<string, unknown>;
}

export interface CaseDetail {
    consultation: CaseConsultation;
    patient: CasePatient;
    questionnaire: CaseQuestionnaire;
    aiAssessment: CaseAIAssessment | null;
    photos: CasePhoto[];
    messages: CaseMessage[];
    prescription: CasePrescription | null;
}

export interface CaseDetailResponse {
    caseDetail: CaseDetail;
}

// Helper: Dashboard status config
export const DASHBOARD_STATUS_CONFIG: Record<
    DashboardStatus,
    { label: string; color: string; bgColor: string }
> = {
    NEW: { label: 'New', color: 'text-success', bgColor: 'bg-success/10' },
    IN_REVIEW: { label: 'In Review', color: 'text-warning', bgColor: 'bg-warning/10' },
    AWAITING_RESPONSE: { label: 'Awaiting Response', color: 'text-accent', bgColor: 'bg-accent/10' },
    LAB_RESULTS_READY: { label: 'Lab Results', color: 'text-purple-600', bgColor: 'bg-purple-100' },
    FOLLOW_UP: { label: 'Follow-Up', color: 'text-info', bgColor: 'bg-info/10' },
    COMPLETED: { label: 'Completed', color: 'text-muted-foreground', bgColor: 'bg-muted' },
    REFERRED: { label: 'Referred', color: 'text-error', bgColor: 'bg-error/10' },
};

// Helper: Vertical config
export const VERTICAL_CONFIG: Record<
    HealthVertical,
    { label: string; color: string; bgColor: string; icon: string }
> = {
    HAIR_LOSS: {
        label: 'Hair Loss',
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        icon: '💇',
    },
    SEXUAL_HEALTH: {
        label: 'Sexual Health',
        color: 'text-rose-600',
        bgColor: 'bg-rose-100',
        icon: '❤️',
    },
    PCOS: {
        label: 'PCOS',
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
        icon: '🩺',
    },
    WEIGHT_MANAGEMENT: {
        label: 'Weight',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-100',
        icon: '⚖️',
    },
};

// Helper: Attention level config
export const ATTENTION_LEVEL_CONFIG: Record<
    string,
    { label: string; color: string; bgColor: string }
> = {
    LOW: { label: 'Low', color: 'text-success', bgColor: 'bg-success/10' },
    MEDIUM: { label: 'Medium', color: 'text-warning', bgColor: 'bg-warning/10' },
    HIGH: { label: 'High', color: 'text-error', bgColor: 'bg-error/10' },
};
