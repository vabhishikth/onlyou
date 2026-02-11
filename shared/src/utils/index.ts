/**
 * Format price in INR (Indian Rupees)
 * Always displays with ₹ symbol
 */
export function formatPriceINR(amountInPaise: number): string {
    const amountInRupees = amountInPaise / 100;
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amountInRupees);
}

/**
 * Format Indian phone number for display
 * Input: +919876543210
 * Output: +91 98765 43210
 */
export function formatPhoneNumber(phone: string): string {
    if (!phone.startsWith('+91') || phone.length !== 13) {
        return phone;
    }
    const digits = phone.slice(3);
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

/**
 * Calculate BMI from height (cm) and weight (kg)
 */
export function calculateBMI(heightCm: number, weightKg: number): number {
    const heightM = heightCm / 100;
    return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

/**
 * Get BMI category
 */
export function getBMICategory(bmi: number): string {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 23) return 'Normal'; // Using Asian BMI cutoffs
    if (bmi < 25) return 'Overweight';
    return 'Obese';
}

/**
 * Mask phone number for privacy
 * Input: +919876543210
 * Output: +91****3210
 */
export function maskPhoneNumber(phone: string): string {
    if (!phone.startsWith('+91') || phone.length !== 13) {
        return phone;
    }
    return `+91****${phone.slice(-4)}`;
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
}

/**
 * Safely log data (strips sensitive info in production)
 */
export function safeLog(message: string, data?: unknown): void {
    if (isDevelopment()) {
        console.log(message, data);
    }
}
