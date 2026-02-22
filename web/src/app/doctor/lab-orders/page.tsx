'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TestTube, AlertTriangle, ShieldCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui';
import {
    DOCTOR_LAB_ORDERS,
    ACKNOWLEDGE_CRITICAL_VALUE,
    DoctorLabOrdersResponse,
    LAB_ORDER_STATUS_CONFIG,
    LabOrderStatus,
} from '@/graphql/lab-order';
import Link from 'next/link';

// Spec: master spec Section 7 — Blood Work & Diagnostics
// Spec: Phase 16 — Doctor acknowledge critical value

const STATUS_FILTERS: { value: string; label: string }[] = [
    { value: 'ALL', label: 'All' },
    { value: 'ORDERED', label: 'Ordered' },
    { value: 'RESULTS_READY', label: 'Results Ready' },
    { value: 'DOCTOR_REVIEWED', label: 'Reviewed' },
    { value: 'CLOSED', label: 'Closed' },
];

export default function LabOrdersPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
    const [ackNotes, setAckNotes] = useState('');

    const { data, loading, refetch } = useQuery<DoctorLabOrdersResponse>(
        DOCTOR_LAB_ORDERS,
        {
            variables: {},
            fetchPolicy: 'cache-and-network',
        }
    );

    const [acknowledgeCritical] = useMutation(ACKNOWLEDGE_CRITICAL_VALUE, {
        onCompleted: () => {
            setAcknowledgingId(null);
            setAckNotes('');
            refetch();
        },
    });

    const labOrders = data?.doctorLabOrders || [];

    const filtered = useMemo(() => {
        let items = labOrders;

        if (statusFilter !== 'ALL') {
            items = items.filter((o) => o.status === statusFilter);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            items = items.filter((o) =>
                (o.patientName || '').toLowerCase().includes(q)
            );
        }

        return items;
    }, [labOrders, statusFilter, searchQuery]);

    const getStatusConfig = (status: string) => {
        return LAB_ORDER_STATUS_CONFIG[status as LabOrderStatus] || {
            label: status,
            color: 'bg-gray-500',
        };
    };

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-2xl lg:text-3xl font-serif font-bold text-foreground">
                    Lab Orders
                </h1>
                <p className="text-muted-foreground mt-1">
                    Track blood work and diagnostic orders.
                </p>
            </motion.div>

            {/* Search and filters */}
            <div className="mb-6 space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by patient name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {STATUS_FILTERS.map((f) => (
                        <button
                            key={f.value}
                            onClick={() => setStatusFilter(f.value)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                statusFilter === f.value
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading state */}
            {loading && (
                <div data-testid="lab-orders-loading" className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="card-premium p-5 animate-pulse">
                            <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                            <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {!loading && filtered.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card-premium p-12 text-center"
                >
                    <TestTube className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-foreground mb-2">
                        No Lab Orders
                    </h2>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                        Lab orders and blood work requests will appear here.
                    </p>
                </motion.div>
            )}

            {/* Lab order cards */}
            {!loading && filtered.length > 0 && (
                <div className="space-y-3">
                    {filtered.map((order) => {
                        const statusConfig = getStatusConfig(order.status);
                        const isResultsReady = order.status === 'RESULTS_READY' || order.status === 'RESULTS_UPLOADED';

                        return (
                            <motion.div
                                key={order.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`card-premium p-5 hover:shadow-md transition-shadow ${
                                    isResultsReady ? 'ring-1 ring-green-500/30' : ''
                                }`}
                                {...(isResultsReady ? { 'data-testid': 'results-ready-highlight' } : {})}
                            >
                                <Link href={`/doctor/case/${order.consultationId}`}>
                                    <div className="flex items-center justify-between cursor-pointer">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold text-foreground truncate">
                                                    {order.patientName || 'Unknown Patient'}
                                                </span>
                                                {order.criticalValues && (
                                                    <span data-testid="critical-indicator" className="flex items-center gap-1 text-xs text-red-600 font-medium">
                                                        <AlertTriangle className="w-3.5 h-3.5" />
                                                        Critical
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                <span>{order.panelName || order.testPanel.join(', ')}</span>
                                                <span>
                                                    Ordered {formatDistanceToNow(new Date(order.orderedAt), { addSuffix: true })}
                                                </span>
                                            </div>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium text-white ${statusConfig.color}`}>
                                            {statusConfig.label}
                                        </span>
                                    </div>
                                </Link>

                                {/* Phase 16: Acknowledge critical value */}
                                {order.criticalValues && isResultsReady && (
                                    <div className="mt-3 pt-3 border-t border-border">
                                        {acknowledgingId !== order.id ? (
                                            <button
                                                data-testid={`acknowledge-${order.id}`}
                                                onClick={() => setAcknowledgingId(order.id)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                                            >
                                                <ShieldCheck className="w-3.5 h-3.5" />
                                                Acknowledge Critical Value
                                            </button>
                                        ) : (
                                            <AnimatePresence>
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                >
                                                    <input
                                                        data-testid="acknowledge-notes-input"
                                                        type="text"
                                                        placeholder="Action taken (e.g., Patient contacted)..."
                                                        value={ackNotes}
                                                        onChange={(e) => setAckNotes(e.target.value)}
                                                        className="w-full px-3 py-2 border border-border rounded-lg text-sm mb-2"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            data-testid="confirm-acknowledge"
                                                            onClick={() =>
                                                                acknowledgeCritical({
                                                                    variables: {
                                                                        labOrderId: order.id,
                                                                        labResultId: order.id,
                                                                        notes: ackNotes,
                                                                    },
                                                                })
                                                            }
                                                            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
                                                        >
                                                            Confirm
                                                        </button>
                                                        <button
                                                            onClick={() => setAcknowledgingId(null)}
                                                            className="px-3 py-2 text-sm text-neutral-500 hover:text-foreground transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            </AnimatePresence>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
