'use client';

import { motion } from 'framer-motion';
import { useQuery } from '@apollo/client';
import { Users, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { QUEUE_STATS } from '@/graphql/dashboard';

// Spec: master spec Section 5 (Doctor Dashboard — Home)

export default function DoctorDashboard() {
    const { user } = useAuth();
    const { data, loading } = useQuery(QUEUE_STATS);

    const queueStats = data?.queueStats;

    const stats = [
        {
            label: 'New Cases',
            value: queueStats?.new ?? 0,
            icon: Users,
            color: 'text-warm',
            bgColor: 'bg-warm/10',
        },
        {
            label: 'In Review',
            value: queueStats?.inReview ?? 0,
            icon: Clock,
            color: 'text-accent',
            bgColor: 'bg-accent/10',
        },
        {
            label: 'Completed',
            value: queueStats?.completed ?? 0,
            icon: CheckCircle,
            color: 'text-success',
            bgColor: 'bg-success/10',
        },
        {
            label: 'Needs Attention',
            value: (queueStats?.awaitingResponse ?? 0) + (queueStats?.labResultsReady ?? 0),
            icon: AlertTriangle,
            color: 'text-error',
            bgColor: 'bg-error/10',
        },
    ];

    const greeting = getGreeting();

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-2xl lg:text-3xl font-serif font-bold text-foreground">
                    {greeting}, {getDoctorDisplayName(user?.name)}
                </h1>
                <p className="text-muted-foreground mt-1">
                    Here&apos;s what&apos;s happening with your patients today.
                </p>
            </motion.div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
                {stats.map((stat, index) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="card-premium p-5"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className={cn('p-2 rounded-xl', stat.bgColor)}>
                                <stat.icon className={cn('w-5 h-5', stat.color)} />
                            </div>
                        </div>
                        <p className="text-2xl lg:text-3xl font-bold text-foreground">
                            {loading ? '\u2014' : stat.value}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {stat.label}
                        </p>
                    </motion.div>
                ))}
            </div>

            {/* Quick actions */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="card-premium p-6"
            >
                <h2 className="text-lg font-semibold text-foreground mb-4">
                    Quick Actions
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <QuickAction
                        href="/doctor/queue"
                        title="Review Cases"
                        description={`${queueStats?.new ?? 0} cases waiting for review`}
                        color="primary"
                    />
                    <QuickAction
                        href="/doctor/queue?filter=lab"
                        title="Lab Results"
                        description={`${queueStats?.labResultsReady ?? 0} new lab results available`}
                        color="accent"
                    />
                    <QuickAction
                        href="/doctor/messages"
                        title="Messages"
                        description={`${queueStats?.awaitingResponse ?? 0} patients awaiting response`}
                        color="secondary"
                    />
                </div>
            </motion.div>

            {/* Active cases summary */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="card-premium p-6 mt-6"
            >
                <h2 className="text-lg font-semibold text-foreground mb-4">
                    Summary
                </h2>
                <p className="text-muted-foreground text-sm">
                    You have <span className="font-semibold text-foreground">{queueStats?.totalActive ?? 0}</span> active cases.
                    {(queueStats?.followUp ?? 0) > 0 && (
                        <> <span className="font-semibold text-foreground">{queueStats.followUp}</span> follow-ups pending.</>
                    )}
                </p>
            </motion.div>
        </div>
    );
}

function QuickAction({
    href,
    title,
    description,
    color,
}: {
    href: string;
    title: string;
    description: string;
    color: 'primary' | 'accent' | 'secondary';
}) {
    const colors = {
        primary: 'border-border hover:border-foreground/30 hover:bg-neutral-50',
        accent: 'border-border hover:border-accent/40 hover:bg-accent/5',
        secondary: 'border-border hover:border-warm/40 hover:bg-warm/5',
    };

    return (
        <a
            href={href}
            className={cn(
                'block p-4 rounded-xl border-2 transition-all duration-200',
                colors[color]
            )}
        >
            <h3 className="font-medium text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </a>
    );
}

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

function getDoctorDisplayName(name?: string | null): string {
    if (!name) return 'Doctor';
    // If name already starts with "Dr.", use as-is (e.g. "Dr. Arjun Mehta" → "Dr. Arjun")
    if (name.startsWith('Dr.') || name.startsWith('Dr ')) {
        const parts = name.replace(/^Dr\.?\s*/, '').split(' ');
        return `Dr. ${parts[0]}`;
    }
    return `Dr. ${name.split(' ')[0]}`;
}
