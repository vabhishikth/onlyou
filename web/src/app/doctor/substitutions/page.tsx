'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRightLeft, CheckCircle, XCircle, Package } from 'lucide-react';
import {
    PENDING_SUBSTITUTION_APPROVALS,
    APPROVE_SUBSTITUTION,
    REJECT_SUBSTITUTION,
} from '@/graphql/doctor-pharmacy';
import type { PendingSubstitution } from '@/graphql/doctor-pharmacy';

// Spec: Phase 15 — Doctor substitution approval queue

export default function SubstitutionsPage() {
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    const { data, loading, refetch } = useQuery(PENDING_SUBSTITUTION_APPROVALS, {
        pollInterval: 30000,
    });

    const [approveSubstitution] = useMutation(APPROVE_SUBSTITUTION, {
        onCompleted: () => refetch(),
    });

    const [rejectSubstitution] = useMutation(REJECT_SUBSTITUTION, {
        onCompleted: () => {
            setRejectingId(null);
            setRejectionReason('');
            refetch();
        },
    });

    const approvals: PendingSubstitution[] = data?.pendingSubstitutionApprovals || [];

    const handleReject = (orderId: string) => {
        rejectSubstitution({
            variables: { pharmacyOrderId: orderId, reason: rejectionReason },
        });
    };

    if (loading) {
        return (
            <div data-testid="substitutions-loading" className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-foreground">
                        Substitution Approvals
                    </h1>
                    <p className="text-sm text-neutral-500 mt-1">
                        Review pharmacy medication substitution requests
                    </p>
                </div>
                {approvals.length > 0 && (
                    <span
                        data-testid="pending-count"
                        className="text-sm font-semibold text-white bg-warning px-3 py-1 rounded-full"
                    >
                        {approvals.length}
                    </span>
                )}
            </div>

            {approvals.length === 0 ? (
                <div className="text-center py-16">
                    <Package className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                    <p className="text-neutral-500">No pending substitutions</p>
                    <p className="text-sm text-neutral-400 mt-1">
                        Substitution requests from pharmacies will appear here
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {approvals.map((approval) => {
                        const isRejecting = rejectingId === approval.id;
                        const details = approval.substitutionDetails;

                        return (
                            <motion.div
                                key={approval.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white border border-border rounded-xl p-4"
                            >
                                {/* Order header */}
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-semibold text-accent">
                                        {approval.orderNumber}
                                    </span>
                                    <span className="text-xs text-warning font-medium px-2.5 py-1 rounded-full bg-warning/10">
                                        Awaiting Approval
                                    </span>
                                </div>

                                {/* Medication comparison */}
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="flex-1 p-2.5 bg-destructive/5 rounded-lg border border-destructive/10">
                                        <p className="text-[10px] uppercase tracking-wider text-neutral-400 mb-0.5">
                                            Original
                                        </p>
                                        <p className="text-sm font-medium text-foreground">
                                            {details.originalMedication}
                                        </p>
                                    </div>
                                    <ArrowRightLeft className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                                    <div className="flex-1 p-2.5 bg-success/5 rounded-lg border border-success/10">
                                        <p className="text-[10px] uppercase tracking-wider text-neutral-400 mb-0.5">
                                            Proposed
                                        </p>
                                        <p className="text-sm font-medium text-foreground">
                                            {details.proposedSubstitution}
                                        </p>
                                    </div>
                                </div>

                                {/* Reason */}
                                <p className="text-xs text-neutral-500 mb-3">
                                    {details.reason}
                                </p>

                                {/* Action buttons */}
                                <div className="flex gap-2">
                                    <button
                                        data-testid={`approve-${approval.id}`}
                                        onClick={() =>
                                            approveSubstitution({
                                                variables: { pharmacyOrderId: approval.id },
                                            })
                                        }
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-success bg-success/10 rounded-lg hover:bg-success/20 transition-colors"
                                    >
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        Approve
                                    </button>
                                    {!isRejecting && (
                                        <button
                                            data-testid={`reject-${approval.id}`}
                                            onClick={() => setRejectingId(approval.id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-destructive bg-destructive/10 rounded-lg hover:bg-destructive/20 transition-colors"
                                        >
                                            <XCircle className="w-3.5 h-3.5" />
                                            Reject
                                        </button>
                                    )}
                                </div>

                                {/* Rejection reason form */}
                                <AnimatePresence>
                                    {isRejecting && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="mt-3 pt-3 border-t border-border"
                                        >
                                            <input
                                                data-testid="rejection-reason-input"
                                                type="text"
                                                placeholder="Reason for rejection..."
                                                value={rejectionReason}
                                                onChange={(e) => setRejectionReason(e.target.value)}
                                                className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                                            />
                                            <div className="flex gap-2 mt-2">
                                                <button
                                                    data-testid={`confirm-reject-${approval.id}`}
                                                    onClick={() => handleReject(approval.id)}
                                                    className="px-4 py-2 bg-destructive text-white rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors"
                                                >
                                                    Confirm Reject
                                                </button>
                                                <button
                                                    onClick={() => setRejectingId(null)}
                                                    className="px-3 py-2 text-sm text-neutral-500 hover:text-foreground transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
