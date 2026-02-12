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
    Clock,
    User,
    TestTube2,
    Building2,
    CheckCircle,
    Loader2,
    AlertTriangle,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    ADMIN_LAB_ORDERS,
    AVAILABLE_PHLEBOTOMISTS,
    ASSIGN_PHLEBOTOMIST,
    BULK_ASSIGN_PHLEBOTOMIST,
    ASSIGN_LAB,
    AVAILABLE_LABS,
    AdminLabOrdersResponse,
    AvailablePhlebotomistsResponse,
    AvailableLabsResponse,
    AdminLabOrder,
    LabOrderStatus,
    LAB_ORDER_STATUS_CONFIG,
    VERTICAL_CONFIG,
    SLA_STATUS_CONFIG,
    HealthVertical,
} from '@/graphql/admin';

// Spec: master spec Section 7 — Blood Work & Diagnostics
// THIS IS THE MOST USED SCREEN for coordinator

const ALL_STATUSES: LabOrderStatus[] = [
    'ORDERED',
    'SLOT_BOOKED',
    'PHLEBOTOMIST_ASSIGNED',
    'SAMPLE_COLLECTED',
    'COLLECTION_FAILED',
    'DELIVERED_TO_LAB',
    'SAMPLE_RECEIVED',
    'SAMPLE_ISSUE',
    'PROCESSING',
    'RESULTS_READY',
    'RESULTS_UPLOADED',
    'DOCTOR_REVIEWED',
    'CLOSED',
    'CANCELLED',
    'EXPIRED',
];

