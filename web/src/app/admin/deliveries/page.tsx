'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
    Search,
    Filter,
    ChevronDown,
    ChevronUp,
    Phone,
    MapPin,
    Truck,
    User,
    Pill,
    Building2,
    Clock,
    RefreshCw,
    Copy,
    CheckCircle,
    Loader2,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    ADMIN_DELIVERIES,
    AVAILABLE_PHARMACIES,
    SEND_TO_PHARMACY,
    ARRANGE_DELIVERY,
    MARK_OUT_FOR_DELIVERY,
    REGENERATE_DELIVERY_OTP,
    AdminDeliveriesResponse,
    AvailablePharmaciesResponse,
    AdminDelivery,
    OrderStatus,
    ORDER_STATUS_CONFIG,
} from '@/graphql/admin';

// Spec: master spec Section 8 — Medication Fulfillment & Local Delivery

const ALL_STATUSES: OrderStatus[] = [
    'PRESCRIPTION_CREATED',
    'SENT_TO_PHARMACY',
    'PHARMACY_PREPARING',
    'PHARMACY_READY',
    'PHARMACY_ISSUE',
    'PICKUP_ARRANGED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'DELIVERY_FAILED',
    'RESCHEDULED',
    'RETURNED',
    'CANCELLED',
];

const DELIVERY_METHODS = [
    { value: 'RAPIDO', label: 'Rapido' },
    { value: 'DUNZO', label: 'Dunzo' },
    { value: 'OWN', label: 'Own Delivery' },
    { value: 'PORTER', label: 'Porter' },
    { value: 'OTHER', label: 'Other' },
];

