'use client';

import { useQuery, useMutation } from '@apollo/client';
import { motion } from 'framer-motion';
import { TestTube, Loader2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    ADMIN_LIST_PARTNER_LABS,
    ADMIN_REVIEW_PARTNER_LAB,
    ADMIN_SUSPEND_PARTNER_LAB,
    ADMIN_REACTIVATE_PARTNER_LAB,
    ListPartnerLabsResponse,
    LAB_STATUS_OPTIONS,
} from '@/graphql/admin-lab-automation';
import Link from 'next/link';

// Spec: Phase 16 — Admin lab partner lifecycle management

export default function LabPartnersPage() {
    const { data, loading, refetch } = useQuery<ListPartnerLabsResponse>(ADMIN_LIST_PARTNER_LABS);

    const [reviewLab] = useMutation(ADMIN_REVIEW_PARTNER_LAB, {
        onCompleted: () => refetch(),
    });

    const [suspendLab] = useMutation(ADMIN_SUSPEND_PARTNER_LAB, {
        onCompleted: () => refetch(),
    });

    const [reactivateLab] = useMutation(ADMIN_REACTIVATE_PARTNER_LAB, {
        onCompleted: () => refetch(),
    });

    const labs = data?.listPartnerLabs || [];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-2xl lg:text-3xl font-serif font-bold text-foreground">
                    Lab Partners
                </h1>
                <p className="text-muted-foreground mt-1">
                    Manage diagnostic centres and phlebotomists.
                </p>
            </motion.div>

            {labs.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card-premium p-12 text-center"
                >
                    <TestTube className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-foreground mb-2">
                        No Lab Partners Registered
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Partner labs will appear here once registered.
                    </p>
                </motion.div>
            )}

            <div className="space-y-4">
                {labs.map((lab) => {
                    const statusConfig = LAB_STATUS_OPTIONS[lab.status] || {
                        label: lab.status,
                        color: 'text-gray-600',
                        bgColor: 'bg-gray-100',
                    };

                    return (
                        <motion.div
                            key={lab.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="card-premium p-5"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <Link href={`/admin/lab-partners/${lab.id}`}>
                                    <h3 className="font-semibold text-foreground text-lg hover:underline cursor-pointer">
                                        {lab.name}
                                    </h3>
                                </Link>
                                <span className={cn(
                                    'px-2.5 py-1 rounded-full text-xs font-medium',
                                    statusConfig.bgColor,
                                    statusConfig.color,
                                )}>
                                    {statusConfig.label}
                                </span>
                            </div>

                            <p className="text-sm text-muted-foreground mb-2">{lab.city}</p>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                                <span className="flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5" />
                                    {lab.technicianCount} technicians
                                </span>
                            </div>

                            <div className="flex gap-2">
                                {lab.status === 'PENDING_REVIEW' && (
                                    <button
                                        data-testid={`approve-${lab.id}`}
                                        onClick={() => reviewLab({
                                            variables: { labId: lab.id, approved: true },
                                        })}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                                    >
                                        Approve
                                    </button>
                                )}
                                {lab.status === 'ACTIVE' && (
                                    <button
                                        data-testid={`suspend-${lab.id}`}
                                        onClick={() => suspendLab({
                                            variables: { labId: lab.id, reason: 'Admin action' },
                                        })}
                                        className="px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                                    >
                                        Suspend
                                    </button>
                                )}
                                {lab.status === 'SUSPENDED' && (
                                    <button
                                        data-testid={`reactivate-${lab.id}`}
                                        onClick={() => reactivateLab({
                                            variables: { labId: lab.id },
                                        })}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                    >
                                        Reactivate
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
