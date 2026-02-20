/**
 * Onlyou Design System — Colors
 * Clinical Luxe palette: premium healthcare aesthetic
 */

export const colors = {
    // Core backgrounds
    white: '#FFFFFF',
    offWhite: '#FAFAF8', // warm off-white
    background: '#FFFFFF',
    surface: '#FAFAF8',

    // Text hierarchy
    textPrimary: '#141414', // near-black, slightly warm
    textSecondary: '#5C5C5C', // warm medium gray
    textTertiary: '#8A8A8A', // lighter gray for hints, timestamps
    textMuted: '#ABABAB', // placeholders, disabled text

    // Interactive / CTA
    ctaPrimary: '#141414', // black buttons
    ctaPrimaryText: '#FFFFFF',
    ctaDisabled: '#E0E0E0',
    ctaDisabledText: '#ABABAB',
    ctaSecondary: '#FFFFFF', // white buttons with border
    ctaSecondaryBorder: '#DCDCDC',

    // Accent — used SPARINGLY
    accent: '#9B8EC4', // muted lavender — links, focus states
    accentLight: '#F0EDF7', // very light lavender tint — focus backgrounds
    accentWarm: '#C4956B', // warm gold — premium badges (used rarely)

    // Borders & Dividers
    border: '#EBEBEB', // default borders
    borderLight: '#F2F2F2', // very subtle dividers
    borderFocus: '#9B8EC4', // input focus state

    // Status colors (used only when needed)
    success: '#2D9F5D', // deeper, sophisticated green
    successLight: '#F0F9F3',
    warning: '#D4880F', // warm amber
    warningLight: '#FFF8ED',
    error: '#CC3333', // deeper red
    errorLight: '#FDF2F2',

    // Treatment vertical tints — EXTREMELY subtle (5-8% opacity feel)
    hairLossTint: '#FAF7F0', // barely-there warm cream
    hairLossIcon: '#B8A472', // muted gold
    sexualHealthTint: '#F4F5FA', // barely-there cool blue
    sexualHealthIcon: '#7E86AD', // muted steel blue
    pcosTint: '#FAF4F6', // barely-there blush
    pcosIcon: '#AD7E8E', // muted dusty rose
    weightTint: '#F2F7F4', // barely-there sage
    weightIcon: '#6E9E7E', // muted sage green

    // Legacy compatibility aliases (used by older screens)
    primary: '#141414',
    primaryLight: '#333333',
    primaryDark: '#000000',
    primaryText: '#FFFFFF',
    text: '#141414',
    textInverse: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    info: '#0284C7',
    infoLight: '#E0F2FE',
} as const;

export type ColorKey = keyof typeof colors;
