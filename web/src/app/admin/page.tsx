'use client';

import { useEffect, useState, useRef } from 'react';
import { useQuery } from '@apollo/client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
    TestTube2,
    Truck,
    FolderOpen,
    AlertTriangle,
    Users,
    IndianRupee,
    CheckCircle,
    Clock,
    XCircle,
    Loader2,
    ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    ADMIN_DASHBOARD_STATS,
    AdminDashboardStatsResponse,
} from '@/graphql/admin';

// Spec: master spec Section 15 — Admin Dashboard Home
// Coordinator's command center with live stats

function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
    const [displayValue, setDisplayValue] = useState(0);
    const startTimeRef = useRef<number | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    useEffect(() => {
        startTimeRef.current = null;

        const animate = (timestamp: number) => {
            if (!startTimeRef.current) {
                startTimeRef.current = timestamp;
            }

            const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(Math.floor(easeOut * value));

            if (progress < 1) {
                animationFrameRef.current = requestAnimationFrame(animate);
            }
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [value, duration]);

    return <>{displayValue.toLocaleString('en-IN')}</>;
}

function formatCurrency(paise: number): string {
    const rupees = paise / 100;
    if (rupees >= 100000) {
        return `${(rupees / 100000).toFixed(1)}L`;
    }
    if (rupees >= 1000) {
        return `${(rupees / 1000).toFixed(1)}K`;
    }
    return rupees.toLocaleString('en-IN');
}

interface StatCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    href: string;
    color: string;
    subStats?: Array<{ label: string; value: number; icon?: React.ReactNode }>;
    isCurrency?: boolean;
    delay?: number;
}

