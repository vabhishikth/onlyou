'use client';

import { useQuery, useMutation } from '@apollo/client';
import { motion } from 'framer-motion';
import { Building2, Loader2, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    ADMIN_PHARMACIES,
    ADMIN_SUSPEND_PHARMACY,
    ADMIN_REVIEW_PHARMACY,
    ADMIN_REACTIVATE_PHARMACY,
    AdminPharmaciesResponse,
    AdminPharmacy,
    PHARMACY_STATUS_OPTIONS,
} from '@/graphql/admin-pharmacy';

// Spec: Phase 15 — Admin pharmacy lifecycle management

export default function PharmacyManagementPage() {
    const { data, loading, refetch } = useQuery<AdminPharmaciesResponse>(ADMIN_PHARMACIES);

    const [suspendPharmacy] = useMutation(ADMIN_SUSPEND_PHARMACY, {
        onCompleted: () => refetch(),
    });

    const [reviewPharmacy] = useMutation(ADMIN_REVIEW_PHARMACY, {
        onCompleted: () => refetch(),
    });

    const [reactivatePharmacy] = useMutation(ADMIN_REACTIVATE_PHARMACY, {
        onCompleted: () => refetch(),
    });

    const pharmacies = data?.pharmacies || [];

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
                    Pharmacy Management
                </h1>
                <p className="text-muted-foreground mt-1">
                    Register, review, and manage partner pharmacies.
                </p>
            </motion.div>

            {pharmacies.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card-premium p-12 text-center"
                >
                    <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-foreground mb-2">
                        No Pharmacies Registered
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Partner pharmacies will appear here once registered.
                    </p>
                </motion.div>
            )}

            <div className="space-y-4">
                {pharmacies.map((pharmacy) => {
                    const statusConfig = PHARMACY_STATUS_OPTIONS[pharmacy.status] || {
                        label: pharmacy.status,
                        color: 'text-gray-600',
                        bgColor: 'bg-gray-100',
                    };

                    return (
                        <motion.div
                            key={pharmacy.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="card-premium p-5"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold text-foreground text-lg">
                                        {pharmacy.name}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">{pharmacy.city}</p>
                                </div>
                                <span className={cn(
                                    'px-2.5 py-1 rounded-full text-xs font-medium',
                                    statusConfig.bgColor,
                                    statusConfig.color,
                                )}>
                                    {statusConfig.label}
                                </span>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                                {pharmacy.rating != null && (
                                    <span className="flex items-center gap-1">
                                        <Star className="w-3.5 h-3.5 text-amber-500" />
                                        {pharmacy.rating}
                                    </span>
                                )}
                                <span>{pharmacy.ordersCompleted} orders completed</span>
                            </div>

                            <div className="flex gap-2">
                                {pharmacy.status === 'PENDING_REVIEW' && (
                                    <button
                                        data-testid={`approve-${pharmacy.id}`}
                                        onClick={() => reviewPharmacy({
                                            variables: { pharmacyId: pharmacy.id, approved: true },
                                        })}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                                    >
                                        Approve
                                    </button>
                                )}
                                {pharmacy.status === 'ACTIVE' && (
                                    <button
                                        data-testid={`suspend-${pharmacy.id}`}
                                        onClick={() => suspendPharmacy({
                                            variables: { pharmacyId: pharmacy.id, reason: 'Admin action' },
                                        })}
                                        className="px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                                    >
                                        Suspend
                                    </button>
                                )}
                                {pharmacy.status === 'SUSPENDED' && (
                                    <button
                                        data-testid={`reactivate-${pharmacy.id}`}
                                        onClick={() => reactivatePharmacy({
                                            variables: { pharmacyId: pharmacy.id },
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
