import { gql } from '@apollo/client';

// Spec: master spec Section 7.1 — Lab Portal (lab.onlyou.life)
// GraphQL queries and mutations for diagnostic centre staff

// =============================================
// QUERIES
// =============================================

export const LAB_INFO = gql`
    query LabInfo {
        labInfo {
            id
            name
            city
            isActive
        }
    }
`;

export const LAB_TODAY_SUMMARY = gql`
    query LabTodaySummary {
        labTodaySummary {
            incoming
            inProgress
            completed
        }
    }
`;

export const LAB_INCOMING_SAMPLES = gql`
    query LabIncomingSamples {
        labIncomingSamples {
            id
            sampleId
            panelName
            testsOrdered
            deliveredBy
            deliveredAt
            status
            tubeCount
            patientInitials
            createdAt
        }
    }
`;

export const LAB_IN_PROGRESS_SAMPLES = gql`
    query LabInProgressSamples {
        labInProgressSamples {
            id
            sampleId
            panelName
            testsOrdered
            deliveredBy
            deliveredAt
            status
            tubeCount
            patientInitials
            createdAt
        }
    }
`;

export const LAB_COMPLETED_SAMPLES = gql`
    query LabCompletedSamples {
        labCompletedSamples {
            id
            sampleId
            panelName
            testsOrdered
            deliveredBy
            deliveredAt
            status
            tubeCount
            patientInitials
            createdAt
        }
    }
`;

// =============================================
// MUTATIONS
// =============================================

export const LAB_MARK_SAMPLE_RECEIVED = gql`
    mutation LabMarkSampleReceived($input: MarkSampleReceivedInput!) {
        labMarkSampleReceived(input: $input) {
            id
            sampleId
            status
            tubeCount
        }
    }
`;

export const LAB_REPORT_SAMPLE_ISSUE = gql`
    mutation LabReportSampleIssue($input: ReportSampleIssueInput!) {
        labReportSampleIssue(input: $input) {
            success
            message
        }
    }
`;

export const LAB_START_PROCESSING = gql`
    mutation LabStartProcessing($labOrderId: String!) {
        labStartProcessing(labOrderId: $labOrderId) {
            id
            sampleId
            status
        }
    }
`;

export const LAB_UPLOAD_RESULTS = gql`
    mutation LabUploadResults($input: UploadResultsInput!) {
        labUploadResults(input: $input) {
            id
            sampleId
            status
        }
    }
`;

// Spec: Phase 16 — Enhanced lab processing operations

export const LAB_MARK_RESULTS_READY = gql`
    mutation LabMarkResultsReady($labOrderId: String!) {
        markLabResultsReady(labOrderId: $labOrderId) {
            id
            status
        }
    }
`;

export const LAB_UPLOAD_STRUCTURED_RESULT = gql`
    mutation LabUploadStructuredResult($input: StructuredResultInput!) {
        uploadLabResult(input: $input) {
            id
            status
        }
    }
`;

// =============================================
// TYPES
// =============================================

export interface StructuredTestResult {
    testCode: string;
    value: string;
    unit: string;
    normalRange: string;
    flag: 'NORMAL' | 'LOW' | 'HIGH' | 'CRITICAL';
}

export interface LabInfo {
    id: string;
    name: string;
    city: string;
    isActive: boolean;
}

export interface LabTodaySummary {
    incoming: number;
    inProgress: number;
    completed: number;
}

export interface LabSampleSummary {
    id: string;
    sampleId: string;
    panelName: string;
    testsOrdered: string[];
    deliveredBy: string | null;
    deliveredAt: string | null;
    status: string;
    tubeCount: number | null;
    patientInitials: string;
    createdAt: string;
}

export interface LabInfoResponse {
    labInfo: LabInfo;
}

export interface LabTodaySummaryResponse {
    labTodaySummary: LabTodaySummary;
}

export interface LabIncomingSamplesResponse {
    labIncomingSamples: LabSampleSummary[];
}

export interface LabInProgressSamplesResponse {
    labInProgressSamples: LabSampleSummary[];
}

export interface LabCompletedSamplesResponse {
    labCompletedSamples: LabSampleSummary[];
}

// Status display config
export const LAB_SAMPLE_STATUS_CONFIG: Record<
    string,
    { label: string; color: string; bgColor: string }
> = {
    DELIVERED_TO_LAB: { label: 'Awaiting Receipt', color: 'text-amber-600', bgColor: 'bg-amber-100' },
    SAMPLE_RECEIVED: { label: 'Rcvd', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    PROCESSING: { label: 'In Process', color: 'text-purple-600', bgColor: 'bg-purple-100' },
    RESULTS_READY: { label: 'Complete', color: 'text-green-600', bgColor: 'bg-green-100' },
    SAMPLE_ISSUE: { label: 'Issue', color: 'text-red-600', bgColor: 'bg-red-100' },
};

// Issue reasons for dropdown
export const SAMPLE_ISSUE_REASONS = [
    { value: 'DAMAGED_TUBE', label: 'Damaged tube' },
    { value: 'WRONG_LABEL', label: 'Wrong/missing label' },
    { value: 'INSUFFICIENT_SAMPLE', label: 'Insufficient sample' },
    { value: 'HEMOLYZED', label: 'Hemolyzed sample' },
    { value: 'CLOTTED', label: 'Clotted sample' },
    { value: 'OTHER', label: 'Other issue' },
];

// Abnormal flag options
export const ABNORMAL_FLAG_OPTIONS = [
    { value: 'NORMAL', label: 'Normal', color: 'text-green-600' },
    { value: 'ABNORMAL', label: 'Abnormal', color: 'text-amber-600' },
    { value: 'CRITICAL', label: 'Critical', color: 'text-red-600' },
];
