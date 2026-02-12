'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Pill,
    Clock,
    CheckCircle,
    AlertTriangle,
    Loader2,
    X,
    FileText,
    Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    PHARMACY_TODAY_SUMMARY,
    PHARMACY_NEW_ORDERS,
    PHARMACY_START_PREPARING,
    PHARMACY_REPORT_STOCK_ISSUE,
    PharmacyTodaySummaryResponse,
    PharmacyNewOrdersResponse,
    PharmacyOrderSummary,
    PHARMACY_STATUS_CONFIG,
} from '@/graphql/pharmacy-portal';

// Spec: master spec Section 8.1 — Pharmacy Portal
// New Orders tab: incoming prescriptions to prepare

export default function PharmacyNewOrdersPage() {
    const [selectedOrder, setSelectedOrder] = useState<PharmacyOrderSummary | null>(null);
    const [showPrescription, setShowPrescription] = useState(false);
    const [showStockIssue, setShowStockIssue] = useState(false);
    const [missingMeds, setMissingMeds] = useState<string[]>([]);

    const { data: summaryData, loading: summaryLoading } = useQuery<PharmacyTodaySummaryResponse>(
        PHARMACY_TODAY_SUMMARY,
        { pollInterval: 30000 }
    );

    const { data: ordersData, loading: ordersLoading, refetch } = useQuery<PharmacyNewOrdersResponse>(
        PHARMACY_NEW_ORDERS,
        { pollInterval: 30000 }
    );

    const [startPreparing, { loading: starting }] = useMutation(PHARMACY_START_PREPARING, {
        onCompleted: () => {
            setSelectedOrder(null);
            refetch();
        },
    });

    const [reportIssue, { loading: reporting }] = useMutation(PHARMACY_REPORT_STOCK_ISSUE, {
        onCompleted: () => {
            setShowStockIssue(false);
            setSelectedOrder(null);
            setMissingMeds([]);
            refetch();
        },
    });

    const summary = summaryData?.pharmacyTodaySummary;
    const orders = ordersData?.pharmacyNewOrders || [];

    const handleStartPreparing = (order: PharmacyOrderSummary) => {
        setSelectedOrder(order);
        startPreparing({ variables: { orderId: order.id } });
    };

    const openStockIssue = (order: PharmacyOrderSummary) => {
        setSelectedOrder(order);
        setMissingMeds([]);
        setShowStockIssue(true);
    };

    const openPrescription = (order: PharmacyOrderSummary) => {
        setSelectedOrder(order);
        setShowPrescription(true);
    };

    const toggleMissingMed = (medName: string) => {
        setMissingMeds((prev) =>
            prev.includes(medName)
                ? prev.filter((m) => m !== medName)
                : [...prev, medName]
        );
    };

    const handleReportIssue = () => {
        if (!selectedOrder || missingMeds.length === 0) return;
        reportIssue({
            variables: {
                input: {
                    orderId: selectedOrder.id,
                    missingMedications: missingMeds,
                },
            },
        });
    };

    const loading = summaryLoading || ordersLoading;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
        );
    }

    return (
        <div className="p-4 max-w-lg mx-auto">
            {/* Summary stats */}
            {summary && (
                <div className="grid grid-cols-3 gap-2 mb-6">
                    <SummaryCard
                        label="New"
                        count={summary.newOrders}
                        icon={<Pill className="w-4 h-4" />}
                        color="bg-amber-100 text-amber-600"
                        active
                    />
                    <SummaryCard
                        label="Preparing"
                        count={summary.preparing}
                        icon={<Clock className="w-4 h-4" />}
                        color="bg-blue-100 text-blue-600"
                    />
                    <SummaryCard
                        label="Ready"
                        count={summary.ready}
                        icon={<CheckCircle className="w-4 h-4" />}
                        color="bg-green-100 text-green-600"
                    />
                </div>
            )}

            {/* Section title */}
            <h2 className="text-lg font-semibold text-foreground mb-3">
                New Orders ({orders.length})
            </h2>

            {/* Empty state */}
            {orders.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="card-premium p-8 text-center"
                >
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        No New Orders
                    </h3>
                    <p className="text-muted-foreground">
                        New prescriptions will appear here.
                    </p>
                </motion.div>
            )}

            {/* Order list */}
            <div className="space-y-3">
                {orders.map((order, index) => (
                    <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <OrderCard
                            order={order}
                            onStartPreparing={() => handleStartPreparing(order)}
                            onViewPrescription={() => openPrescription(order)}
                            onStockIssue={() => openStockIssue(order)}
                            loading={starting && selectedOrder?.id === order.id}
                        />
                    </motion.div>
                ))}
            </div>

            {/* View Prescription Dialog */}
            <AnimatePresence>
                {showPrescription && selectedOrder && (
                    <Dialog onClose={() => setShowPrescription(false)}>
                        <div className="text-center mb-4">
                            <h3 className="text-lg font-semibold text-foreground">
                                Prescription
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Order {selectedOrder.orderId}
                            </p>
                        </div>

                        {selectedOrder.prescriptionUrl ? (
                            <div className="bg-muted rounded-lg p-4 mb-4">
                                <a
                                    href={selectedOrder.prescriptionUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 text-green-600 hover:text-green-700"
                                >
                                    <FileText className="w-5 h-5" />
                                    View Full Prescription PDF
                                </a>
                            </div>
                        ) : (
                            <div className="bg-muted rounded-lg p-4 mb-4 text-center text-muted-foreground">
                                Prescription PDF not available
                            </div>
                        )}

                        <div className="mb-4">
                            <h4 className="font-medium text-foreground mb-2">Medications</h4>
                            <div className="space-y-2">
                                {selectedOrder.medications.map((med, idx) => (
                                    <div key={idx} className="flex justify-between p-3 bg-muted rounded-lg">
                                        <div>
                                            <p className="font-medium text-foreground">{med.name}</p>
                                            <p className="text-sm text-muted-foreground">{med.dosage}</p>
                                        </div>
                                        <span className="font-semibold text-foreground">×{med.quantity}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => setShowPrescription(false)}
                            className="w-full py-3 bg-muted text-foreground rounded-xl font-medium"
                        >
                            Close
                        </button>
                    </Dialog>
                )}
            </AnimatePresence>

            {/* Stock Issue Dialog */}
            <AnimatePresence>
                {showStockIssue && selectedOrder && (
                    <Dialog onClose={() => setShowStockIssue(false)}>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-8 h-8 text-red-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">
                                Stock Issue
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Order {selectedOrder.orderId}
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Select unavailable medications
                            </label>
                            <div className="space-y-2">
                                {selectedOrder.medications.map((med, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => toggleMissingMed(med.name)}
                                        className={cn(
                                            'w-full p-3 rounded-lg border text-left transition-all flex justify-between items-center',
                                            missingMeds.includes(med.name)
                                                ? 'border-red-500 bg-red-50'
                                                : 'border-border hover:border-red-300'
                                        )}
                                    >
                                        <div>
                                            <p className={cn(
                                                'font-medium',
                                                missingMeds.includes(med.name) ? 'text-red-700' : 'text-foreground'
                                            )}>
                                                {med.name}
                                            </p>
                                            <p className="text-sm text-muted-foreground">{med.dosage}</p>
                                        </div>
                                        {missingMeds.includes(med.name) && (
                                            <span className="text-red-600 font-medium">Unavailable</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleReportIssue}
                            disabled={reporting || missingMeds.length === 0}
                            className="w-full py-4 bg-red-600 text-white rounded-xl font-semibold text-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {reporting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <AlertTriangle className="w-5 h-5" />
                            )}
                            Report Stock Issue
                        </button>
                    </Dialog>
                )}
            </AnimatePresence>
        </div>
    );
}

function SummaryCard({
    label,
    count,
    icon,
    color,
    active,
}: {
    label: string;
    count: number;
    icon: React.ReactNode;
    color: string;
    active?: boolean;
}) {
    return (
        <div className={cn('card-premium p-3 text-center', active && 'ring-2 ring-green-500')}>
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1', color)}>
                {icon}
            </div>
            <p className="text-2xl font-bold text-foreground">{count}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    );
}

function OrderCard({
    order,
    onStartPreparing,
    onViewPrescription,
    onStockIssue,
    loading,
}: {
    order: PharmacyOrderSummary;
    onStartPreparing: () => void;
    onViewPrescription: () => void;
    onStockIssue: () => void;
    loading: boolean;
}) {
    return (
        <div className="card-premium p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div>
                    <span className="font-mono font-semibold text-foreground">
                        {order.orderId}
                    </span>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {order.patientArea}
                    </p>
                </div>
                <span className={cn(
                    'px-2 py-0.5 rounded text-xs font-medium',
                    PHARMACY_STATUS_CONFIG[order.status]?.bgColor || 'bg-gray-100',
                    PHARMACY_STATUS_CONFIG[order.status]?.color || 'text-gray-600'
                )}>
                    {PHARMACY_STATUS_CONFIG[order.status]?.label || order.status}
                </span>
            </div>

            {/* Medications */}
            <div className="mb-4">
                {order.medications.map((med, idx) => (
                    <div key={idx} className="flex justify-between py-1.5 border-b border-border last:border-0">
                        <div>
                            <p className="font-medium text-foreground text-sm">{med.name}</p>
                            <p className="text-xs text-muted-foreground">{med.dosage}</p>
                        </div>
                        <span className="font-semibold text-foreground">×{med.quantity}</span>
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mb-2">
                <button
                    onClick={onViewPrescription}
                    className="flex-1 h-10 bg-muted text-foreground rounded-lg font-medium text-sm flex items-center justify-center gap-1 hover:bg-muted/80"
                >
                    <FileText className="w-4 h-4" />
                    Prescription
                </button>
                <button
                    onClick={onStockIssue}
                    className="h-10 px-4 bg-red-100 text-red-600 rounded-lg font-medium text-sm flex items-center justify-center hover:bg-red-200"
                >
                    <AlertTriangle className="w-4 h-4" />
                </button>
            </div>

            <button
                onClick={onStartPreparing}
                disabled={loading}
                className="w-full h-12 bg-green-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50"
            >
                {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <Package className="w-5 h-5" />
                )}
                Start Preparing
            </button>
        </div>
    );
}

function Dialog({
    children,
    onClose,
}: {
    children: React.ReactNode;
    onClose: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        >
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25 }}
                className="relative bg-card rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-muted rounded-lg"
                >
                    <X className="w-5 h-5 text-muted-foreground" />
                </button>
                {children}
            </motion.div>
        </motion.div>
    );
}
