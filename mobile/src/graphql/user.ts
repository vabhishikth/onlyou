import { gql } from '@apollo/client';

// ==================
// User Queries
// ==================

export const GET_ME = gql`
    query GetMe {
        me {
            id
            phone
            email
            name
            role
            isVerified
            createdAt
            isProfileComplete
            patientProfile {
                id
                dateOfBirth
                gender
                height
                weight
                addressLine1
                addressLine2
                city
                state
                pincode
            }
        }
    }
`;

// ==================
// User Mutations
// ==================

export const UPDATE_PROFILE = gql`
    mutation UpdateProfile($input: UpdateProfileInput!) {
        updateProfile(input: $input) {
            success
            message
            user {
                id
                phone
                email
                name
                role
                isVerified
                isProfileComplete
                patientProfile {
                    id
                    dateOfBirth
                    gender
                    height
                    weight
                    addressLine1
                    addressLine2
                    city
                    state
                    pincode
                }
            }
        }
    }
`;

// ==================
// Types
// ==================

export interface PatientProfile {
    id: string;
    dateOfBirth: string | null;
    gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
    height: number | null;
    weight: number | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
}

export interface UserProfile {
    id: string;
    phone: string;
    email: string | null;
    name: string | null;
    role: string;
    isVerified: boolean;
    createdAt: string;
    isProfileComplete: boolean;
    patientProfile: PatientProfile | null;
}

export interface GetMeResponse {
    me: UserProfile | null;
}

export interface UpdateProfileInput {
    name?: string;
    email?: string;
    dateOfBirth?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    height?: number;
    weight?: number;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pincode?: string;
}

export interface UpdateProfileResponse {
    updateProfile: {
        success: boolean;
        message: string;
        user?: UserProfile;
    };
}
