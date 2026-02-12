'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@apollo/client';
import {
    FlaskConical,
    Clock,
    Upload,
    User,
    Calendar,
    LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LAB_INFO, LabInfoResponse } from '@/graphql/lab-portal';

// Spec: master spec Section 7.1 — Lab Portal (lab.onlyou.life)
// Role: LAB only — Simple mobile-first interface for diagnostic centre staff
// Design: Dead simple, big buttons, 375px mobile-first

const NAV_ITEMS = [
    {
        href: '/lab',
        label: 'Incoming',
        icon: FlaskConical,
    },
    {
        href: '/lab/processing',
        label: 'Processing',
        icon: Clock,
    },
    {
        href: '/lab/upload',
        label: 'Upload',
        icon: Upload,
    },
    {
        href: '/lab/profile',
        label: 'Profile',
        icon: User,
    },
];

export default function LabLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [todayDate, setTodayDate] = useState('');

    const { data: labData } = useQuery<LabInfoResponse>(LAB_INFO, {
        // Skip if not authenticated — will show login
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

    const labName = labData?.labInfo?.name || 'Lab Portal';

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Top header — lab name + today's date */}
            <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3">
                <div className="flex items-center justify-between max-w-lg mx-auto">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                            <FlaskConical className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h1 className="font-semibold text-foreground text-sm leading-tight">
                                {labName}
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

            {/* Bottom navigation — mobile-first, big tap targets */}
            <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
                <div className="flex justify-around items-center max-w-lg mx-auto">
                    {NAV_ITEMS.map((item) => {
                        const isActive =
                            pathname === item.href ||
                            (item.href !== '/lab' && pathname.startsWith(item.href));

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'flex flex-col items-center py-2 px-4 min-w-[64px]',
                                    'transition-colors',
                                    isActive
                                        ? 'text-blue-600'
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
