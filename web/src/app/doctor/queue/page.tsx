'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, ChevronRight, Clock, User, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui';
import {
    DOCTOR_QUEUE,
    QUEUE_STATS,
    DoctorQueueResponse,
    QueueStatsResponse,
    CaseCard,
    DashboardStatus,
    HealthVertical,
    DASHBOARD_STATUS_CONFIG,
    VERTICAL_CONFIG,
    ATTENTION_LEVEL_CONFIG,
} from '@/graphql/dashboard';
import Link from 'next/link';

// Spec: master spec Section 5.1 — Case Queue

const STATUS_FILTERS: { value: DashboardStatus | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'All Cases' },
    { value: 'NEW', label: 'New' },
    { value: 'IN_REVIEW', label: 'In Review' },
    { value: 'AWAITING_RESPONSE', label: 'Awaiting Response' },
    { value: 'LAB_RESULTS_READY', label: 'Lab Results' },
    { value: 'FOLLOW_UP', label: 'Follow-Up' },
];

const VERTICAL_FILTERS: { value: HealthVertical | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'All Conditions' },
    { value: 'HAIR_LOSS', label: 'Hair Loss' },
    { value: 'SEXUAL_HEALTH', label: 'Sexual Health' },
    { value: 'PCOS', label: 'PCOS' },
    { value: 'WEIGHT_MANAGEMENT', label: 'Weight' },
];

