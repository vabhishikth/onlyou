// User roles in the Onlyou platform
export type UserRole = 'PATIENT' | 'DOCTOR' | 'NURSE' | 'PHARMACIST' | 'ADMIN';

// Health verticals offered by Onlyou
export type HealthVertical = 'HAIR_LOSS' | 'SEXUAL_HEALTH' | 'PCOS' | 'WEIGHT_MANAGEMENT';

// Consultation statuses
export type ConsultationStatus =
    | 'PENDING_ASSESSMENT'
    | 'AI_REVIEWED'
    | 'DOCTOR_REVIEWING'
    | 'APPROVED'
    | 'NEEDS_INFO'
    | 'REJECTED';

// Order statuses
export type OrderStatus =
    | 'PENDING'
    | 'PROCESSING'
    | 'PACKED'
    | 'SHIPPED'
    | 'DELIVERED'
    | 'CANCELLED'
    | 'RETURNED';

// Payment statuses
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

// Subscription statuses
export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED';

// Base user type
export interface User {
    id: string;
    phone: string;
    email?: string;
    name?: string;
    role: UserRole;
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// Patient profile
export interface PatientProfile {
    id: string;
    userId: string;
    dateOfBirth?: Date;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    height?: number; // in cm
    weight?: number; // in kg
    address?: Address;
}

// Address structure (Indian format)
export interface Address {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string; // Indian postal code (6 digits)
    country: 'IN';
}

// Subscription plan
export interface SubscriptionPlan {
    id: string;
    vertical: HealthVertical;
    name: string;
    priceInPaise: number; // Store in paise (smallest unit)
    durationMonths: number;
    features: string[];
}

// API Response wrapper
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
}
