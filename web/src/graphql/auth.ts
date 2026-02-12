import { gql } from '@apollo/client';

// Request OTP for phone login
export const REQUEST_OTP = gql`
    mutation RequestOTP($phone: String!) {
        requestOTP(phone: $phone) {
            success
            message
            expiresAt
        }
    }
`;

// Verify OTP and get tokens
export const VERIFY_OTP = gql`
    mutation VerifyOTP($phone: String!, $otp: String!) {
        verifyOTP(phone: $phone, otp: $otp) {
            accessToken
            refreshToken
            user {
                id
                phone
                name
                email
                role
                avatar
            }
        }
    }
`;

// Refresh access token
export const REFRESH_TOKEN = gql`
    mutation RefreshToken($refreshToken: String!) {
        refreshToken(refreshToken: $refreshToken) {
            accessToken
            refreshToken
        }
    }
`;

// Get current user
export const ME = gql`
    query Me {
        me {
            id
            phone
            name
            email
            role
            avatar
            createdAt
            doctorProfile {
                id
                specialization
                registrationNumber
                isVerified
            }
        }
    }
`;

// Logout
export const LOGOUT = gql`
    mutation Logout {
        logout
    }
`;

// Types
export interface User {
    id: string;
    phone: string;
    name: string | null;
    email: string | null;
    role: 'PATIENT' | 'DOCTOR' | 'ADMIN' | 'LAB' | 'PHLEBOTOMIST' | 'PHARMACY' | 'DELIVERY';
    avatar: string | null;
    createdAt: string;
    doctorProfile?: {
        id: string;
        specialization: string[];
        registrationNumber: string;
        isVerified: boolean;
    };
}

export interface RequestOTPResponse {
    requestOTP: {
        success: boolean;
        message: string;
        expiresAt: string;
    };
}

export interface VerifyOTPResponse {
    verifyOTP: {
        accessToken: string;
        refreshToken: string;
        user: User;
    };
}

export interface MeResponse {
    me: User;
}
