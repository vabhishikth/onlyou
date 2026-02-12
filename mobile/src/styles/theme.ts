// Onlyou Design System - Theme Constants
// Based on a warm, approachable medical aesthetic

export const colors = {
    // Primary brand colors
    primary: '#1B4332',      // Deep forest green
    primaryLight: '#2D6A4F',
    primaryDark: '#081C15',
    primaryText: '#FFFFFF',

    // Accent colors
    accent: '#D4A574',       // Warm tan/gold
    accentLight: '#F5E6D3',
    accentDark: '#B8956A',

    // Background colors
    background: '#FEFCFB',   // Warm off-white
    surface: '#F8F5F2',      // Slightly darker for cards
    surfaceElevated: '#FFFFFF',

    // Text colors
    text: '#1C1917',         // Near black
    textSecondary: '#57534E',
    textTertiary: '#A8A29E',
    textInverse: '#FFFFFF',

    // Border colors
    border: '#E7E5E4',
    borderFocus: '#1B4332',

    // Semantic colors
    success: '#059669',
    successLight: '#D1FAE5',
    warning: '#D97706',
    warningLight: '#FEF3C7',
    error: '#DC2626',
    errorLight: '#FEE2E2',
    info: '#0284C7',
    infoLight: '#E0F2FE',

    // Status colors for tracking
    statusPending: '#A8A29E',
    statusActive: '#0284C7',
    statusComplete: '#059669',
    statusAlert: '#DC2626',
} as const;

export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
} as const;

export const borderRadius = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    full: 9999,
} as const;

export const typography = {
    // Display - for hero text
    displayLarge: {
        fontSize: 32,
        lineHeight: 40,
        fontWeight: '700' as const,
        letterSpacing: -0.5,
    },
    displayMedium: {
        fontSize: 28,
        lineHeight: 36,
        fontWeight: '600' as const,
        letterSpacing: -0.3,
    },

    // Headings
    headingLarge: {
        fontSize: 24,
        lineHeight: 32,
        fontWeight: '600' as const,
    },
    headingMedium: {
        fontSize: 20,
        lineHeight: 28,
        fontWeight: '600' as const,
    },
    headingSmall: {
        fontSize: 18,
        lineHeight: 24,
        fontWeight: '600' as const,
    },

    // Body text
    bodyLarge: {
        fontSize: 16,
        lineHeight: 24,
        fontWeight: '400' as const,
    },
    bodyMedium: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '400' as const,
    },
    bodySmall: {
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '400' as const,
    },

    // Labels
    label: {
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '500' as const,
        letterSpacing: 0.5,
    },

    // Buttons
    button: {
        fontSize: 16,
        lineHeight: 24,
        fontWeight: '600' as const,
    },
    buttonSmall: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '600' as const,
    },
} as const;

export const shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
} as const;

export default {
    colors,
    spacing,
    borderRadius,
    typography,
    shadows,
};
