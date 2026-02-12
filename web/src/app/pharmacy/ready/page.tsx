'use client';

import { useQuery } from '@apollo/client';
import { motion } from 'framer-motion';
import {
    CheckCircle,
    Loader2,
    Phone,
    User,
    Truck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    PHARMACY_READY_ORDERS,
    PharmacyReadyOrdersResponse,
    PharmacyOrderSummary,
    PHARMACY_STATUS_CONFIG,
} from '@/graphql/pharmacy-portal';

// Spec: master spec Section 8.1 — Pharmacy Portal
// Ready tab: orders waiting for pickup

export default function PharmacyReadyPage() {
    const { data, loading } = useQuery<PharmacyReadyOrdersResponse>(
        PHARMACY_READY_ORDERS,
        { pollInterval: 30000 }
    );

    const orders = data?.pharmacyReadyOrders || [];

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
                <CheckCircle className="w-5 h-5 text-green-600" />
                Ready for Pickup ({orders.length})
            </h2>

            {/* Empty state */}
            {orders.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="card-premium p-8 text-center"
                >
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <Truck className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        No Orders Waiting
                    </h3>
                    <p className="text-muted-foreground">
                        Packed orders waiting for pickup will appear here.
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
                        <ReadyCard order={order} />
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

function ReadyCard({ order }: { order: PharmacyOrderSummary }) {
    const hasDeliveryPerson = order.deliveryPersonName && order.deliveryPersonPhone;
    const isPickupArranged = order.status === 'PICKUP_ARRANGED';

    return (
        <div className={cn(
            'card-premium p-4 border-l-4',
            isPickupArranged ? 'border-purple-500' : 'border-green-500'
        )}>
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

            {/* Medications count */}
            <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                <span>{order.medications.length} medication{order.medications.length !== 1 ? 's' : ''}</span>
                <span>•</span>
                <span>{order.medications.reduce((sum, m) => sum + m.quantity, 0)} items total</span>
            </div>

            {/* Delivery person info */}
            {hasDeliveryPerson ? (
                <div className="bg-purple-50 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="font-medium text-foreground">{order.deliveryPersonName}</p>
                            <p className="text-sm text-muted-foreground">Delivery person</p>
                        </div>
                    </div>
                    <a
                        href={`tel:${order.deliveryPersonPhone}`}
                        className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                        <Phone className="w-5 h-5" />
                    </a>
                </div>
            ) : (
                <div className="bg-muted rounded-lg p-3 text-center text-muted-foreground">
                    <Truck className="w-5 h-5 mx-auto mb-1" />
                    <p className="text-sm">Waiting for delivery assignment</p>
                </div>
            )}
        </div>
    );
}
