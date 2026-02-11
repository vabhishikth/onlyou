// Hims-inspired Design System for Onlyou
// Based on Hims iOS app design patterns

export const colors = {
    // Primary actions
    primary: '#000000',
    primaryText: '#FFFFFF',

    // Accent color (terracotta/coral)
    accent: '#C47B5B',
    accentLight: '#E8C4B8',

    // Success
    success: '#6B8E23',
    successLight: '#E8F0D8',

    // Backgrounds
    background: '#FFFFFF',
    surface: '#F8F8F8',
    surfaceSecondary: '#F0F0F0',
    surfaceHover: '#F0F0F0',

    // Text
    text: '#1A1A1A',
    textSecondary: '#666666',
    textTertiary: '#999999',

    // Borders
    border: '#E5E5E5',
    borderFocus: '#C47B5B',

    // Status
    error: '#DC3545',
    warning: '#FFC107',
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const borderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
};

export const typography = {
    // Serif for headings (elegant, premium feel)
    headingLarge: {
        fontSize: 28,
        fontWeight: '700' as const,
        lineHeight: 34,
        letterSpacing: -0.5,
    },
    headingMedium: {
        fontSize: 22,
        fontWeight: '600' as const,
        lineHeight: 28,
        letterSpacing: -0.3,
    },
    headingSmall: {
        fontSize: 18,
        fontWeight: '600' as const,
        lineHeight: 24,
    },
    // Sans-serif for body
    bodyLarge: {
        fontSize: 17,
        fontWeight: '400' as const,
        lineHeight: 24,
    },
    bodyMedium: {
        fontSize: 15,
        fontWeight: '400' as const,
        lineHeight: 22,
    },
    bodySmall: {
        fontSize: 13,
        fontWeight: '400' as const,
        lineHeight: 18,
    },
    label: {
        fontSize: 13,
        fontWeight: '500' as const,
        lineHeight: 18,
        letterSpacing: 0.2,
    },
    button: {
        fontSize: 16,
        fontWeight: '600' as const,
        lineHeight: 22,
    },
    caption: {
        fontSize: 11,
        fontWeight: '400' as const,
        lineHeight: 14,
    },
};

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
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 5,
    },
};

export default {
    colors,
    spacing,
    borderRadius,
    typography,
    shadows,
};
