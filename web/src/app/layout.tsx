import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const plusJakarta = Plus_Jakarta_Sans({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-plus-jakarta',
    weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
    title: 'Onlyou - Premium Healthcare',
    description: 'Discreet, personalized healthcare for modern India',
    icons: {
        icon: '/favicon.ico',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={plusJakarta.variable}>
            <body className="min-h-screen font-sans">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