function StatCard({
    title,
    value,
    icon,
    href,
    color,
    subStats,
    isCurrency,
    delay = 0,
}: StatCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay * 0.1, duration: 0.3 }}
        >
            <Link href={href} className="block">
                <div
                    className={cn(
                        'card-premium p-4 lg:p-5 transition-all duration-200',
                        'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer'
                    )}
                >
                    <div className="flex items-start justify-between mb-3">
                        <div
                            className={cn(
                                'w-10 h-10 rounded-xl flex items-center justify-center',
                                color
                            )}
                        >
                            {icon}
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>

                    <div className="mb-2">
                        <p className="text-2xl lg:text-3xl font-bold text-foreground">
                            {isCurrency ? (
                                <>
                                    <span className="text-lg">₹</span>
                                    {formatCurrency(value)}
                                </>
                            ) : (
                                <AnimatedNumber value={value} />
                            )}
                        </p>
                        <p className="text-sm text-muted-foreground">{title}</p>
                    </div>

                    {subStats && subStats.length > 0 && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 border-t border-border">
                            {subStats.map((stat, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-xs">
                                    {stat.icon}
                                    <span className="text-muted-foreground">{stat.label}:</span>
                                    <span className="font-medium text-foreground">{stat.value}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Link>
        </motion.div>
    );
}

export default function AdminDashboard() {
    const { data, loading, error } = useQuery<AdminDashboardStatsResponse>(ADMIN_DASHBOARD_STATS, {
        pollInterval: 30000, // Refresh every 30 seconds
    });

    const stats = data?.adminDashboardStats;

    if (loading && !stats) {
        return (
            <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 lg:p-8">
                <div className="card-premium p-6 text-center">
                    <AlertTriangle className="w-12 h-12 text-error mx-auto mb-3" />
                    <p className="text-foreground font-medium">Failed to load dashboard</p>
                    <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
                </div>
            </div>
        );
    }

    const labTotal =
        (stats?.labCollections.scheduled || 0) +
        (stats?.labCollections.completed || 0) +
        (stats?.labCollections.failed || 0);

    const deliveryTotal =
        (stats?.deliveries.pending || 0) +
        (stats?.deliveries.outForDelivery || 0) +
        (stats?.deliveries.delivered || 0) +
        (stats?.deliveries.failed || 0);

    return (
        <div className="p-4 lg:p-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 lg:mb-8"
            >
                <h1 className="text-xl lg:text-2xl font-bold text-foreground">
                    Good {getGreeting()}, Abhishikth
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Here&apos;s what&apos;s happening today
                </p>
            </motion.div>

            {/* SLA Alert Banner */}
            {stats && stats.slaBreaches > 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-6"
                >
                    <Link href="/admin/escalations">
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 hover:bg-red-100 transition-colors cursor-pointer">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-red-800">
                                    {stats.slaBreaches} SLA{' '}
                                    {stats.slaBreaches === 1 ? 'breach' : 'breaches'} need attention
                                </p>
                                <p className="text-sm text-red-600">
                                    Tap to view and resolve escalations
                                </p>
                            </div>
                            <ArrowRight className="w-5 h-5 text-red-400" />
                        </div>
                    </Link>
                </motion.div>
            )}

            {/* All Clear Banner */}
            {stats && stats.slaBreaches === 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-6"
                >
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="font-medium text-green-800">All clear!</p>
                            <p className="text-sm text-green-600">
                                No SLA breaches. Everything is on track.
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                {/* Lab Collections Today */}
                <StatCard
                    title="Lab Collections Today"
                    value={labTotal}
                    icon={<TestTube2 className="w-5 h-5 text-blue-600" />}
                    href="/admin/lab-orders"
                    color="bg-blue-100"
                    delay={0}
                    subStats={[
                        {
                            label: 'Scheduled',
                            value: stats?.labCollections.scheduled || 0,
                            icon: <Clock className="w-3 h-3 text-blue-500" />,
                        },
                        {
                            label: 'Completed',
                            value: stats?.labCollections.completed || 0,
                            icon: <CheckCircle className="w-3 h-3 text-green-500" />,
                        },
                        {
                            label: 'Failed',
                            value: stats?.labCollections.failed || 0,
                            icon: <XCircle className="w-3 h-3 text-red-500" />,
                        },
                    ]}
                />

                {/* Deliveries Today */}
                <StatCard
                    title="Deliveries Today"
                    value={deliveryTotal}
                    icon={<Truck className="w-5 h-5 text-purple-600" />}
                    href="/admin/deliveries"
                    color="bg-purple-100"
                    delay={1}
                    subStats={[
                        {
                            label: 'Pending',
                            value: stats?.deliveries.pending || 0,
                            icon: <Clock className="w-3 h-3 text-amber-500" />,
                        },
                        {
                            label: 'Out',
                            value: stats?.deliveries.outForDelivery || 0,
                            icon: <Truck className="w-3 h-3 text-blue-500" />,
                        },
                        {
                            label: 'Delivered',
                            value: stats?.deliveries.delivered || 0,
                            icon: <CheckCircle className="w-3 h-3 text-green-500" />,
                        },
                    ]}
                />

                {/* Open Cases */}
                <StatCard
                    title="Open Cases"
                    value={stats?.openCases || 0}
                    icon={<FolderOpen className="w-5 h-5 text-amber-600" />}
                    href="/admin/lab-orders?status=ORDERED"
                    color="bg-amber-100"
                    delay={2}
                />

                {/* SLA Breaches */}
                <StatCard
                    title="SLA Breaches"
                    value={stats?.slaBreaches || 0}
                    icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
                    href="/admin/escalations"
                    color={stats?.slaBreaches ? 'bg-red-100' : 'bg-green-100'}
                    delay={3}
                />

                {/* Active Patients */}
                <StatCard
                    title="Active Patients"
                    value={stats?.activePatients || 0}
                    icon={<Users className="w-5 h-5 text-teal-600" />}
                    href="/admin/patients"
                    color="bg-teal-100"
                    delay={4}
                />

                {/* Revenue This Month */}
                <StatCard
                    title="Revenue This Month"
                    value={stats?.revenueThisMonthPaise || 0}
                    icon={<IndianRupee className="w-5 h-5 text-green-600" />}
                    href="/admin"
                    color="bg-green-100"
                    delay={5}
                    isCurrency
                />
            </div>

            {/* Quick Actions */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-8"
            >
                <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <QuickActionButton
                        href="/admin/lab-orders?status=SLOT_BOOKED"
                        label="Assign Phlebotomists"
                        icon={<TestTube2 className="w-4 h-4" />}
                    />
                    <QuickActionButton
                        href="/admin/deliveries?status=PHARMACY_READY"
                        label="Arrange Deliveries"
                        icon={<Truck className="w-4 h-4" />}
                    />
                    <QuickActionButton
                        href="/admin/partners"
                        label="Manage Partners"
                        icon={<Users className="w-4 h-4" />}
                    />
                    <QuickActionButton
                        href="/admin/escalations"
                        label="View Escalations"
                        icon={<AlertTriangle className="w-4 h-4" />}
                    />
                </div>
            </motion.div>
        </div>
    );
}

function QuickActionButton({
    href,
    label,
    icon,
}: {
    href: string;
    label: string;
    icon: React.ReactNode;
}) {
    return (
        <Link
            href={href}
            className="flex items-center gap-2 px-4 py-3 bg-muted rounded-xl text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
        >
            {icon}
            {label}
        </Link>
    );
}

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
}
