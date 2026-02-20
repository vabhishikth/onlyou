import { gql } from '@apollo/client';

// Spec: master spec Section 12 (Payment & Subscription)

// ============================================
// TYPES
// ============================================

export interface SubscriptionPlan {
    id: string;
    vertical: string;
    name: string;
    description?: string;
    priceInPaise: number;
    durationMonths: number;
    features: string[];
    isActive: boolean;
}

export interface PaymentOrder {
    paymentId: string;
    razorpayOrderId: string;
    amountPaise: number;
    currency: string;
}

export interface PaymentOrderResponse {
    success: boolean;
    message: string;
    paymentId?: string;
    razorpayOrderId?: string;
    amountPaise?: number;
    currency?: string;
}

export interface VerifyPaymentResponse {
    success: boolean;
    message: string;
}

export interface PaymentRecord {
    id: string;
    userId: string;
    amountPaise: number;
    status: string;
    razorpayOrderId?: string;
    method?: string;
    createdAt: string;
}

// ============================================
// QUERIES
// ============================================

export const GET_AVAILABLE_PLANS = gql`
    query GetAvailablePlans($vertical: String!) {
        availablePlans(vertical: $vertical) {
            id
            vertical
            name
            description
            priceInPaise
            durationMonths
            features
            isActive
        }
    }
`;

export const GET_MY_PAYMENTS = gql`
    query GetMyPayments($status: String) {
        myPayments(status: $status) {
            id
            userId
            amountPaise
            status
            razorpayOrderId
            method
            createdAt
        }
    }
`;

// ============================================
// MUTATIONS
// ============================================

export const CREATE_PAYMENT_ORDER = gql`
    mutation CreatePaymentOrder($input: CreatePaymentOrderInput!) {
        createPaymentOrder(input: $input) {
            success
            message
            paymentId
            razorpayOrderId
            amountPaise
            currency
        }
    }
`;

export const VERIFY_PAYMENT = gql`
    mutation VerifyPayment($input: VerifyPaymentInput!) {
        verifyPayment(input: $input) {
            success
            message
        }
    }
`;

// ============================================
// HELPERS
// ============================================

/**
 * Format paise to Indian Rupee display string
 * Spec: All amounts stored in paise (integer), display in rupees
 */
export function formatAmount(paise: number): string {
    const rupees = paise / 100;
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(rupees);
}

/**
 * Calculate savings compared to monthly plan
 * Returns savings percentage and amount saved in paise
 */
export function calculateSavings(
    monthlyPricePaise: number,
    planPricePaise: number,
    durationMonths: number,
): { savingsPaise: number; savingsPercent: number } {
    const fullMonthlyPrice = monthlyPricePaise * durationMonths;
    const savingsPaise = fullMonthlyPrice - planPricePaise;
    const savingsPercent = Math.round((savingsPaise / fullMonthlyPrice) * 100);
    return { savingsPaise, savingsPercent };
}

/**
 * Get plan duration label
 */
export function getPlanDurationLabel(durationMonths: number): string {
    if (durationMonths === 1) return 'Monthly';
    if (durationMonths === 3) return 'Quarterly';
    if (durationMonths === 12) return 'Annual';
    return `${durationMonths} months`;
}

/**
 * Get monthly equivalent price for non-monthly plans
 */
export function getMonthlyEquivalent(pricePaise: number, durationMonths: number): number {
    return Math.round(pricePaise / durationMonths);
}
