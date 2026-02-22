'use client';

import { useQuery, useMutation } from '@apollo/client';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { TestTube, Loader2, AlertTriangle, User, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    ADMIN_PARTNER_LAB_BY_ID,
    ADMIN_ACTIVATE_PHLEBOTOMIST,
    PartnerLabByIdResponse,
    Phlebotomist,
    LAB_STATUS_OPTIONS,
} from '@/graphql/admin-lab-automation';

// Spec: Phase 16 — Lab partner detail with phlebotomist management

const PHLEBOTOMIST_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
    ACTIVE: { label: 'Active', color: 'text-green-600', bgColor: 'bg-green-100' },
    PENDING: { label: 'Pending', color: 'text-amber-600', bgColor: 'bg-amber-100' },
    SUSPENDED: { label: 'Suspended', color: 'text-red-600', bgColor: 'bg-red-100' },
    INACTIVE: { label: 'Inactive', color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

function isExpiringSoon(expiryDate: string | null): boolean {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
}

export default function LabPartnerDetailPage() {
    const params = useParams();
    const labId = params?.id as string;

    const { data, loading, refetch } = useQuery<PartnerLabByIdResponse>(
        ADMIN_PARTNER_LAB_BY_ID,
        { variables: { id: labId }, skip: !labId }
    );

    const [activatePhlebotomist] = useMutation(ADMIN_ACTIVATE_PHLEBOTOMIST, {
        onCompleted: () => refetch(),
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const lab = data?.partnerLabById;
    if (!lab) {
        return (
            <div className="p-6 text-center">
                <p className="text-muted-foreground">Lab not found.</p>
            </div>
        );
    }

    const statusConfig = LAB_STATUS_OPTIONS[lab.status] || {
        label: lab.status,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
    };

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl lg:text-3xl font-serif font-bold text-foreground">
                        {lab.name}
                    </h1>
                    <span className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium',
                        statusConfig.bgColor,
                        statusConfig.color,
                    )}>
                        {statusConfig.label}
                    </span>
                </div>
                <p className="text-muted-foreground">{lab.city}</p>
            </motion.div>

            {/* Lab details */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-premium p-5 mb-6"
            >
                <h2 className="text-lg font-semibold text-foreground mb-3">Details</h2>
                <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">{lab.address}</p>
                    <p className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        {lab.phone}
                    </p>
                </div>
            </motion.div>

            {/* Phlebotomists section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-teal-600" />
                    Phlebotomists ({lab.phlebotomists.length})
                </h2>

                {lab.phlebotomists.length === 0 && (
                    <div className="card-premium p-8 text-center">
                        <p className="text-muted-foreground">No phlebotomists registered.</p>
                    </div>
                )}

                <div className="space-y-3">
                    {lab.phlebotomists.map((phle) => {
                        const phleStatus = PHLEBOTOMIST_STATUS_CONFIG[phle.status] || {
                            label: phle.status,
                            color: 'text-gray-600',
                            bgColor: 'bg-gray-100',
                        };
                        const expiringSoon = isExpiringSoon(phle.credentialExpiry);

                        return (
                            <motion.div
                                key={phle.id}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="card-premium p-4"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <h3 className="font-semibold text-foreground">
                                            {phle.name}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">{phle.phone}</p>
                                    </div>
                                    <span
                                        data-testid={`status-${phle.id}`}
                                        className={cn(
                                            'px-2 py-0.5 rounded text-xs font-medium',
                                            phleStatus.bgColor,
                                            phleStatus.color,
                                        )}
                                    >
                                        {phleStatus.label}
                                    </span>
                                </div>

                                {/* Credential expiry warning */}
                                {expiringSoon && (
                                    <div
                                        data-testid={`expiry-warning-${phle.id}`}
                                        className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg mb-2"
                                    >
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        Credentials expiring on{' '}
                                        {new Date(phle.credentialExpiry!).toLocaleDateString('en-IN')}
                                    </div>
                                )}

                                {/* Activate button for pending */}
                                {phle.status === 'PENDING' && (
                                    <button
                                        data-testid={`activate-${phle.id}`}
                                        onClick={() => activatePhlebotomist({
                                            variables: { phlebotomistId: phle.id },
                                        })}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                                    >
                                        Activate
                                    </button>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>
        </div>
    );
}
