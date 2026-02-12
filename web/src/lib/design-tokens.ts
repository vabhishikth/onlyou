/**
 * Onlyou Design Tokens
 * Premium lifestyle wellness brand - NOT clinical/hospital aesthetic
 * Inspired by: Hims, Ro, Manual UK, Curology
 */

// Brand Colors
export const colors = {
  // Primary - Deep forest green (trust, wellness, premium)
  primary: {
    DEFAULT: '#0D6B4B',
    50: '#E8F5EF',
    100: '#D1EBE0',
    200: '#A3D7C1',
    300: '#75C3A2',
    400: '#47AF83',
    500: '#0D6B4B',
    600: '#0B5A3F',
    700: '#094933',
    800: '#073827',
    900: '#05271B',
  },

  // Secondary - Deep navy (sophistication, confidence)
  secondary: {
    DEFAULT: '#1A1A2E',
    50: '#E8E8EB',
    100: '#D1D1D7',
    200: '#A3A3AF',
    300: '#757587',
    400: '#47475F',
    500: '#1A1A2E',
    600: '#151527',
    700: '#101020',
    800: '#0B0B19',
    900: '#060612',
  },

  // Accent - Warm amber (energy, action, warmth)
  accent: {
    DEFAULT: '#F4A261',
    50: '#FEF5EC',
    100: '#FCEAD9',
    200: '#FAD6B3',
    300: '#F7C18D',
    400: '#F5AD67',
    500: '#F4A261',
    600: '#C38251',
    700: '#926241',
    800: '#614131',
    900: '#312120',
  },

  // Neutrals - Warm grays (friendly, approachable)
  neutral: {
    50: '#FAFAF8',
    100: '#F5F5F3',
    200: '#E8E8E6',
    300: '#D4D4D2',
    400: '#A3A3A1',
    500: '#737371',
    600: '#525250',
    700: '#3D3D3B',
    800: '#262625',
    900: '#171716',
  },

  // Semantic colors
  success: '#16A34A',
  warning: '#F59E0B',
  error: '#DC2626',
  info: '#0EA5E9',

  // Surface colors
  background: '#FAFAF8',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  // Text colors
  text: '#171716',
  textSecondary: '#525250',
  textTertiary: '#737371',
  textInverse: '#FFFFFF',
} as const;

// Typography Scale
export const typography = {
  fontFamily: {
    sans: ['var(--font-plus-jakarta)', 'system-ui', '-apple-system', 'sans-serif'],
    display: ['var(--font-plus-jakarta)', 'system-ui', '-apple-system', 'sans-serif'],
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    '5xl': ['3rem', { lineHeight: '1.1' }],
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

// Spacing (8px base)
export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem', // 2px
  1: '0.25rem',    // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem',     // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem',    // 12px
  3.5: '0.875rem', // 14px
  4: '1rem',       // 16px
  5: '1.25rem',    // 20px
  6: '1.5rem',     // 24px
  7: '1.75rem',    // 28px
  8: '2rem',       // 32px
  9: '2.25rem',    // 36px
  10: '2.5rem',    // 40px
  11: '2.75rem',   // 44px
  12: '3rem',      // 48px
  14: '3.5rem',    // 56px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
  28: '7rem',      // 112px
  32: '8rem',      // 128px
} as const;

// Border Radius
export const borderRadius = {
  none: '0',
  sm: '0.25rem',   // 4px
  DEFAULT: '0.5rem', // 8px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  '2xl': '1.5rem', // 24px
  '3xl': '2rem',   // 32px
  full: '9999px',
} as const;

// Shadows (soft, premium feel)
export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: 'none',
  // Premium soft shadows
  soft: '0 2px 8px -2px rgb(0 0 0 / 0.08), 0 4px 16px -4px rgb(0 0 0 / 0.12)',
  'soft-lg': '0 4px 12px -4px rgb(0 0 0 / 0.1), 0 8px 24px -8px rgb(0 0 0 / 0.15)',
} as const;

// Animation durations
export const animation = {
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

// Z-index scale
export const zIndex = {
  hide: -1,
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
} as const;

// Breakpoints
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Status Colors (for consultation/order states)
export const statusColors = {
  new: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
  inReview: { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },
  awaitingResponse: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
  labResults: { bg: '#E0E7FF', text: '#3730A3', border: '#A5B4FC' },
  followUp: { bg: '#FCE7F3', text: '#9D174D', border: '#F9A8D4' },
  completed: { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
  referred: { bg: '#F3E8FF', text: '#6B21A8', border: '#C4B5FD' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
} as const;

// Condition-specific colors
export const conditionColors = {
  HAIR_LOSS: { primary: '#0D6B4B', light: '#E8F5EF' },
  SEXUAL_HEALTH: { primary: '#4F46E5', light: '#EEF2FF' },
  WEIGHT_MANAGEMENT: { primary: '#EA580C', light: '#FFF7ED' },
  PCOS: { primary: '#DB2777', light: '#FDF2F8' },
} as const;
