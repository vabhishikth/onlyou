/**
 * Payment GraphQL Helpers Tests
 * PR 14: Payment Integration — helper functions for pricing
 * Spec: master spec Section 12 — Pricing
 */

import {
    formatAmount,
    calculateSavings,
    getPlanDurationLabel,
    getMonthlyEquivalent,
    GET_AVAILABLE_PLANS,
    GET_MY_PAYMENTS,
    CREATE_PAYMENT_ORDER,
    VERIFY_PAYMENT,
} from '../payment';

describe('Payment GraphQL helpers', () => {
    describe('formatAmount', () => {
        it('formats 99900 paise as ₹999', () => {
            expect(formatAmount(99900)).toBe('₹999');
        });

        it('formats 249900 paise as ₹2,499', () => {
            expect(formatAmount(249900)).toBe('₹2,499');
        });

        it('formats 899900 paise as ₹8,999', () => {
            expect(formatAmount(899900)).toBe('₹8,999');
        });

        it('formats 0 paise as ₹0', () => {
            expect(formatAmount(0)).toBe('₹0');
        });
    });

    describe('calculateSavings', () => {
        it('returns 17% savings for Hair Loss quarterly', () => {
            // Monthly ₹999 × 3 = ₹2,997 vs Quarterly ₹2,499
            const result = calculateSavings(99900, 249900, 3);
            expect(result.savingsPercent).toBe(17);
            expect(result.savingsPaise).toBe(99900 * 3 - 249900);
        });

        it('returns 25% savings for Hair Loss annual', () => {
            // Monthly ₹999 × 12 = ₹11,988 vs Annual ₹8,999
            const result = calculateSavings(99900, 899900, 12);
            expect(result.savingsPercent).toBe(25);
        });

        it('returns 0% savings for monthly (same price)', () => {
            const result = calculateSavings(99900, 99900, 1);
            expect(result.savingsPercent).toBe(0);
            expect(result.savingsPaise).toBe(0);
        });

        it('calculates PCOS quarterly savings correctly', () => {
            // Monthly ₹1,499 × 3 = ₹4,497 vs Quarterly ₹3,799
            const result = calculateSavings(149900, 379900, 3);
            expect(result.savingsPercent).toBe(16);
        });
    });

    describe('getPlanDurationLabel', () => {
        it('returns Monthly for 1 month', () => {
            expect(getPlanDurationLabel(1)).toBe('Monthly');
        });

        it('returns Quarterly for 3 months', () => {
            expect(getPlanDurationLabel(3)).toBe('Quarterly');
        });

        it('returns Annual for 12 months', () => {
            expect(getPlanDurationLabel(12)).toBe('Annual');
        });

        it('returns N months for other durations', () => {
            expect(getPlanDurationLabel(6)).toBe('6 months');
        });
    });

    describe('getMonthlyEquivalent', () => {
        it('returns same price for monthly', () => {
            expect(getMonthlyEquivalent(99900, 1)).toBe(99900);
        });

        it('returns per-month price for quarterly', () => {
            expect(getMonthlyEquivalent(249900, 3)).toBe(83300);
        });

        it('returns per-month price for annual', () => {
            expect(getMonthlyEquivalent(899900, 12)).toBe(74992);
        });
    });

    describe('GraphQL queries and mutations exist', () => {
        it('exports GET_AVAILABLE_PLANS query', () => {
            expect(GET_AVAILABLE_PLANS).toBeDefined();
        });

        it('exports GET_MY_PAYMENTS query', () => {
            expect(GET_MY_PAYMENTS).toBeDefined();
        });

        it('exports CREATE_PAYMENT_ORDER mutation', () => {
            expect(CREATE_PAYMENT_ORDER).toBeDefined();
        });

        it('exports VERIFY_PAYMENT mutation', () => {
            expect(VERIFY_PAYMENT).toBeDefined();
        });
    });
});
