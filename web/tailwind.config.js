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
                // Onlyou Brand Colors
                primary: {
                    DEFAULT: '#0D6B4B',
                    light: '#E8F5EF',
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
                background: '#FAFAF8',
                surface: '#FFFFFF',
                // Semantic colors
                success: '#16A34A',
                warning: '#F59E0B',
                error: '#DC2626',
            },
            fontFamily: {
                sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
            },
            borderRadius: {
                DEFAULT: '8px',
                card: '8px',
                button: '12px',
                pill: '24px',
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
