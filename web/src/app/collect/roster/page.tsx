'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { motion } from 'framer-motion';
import { Clock, MapPin, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    COLLECT_MY_DAILY_ROSTER,
    DailyRosterItem,
    COLLECT_STATUS_CONFIG,
} from '@/graphql/collect-portal';

// Spec: Phase 16 — Phlebotomist daily roster view
// Time-ordered list with area grouping and fasting badges

export default function RosterPage() {
    const today = new Date().toISOString().split('T')[0];

    const { data, loading } = useQuery(COLLECT_MY_DAILY_ROSTER, {
        variables: { date: today },
    });

    const roster: DailyRosterItem[] = data?.myDailyRoster || [];

    // Group by area
    const grouped = useMemo(() => {
        const groups: Record<string, DailyRosterItem[]> = {};
        roster.forEach((item) => {
            const area = item.patientArea || 'Other';
            if (!groups[area]) groups[area] = [];
            groups[area].push(item);
        });
        // Sort items within each group by time window
        Object.values(groups).forEach((items) =>
            items.sort((a, b) => a.timeWindow.localeCompare(b.timeWindow))
        );
        return groups;
    }, [roster]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
        );
    }

    return (
        <div className="p-4 max-w-lg mx-auto">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-teal-600" />
                Daily Roster
            </h2>

            {roster.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="card-premium p-8 text-center"
                >
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        No Collections Scheduled
                    </h3>
                    <p className="text-muted-foreground">
                        Your roster for today is empty.
                    </p>
                </motion.div>
            )}

            {Object.entries(grouped).map(([area, items]) => (
                <div key={area} className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                            {area}
                        </h3>
                    </div>

                    <div className="space-y-3">
                        {items.map((item) => {
                            const statusConfig = COLLECT_STATUS_CONFIG[item.status] || {
                                label: item.status,
                                color: 'text-gray-600',
                                bgColor: 'bg-gray-100',
                            };

                            return (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="card-premium p-4"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-base font-bold text-blue-600">
                                            {item.timeWindow}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {item.requiresFasting && (
                                                <span
                                                    data-testid={`fasting-${item.id}`}
                                                    className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 flex items-center gap-1"
                                                >
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Fasting
                                                </span>
                                            )}
                                            <span className={cn(
                                                'px-2 py-0.5 rounded text-xs font-medium',
                                                statusConfig.bgColor,
                                                statusConfig.color,
                                            )}>
                                                {statusConfig.label}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mb-1">
                                        <span className="font-semibold text-foreground">
                                            {item.patientFirstName}
                                        </span>
                                    </div>

                                    <p className="text-sm text-muted-foreground mb-1">
                                        {item.panelName}
                                    </p>

                                    {/* Google Maps link with address */}
                                    <a
                                        href={`https://maps.google.com/?q=${encodeURIComponent(item.fullAddress)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline"
                                        title={item.fullAddress}
                                    >
                                        <MapPin className="w-3 h-3" />
                                        Open in Maps
                                    </a>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
