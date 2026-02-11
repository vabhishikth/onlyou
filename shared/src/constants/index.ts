import type { HealthVertical } from '../types';

// Health verticals with display information
export const HEALTH_VERTICALS: Record<
    HealthVertical,
    { name: string; description: string; priceInr: number }
> = {
    HAIR_LOSS: {
        name: 'Hair Loss',
        description: 'Science-backed treatment for hair regrowth',
        priceInr: 999,
    },
    SEXUAL_HEALTH: {
        name: 'Sexual Health',
        description: 'Discreet treatment for erectile dysfunction',
        priceInr: 799,
    },
    PCOS: {
        name: 'PCOS & Hormonal',
        description: 'Holistic care for hormonal balance',
        priceInr: 1199,
    },
    WEIGHT_MANAGEMENT: {
        name: 'Weight Management',
        description: 'Medical weight loss with GLP-1 medications',
        priceInr: 2499,
    },
};

// JWT token expiry times
export const AUTH_CONFIG = {
    ACCESS_TOKEN_EXPIRY: '15m',
    REFRESH_TOKEN_EXPIRY: '30d',
    OTP_EXPIRY_SECONDS: 300, // 5 minutes
    OTP_MAX_ATTEMPTS: 3,
    OTP_RATE_LIMIT_PER_HOUR: 5,
} as const;

// Indian states for address validation
export const INDIAN_STATES = [
    'Andhra Pradesh',
    'Arunachal Pradesh',
    'Assam',
    'Bihar',
    'Chhattisgarh',
    'Goa',
    'Gujarat',
    'Haryana',
    'Himachal Pradesh',
    'Jharkhand',
    'Karnataka',
    'Kerala',
    'Madhya Pradesh',
    'Maharashtra',
    'Manipur',
    'Meghalaya',
    'Mizoram',
    'Nagaland',
    'Odisha',
    'Punjab',
    'Rajasthan',
    'Sikkim',
    'Tamil Nadu',
    'Telangana',
    'Tripura',
    'Uttar Pradesh',
    'Uttarakhand',
    'West Bengal',
    'Delhi',
    'Jammu and Kashmir',
    'Ladakh',
    'Chandigarh',
    'Puducherry',
    'Andaman and Nicobar Islands',
    'Dadra and Nagar Haveli and Daman and Diu',
    'Lakshadweep',
] as const;

// Status colors for UI consistency
export const STATUS_COLORS = {
    // Green: Active, Approved, Delivered, Paid
    success: ['ACTIVE', 'APPROVED', 'DELIVERED', 'PAID', 'COMPLETED'],
    // Yellow: Pending, In Progress, Under Review
    warning: ['PENDING', 'IN_PROGRESS', 'PROCESSING', 'UNDER_REVIEW', 'PAUSED', 'DOCTOR_REVIEWING'],
    // Red: Rejected, Cancelled, Failed, Expired
    error: ['REJECTED', 'CANCELLED', 'FAILED', 'EXPIRED', 'RETURNED'],
    // Blue: New, Scheduled
    info: ['NEW', 'SCHEDULED', 'PENDING_ASSESSMENT', 'AI_REVIEWED'],
} as const;

// API endpoints
export const API_ENDPOINTS = {
    GRAPHQL: '/graphql',
    HEALTH: '/health',
    WEBHOOK_RAZORPAY: '/webhooks/razorpay',
    WEBHOOK_SHIPROCKET: '/webhooks/shiprocket',
} as const;
