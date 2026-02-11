import { gql } from '@apollo/client';

// ============================================
// MUTATIONS
// ============================================

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
        email
        name
        role
        isVerified
        isProfileComplete
        createdAt
      }
    }
  }
`;

export const REFRESH_TOKEN = gql`
  mutation RefreshToken($input: RefreshTokenInput!) {
    refreshToken(input: $input) {
      success
      message
      accessToken
      refreshToken
      user {
        id
        phone
        role
      }
    }
  }
`;

export const LOGOUT = gql`
  mutation Logout($refreshToken: String) {
    logout(refreshToken: $refreshToken) {
      success
      message
    }
  }
`;

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
        patientProfile {
          id
          dateOfBirth
          state
        }
      }
    }
  }
`;


// ============================================
// QUERIES
// ============================================

export const ME = gql`
  query Me {
    me {
      id
      phone
      email
      name
      role
      isVerified
      createdAt
    }
  }
`;

// ============================================
// TYPES
// ============================================

export interface User {
  id: string;
  phone: string;
  email?: string | null;
  name?: string | null;
  role: string;
  isVerified: boolean;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  accessToken?: string;
  refreshToken?: string;
  user?: User;
}
