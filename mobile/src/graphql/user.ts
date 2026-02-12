import { gql } from '@apollo/client';

// Types
export interface User {
    id: string;
    phone: string;
    name?: string;
    email?: string;
    isProfileComplete: boolean;
    patientProfile?: PatientProfile;
}

export interface PatientProfile {
    id: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    dateOfBirth?: string;
    addressLine1?: string;
    city?: string;
    state?: string;
    pincode?: string;
}

export interface GetMeResponse {
    me: User;
}

export interface UpdateProfileInput {
    name?: string;
    email?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    dateOfBirth?: string;
    addressLine1?: string;
    city?: string;
    state?: string;
    pincode?: string;
}

export interface UpdateProfileResponse {
    updateProfile: {
        success: boolean;
        message: string;
        user?: User;
    };
}

// Queries
export const GET_ME = gql`
    query GetMe {
        me {
            id
            phone
            name
            email
            isProfileComplete
            patientProfile {
                id
                gender
                dateOfBirth
                addressLine1
                city
                state
                pincode
            }
        }
    }
`;

// Mutations
export const UPDATE_PROFILE = gql`
    mutation UpdateProfile($input: UpdateProfileInput!) {
        updateProfile(input: $input) {
            success
            message
            user {
                id
                phone
                name
                email
                isProfileComplete
                patientProfile {
                    id
                    gender
                    dateOfBirth
                    addressLine1
                    city
                    state
                    pincode
                }
            }
        }
    }
`;
