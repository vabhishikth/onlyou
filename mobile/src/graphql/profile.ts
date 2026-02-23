import { gql } from '@apollo/client';

// User profile types
export interface PatientProfile {
    id: string;
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

export interface UserProfile {
    id: string;
    phone: string;
    name?: string;
    email?: string;
    isProfileComplete: boolean;
    patientProfile?: PatientProfile;
    createdAt: string;
}

// Subscription types
export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED';

export interface SubscriptionPlan {
    id: string;
    vertical: string;
    name: string;
    priceInPaise: number;
    durationMonths: number;
}

export interface Subscription {
    id: string;
    planId: string;
    status: SubscriptionStatus;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelledAt?: string;
    plan?: SubscriptionPlan;
}

// Wallet types
export type TransactionType = 'CREDIT' | 'DEBIT' | 'REFERRAL' | 'REFUND';

export interface WalletTransaction {
    id: string;
    type: TransactionType;
    amount: number; // in paise
    description: string;
    createdAt: string;
}

export interface Wallet {
    balance: number; // in paise
    referralCode: string;
    totalReferrals: number;
    transactions: WalletTransaction[];
}

// Prescription types
export interface PatientPrescription {
    id: string;
    consultationId: string;
    vertical: string;
    doctorName?: string;
    pdfUrl?: string;
    medications: unknown;
    instructions?: string;
    validUntil: string;
    issuedAt: string;
    createdAt: string;
}

export interface GetMyPrescriptionsResponse {
    myPrescriptions: PatientPrescription[];
}

// Lab order types
export interface PatientLabOrder {
    id: string;
    status: string;
    testPanel: string[];
    panelName?: string;
    resultFileUrl?: string;
    criticalValues?: unknown;
    orderedAt: string;
    sampleCollectedAt?: string;
    resultsUploadedAt?: string;
    doctorReviewedAt?: string;
}

export interface GetMyLabOrdersResponse {
    myLabOrders: PatientLabOrder[];
}

// Notification preferences
export interface NotificationPreferences {
    pushEnabled: boolean;
    smsEnabled: boolean;
    whatsappEnabled: boolean;
    emailEnabled: boolean;
    discreetMode: boolean;
}

// Response types
export interface GetProfileResponse {
    me: UserProfile;
}

export interface GetSubscriptionsResponse {
    mySubscriptions: Subscription[];
}

export interface GetWalletResponse {
    myWallet: Wallet;
}

export interface GetNotificationPreferencesResponse {
    notificationPreferences: NotificationPreferences;
}

// Queries
export const GET_PROFILE = gql`
    query GetProfile {
        me {
            id
            phone
            name
            email
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
            createdAt
        }
    }
`;

export const GET_SUBSCRIPTIONS = gql`
    query GetSubscriptions {
        mySubscriptions {
            id
            planId
            status
            currentPeriodStart
            currentPeriodEnd
            cancelledAt
            plan {
                id
                vertical
                name
                priceInPaise
                durationMonths
            }
        }
    }
`;

export const GET_WALLET = gql`
    query GetWallet {
        myWallet {
            balance
            referralCode
            totalReferrals
            transactions {
                id
                type
                amount
                description
                createdAt
            }
        }
    }
`;

export const GET_MY_PRESCRIPTIONS = gql`
    query GetMyPrescriptions {
        myPrescriptions {
            id
            consultationId
            vertical
            doctorName
            pdfUrl
            medications
            instructions
            validUntil
            issuedAt
            createdAt
        }
    }
`;

export const GET_MY_LAB_ORDERS = gql`
    query GetMyLabOrders {
        myLabOrders {
            id
            status
            testPanel
            panelName
            resultFileUrl
            criticalValues
            orderedAt
            sampleCollectedAt
            resultsUploadedAt
            doctorReviewedAt
        }
    }
`;

export const GET_NOTIFICATION_PREFERENCES = gql`
    query GetNotificationPreferences {
        notificationPreferences {
            pushEnabled
            smsEnabled
            whatsappEnabled
            emailEnabled
            discreetMode
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
                name
                email
                isProfileComplete
                patientProfile {
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

export const PAUSE_SUBSCRIPTION = gql`
    mutation PauseSubscription($subscriptionId: String!) {
        pauseSubscription(subscriptionId: $subscriptionId) {
            success
            message
        }
    }
`;

export const RESUME_SUBSCRIPTION = gql`
    mutation ResumeSubscription($subscriptionId: String!) {
        resumeSubscription(subscriptionId: $subscriptionId) {
            success
            message
        }
    }
`;

export const CANCEL_SUBSCRIPTION = gql`
    mutation CancelSubscription($input: CancelSubscriptionInput!) {
        cancelSubscription(input: $input) {
            success
            message
        }
    }
`;

export const UPDATE_NOTIFICATION_PREFERENCES = gql`
    mutation UpdateNotificationPreferences($input: NotificationPreferencesInput!) {
        updateNotificationPreferences(input: $input) {
            pushEnabled
            smsEnabled
            whatsappEnabled
            emailEnabled
            discreetMode
        }
    }
`;

// Helper: Format amount from paise to rupees
export function formatAmount(paise: number): string {
    const rupees = paise / 100;
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(rupees);
}

// Helper: Vertical display names
export const VERTICAL_NAMES: Record<string, string> = {
    HAIR_LOSS: 'Hair Loss',
    SEXUAL_HEALTH: 'Sexual Health',
    PCOS: 'PCOS',
    WEIGHT_MANAGEMENT: 'Weight Management',
};

// Helper: Subscription status labels
export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, { label: string; color: string }> = {
    ACTIVE: { label: 'Active', color: 'success' },
    PAUSED: { label: 'Paused', color: 'warning' },
    CANCELLED: { label: 'Cancelled', color: 'error' },
    EXPIRED: { label: 'Expired', color: 'textTertiary' },
};
