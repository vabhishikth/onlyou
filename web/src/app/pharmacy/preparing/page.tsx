'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock,
    CheckCircle,
    Loader2,
    X,
    ArrowRightLeft,
    ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    PHARMACY_PREPARING_ORDERS,
    PHARMACY_MARK_READY,
    PHARMACY_PROPOSE_SUBSTITUTION,
    PHARMACY_CONFIRM_DISCREET_PACKAGING,
    PharmacyPreparingOrdersResponse,
    PharmacyOrderSummary,
    PHARMACY_STATUS_CONFIG,
} from '@/graphql/pharmacy-portal';

// Spec: master spec Section 8.1 — Pharmacy Portal
// Spec: Phase 15 — Substitution proposal + discreet packaging
// Preparing tab: orders currently being prepared

export default function PharmacyPreparingPage() {
    const [selectedOrder, setSelectedOrder] = useState<PharmacyOrderSummary | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    const { data, loading, refetch } = useQuery<PharmacyPreparingOrdersResponse>(
        PHARMACY_PREPARING_ORDERS,
        { pollInterval: 30000 }
    );

    const [markReady, { loading: marking }] = useMutation(PHARMACY_MARK_READY, {
        onCompleted: () => {
            setShowConfirmDialog(false);
            setSelectedOrder(null);
            refetch();
        },
    });

    const [proposeSubstitution] = useMutation(PHARMACY_PROPOSE_SUBSTITUTION, {
        onCompleted: () => refetch(),
    });

    const [confirmDiscreetPackaging] = useMutation(PHARMACY_CONFIRM_DISCREET_PACKAGING, {
        onCompleted: () => refetch(),
    });

    const orders = data?.pharmacyPreparingOrders || [];

    const openConfirmDialog = (order: PharmacyOrderSummary) => {
        setSelectedOrder(order);
        setShowConfirmDialog(true);
    };

    const handleMarkReady = () => {
        if (!selectedOrder) return;
        markReady({ variables: { orderId: selectedOrder.id } });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
        );
    }

    return (
        <div className="p-4 max-w-lg mx-auto">
            {/* Section title */}
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Preparing ({orders.length})
            </h2>

            {/* Empty state */}
            {orders.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="card-premium p-8 text-center"
                >
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        No Orders Preparing
                    </h3>
                    <p className="text-muted-foreground">
                        Orders being prepared will appear here.
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
                            onMarkReady={() => openConfirmDialog(order)}
                            onProposeSubstitution={(details: any) =>
                                proposeSubstitution({
                                    variables: { pharmacyOrderId: order.id, substitutionDetails: details },
                                })
                            }
                            onConfirmDiscreet={() =>
                                confirmDiscreetPackaging({
                                    variables: { pharmacyOrderId: order.id },
                                })
                            }
                        />
                    </motion.div>
                ))}
            </div>

            {/* Confirm Ready Dialog */}
            <AnimatePresence>
                {showConfirmDialog && selectedOrder && (
                    <Dialog onClose={() => setShowConfirmDialog(false)}>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">
                                Ready for Pickup?
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Order {selectedOrder.orderId}
                            </p>
                        </div>

                        <div className="bg-muted rounded-lg p-4 mb-6">
                            <p className="text-sm text-muted-foreground mb-2">Medications packed:</p>
                            {selectedOrder.medications.map((med, idx) => (
                                <div key={idx} className="flex justify-between py-1">
                                    <span className="text-foreground">{med.name}</span>
                                    <span className="font-medium">×{med.quantity}</span>
                                </div>
                            ))}
                        </div>

                        <p className="text-sm text-muted-foreground text-center mb-4">
                            Coordinator will be notified to arrange delivery.
                        </p>

                        <button
                            onClick={handleMarkReady}
                            disabled={marking}
                            className="w-full py-4 bg-green-600 text-white rounded-xl font-semibold text-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {marking ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <CheckCircle className="w-5 h-5" />
                            )}
                            Confirm Ready
                        </button>
                    </Dialog>
                )}
            </AnimatePresence>
        </div>
    );
}

function OrderCard({
    order,
    onMarkReady,
    onProposeSubstitution,
    onConfirmDiscreet,
}: {
    order: PharmacyOrderSummary;
    onMarkReady: () => void;
    onProposeSubstitution: (details: any) => void;
    onConfirmDiscreet: () => void;
}) {
    const [showSubForm, setShowSubForm] = useState(false);
    const [subOriginal, setSubOriginal] = useState('');
    const [subProposed, setSubProposed] = useState('');
    const [subReason, setSubReason] = useState('');

    return (
        <div className="card-premium p-4 border-l-4 border-blue-500">
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

            {/* Phase 15: Propose substitution */}
            <div className="flex gap-2 mb-3">
                <button
                    data-testid={`propose-sub-${order.id}`}
                    onClick={() => setShowSubForm(!showSubForm)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    Propose Substitution
                </button>
                <label
                    data-testid={`discreet-packaging-${order.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors"
                >
                    <input
                        type="checkbox"
                        onChange={(e) => { if (e.target.checked) onConfirmDiscreet(); }}
                        className="w-3.5 h-3.5"
                    />
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Discreet Packaging
                </label>
            </div>

            {/* Substitution form */}
            {showSubForm && (
                <div className="mb-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <input
                        data-testid="sub-original-input"
                        type="text"
                        placeholder="Original medication..."
                        value={subOriginal}
                        onChange={(e) => setSubOriginal(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm mb-2"
                    />
                    <input
                        data-testid="sub-proposed-input"
                        type="text"
                        placeholder="Proposed substitution..."
                        value={subProposed}
                        onChange={(e) => setSubProposed(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm mb-2"
                    />
                    <input
                        data-testid="sub-reason-input"
                        type="text"
                        placeholder="Reason for substitution..."
                        value={subReason}
                        onChange={(e) => setSubReason(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm mb-2"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                onProposeSubstitution({
                                    originalMedication: subOriginal,
                                    proposedSubstitution: subProposed,
                                    reason: subReason,
                                });
                                setShowSubForm(false);
                            }}
                            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
                        >
                            Submit Proposal
                        </button>
                        <button
                            onClick={() => setShowSubForm(false)}
                            className="px-3 py-2 text-sm text-neutral-500 hover:text-foreground"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Action */}
            <button
                onClick={onMarkReady}
                className="w-full h-12 bg-green-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-green-700"
            >
                <CheckCircle className="w-5 h-5" />
                Ready for Pickup
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
