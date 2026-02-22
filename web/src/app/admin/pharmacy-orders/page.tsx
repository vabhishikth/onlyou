'use client';

import { useQuery, useMutation } from '@apollo/client';
import { motion } from 'framer-motion';
import { Package, Loader2, Truck, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    ADMIN_ALL_PHARMACY_ORDERS,
    ADMIN_DISPATCH_ORDER,
    ADMIN_MANUAL_REASSIGN,
    ADMIN_TRIGGER_ASSIGNMENT,
    AdminAllPharmacyOrdersResponse,
} from '@/graphql/admin-pharmacy';

// Spec: Phase 15 — Admin pharmacy order operations

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
    SENT_TO_PHARMACY: { label: 'Sent', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    ACCEPTED: { label: 'Accepted', color: 'text-purple-600', bgColor: 'bg-purple-100' },
    PREPARING: { label: 'Preparing', color: 'text-amber-600', bgColor: 'bg-amber-100' },
    READY_FOR_PICKUP: { label: 'Ready', color: 'text-green-600', bgColor: 'bg-green-100' },
    DISPATCHED: { label: 'Dispatched', color: 'text-teal-600', bgColor: 'bg-teal-100' },
    DELIVERED: { label: 'Delivered', color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

export default function PharmacyOrdersPage() {
    const { data, loading, refetch } = useQuery<AdminAllPharmacyOrdersResponse>(
        ADMIN_ALL_PHARMACY_ORDERS
    );

    const [dispatchOrder] = useMutation(ADMIN_DISPATCH_ORDER, {
        onCompleted: () => refetch(),
    });

    const [reassignOrder] = useMutation(ADMIN_MANUAL_REASSIGN, {
        onCompleted: () => refetch(),
    });

    const [triggerAssignment] = useMutation(ADMIN_TRIGGER_ASSIGNMENT, {
        onCompleted: () => refetch(),
    });

    const orders = data?.allPharmacyOrders || [];

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
                    Pharmacy Orders
                </h1>
                <p className="text-muted-foreground mt-1">
                    Monitor and manage all pharmacy orders.
                </p>
            </motion.div>

            {orders.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card-premium p-12 text-center"
                >
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-foreground mb-2">
                        No Pharmacy Orders
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Orders will appear here once created.
                    </p>
                </motion.div>
            )}

            <div className="space-y-3">
                {orders.map((order) => {
                    const statusConfig = ORDER_STATUS_CONFIG[order.status] || {
                        label: order.status,
                        color: 'text-gray-600',
                        bgColor: 'bg-gray-100',
                    };

                    return (
                        <motion.div
                            key={order.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="card-premium p-5"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <span className="font-mono font-semibold text-foreground">
                                        {order.orderId}
                                    </span>
                                    <p className="text-sm text-muted-foreground">
                                        {order.pharmacyName}
                                    </p>
                                </div>
                                <span className={cn(
                                    'px-2.5 py-1 rounded-full text-xs font-medium',
                                    statusConfig.bgColor,
                                    statusConfig.color,
                                )}>
                                    {statusConfig.label}
                                </span>
                            </div>

                            <p className="text-sm text-muted-foreground mb-3">
                                {order.patientArea}
                            </p>

                            <div className="flex gap-2">
                                {order.status === 'SENT_TO_PHARMACY' && (
                                    <button
                                        data-testid={`reassign-${order.id}`}
                                        onClick={() => reassignOrder({
                                            variables: { orderId: order.id, pharmacyId: '' },
                                        })}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                                    >
                                        <ArrowRightLeft className="w-3.5 h-3.5" />
                                        Reassign
                                    </button>
                                )}
                                {order.status === 'READY_FOR_PICKUP' && (
                                    <button
                                        data-testid={`dispatch-${order.id}`}
                                        onClick={() => dispatchOrder({
                                            variables: { orderId: order.id },
                                        })}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                                    >
                                        <Truck className="w-3.5 h-3.5" />
                                        Dispatch
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