export default function DoctorQueuePage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<DashboardStatus | 'ALL'>('ALL');
    const [verticalFilter, setVerticalFilter] = useState<HealthVertical | 'ALL'>('ALL');
    const [showFilters, setShowFilters] = useState(false);

    // Fetch queue data
    const { data: queueData, loading: queueLoading, refetch } = useQuery<DoctorQueueResponse>(
        DOCTOR_QUEUE,
        {
            variables: {
                filters: {
                    ...(statusFilter !== 'ALL' && { dashboardStatus: statusFilter }),
                    ...(verticalFilter !== 'ALL' && { vertical: verticalFilter }),
                },
            },
            fetchPolicy: 'cache-and-network',
        }
    );

    // Fetch stats
    const { data: statsData } = useQuery<QueueStatsResponse>(QUEUE_STATS, {
        fetchPolicy: 'cache-and-network',
    });

    // Filter cases by search query
    const filteredCases = useMemo(() => {
        const cases = queueData?.doctorQueue.cases || [];
        if (!searchQuery.trim()) return cases;

        const query = searchQuery.toLowerCase();
        return cases.filter(
            (c) =>
                c.patientName.toLowerCase().includes(query) ||
                c.id.toLowerCase().includes(query)
        );
    }, [queueData, searchQuery]);

    const stats = statsData?.queueStats;

    return (
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                            Case Queue
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            {stats?.totalActive || 0} active cases waiting for your review
                        </p>
                    </div>
                    <button
                        onClick={() => refetch()}
                        className="p-2 rounded-xl hover:bg-muted transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={cn('w-5 h-5 text-muted-foreground', queueLoading && 'animate-spin')} />
                    </button>
                </div>
            </motion.div>

            {/* Stats chips */}
            {stats && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-wrap gap-2 mb-6"
                >
                    <StatChip
                        label="New"
                        count={stats.new}
                        active={statusFilter === 'NEW'}
                        onClick={() => setStatusFilter(statusFilter === 'NEW' ? 'ALL' : 'NEW')}
                        color="success"
                    />
                    <StatChip
                        label="In Review"
                        count={stats.inReview}
                        active={statusFilter === 'IN_REVIEW'}
                        onClick={() => setStatusFilter(statusFilter === 'IN_REVIEW' ? 'ALL' : 'IN_REVIEW')}
                        color="warning"
                    />
                    <StatChip
                        label="Awaiting"
                        count={stats.awaitingResponse}
                        active={statusFilter === 'AWAITING_RESPONSE'}
                        onClick={() => setStatusFilter(statusFilter === 'AWAITING_RESPONSE' ? 'ALL' : 'AWAITING_RESPONSE')}
                        color="accent"
                    />
                    <StatChip
                        label="Lab Results"
                        count={stats.labResultsReady}
                        active={statusFilter === 'LAB_RESULTS_READY'}
                        onClick={() => setStatusFilter(statusFilter === 'LAB_RESULTS_READY' ? 'ALL' : 'LAB_RESULTS_READY')}
                        color="purple"
                    />
                    <StatChip
                        label="Follow-Up"
                        count={stats.followUp}
                        active={statusFilter === 'FOLLOW_UP'}
                        onClick={() => setStatusFilter(statusFilter === 'FOLLOW_UP' ? 'ALL' : 'FOLLOW_UP')}
                        color="info"
                    />
                </motion.div>
            )}

            {/* Search and filters */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-6"
            >
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search by patient name or case ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                            'px-4 py-2 rounded-xl border transition-colors flex items-center gap-2',
                            showFilters
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background border-border hover:border-primary/40'
                        )}
                    >
                        <Filter className="w-4 h-4" />
                        <span className="hidden sm:inline">Filters</span>
                    </button>
                </div>

                {/* Filter dropdowns */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as DashboardStatus | 'ALL')}
                                    className="px-4 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    {STATUS_FILTERS.map((f) => (
                                        <option key={f.value} value={f.value}>
                                            {f.label}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={verticalFilter}
                                    onChange={(e) => setVerticalFilter(e.target.value as HealthVertical | 'ALL')}
                                    className="px-4 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    {VERTICAL_FILTERS.map((f) => (
                                        <option key={f.value} value={f.value}>
                                            {f.label}
                                        </option>
                                    ))}
                                </select>
                                {(statusFilter !== 'ALL' || verticalFilter !== 'ALL') && (
                                    <button
                                        onClick={() => {
                                            setStatusFilter('ALL');
                                            setVerticalFilter('ALL');
                                        }}
                                        className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        Clear filters
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Case list */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-3"
            >
                {queueLoading && !queueData ? (
                    // Loading skeleton
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="card-premium p-4 animate-pulse">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-muted" />
                                <div className="flex-1">
                                    <div className="h-4 w-32 bg-muted rounded mb-2" />
                                    <div className="h-3 w-48 bg-muted rounded" />
                                </div>
                            </div>
                        </div>
                    ))
                ) : filteredCases.length === 0 ? (
                    <div className="card-premium p-8 text-center">
                        <p className="text-muted-foreground">
                            {searchQuery
                                ? 'No cases match your search.'
                                : 'No cases in your queue.'}
                        </p>
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {filteredCases.map((caseItem, index) => (
                            <motion.div
                                key={caseItem.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <CaseCardComponent caseData={caseItem} />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </motion.div>
        </div>
    );
}

function StatChip({
    label,
    count,
    active,
    onClick,
    color,
}: {
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
    color: 'success' | 'warning' | 'accent' | 'purple' | 'info';
}) {
    const colors = {
        success: active ? 'bg-success text-white' : 'bg-success/10 text-success hover:bg-success/20',
        warning: active ? 'bg-warning text-white' : 'bg-warning/10 text-warning hover:bg-warning/20',
        accent: active ? 'bg-accent text-white' : 'bg-accent/10 text-accent hover:bg-accent/20',
        purple: active ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-600 hover:bg-purple-200',
        info: active ? 'bg-info text-white' : 'bg-info/10 text-info hover:bg-info/20',
    };

    return (
        <button
            onClick={onClick}
            className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2',
                colors[color]
            )}
        >
            <span>{label}</span>
            <span className={cn('font-bold', active ? 'text-white/90' : '')}>
                {count}
            </span>
        </button>
    );
}

function CaseCardComponent({ caseData }: { caseData: CaseCard }) {
    const statusConfig = DASHBOARD_STATUS_CONFIG[caseData.dashboardStatus];
    const verticalConfig = VERTICAL_CONFIG[caseData.vertical];
    const attentionConfig = caseData.aiAttentionLevel
        ? ATTENTION_LEVEL_CONFIG[caseData.aiAttentionLevel]
        : null;

    const patientInfo = [
        caseData.patientAge && `${caseData.patientAge}y`,
        caseData.patientSex,
    ]
        .filter(Boolean)
        .join(', ');

    return (
        <Link
            href={`/doctor/case/${caseData.id}`}
            className="card-premium p-4 flex items-center gap-4 hover:shadow-soft-lg transition-shadow group"
        >
            {/* Avatar placeholder */}
            <div
                className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center text-lg',
                    verticalConfig.bgColor
                )}
            >
                {verticalConfig.icon}
            </div>

            {/* Main info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground truncate">
                        {caseData.patientName}
                    </h3>
                    {caseData.isFollowUp && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-info/10 text-info">
                            Follow-up
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {patientInfo && (
                        <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {patientInfo}
                        </span>
                    )}
                    <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDistanceToNow(new Date(caseData.createdAt), { addSuffix: true })}
                    </span>
                </div>
            </div>

            {/* Status badges */}
            <div className="flex items-center gap-2">
                {/* Attention level badge */}
                {attentionConfig && caseData.aiAttentionLevel !== 'LOW' && (
                    <span
                        className={cn(
                            'px-2 py-1 rounded-lg text-xs font-medium',
                            attentionConfig.bgColor,
                            attentionConfig.color
                        )}
                    >
                        {attentionConfig.label} Priority
                    </span>
                )}

                {/* Vertical badge */}
                <span
                    className={cn(
                        'px-2 py-1 rounded-lg text-xs font-medium hidden sm:block',
                        verticalConfig.bgColor,
                        verticalConfig.color
                    )}
                >
                    {verticalConfig.label}
                </span>

                {/* Status badge */}
                <span
                    className={cn(
                        'px-2 py-1 rounded-lg text-xs font-medium',
                        statusConfig.bgColor,
                        statusConfig.color
                    )}
                >
                    {statusConfig.label}
                </span>

                {/* Chevron */}
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
        </Link>
    );
}
