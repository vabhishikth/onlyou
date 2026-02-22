/**
 * Spec: Phase 16 — Lab Automation biomarker queries
 * Patient-facing biomarker history, trends, latest results, critical values
 */

import { gql } from '@apollo/client';

// Spec: Phase 16 — Patient biomarker history by test code
export const MY_BIOMARKER_HISTORY = gql`
    query MyBiomarkerHistory($testCode: String!) {
        myBiomarkerHistory(testCode: $testCode) {
            id
            testCode
            value
            unit
            normalRange
            flag
            recordedAt
        }
    }
`;

// Spec: Phase 16 — Trend data for a single biomarker
export const MY_BIOMARKER_TREND = gql`
    query MyBiomarkerTrend($testCode: String!) {
        myBiomarkerTrend(testCode: $testCode) {
            testCode
            dataPoints {
                value
                recordedAt
            }
            normalMin
            normalMax
            unit
        }
    }
`;

// Spec: Phase 16 — Latest results across all biomarkers
export const MY_LATEST_LAB_RESULTS = gql`
    query MyLatestLabResults {
        myLatestLabResults {
            id
            testCode
            testName
            value
            unit
            normalRange
            flag
            recordedAt
        }
    }
`;

// Spec: Phase 16 — Critical values requiring attention
export const MY_CRITICAL_VALUES = gql`
    query MyCriticalValues {
        myCriticalValues {
            id
            testCode
            testName
            value
            unit
            normalRange
            flag
            recordedAt
            acknowledged
        }
    }
`;

export interface BiomarkerResult {
    id: string;
    testCode: string;
    testName?: string;
    value: number;
    unit: string;
    normalRange: string;
    flag: 'NORMAL' | 'LOW' | 'HIGH' | 'CRITICAL';
    recordedAt: string;
    acknowledged?: boolean;
}

export interface BiomarkerTrend {
    testCode: string;
    dataPoints: { value: number; recordedAt: string }[];
    normalMin: number;
    normalMax: number;
    unit: string;
}
