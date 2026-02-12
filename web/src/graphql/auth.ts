import { gql } from '@apollo/client';

// Request OTP for phone login
export const REQUEST_OTP = gql`
    mutation RequestOtp($phone: String!) {
        requestOtp(input: { phone: $phone }) {
            success
            message
        }
    }
`;

// Verify OTP and get tokens
export const VERIFY_OTP = gql`
    mutation VerifyOtp($phone: String!, $otp: String!) {
        verifyOtp(input: { phone: $phone, otp: $otp }) {
            success
            message
            accessToken
            refreshToken
            user {
                id
                phone
                name
                email
                role
                isVerified
                isProfileComplete
                createdAt
            }
        }
    }
`;

// Refresh access token
export const REFRESH_TOKEN = gql`
    mutation RefreshToken($refreshToken: String!) {
        refreshToken(input: { refreshToken: $refreshToken }) {
            success
            message
            accessToken
            refreshToken
            user {
                id
                phone
                name
                email
                role
                isVerified
                isProfileComplete
                createdAt
            }
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
            isVerified
            isProfileComplete
            createdAt
        }
    }
`;

// Logout
export const LOGOUT = gql`
    mutation Logout($refreshToken: String) {
        logout(refreshToken: $refreshToken) {
            success
            message
        }
    }
`;

// Types
export interface User {
    id: string;
    phone: string;
    name: string | null;
    email: string | null;
    role: 'PATIENT' | 'DOCTOR' | 'ADMIN' | 'LAB' | 'PHLEBOTOMIST' | 'PHARMACY' | 'DELIVERY';
    isVerified: boolean;
    isProfileComplete: boolean;
    createdAt: string;
}

export interface RequestOTPResponse {
    requestOtp: {
        success: boolean;
        message: string;
    };
}

export interface VerifyOTPResponse {
    verifyOtp: {
        success: boolean;
        message: string;
        accessToken?: string;
        refreshToken?: string;
        user?: User;
    };
}

export interface RefreshTokenResponse {
    refreshToken: {
        success: boolean;
        message: string;
        accessToken?: string;
        refreshToken?: string;
        user?: User;
    };
}

export interface LogoutResponse {
    logout: {
        success: boolean;
        message: string;
    };
}

export interface MeResponse {
    me: User | null;
}
