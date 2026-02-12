'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import {
    Droplets,
    LogOut,
    AlertCircle,
} from 'lucide-react';
import { PHLEBOTOMIST_INFO, PhlebotomistInfoResponse } from '@/graphql/collect-portal';

// Spec: master spec Section 7.2 — Collection Portal (collect.onlyou.life)
// THE SIMPLEST PORTAL. Used on the road, one hand, between collections.
// Single screen — NO tabs. Just today's list.

export default function CollectLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [todayDate, setTodayDate] = useState('');
    const [isOnline, setIsOnline] = useState(true);

    const { data } = useQuery<PhlebotomistInfoResponse>(PHLEBOTOMIST_INFO, {
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

        // Track online status for offline mode
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        setIsOnline(navigator.onLine);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const phlebotomistName = data?.phlebotomistInfo?.name || 'Collection';

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Offline banner */}
            {!isOnline && (
                <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    You&apos;re offline. Changes will sync when you&apos;re back online.
                </div>
            )}

            {/* Top header — name + today's date */}
            <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3">
                <div className="flex items-center justify-between max-w-lg mx-auto">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center">
                            <Droplets className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-semibold text-foreground leading-tight">
                                {phlebotomistName}
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

            {/* Main content — full height, no bottom nav needed */}
            <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
    );
}
