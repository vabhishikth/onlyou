import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Playfair_Display } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { PWAProvider } from '@/components/pwa-provider';

const plusJakarta = Plus_Jakarta_Sans({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-plus-jakarta',
    weight: ['400', '500', '600', '700'],
});

const playfair = Playfair_Display({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-playfair',
    weight: ['600', '700', '900'],
});

export const metadata: Metadata = {
    title: 'Onlyou - Premium Healthcare',
    description: 'Discreet, personalized healthcare for modern India',
    icons: {
        icon: '/favicon.ico',
    },
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Onlyou',
    },
};

export const viewport: Viewport = {
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#ffffff' },
        { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
    ],
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={`${plusJakarta.variable} ${playfair.variable}`}>
            <body className="min-h-screen font-sans">
                <Providers>
                    <PWAProvider>{children}</PWAProvider>
                </Providers>
            </body>
        </html>
    );
}
