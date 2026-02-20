/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: [
        './src/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                // Clinical Luxe — Premium Wellness Aesthetic
                // Matches mobile design tokens from mobile/src/theme/colors.ts
                primary: {
                    DEFAULT: '#141414',
                    foreground: '#FFFFFF',
                    50: '#F5F5F5',
                    100: '#E8E8E8',
                    200: '#D1D1D1',
                    300: '#ABABAB',
                    400: '#8A8A8A',
                    500: '#5C5C5C',
                    600: '#3D3D3D',
                    700: '#2A2A2A',
                    800: '#1A1A1A',
                    900: '#141414',
                },
                secondary: {
                    DEFAULT: '#F8F8F6',
                    foreground: '#141414',
                    50: '#FEFEFE',
                    100: '#FCFCFB',
                    200: '#F8F8F6',
                    300: '#F2F2F0',
                    400: '#EBEBEB',
                    500: '#DCDCDC',
                },
                accent: {
                    DEFAULT: '#9B8EC4',
                    foreground: '#FFFFFF',
                    50: '#F0EDF7',
                    100: '#E4DFF0',
                    200: '#D0C8E4',
                    300: '#BDB2D8',
                    400: '#9B8EC4',
                    500: '#8577B0',
                    600: '#6F619C',
                    700: '#5A4E80',
                    800: '#453C63',
                    900: '#302A46',
                },
                // Warm gold for premium badges
                warm: {
                    DEFAULT: '#C4956B',
                    light: '#F5EDE4',
                    50: '#FCF8F4',
                    100: '#F5EDE4',
                    200: '#E8D5C0',
                    300: '#D6B898',
                    400: '#C4956B',
                    500: '#A87C56',
                },
                // Neutral warm grays
                neutral: {
                    50: '#FAFAF8',
                    100: '#F5F5F3',
                    200: '#EBEBEB',
                    300: '#DCDCDC',
                    400: '#ABABAB',
                    500: '#8A8A8A',
                    600: '#5C5C5C',
                    700: '#3D3D3D',
                    800: '#1A1A1A',
                    900: '#141414',
                },
                // Semantic — deeper, more sophisticated
                success: '#2D9F5D',
                warning: '#D4880F',
                error: '#CC3333',
                destructive: {
                    DEFAULT: '#CC3333',
                    foreground: '#FFFFFF',
                },
                // Treatment vertical tints
                vertical: {
                    'hair-loss': '#FAF7F0',
                    'hair-loss-icon': '#B8A472',
                    'sexual-health': '#F4F5FA',
                    'sexual-health-icon': '#7E86AD',
                    'pcos': '#FAF4F6',
                    'pcos-icon': '#AD7E8E',
                    'weight': '#F2F7F4',
                    'weight-icon': '#6E9E7E',
                },
                // UI colors (shadcn compatible)
                background: '#FAFAF8',
                foreground: '#141414',
                card: {
                    DEFAULT: '#FFFFFF',
                    foreground: '#141414',
                },
                popover: {
                    DEFAULT: '#FFFFFF',
                    foreground: '#141414',
                },
                muted: {
                    DEFAULT: '#F5F5F3',
                    foreground: '#5C5C5C',
                },
                border: '#EBEBEB',
                input: '#EBEBEB',
                ring: '#9B8EC4',
                // Chart colors
                chart: {
                    1: '#9B8EC4',
                    2: '#C4956B',
                    3: '#2D9F5D',
                    4: '#7E86AD',
                    5: '#AD7E8E',
                },
            },
            fontFamily: {
                sans: [
                    'var(--font-plus-jakarta)',
                    'system-ui',
                    '-apple-system',
                    'BlinkMacSystemFont',
                    'Segoe UI',
                    'Roboto',
                    'sans-serif',
                ],
                serif: [
                    'var(--font-playfair)',
                    'Georgia',
                    'Cambria',
                    'Times New Roman',
                    'serif',
                ],
            },
            fontSize: {
                xs: ['0.75rem', { lineHeight: '1rem' }],
                sm: ['0.875rem', { lineHeight: '1.25rem' }],
                base: ['1rem', { lineHeight: '1.5rem' }],
                lg: ['1.125rem', { lineHeight: '1.75rem' }],
                xl: ['1.25rem', { lineHeight: '1.75rem' }],
                '2xl': ['1.5rem', { lineHeight: '2rem' }],
                '3xl': ['1.875rem', { lineHeight: '1.2' }],
                '4xl': ['2.25rem', { lineHeight: '1.2' }],
                '5xl': ['3rem', { lineHeight: '1.1' }],
            },
            borderRadius: {
                DEFAULT: '0.75rem',
                sm: '0.375rem',
                md: '0.5rem',
                lg: '0.75rem',
                xl: '1rem',
                '2xl': '1.25rem',
                '3xl': '1.5rem',
            },
            boxShadow: {
                soft: '0 2px 12px -2px rgb(0 0 0 / 0.04)',
                'soft-md': '0 2px 8px -2px rgb(0 0 0 / 0.06), 0 4px 16px -4px rgb(0 0 0 / 0.08)',
                'soft-lg': '0 4px 8px -2px rgb(0 0 0 / 0.08), 0 8px 24px -4px rgb(0 0 0 / 0.1)',
            },
            animation: {
                'fade-in': 'fadeIn 0.2s ease-out',
                'fade-in-up': 'fadeInUp 0.3s ease-out',
                'slide-in-right': 'slideInRight 0.3s ease-out',
                'slide-in-left': 'slideInLeft 0.3s ease-out',
                'scale-in': 'scaleIn 0.2s ease-out',
                'pulse-soft': 'pulseSoft 2s infinite',
            },
            keyframes: {
                fadeIn: {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                fadeInUp: {
                    from: { opacity: '0', transform: 'translateY(10px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                slideInRight: {
                    from: { opacity: '0', transform: 'translateX(20px)' },
                    to: { opacity: '1', transform: 'translateX(0)' },
                },
                slideInLeft: {
                    from: { opacity: '0', transform: 'translateX(-20px)' },
                    to: { opacity: '1', transform: 'translateX(0)' },
                },
                scaleIn: {
                    from: { opacity: '0', transform: 'scale(0.95)' },
                    to: { opacity: '1', transform: 'scale(1)' },
                },
                pulseSoft: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.7' },
                },
            },
            spacing: {
                '4.5': '18px',
                '13': '52px',
                '15': '60px',
            },
        },
    },
    plugins: [require('tailwindcss-animate')],
};
