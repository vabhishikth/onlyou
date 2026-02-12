'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@apollo/client';
import {
    Pill,
    Clock,
    CheckCircle,
    User,
    LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PHARMACY_INFO, PharmacyInfoResponse } from '@/graphql/pharmacy-portal';

// Spec: master spec Section 8.1 — Pharmacy Portal (pharmacy.onlyou.life)
// Role: PHARMACY only — Simple mobile-first interface
// Three tabs: New | Preparing | Ready

const NAV_ITEMS = [
    {
        href: '/pharmacy',
        label: 'New',
        icon: Pill,
    },
    {
        href: '/pharmacy/preparing',
        label: 'Preparing',
        icon: Clock,
    },
    {
        href: '/pharmacy/ready',
        label: 'Ready',
        icon: CheckCircle,
    },
    {
        href: '/pharmacy/profile',
        label: 'Profile',
        icon: User,
    },
];

export default function PharmacyLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [todayDate, setTodayDate] = useState('');

    const { data } = useQuery<PharmacyInfoResponse>(PHARMACY_INFO, {
        errorPolicy: 'ignore',
    });

    useEffect(() => {
        setTodayDate(
            new Date().toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
            })
        );
    }, []);

    const pharmacyName = data?.pharmacyInfo?.name || 'Pharmacy Portal';

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Top header */}
            <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3">
                <div className="flex items-center justify-between max-w-lg mx-auto">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
                            <Pill className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h1 className="font-semibold text-foreground text-sm leading-tight">
                                {pharmacyName}
                            </h1>
                            <p className="text-xs text-muted-foreground">{todayDate}</p>
                        </div>
                    </div>
                    <button
                        className="p-2 hover:bg-muted rounded-lg text-muted-foreground"
                        title="Logout"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto pb-20">{children}</main>

            {/* Bottom navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
                <div className="flex justify-around items-center max-w-lg mx-auto">
                    {NAV_ITEMS.map((item) => {
                        const isActive =
                            pathname === item.href ||
                            (item.href !== '/pharmacy' && pathname.startsWith(item.href));

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'flex flex-col items-center py-2 px-4 min-w-[64px]',
                                    'transition-colors',
                                    isActive
                                        ? 'text-green-600'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                <item.icon className={cn('w-6 h-6', isActive && 'stroke-[2.5]')} />
                                <span className="text-xs mt-1 font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
