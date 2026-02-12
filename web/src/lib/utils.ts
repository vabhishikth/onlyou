import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Format currency for Indian Rupees
 */
export function formatINR(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount / 100); // Convert from paise
}

/**
 * Format date in Indian format
 */
export function formatDate(date: string | Date): string {
    return new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(new Date(date));
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return formatDate(date);
}

/**
 * Vertical display names
 */
export const VERTICAL_NAMES: Record<string, string> = {
    HAIR_LOSS: 'Hair Loss',
    SEXUAL_HEALTH: 'Sexual Health',
    WEIGHT_MANAGEMENT: 'Weight Management',
    PCOS: 'PCOS',
};

/**
 * Consultation status colors and labels
 */
export const CONSULTATION_STATUS = {
    PENDING_REVIEW: { label: 'New', color: 'warning' },
    IN_REVIEW: { label: 'In Review', color: 'info' },
    AWAITING_PATIENT: { label: 'Awaiting Response', color: 'warning' },
    AWAITING_LAB_RESULTS: { label: 'Lab Results', color: 'primary' },
    FOLLOW_UP: { label: 'Follow-Up', color: 'accent' },
    COMPLETED: { label: 'Completed', color: 'success' },
    REFERRED: { label: 'Referred', color: 'secondary' },
    CANCELLED: { label: 'Cancelled', color: 'error' },
} as const;

/**
 * Role display names
 */
export const ROLE_NAMES: Record<string, string> = {
    PATIENT: 'Patient',
    DOCTOR: 'Doctor',
    ADMIN: 'Coordinator',
    LAB: 'Lab Partner',
    PHLEBOTOMIST: 'Phlebotomist',
    PHARMACY: 'Pharmacy',
    DELIVERY: 'Delivery',
};

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

/**
 * Mask phone number for privacy
 */
export function maskPhone(phone: string): string {
    if (phone.length < 10) return phone;
    return phone.slice(0, 2) + '******' + phone.slice(-2);
}
