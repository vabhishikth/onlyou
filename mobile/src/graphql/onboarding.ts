/**
 * Onboarding GraphQL Operations
 */

import { gql } from '@apollo/client';

// Pincode lookup query (unauthenticated)
export const LOOKUP_PINCODE = gql`
    query LookupPincode($pincode: String!) {
        lookupPincode(pincode: $pincode) {
            found
            city
            state
        }
    }
`;

// Save onboarding data (Steps 1-3)
export const UPDATE_ONBOARDING = gql`
    mutation UpdateOnboarding($input: UpdateOnboardingInput!) {
        updateOnboarding(input: $input) {
            success
            message
            patientProfile {
                id
                fullName
                dateOfBirth
                gender
                city
                state
                pincode
                healthGoals
                onboardingComplete
                telehealthConsent
                telehealthConsentDate
            }
        }
    }
`;

// Save health profile for a condition (Step 4)
export const UPSERT_HEALTH_PROFILE = gql`
    mutation UpsertHealthProfile($input: UpsertHealthProfileInput!) {
        upsertHealthProfile(input: $input) {
            success
            message
            healthProfile {
                id
                condition
                responses
                createdAt
                updatedAt
            }
        }
    }
`;

// Complete onboarding
export const COMPLETE_ONBOARDING = gql`
    mutation CompleteOnboarding {
        completeOnboarding {
            success
            message
            patientProfile {
                id
                onboardingComplete
                healthGoals
            }
        }
    }
`;

// Types
export interface PincodeLookupResult {
    found: boolean;
    city?: string;
    state?: string;
}

export interface UpdateOnboardingInput {
    healthGoals: string[];
    fullName: string;
    dateOfBirth: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    pincode: string;
    state: string;
    city: string;
    telehealthConsent: boolean;
}

export interface UpsertHealthProfileInput {
    condition: string;
    responses: Record<string, unknown>;
}
