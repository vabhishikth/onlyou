import {
    cn,
    formatINR,
    formatDate,
    formatRelativeTime,
    getInitials,
    maskPhone,
    VERTICAL_NAMES,
    CONSULTATION_STATUS,
    ROLE_NAMES,
} from '../utils';

describe('cn', () => {
    it('should merge class names', () => {
        expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
        expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
    });

    it('should merge conflicting Tailwind classes', () => {
        expect(cn('p-4', 'p-2')).toBe('p-2');
    });
});

describe('formatINR', () => {
    it('should format 0 paise', () => {
        const result = formatINR(0);
        expect(result).toContain('0');
    });

    it('should convert paise to rupees', () => {
        const result = formatINR(10000);
        expect(result).toContain('100');
    });

    it('should format large amounts with Indian grouping', () => {
        const result = formatINR(999900);
        expect(result).toContain('9,999');
    });

    it('should handle negative amounts', () => {
        const result = formatINR(-5000);
        expect(result).toContain('50');
    });
});

describe('formatDate', () => {
    it('should format a valid date string', () => {
        const result = formatDate('2026-01-15');
        expect(result).toContain('Jan');
        expect(result).toContain('2026');
    });

    it('should format a Date object', () => {
        const result = formatDate(new Date(2026, 5, 20));
        expect(result).toContain('Jun');
        expect(result).toContain('2026');
    });

    it('should include day', () => {
        const result = formatDate('2026-03-05');
        expect(result).toContain('5');
    });
});

describe('formatRelativeTime', () => {
    it('should return "Just now" for very recent times', () => {
        const now = new Date();
        expect(formatRelativeTime(now)).toBe('Just now');
    });

    it('should return minutes ago', () => {
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
        expect(formatRelativeTime(fiveMinAgo)).toBe('5m ago');
    });

    it('should return hours ago', () => {
        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
        expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago');
    });

    it('should return days ago', () => {
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        expect(formatRelativeTime(twoDaysAgo)).toBe('2d ago');
    });

    it('should return formatted date for 7+ days', () => {
        const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        const result = formatRelativeTime(twoWeeksAgo);
        // Should fall back to formatDate (contains month abbreviation)
        expect(result).toMatch(/[A-Z][a-z]{2}/);
    });

    it('should handle string dates', () => {
        const recent = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        expect(formatRelativeTime(recent)).toBe('30m ago');
    });
});

describe('getInitials', () => {
    it('should extract initials from two-word name', () => {
        expect(getInitials('Rahul Sharma')).toBe('RS');
    });

    it('should handle single name', () => {
        expect(getInitials('Rahul')).toBe('R');
    });

    it('should limit to 2 initials', () => {
        expect(getInitials('Rahul Kumar Sharma')).toBe('RK');
    });

    it('should uppercase initials', () => {
        expect(getInitials('rahul sharma')).toBe('RS');
    });
});

describe('maskPhone', () => {
    it('should mask standard 10-digit phone', () => {
        expect(maskPhone('9876543210')).toBe('98******10');
    });

    it('should mask 12-digit phone with country code', () => {
        expect(maskPhone('919876543210')).toBe('91******10');
    });

    it('should return short phone unchanged', () => {
        expect(maskPhone('12345')).toBe('12345');
    });
});

describe('constants', () => {
    it('should have all 4 vertical names', () => {
        expect(VERTICAL_NAMES.HAIR_LOSS).toBe('Hair Loss');
        expect(VERTICAL_NAMES.SEXUAL_HEALTH).toBe('Sexual Health');
        expect(VERTICAL_NAMES.PCOS).toBe('PCOS');
        expect(VERTICAL_NAMES.WEIGHT_MANAGEMENT).toBe('Weight Management');
    });

    it('should have all consultation statuses', () => {
        expect(CONSULTATION_STATUS.PENDING_REVIEW.label).toBe('New');
        expect(CONSULTATION_STATUS.COMPLETED.label).toBe('Completed');
    });

    it('should have all 7 role names', () => {
        expect(Object.keys(ROLE_NAMES)).toHaveLength(7);
        expect(ROLE_NAMES.PATIENT).toBe('Patient');
        expect(ROLE_NAMES.DOCTOR).toBe('Doctor');
        expect(ROLE_NAMES.ADMIN).toBe('Coordinator');
    });
});