export default function DeliveriesPage() {
    const [search, setSearch] = useState('');
    const [selectedStatuses, setSelectedStatuses] = useState<OrderStatus[]>([]);
    const [showReordersOnly, setShowReordersOnly] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const { data, loading, refetch } = useQuery<AdminDeliveriesResponse>(ADMIN_DELIVERIES, {
        variables: {
            filter: {
                statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
                isReorder: showReordersOnly ? true : undefined,
                search: search || undefined,
            },
        },
        pollInterval: 30000,
    });

    const deliveries = data?.adminDeliveries?.deliveries || [];
    const total = data?.adminDeliveries?.total || 0;

    const toggleStatus = (status: OrderStatus) => {
        setSelectedStatuses((prev) =>
            prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
        );
    };

    const clearFilters = () => {
        setSelectedStatuses([]);
        setShowReordersOnly(false);
        setSearch('');
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-card border-b border-border px-4 lg:px-8 py-4">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-foreground">Deliveries</h1>
                        <p className="text-sm text-muted-foreground">
                            {total} total • {deliveries.filter((d) => d.isReorder).length} auto-reorders
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <div className="relative flex-1 lg:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search patient..."
                                className="pl-9"
                            />
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setShowFilters(!showFilters)}
                            className={cn(showFilters && 'bg-primary/10')}
                        >
                            <Filter className="w-4 h-4 mr-2" />
                            Filters
                            {(selectedStatuses.length > 0 || showReordersOnly) && (
                                <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary text-white rounded-full">
                                    {selectedStatuses.length + (showReordersOnly ? 1 : 0)}
                                </span>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="pt-4 space-y-4">
                                <div>
                                    <p className="text-sm font-medium text-foreground mb-2">Status</p>
                                    <div className="flex flex-wrap gap-2">
                                        {ALL_STATUSES.map((status) => {
                                            const config = ORDER_STATUS_CONFIG[status];
                                            const isSelected = selectedStatuses.includes(status);
                                            return (
                                                <button
                                                    key={status}
                                                    onClick={() => toggleStatus(status)}
                                                    className={cn(
                                                        'px-3 py-1.5 text-xs rounded-full border transition-all',
                                                        isSelected
                                                            ? `${config.bgColor} ${config.color} border-current`
                                                            : 'border-border hover:border-primary/40',
                                                    )}
                                                >
                                                    {config.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowReordersOnly(!showReordersOnly)}
                                        className={cn(
                                            'px-3 py-1.5 text-xs rounded-full border transition-all flex items-center gap-1',
                                            showReordersOnly
                                                ? 'bg-primary/10 text-primary border-primary'
                                                : 'border-border hover:border-primary/40',
                                        )}
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                        Auto-Reorders Only
                                    </button>
                                </div>

                                {(selectedStatuses.length > 0 || showReordersOnly) && (
                                    <button
                                        onClick={clearFilters}
                                        className="text-sm text-primary hover:underline"
                                    >
                                        Clear all filters
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            {/* Deliveries List */}
            <div className="p-4 lg:p-8 space-y-3">
                {loading && deliveries.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : deliveries.length === 0 ? (
                    <div className="text-center py-12">
                        <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-foreground font-medium">No deliveries found</p>
                        <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                    </div>
                ) : (
                    deliveries.map((delivery) => (
                        <DeliveryCard
                            key={delivery.id}
                            delivery={delivery}
                            isExpanded={expandedId === delivery.id}
                            onToggleExpand={() =>
                                setExpandedId(expandedId === delivery.id ? null : delivery.id)
                            }
                            onRefetch={refetch}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

interface DeliveryCardProps {
    delivery: AdminDelivery;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onRefetch: () => void;
}

function DeliveryCard({ delivery, isExpanded, onToggleExpand, onRefetch }: DeliveryCardProps) {
    const statusConfig = ORDER_STATUS_CONFIG[delivery.status];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-premium overflow-hidden"
        >
            {/* Main row */}
            <div
                onClick={onToggleExpand}
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            >
                <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-medium text-foreground truncate">
                                {delivery.patient.name || 'Unknown'}
                            </span>
                            {delivery.isReorder && (
                                <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-600 rounded-full flex items-center gap-1">
                                    <RefreshCw className="w-3 h-3" />
                                    Auto-Reorder
                                </span>
                            )}
                            <span
                                className={cn(
                                    'px-2 py-0.5 text-xs rounded-full',
                                    statusConfig.bgColor,
                                    statusConfig.color,
                                )}
                            >
                                {statusConfig.label}
                            </span>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Pill className="w-3 h-3" />
                                {delivery.medications.length} medication(s)
                            </span>
                            {delivery.pharmacy && (
                                <span className="flex items-center gap-1">
                                    <Building2 className="w-3 h-3" />
                                    {delivery.pharmacy.name}
                                </span>
                            )}
                            {delivery.deliveryPersonName && (
                                <span className="flex items-center gap-1">
                                    <Truck className="w-3 h-3" />
                                    {delivery.deliveryPersonName}
                                </span>
                            )}
                            {delivery.estimatedDeliveryTime && (
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    ETA: {delivery.estimatedDeliveryTime}
                                </span>
                            )}
                        </div>
                    </div>

                    {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                </div>
            </div>

            {/* Expanded details */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                    >
                        <ExpandedDeliveryDetails delivery={delivery} onRefetch={onRefetch} />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function ExpandedDeliveryDetails({
    delivery,
    onRefetch,
}: {
    delivery: AdminDelivery;
    onRefetch: () => void;
}) {
    const [copiedOtp, setCopiedOtp] = useState(false);

    const copyOtp = () => {
        if (delivery.deliveryOtp) {
            navigator.clipboard.writeText(delivery.deliveryOtp);
            setCopiedOtp(true);
            setTimeout(() => setCopiedOtp(false), 2000);
        }
    };

    return (
        <div className="px-4 pb-4 border-t border-border">
            <div className="pt-4 grid gap-6 lg:grid-cols-2">
                {/* Patient & Delivery Info */}
                <div>
                    <h4 className="font-medium text-foreground mb-3">Patient & Delivery</h4>
                    <div className="space-y-2 text-sm">
                        <p className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            {delivery.patient.name || 'Unknown'}
                        </p>
                        {delivery.patient.phone && (
                            <a
                                href={`tel:${delivery.patient.phone}`}
                                className="flex items-center gap-2 text-primary hover:underline"
                            >
                                <Phone className="w-4 h-4" />
                                {delivery.patient.phone}
                            </a>
                        )}
                        <p className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                            <span>
                                {delivery.deliveryAddress}
                                <br />
                                {delivery.deliveryCity}, {delivery.deliveryPincode}
                            </span>
                        </p>
                    </div>

                    {/* Delivery OTP */}
                    {delivery.deliveryOtp && (
                        <div className="mt-4 p-3 bg-green-50 rounded-lg">
                            <p className="text-sm text-green-800 font-medium mb-1">Delivery OTP</p>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold text-green-700 tracking-widest">
                                    {delivery.deliveryOtp}
                                </span>
                                <button
                                    onClick={copyOtp}
                                    className="p-1 hover:bg-green-100 rounded"
                                >
                                    {copiedOtp ? (
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                    ) : (
                                        <Copy className="w-4 h-4 text-green-600" />
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Medications */}
                <div>
                    <h4 className="font-medium text-foreground mb-3">Medications</h4>
                    <div className="space-y-2">
                        {delivery.medications.map((med, i) => (
                            <div key={i} className="p-3 bg-muted rounded-lg">
                                <p className="font-medium text-foreground">{med.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {med.dosage} • {med.frequency}
                                </p>
                            </div>
                        ))}
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                        Total: ₹{(delivery.totalAmountPaise / 100).toLocaleString('en-IN')}
                    </p>
                </div>
            </div>

            {/* Timeline */}
            <div className="mt-6 pt-4 border-t border-border">
                <h4 className="font-medium text-foreground mb-3">Timeline</h4>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    {delivery.orderedAt && (
                        <div>
                            <span className="text-muted-foreground">Created:</span>{' '}
                            {format(new Date(delivery.orderedAt), 'MMM d, h:mm a')}
                        </div>
                    )}
                    {delivery.sentToPharmacyAt && (
                        <div>
                            <span className="text-muted-foreground">Sent to Pharmacy:</span>{' '}
                            {format(new Date(delivery.sentToPharmacyAt), 'MMM d, h:mm a')}
                        </div>
                    )}
                    {delivery.pharmacyReadyAt && (
                        <div>
                            <span className="text-muted-foreground">Ready:</span>{' '}
                            {format(new Date(delivery.pharmacyReadyAt), 'MMM d, h:mm a')}
                        </div>
                    )}
                    {delivery.outForDeliveryAt && (
                        <div>
                            <span className="text-muted-foreground">Out:</span>{' '}
                            {format(new Date(delivery.outForDeliveryAt), 'MMM d, h:mm a')}
                        </div>
                    )}
                    {delivery.deliveredAt && (
                        <div className="text-green-600">
                            <span className="text-muted-foreground">Delivered:</span>{' '}
                            {format(new Date(delivery.deliveredAt), 'MMM d, h:mm a')}
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="mt-6 pt-4 border-t border-border">
                <h4 className="font-medium text-foreground mb-3">Actions</h4>
                <div className="flex flex-wrap gap-2">
                    {delivery.status === 'PRESCRIPTION_CREATED' && (
                        <SendToPharmacyButton delivery={delivery} onSuccess={onRefetch} />
                    )}
                    {delivery.status === 'PHARMACY_READY' && (
                        <ArrangeDeliveryButton delivery={delivery} onSuccess={onRefetch} />
                    )}
                    {delivery.status === 'PICKUP_ARRANGED' && (
                        <MarkOutForDeliveryButton orderId={delivery.id} onSuccess={onRefetch} />
                    )}
                    {(delivery.status === 'OUT_FOR_DELIVERY' || delivery.status === 'PICKUP_ARRANGED') && (
                        <RegenerateOtpButton orderId={delivery.id} onSuccess={onRefetch} />
                    )}
                </div>
            </div>
        </div>
    );
}

function SendToPharmacyButton({
    delivery,
    onSuccess,
}: {
    delivery: AdminDelivery;
    onSuccess: () => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const { data, loading } = useQuery<AvailablePharmaciesResponse>(AVAILABLE_PHARMACIES, {
        variables: { pincode: delivery.deliveryPincode },
        skip: !isOpen,
    });

    const [send, { loading: sending }] = useMutation(SEND_TO_PHARMACY, {
        onCompleted: (data) => {
            if (data.sendToPharmacy.success) {
                setIsOpen(false);
                onSuccess();
            }
        },
    });

    const pharmacies = data?.availablePharmacies?.pharmacies || [];

    return (
        <>
            <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
                <Building2 className="w-4 h-4 mr-2" />
                Send to Pharmacy
            </Button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-card rounded-xl shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden"
                    >
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <h3 className="font-semibold text-foreground">Select Pharmacy</h3>
                            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-muted rounded">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto max-h-[60vh]">
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                </div>
                            ) : pharmacies.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    No pharmacies available for this pincode
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {pharmacies.map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => setSelectedId(p.id)}
                                            className={cn(
                                                'w-full p-3 rounded-lg border text-left transition-all',
                                                selectedId === p.id
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-border hover:border-primary/40',
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-foreground">{p.name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    ~{p.avgPreparationMinutes} min prep
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">{p.address}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-border flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                className="flex-1"
                                disabled={!selectedId || sending}
                                onClick={() => {
                                    if (selectedId) {
                                        send({
                                            variables: {
                                                input: { orderId: delivery.id, pharmacyId: selectedId },
                                            },
                                        });
                                    }
                                }}
                            >
                                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </>
    );
}

function ArrangeDeliveryButton({
    delivery,
    onSuccess,
}: {
    delivery: AdminDelivery;
    onSuccess: () => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [method, setMethod] = useState('OWN');
    const [eta, setEta] = useState('');
    const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);

    const [arrange, { loading }] = useMutation(ARRANGE_DELIVERY, {
        onCompleted: (data) => {
            if (data.arrangeDelivery.success) {
                setGeneratedOtp(data.arrangeDelivery.otp);
            }
        },
    });

    const handleSubmit = () => {
        arrange({
            variables: {
                input: {
                    orderId: delivery.id,
                    deliveryPersonName: name,
                    deliveryPersonPhone: phone,
                    deliveryMethod: method,
                    estimatedDeliveryTime: eta || null,
                },
            },
        });
    };

    const handleClose = () => {
        setIsOpen(false);
        setGeneratedOtp(null);
        if (generatedOtp) {
            onSuccess();
        }
    };

    return (
        <>
            <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
                <Truck className="w-4 h-4 mr-2" />
                Arrange Delivery
            </Button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-card rounded-xl shadow-xl w-full max-w-md"
                    >
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <h3 className="font-semibold text-foreground">Arrange Delivery</h3>
                            <button onClick={handleClose} className="p-1 hover:bg-muted rounded">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {generatedOtp ? (
                            <div className="p-6 text-center">
                                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                                <h4 className="text-lg font-semibold text-foreground mb-2">
                                    Delivery Arranged!
                                </h4>
                                <p className="text-muted-foreground mb-4">Delivery OTP:</p>
                                <p className="text-4xl font-bold text-primary tracking-widest mb-4">
                                    {generatedOtp}
                                </p>
                                <p className="text-sm text-muted-foreground mb-6">
                                    Share this OTP with the patient. They will give it to the delivery person.
                                </p>
                                <Button onClick={handleClose} className="w-full">
                                    Done
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="p-4 space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-foreground">
                                            Delivery Person Name
                                        </label>
                                        <Input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Enter name"
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-foreground">
                                            Phone Number
                                        </label>
                                        <Input
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="+91XXXXXXXXXX"
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-foreground">
                                            Delivery Method
                                        </label>
                                        <div className="mt-1 flex flex-wrap gap-2">
                                            {DELIVERY_METHODS.map((m) => (
                                                <button
                                                    key={m.value}
                                                    onClick={() => setMethod(m.value)}
                                                    className={cn(
                                                        'px-3 py-1.5 text-sm rounded-lg border transition-all',
                                                        method === m.value
                                                            ? 'border-primary bg-primary/5 text-primary'
                                                            : 'border-border hover:border-primary/40',
                                                    )}
                                                >
                                                    {m.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-foreground">
                                            Estimated Delivery Time (optional)
                                        </label>
                                        <Input
                                            value={eta}
                                            onChange={(e) => setEta(e.target.value)}
                                            placeholder="e.g., 3:00 PM - 4:00 PM"
                                            className="mt-1"
                                        />
                                    </div>
                                </div>

                                <div className="p-4 border-t border-border flex gap-2">
                                    <Button variant="outline" className="flex-1" onClick={handleClose}>
                                        Cancel
                                    </Button>
                                    <Button
                                        className="flex-1"
                                        disabled={!name || !phone || loading}
                                        onClick={handleSubmit}
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Arrange'}
                                    </Button>
                                </div>
                            </>
                        )}
                    </motion.div>
                </div>
            )}
        </>
    );
}

function MarkOutForDeliveryButton({
    orderId,
    onSuccess,
}: {
    orderId: string;
    onSuccess: () => void;
}) {
    const [mark, { loading }] = useMutation(MARK_OUT_FOR_DELIVERY, {
        onCompleted: (data) => {
            if (data.markOutForDelivery.success) {
                onSuccess();
            }
        },
    });

    return (
        <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => mark({ variables: { orderId } })}
        >
            {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
                <Truck className="w-4 h-4 mr-2" />
            )}
            Mark Out for Delivery
        </Button>
    );
}

function RegenerateOtpButton({
    orderId,
    onSuccess,
}: {
    orderId: string;
    onSuccess: () => void;
}) {
    const [regenerate, { loading }] = useMutation(REGENERATE_DELIVERY_OTP, {
        onCompleted: (data) => {
            if (data.regenerateDeliveryOtp.success) {
                alert(`New OTP: ${data.regenerateDeliveryOtp.otp}`);
                onSuccess();
            }
        },
    });

    return (
        <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => regenerate({ variables: { orderId } })}
        >
            {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Regenerate OTP
        </Button>
    );
}