export default function LabOrdersPage() {
    const [search, setSearch] = useState('');
    const [selectedStatuses, setSelectedStatuses] = useState<LabOrderStatus[]>([]);
    const [selectedVertical, setSelectedVertical] = useState<HealthVertical | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

    // Fetch lab orders
    const { data, loading, refetch } = useQuery<AdminLabOrdersResponse>(ADMIN_LAB_ORDERS, {
        variables: {
            filter: {
                statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
                vertical: selectedVertical || undefined,
                search: search || undefined,
            },
        },
        pollInterval: 30000,
    });

    const labOrders = data?.adminLabOrders?.labOrders || [];
    const total = data?.adminLabOrders?.total || 0;

    const toggleStatus = (status: LabOrderStatus) => {
        setSelectedStatuses((prev) =>
            prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
        );
    };

    const toggleOrderSelection = (orderId: string) => {
        setSelectedOrders((prev) =>
            prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId],
        );
    };

    const clearFilters = () => {
        setSelectedStatuses([]);
        setSelectedVertical(null);
        setSearch('');
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-card border-b border-border px-4 lg:px-8 py-4">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-foreground">Lab Orders</h1>
                        <p className="text-sm text-muted-foreground">
                            {total} total • {labOrders.filter((o) => o.slaInfo.status === 'BREACHED').length} SLA breaches
                        </p>
                    </div>

                    {/* Search */}
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
                            {(selectedStatuses.length > 0 || selectedVertical) && (
                                <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary text-white rounded-full">
                                    {selectedStatuses.length + (selectedVertical ? 1 : 0)}
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
                                {/* Status filters */}
                                <div>
                                    <p className="text-sm font-medium text-foreground mb-2">Status</p>
                                    <div className="flex flex-wrap gap-2">
                                        {ALL_STATUSES.map((status) => {
                                            const config = LAB_ORDER_STATUS_CONFIG[status];
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

                                {/* Vertical filters */}
                                <div>
                                    <p className="text-sm font-medium text-foreground mb-2">Vertical</p>
                                    <div className="flex flex-wrap gap-2">
                                        {(Object.keys(VERTICAL_CONFIG) as HealthVertical[]).map((vertical) => {
                                            const config = VERTICAL_CONFIG[vertical];
                                            const isSelected = selectedVertical === vertical;
                                            return (
                                                <button
                                                    key={vertical}
                                                    onClick={() =>
                                                        setSelectedVertical(isSelected ? null : vertical)
                                                    }
                                                    className={cn(
                                                        'px-3 py-1.5 text-xs rounded-full border transition-all',
                                                        isSelected
                                                            ? `bg-primary/10 text-primary border-primary`
                                                            : 'border-border hover:border-primary/40',
                                                    )}
                                                >
                                                    {config.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {(selectedStatuses.length > 0 || selectedVertical) && (
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

            {/* Bulk Actions */}
            <AnimatePresence>
                {selectedOrders.length > 0 && (
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        className="sticky top-[73px] lg:top-[81px] z-20 bg-primary text-white px-4 lg:px-8 py-3"
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                                {selectedOrders.length} order(s) selected
                            </p>
                            <div className="flex gap-2">
                                <BulkAssignButton
                                    orderIds={selectedOrders}
                                    orders={labOrders.filter((o) => selectedOrders.includes(o.id))}
                                    onSuccess={() => {
                                        setSelectedOrders([]);
                                        refetch();
                                    }}
                                />
                                <button
                                    onClick={() => setSelectedOrders([])}
                                    className="px-3 py-1.5 text-sm bg-white/20 rounded-lg hover:bg-white/30"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Orders List */}
            <div className="p-4 lg:p-8 space-y-3">
                {loading && labOrders.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : labOrders.length === 0 ? (
                    <div className="text-center py-12">
                        <TestTube2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-foreground font-medium">No lab orders found</p>
                        <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                    </div>
                ) : (
                    labOrders.map((order) => (
                        <LabOrderCard
                            key={order.id}
                            order={order}
                            isExpanded={expandedId === order.id}
                            isSelected={selectedOrders.includes(order.id)}
                            onToggleExpand={() =>
                                setExpandedId(expandedId === order.id ? null : order.id)
                            }
                            onToggleSelect={() => toggleOrderSelection(order.id)}
                            onRefetch={refetch}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

interface LabOrderCardProps {
    order: AdminLabOrder;
    isExpanded: boolean;
    isSelected: boolean;
    onToggleExpand: () => void;
    onToggleSelect: () => void;
    onRefetch: () => void;
}

function LabOrderCard({
    order,
    isExpanded,
    isSelected,
    onToggleExpand,
    onToggleSelect,
    onRefetch,
}: LabOrderCardProps) {
    const statusConfig = LAB_ORDER_STATUS_CONFIG[order.status];
    const slaConfig = SLA_STATUS_CONFIG[order.slaInfo.status];
    const verticalConfig = order.vertical ? VERTICAL_CONFIG[order.vertical] : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                'card-premium overflow-hidden transition-all',
                order.slaInfo.status === 'BREACHED' && 'ring-2 ring-red-200',
                isSelected && 'ring-2 ring-primary',
            )}
        >
            {/* Main row */}
            <div
                onClick={onToggleExpand}
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            >
                <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleSelect();
                        }}
                        className={cn(
                            'w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 transition-colors',
                            isSelected
                                ? 'bg-primary border-primary'
                                : 'border-border hover:border-primary',
                        )}
                    >
                        {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-medium text-foreground truncate">
                                {order.patient.name || 'Unknown'}
                            </span>
                            {verticalConfig && (
                                <span className={cn('text-xs', verticalConfig.color)}>
                                    {verticalConfig.label}
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
                            {order.slaInfo.status !== 'ON_TIME' && (
                                <span
                                    className={cn(
                                        'px-2 py-0.5 text-xs rounded-full',
                                        slaConfig.bgColor,
                                        slaConfig.color,
                                    )}
                                >
                                    {order.slaInfo.status === 'BREACHED' ? (
                                        <>
                                            <AlertTriangle className="w-3 h-3 inline mr-1" />
                                            {order.slaInfo.hoursOverdue}h overdue
                                        </>
                                    ) : (
                                        'Approaching'
                                    )}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <TestTube2 className="w-3 h-3" />
                                {order.panelName || order.testPanel.join(', ')}
                            </span>
                            {order.bookedDate && (
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {format(new Date(order.bookedDate), 'MMM d')}
                                    {order.bookedTimeSlot && ` • ${order.bookedTimeSlot}`}
                                </span>
                            )}
                            {order.phlebotomist && (
                                <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {order.phlebotomist.name}
                                </span>
                            )}
                            {order.lab && (
                                <span className="flex items-center gap-1">
                                    <Building2 className="w-3 h-3" />
                                    {order.lab.name}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Expand icon */}
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
                        <ExpandedOrderDetails order={order} onRefetch={onRefetch} />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function ExpandedOrderDetails({
    order,
    onRefetch,
}: {
    order: AdminLabOrder;
    onRefetch: () => void;
}) {
    return (
        <div className="px-4 pb-4 border-t border-border">
            <div className="pt-4 grid gap-6 lg:grid-cols-2">
                {/* Patient Info */}
                <div>
                    <h4 className="font-medium text-foreground mb-3">Patient Info</h4>
                    <div className="space-y-2 text-sm">
                        <p className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            {order.patient.name || 'Unknown'}
                        </p>
                        {order.patient.phone && (
                            <a
                                href={`tel:${order.patient.phone}`}
                                className="flex items-center gap-2 text-primary hover:underline"
                            >
                                <Phone className="w-4 h-4" />
                                {order.patient.phone}
                            </a>
                        )}
                        <p className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                            <span>
                                {order.collectionAddress}
                                <br />
                                {order.collectionCity}, {order.collectionPincode}
                            </span>
                        </p>
                    </div>
                </div>

                {/* Timeline */}
                <div>
                    <h4 className="font-medium text-foreground mb-3">Timeline</h4>
                    <div className="space-y-2">
                        {order.timeline.map((event, i) => {
                            const config = LAB_ORDER_STATUS_CONFIG[event.status as LabOrderStatus];
                            return (
                                <div key={i} className="flex items-start gap-2 text-sm">
                                    <div
                                        className={cn(
                                            'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                                            config?.bgColor || 'bg-gray-200',
                                        )}
                                    />
                                    <div>
                                        <p className="text-foreground">
                                            {config?.label || event.status}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {format(new Date(event.timestamp), 'MMM d, h:mm a')}
                                            {event.details && ` • ${event.details}`}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="mt-6 pt-4 border-t border-border">
                <h4 className="font-medium text-foreground mb-3">Actions</h4>
                <div className="flex flex-wrap gap-2">
                    {order.status === 'SLOT_BOOKED' && (
                        <AssignPhlebotomistButton order={order} onSuccess={onRefetch} />
                    )}
                    {!order.lab && (
                        <AssignLabButton order={order} onSuccess={onRefetch} />
                    )}
                </div>
            </div>
        </div>
    );
}

function AssignPhlebotomistButton({
    order,
    onSuccess,
}: {
    order: AdminLabOrder;
    onSuccess: () => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const { data, loading } = useQuery<AvailablePhlebotomistsResponse>(AVAILABLE_PHLEBOTOMISTS, {
        variables: {
            pincode: order.collectionPincode,
            date: order.bookedDate ? new Date(order.bookedDate) : new Date(),
        },
        skip: !isOpen,
    });

    const [assign, { loading: assigning }] = useMutation(ASSIGN_PHLEBOTOMIST, {
        onCompleted: (data) => {
            if (data.assignPhlebotomist.success) {
                setIsOpen(false);
                onSuccess();
            }
        },
    });

    const phlebotomists = data?.availablePhlebotomists?.phlebotomists || [];

    return (
        <>
            <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
                <User className="w-4 h-4 mr-2" />
                Assign Phlebotomist
            </Button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-card rounded-xl shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden"
                    >
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <h3 className="font-semibold text-foreground">Assign Phlebotomist</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-muted rounded"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto max-h-[60vh]">
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                </div>
                            ) : phlebotomists.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    No phlebotomists available for this pincode
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {phlebotomists.map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => setSelectedId(p.id)}
                                            disabled={!p.isAvailable}
                                            className={cn(
                                                'w-full p-3 rounded-lg border text-left transition-all',
                                                selectedId === p.id
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-border hover:border-primary/40',
                                                !p.isAvailable && 'opacity-50 cursor-not-allowed',
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-foreground">
                                                    {p.name}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {p.todayAssignments}/{p.maxDailyCollections} today
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">{p.phone}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-border flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setIsOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1"
                                disabled={!selectedId || assigning}
                                onClick={() => {
                                    if (selectedId) {
                                        assign({
                                            variables: {
                                                input: {
                                                    labOrderId: order.id,
                                                    phlebotomistId: selectedId,
                                                },
                                            },
                                        });
                                    }
                                }}
                            >
                                {assigning ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    'Assign'
                                )}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </>
    );
}

function AssignLabButton({
    order,
    onSuccess,
}: {
    order: AdminLabOrder;
    onSuccess: () => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const { data, loading } = useQuery<AvailableLabsResponse>(AVAILABLE_LABS, {
        variables: { city: order.collectionCity },
        skip: !isOpen,
    });

    const [assign, { loading: assigning }] = useMutation(ASSIGN_LAB, {
        onCompleted: (data) => {
            if (data.assignLab.success) {
                setIsOpen(false);
                onSuccess();
            }
        },
    });

    const labs = data?.availableLabs?.labs || [];

    return (
        <>
            <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
                <Building2 className="w-4 h-4 mr-2" />
                Assign Lab
            </Button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-card rounded-xl shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden"
                    >
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <h3 className="font-semibold text-foreground">Assign Lab</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-muted rounded"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto max-h-[60vh]">
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                </div>
                            ) : labs.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    No labs available in {order.collectionCity}
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {labs.map((lab) => (
                                        <button
                                            key={lab.id}
                                            onClick={() => setSelectedId(lab.id)}
                                            className={cn(
                                                'w-full p-3 rounded-lg border text-left transition-all',
                                                selectedId === lab.id
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-border hover:border-primary/40',
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-foreground">
                                                    {lab.name}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    ~{lab.avgTurnaroundHours}h turnaround
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">{lab.address}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-border flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setIsOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1"
                                disabled={!selectedId || assigning}
                                onClick={() => {
                                    if (selectedId) {
                                        assign({
                                            variables: {
                                                input: {
                                                    labOrderId: order.id,
                                                    labId: selectedId,
                                                },
                                            },
                                        });
                                    }
                                }}
                            >
                                {assigning ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    'Assign'
                                )}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </>
    );
}

function BulkAssignButton({
    orderIds,
    orders,
    onSuccess,
}: {
    orderIds: string[];
    orders: AdminLabOrder[];
    onSuccess: () => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Get common pincode from selected orders (use first order's pincode)
    const firstOrder = orders[0];
    const pincode = firstOrder?.collectionPincode || '';

    const { data, loading } = useQuery<AvailablePhlebotomistsResponse>(AVAILABLE_PHLEBOTOMISTS, {
        variables: {
            pincode,
            date: firstOrder?.bookedDate ? new Date(firstOrder.bookedDate) : new Date(),
        },
        skip: !isOpen || !pincode,
    });

    const [bulkAssign, { loading: assigning }] = useMutation(BULK_ASSIGN_PHLEBOTOMIST, {
        onCompleted: (data) => {
            if (data.bulkAssignPhlebotomist.success) {
                setIsOpen(false);
                onSuccess();
            }
        },
    });

    const phlebotomists = data?.availablePhlebotomists?.phlebotomists || [];

    // Filter to only SLOT_BOOKED orders
    const eligibleCount = orders.filter((o) => o.status === 'SLOT_BOOKED').length;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="px-3 py-1.5 text-sm bg-white text-primary rounded-lg hover:bg-white/90"
            >
                Bulk Assign Phlebotomist
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-card rounded-xl shadow-xl w-full max-w-md"
                    >
                        <div className="p-4 border-b border-border">
                            <h3 className="font-semibold text-foreground">Bulk Assign Phlebotomist</h3>
                            <p className="text-sm text-muted-foreground">
                                {eligibleCount} of {orderIds.length} orders eligible (SLOT_BOOKED only)
                            </p>
                        </div>

                        <div className="p-4 max-h-[60vh] overflow-y-auto">
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {phlebotomists.map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => setSelectedId(p.id)}
                                            disabled={!p.isAvailable}
                                            className={cn(
                                                'w-full p-3 rounded-lg border text-left transition-all',
                                                selectedId === p.id
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-border hover:border-primary/40',
                                                !p.isAvailable && 'opacity-50 cursor-not-allowed',
                                            )}
                                        >
                                            <span className="font-medium text-foreground">{p.name}</span>
                                            <span className="text-xs text-muted-foreground ml-2">
                                                ({p.todayAssignments}/{p.maxDailyCollections})
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-border flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setIsOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1"
                                disabled={!selectedId || assigning || eligibleCount === 0}
                                onClick={() => {
                                    if (selectedId) {
                                        bulkAssign({
                                            variables: {
                                                input: {
                                                    labOrderIds: orderIds,
                                                    phlebotomistId: selectedId,
                                                },
                                            },
                                        });
                                    }
                                }}
                            >
                                {assigning ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    `Assign ${eligibleCount}`
                                )}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </>
    );
}
