'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle,
    Clock,
    Phone,
    User,
    TestTube2,
    Truck,
    ChevronDown,
    ExternalLink,
    Loader2,
    CheckCircle,
    Filter,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
    SLA_ESCALATIONS,
    SLAEscalationsResponse,
    SLAEscalation,
    SLA_STATUS_CONFIG,
    VERTICAL_CONFIG,
    HealthVertical,
} from '@/graphql/admin';

// Spec: master spec Section 7.4 — SLA Escalation Dashboard
// Shows all SLA breaches with responsible party and contact info

type FilterType = 'ALL' | 'LAB_ORDER' | 'DELIVERY';

export default function EscalationsPage() {
    const [filter, setFilter] = useState<FilterType>('ALL');

    const { data, loading, error } = useQuery<SLAEscalationsResponse>(SLA_ESCALATIONS, {
        pollInterval: 30000, // Refresh every 30 seconds
    });

    const escalations = data?.slaEscalations || [];
    const filteredEscalations = escalations.filter((e) => {
        if (filter === 'ALL') return true;
        return e.type === filter;
    });

    const labOrderCount = escalations.filter((e) => e.type === 'LAB_ORDER').length;
    const deliveryCount = escalations.filter((e) => e.type === 'DELIVERY').length;

    if (loading && !data) {
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
                    <p className="text-foreground font-medium">Failed to load escalations</p>
                    <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
            >
                <h1 className="text-xl lg:text-2xl font-bold text-foreground">
                    SLA Escalations
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {escalations.length === 0
                        ? 'All clear! No SLA breaches to handle.'
                        : `${escalations.length} item${escalations.length === 1 ? '' : 's'} need${escalations.length === 1 ? 's' : ''} attention`}
                </p>
            </motion.div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                <SummaryCard
                    label="Total"
                    count={escalations.length}
                    active={filter === 'ALL'}
                    onClick={() => setFilter('ALL')}
                    color="bg-red-100 text-red-600"
                />
                <SummaryCard
                    label="Lab Orders"
                    count={labOrderCount}
                    active={filter === 'LAB_ORDER'}
                    onClick={() => setFilter('LAB_ORDER')}
                    color="bg-blue-100 text-blue-600"
                    icon={<TestTube2 className="w-4 h-4" />}
                />
                <SummaryCard
                    label="Deliveries"
                    count={deliveryCount}
                    active={filter === 'DELIVERY'}
                    onClick={() => setFilter('DELIVERY')}
                    color="bg-purple-100 text-purple-600"
                    icon={<Truck className="w-4 h-4" />}
                />
            </div>

            {/* All Clear State */}
            {escalations.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="card-premium p-8 text-center"
                >
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground mb-2">
                        All Clear!
                    </h2>
                    <p className="text-muted-foreground">
                        No SLA breaches at the moment. Everything is running smoothly.
                    </p>
                </motion.div>
            )}

            {/* Escalation List */}
            {filteredEscalations.length > 0 && (
                <div className="space-y-3">
                    {filteredEscalations.map((escalation, index) => (
                        <motion.div
                            key={escalation.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <EscalationCard escalation={escalation} />
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Empty filtered state */}
            {filteredEscalations.length === 0 && escalations.length > 0 && (
                <div className="card-premium p-6 text-center">
                    <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-foreground font-medium">
                        No {filter === 'LAB_ORDER' ? 'lab order' : 'delivery'} escalations
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Try a different filter
                    </p>
                </div>
            )}
        </div>
    );
}

function SummaryCard({
    label,
    count,
    active,
    onClick,
    color,
    icon,
}: {
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
    color: string;
    icon?: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'card-premium p-3 text-center transition-all',
                active ? 'ring-2 ring-primary' : 'hover:shadow-md'
            )}
        >
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2', color)}>
                {icon || <AlertTriangle className="w-4 h-4" />}
            </div>
            <p className="text-2xl font-bold text-foreground">{count}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
        </button>
    );
}

function EscalationCard({ escalation }: { escalation: SLAEscalation }) {
    const [expanded, setExpanded] = useState(false);

    const slaConfig = SLA_STATUS_CONFIG[escalation.slaInfo.status];
    const verticalConfig = escalation.vertical
        ? VERTICAL_CONFIG[escalation.vertical as HealthVertical]
        : null;

    const getTypeIcon = () => {
        if (escalation.type === 'LAB_ORDER') {
            return <TestTube2 className="w-4 h-4 text-blue-600" />;
        }
        return <Truck className="w-4 h-4 text-purple-600" />;
    };

    const getTypeLabel = () => {
        return escalation.type === 'LAB_ORDER' ? 'Lab Order' : 'Delivery';
    };

    const getDetailLink = () => {
        if (escalation.type === 'LAB_ORDER') {
            return `/admin/lab-orders?id=${escalation.resourceId}`;
        }
        return `/admin/deliveries?id=${escalation.resourceId}`;
    };

    return (
        <div className="card-premium overflow-hidden border-l-4 border-red-500">
            <div
                className="p-4 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        {/* Type and Status Badge */}
                        <div className="flex items-center gap-2 mb-2">
                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-muted rounded text-xs font-medium">
                                {getTypeIcon()}
                                {getTypeLabel()}
                            </span>
                            <span className={cn('px-2 py-0.5 rounded text-xs font-medium', slaConfig.bgColor, slaConfig.color)}>
                                {slaConfig.label}
                            </span>
                            {verticalConfig && (
                                <span className={cn('text-xs', verticalConfig.color)}>
                                    {verticalConfig.label}
                                </span>
                            )}
                        </div>

                        {/* Patient Info */}
                        <div className="flex items-center gap-2 mb-1">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-foreground">
                                {escalation.patientName || 'Unknown Patient'}
                            </span>
                        </div>

                        {/* SLA Reason */}
                        <p className="text-sm text-muted-foreground">
                            {escalation.slaInfo.reason}
                        </p>

                        {/* Overdue Time */}
                        {escalation.slaInfo.hoursOverdue && escalation.slaInfo.hoursOverdue > 0 && (
                            <div className="flex items-center gap-1.5 mt-2 text-red-600 text-sm">
                                <Clock className="w-4 h-4" />
                                <span className="font-medium">
                                    {escalation.slaInfo.hoursOverdue}h overdue
                                </span>
                            </div>
                        )}
                    </div>

                    <ChevronDown
                        className={cn(
                            'w-5 h-5 text-muted-foreground transition-transform ml-2',
                            expanded && 'rotate-180'
                        )}
                    />
                </div>
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border overflow-hidden"
                    >
                        <div className="p-4 space-y-4">
                            {/* Responsible Party */}
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <p className="text-xs text-amber-600 font-medium mb-1">RESPONSIBLE PARTY</p>
                                <p className="font-medium text-amber-800">{escalation.responsibleParty}</p>
                                {escalation.responsibleContact && (
                                    <a
                                        href={`tel:${escalation.responsibleContact}`}
                                        className="flex items-center gap-2 mt-2 text-sm text-amber-700 hover:text-amber-900"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Phone className="w-4 h-4" />
                                        {escalation.responsibleContact}
                                    </a>
                                )}
                            </div>

                            {/* Deadline */}
                            {escalation.slaInfo.deadlineAt && (
                                <div className="flex items-center gap-2 text-sm">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Deadline:</span>
                                    <span className="text-foreground font-medium">
                                        {new Date(escalation.slaInfo.deadlineAt).toLocaleString('en-IN', {
                                            dateStyle: 'medium',
                                            timeStyle: 'short',
                                        })}
                                    </span>
                                </div>
                            )}

                            {/* Created At */}
                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Escalated:</span>
                                <span className="text-foreground">
                                    {new Date(escalation.createdAt).toLocaleString('en-IN', {
                                        dateStyle: 'medium',
                                        timeStyle: 'short',
                                    })}
                                </span>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <Link
                                    href={getDetailLink()}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    View Details
                                </Link>
                                {escalation.responsibleContact && (
                                    <a
                                        href={`tel:${escalation.responsibleContact}`}
                                        className="px-4 py-2.5 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors flex items-center gap-2"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Phone className="w-4 h-4" />
                                        Call
                                    </a>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
