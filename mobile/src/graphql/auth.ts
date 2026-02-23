import { gql } from '@apollo/client';

// Types
export interface RequestOtpInput {
    phone: string;
}

export interface VerifyOtpInput {
    phone: string;
    otp: string;
}

export interface RequestOtpResponse {
    requestOtp: {
        success: boolean;
        message: string;
    };
}

export interface VerifyOtpResponse {
    verifyOtp: {
        success: boolean;
        message: string;
        accessToken?: string;
        refreshToken?: string;
        user?: {
            id: string;
            phone: string;
            name?: string;
            email?: string;
            isProfileComplete: boolean;
        };
    };
}

export interface RefreshTokenResponse {
    refreshToken: {
        success: boolean;
        accessToken?: string;
        refreshToken?: string;
    };
}

// Mutations
export const REQUEST_OTP = gql`
    mutation RequestOtp($input: RequestOtpInput!) {
        requestOtp(input: $input) {
            success
            message
        }
    }
`;

export const VERIFY_OTP = gql`
    mutation VerifyOtp($input: VerifyOtpInput!) {
        verifyOtp(input: $input) {
            success
            message
            accessToken
            refreshToken
            user {
                id
                phone
                name
                email
                isProfileComplete
            }
        }
    }
`;

export const REFRESH_TOKEN = gql`
    mutation RefreshToken($input: RefreshTokenInput!) {
        refreshToken(input: $input) {
            success
            accessToken
            refreshToken
        }
    }
`;
