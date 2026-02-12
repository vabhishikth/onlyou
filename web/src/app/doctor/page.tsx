'use client';

import { motion } from 'framer-motion';
import { Users, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

// Mock stats - will be replaced with real data
const stats = [
    {
        label: 'New Cases',
        value: 12,
        icon: Users,
        color: 'text-warning',
        bgColor: 'bg-warning/10',
    },
    {
        label: 'In Review',
        value: 5,
        icon: Clock,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
    },
    {
        label: 'Completed Today',
        value: 8,
        icon: CheckCircle,
        color: 'text-success',
        bgColor: 'bg-success/10',
    },
    {
        label: 'Needs Attention',
        value: 3,
        icon: AlertTriangle,
        color: 'text-error',
        bgColor: 'bg-error/10',
    },
];

export default function DoctorDashboard() {
    const { user } = useAuth();

    const greeting = getGreeting();

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                    {greeting}, Dr. {user?.name?.split(' ')[0] || 'Doctor'}
                </h1>
                <p className="text-muted-foreground mt-1">
                    Here's what's happening with your patients today.
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
                            {stat.value}
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
                        description="12 cases waiting for review"
                        color="primary"
                    />
                    <QuickAction
                        href="/doctor/queue?filter=lab"
                        title="Lab Results"
                        description="3 new lab results available"
                        color="accent"
                    />
                    <QuickAction
                        href="/doctor/messages"
                        title="Messages"
                        description="5 unread patient messages"
                        color="secondary"
                    />
                </div>
            </motion.div>

            {/* Recent cases placeholder */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="card-premium p-6 mt-6"
            >
                <h2 className="text-lg font-semibold text-foreground mb-4">
                    Recent Cases
                </h2>
                <p className="text-muted-foreground text-sm">
                    Case list will appear here once connected to the backend.
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
        primary: 'border-primary/20 hover:border-primary/40 hover:bg-primary/5',
        accent: 'border-accent/20 hover:border-accent/40 hover:bg-accent/5',
        secondary: 'border-secondary/20 hover:border-secondary/40 hover:bg-secondary/5',
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
