/**
 * Onlyou Design System — Spacing
 * 8px base grid system
 */

export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
    '3xl': 40,
    '4xl': 48,
    '5xl': 64,
    '6xl': 80,
} as const;

// Screen-specific spacing
export const screenSpacing = {
    horizontal: 24, // horizontal padding on all screens
    sectionGap: 40, // vertical gap between major sections
    cardGap: 12, // gap between cards in a list
    inputGap: 16, // gap between form fields
    buttonMargin: 24, // bottom margin above the main CTA
} as const;

export const borderRadius = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 20,
    '3xl': 24,
    '4xl': 28,
    full: 9999,
} as const;

// Component-specific dimensions
export const dimensions = {
    buttonHeight: 56,
    buttonHeightSmall: 44,
    inputHeight: 60,
    iconSizeSm: 16,
    iconSizeMd: 20,
    iconSizeLg: 24,
    iconSizeXl: 28,
    iconSize2xl: 36,
    tabBarHeight: 84, // including safe area
    backButtonSize: 44,
    progressDotSize: 8,
    progressDotActiveWidth: 24,
    touchTarget: 44, // minimum touch target
} as const;

// Shadows
export const shadows = {
    none: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    },
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
        shadowRadius: 4,
        elevation: 2,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    soft: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 3,
    },
} as const;
