'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Search,
    Phone,
    Mail,
    MapPin,
    Calendar,
    ChevronDown,
    ChevronRight,
    TestTube2,
    Truck,
    MessageSquare,
    Loader2,
    AlertTriangle,
    User,
    Clock,
    Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    ADMIN_PATIENTS,
    ADMIN_PATIENT_DETAIL,
    AdminPatientsResponse,
    AdminPatientDetailResponse,
    AdminPatientSummary,
    AdminPatientDetail,
    VERTICAL_CONFIG,
    LAB_ORDER_STATUS_CONFIG,
    ORDER_STATUS_CONFIG,
    CONSULTATION_STATUS_CONFIG,
    HealthVertical,
    LabOrderStatus,
    OrderStatus,
} from '@/graphql/admin';

// Spec: master spec Section 3.2 — Patient Management
// Search patients, view details, track activity

export default function PatientsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

    // Debounce search
    const handleSearch = (value: string) => {
        setSearchQuery(value);
        // Simple debounce
        setTimeout(() => {
            setDebouncedSearch(value);
        }, 300);
    };

    const { data, loading, error } = useQuery<AdminPatientsResponse>(ADMIN_PATIENTS, {
        variables: {
            filter: {
                search: debouncedSearch || undefined,
                pageSize: 50,
            },
        },
    });

    const patients = data?.adminPatients.patients || [];

    return (
        <div className="p-4 lg:p-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
            >
                <h1 className="text-xl lg:text-2xl font-bold text-foreground">
                    Patient Management
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Search and view patient profiles and activity
                </p>
            </motion.div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by name, phone, or email..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>
            </div>

            {/* Loading */}
            {loading && !data && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="card-premium p-6 text-center">
                    <AlertTriangle className="w-12 h-12 text-error mx-auto mb-3" />
                    <p className="text-foreground font-medium">Failed to load patients</p>
                    <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
                </div>
            )}

            {/* Empty State */}
            {!loading && patients.length === 0 && (
                <div className="card-premium p-8 text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-foreground font-medium">
                        {debouncedSearch ? 'No patients found' : 'No patients yet'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                        {debouncedSearch
                            ? 'Try a different search term'
                            : 'Patients will appear here once they register'}
                    </p>
                </div>
            )}

            {/* Patient List */}
            {patients.length > 0 && (
                <div className="space-y-3">
                    {patients.map((patient, index) => (
                        <motion.div
                            key={patient.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                        >
                            <PatientCard
                                patient={patient}
                                isSelected={selectedPatientId === patient.id}
                                onSelect={() =>
                                    setSelectedPatientId(
                                        selectedPatientId === patient.id ? null : patient.id
                                    )
                                }
                            />
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Patient Detail Modal */}
            {selectedPatientId && (
                <PatientDetailModal
                    patientId={selectedPatientId}
                    onClose={() => setSelectedPatientId(null)}
                />
            )}
        </div>
    );
}

function PatientCard({
    patient,
    isSelected,
    onSelect,
}: {
    patient: AdminPatientSummary;
    isSelected: boolean;
    onSelect: () => void;
}) {
    const hasActivity =
        patient.activeConsultations > 0 ||
        patient.pendingLabOrders > 0 ||
        patient.pendingDeliveries > 0;

    return (
        <div
            className={cn(
                'card-premium p-4 cursor-pointer transition-all',
                isSelected && 'ring-2 ring-primary'
            )}
            onClick={onSelect}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    {/* Name and Contact */}
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-foreground truncate">
                            {patient.name || 'Unnamed Patient'}
                        </h3>
                        {hasActivity && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                Active
                            </span>
                        )}
                    </div>

                    {/* Contact Info */}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            {patient.phone}
                        </span>
                        {patient.email && (
                            <span className="flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5" />
                                {patient.email}
                            </span>
                        )}
                        {patient.city && (
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {patient.city}
                            </span>
                        )}
                    </div>

                    {/* Activity Stats */}
                    <div className="flex flex-wrap gap-3 text-xs">
                        {patient.activeConsultations > 0 && (
                            <span className="flex items-center gap-1 text-purple-600">
                                <MessageSquare className="w-3.5 h-3.5" />
                                {patient.activeConsultations} consultation
                                {patient.activeConsultations > 1 ? 's' : ''}
                            </span>
                        )}
                        {patient.pendingLabOrders > 0 && (
                            <span className="flex items-center gap-1 text-blue-600">
                                <TestTube2 className="w-3.5 h-3.5" />
                                {patient.pendingLabOrders} lab order
                                {patient.pendingLabOrders > 1 ? 's' : ''}
                            </span>
                        )}
                        {patient.pendingDeliveries > 0 && (
                            <span className="flex items-center gap-1 text-teal-600">
                                <Truck className="w-3.5 h-3.5" />
                                {patient.pendingDeliveries} deliver
                                {patient.pendingDeliveries > 1 ? 'ies' : 'y'}
                            </span>
                        )}
                    </div>
                </div>

                <ChevronRight
                    className={cn(
                        'w-5 h-5 text-muted-foreground transition-transform ml-2',
                        isSelected && 'rotate-90'
                    )}
                />
            </div>
        </div>
    );
}

function PatientDetailModal({
    patientId,
    onClose,
}: {
    patientId: string;
    onClose: () => void;
}) {
    const { data, loading, error } = useQuery<AdminPatientDetailResponse>(ADMIN_PATIENT_DETAIL, {
        variables: { patientId },
    });

    const patient = data?.adminPatientDetail;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative bg-background rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-lg font-semibold">Patient Details</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-muted transition-colors text-2xl leading-none"
                    >
                        &times;
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(90vh-60px)]">
                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    )}

                    {error && (
                        <div className="p-6 text-center">
                            <AlertTriangle className="w-12 h-12 text-error mx-auto mb-3" />
                            <p className="text-foreground font-medium">Failed to load patient</p>
                            <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
                        </div>
                    )}

                    {patient && <PatientDetailContent patient={patient} />}

                    {!loading && !error && !patient && (
                        <div className="p-6 text-center">
                            <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                            <p className="text-foreground font-medium">Patient not found</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

function PatientDetailContent({ patient }: { patient: AdminPatientDetail }) {
    const [activeSection, setActiveSection] = useState<
        'info' | 'consultations' | 'labOrders' | 'orders'
    >('info');

    return (
        <div className="p-4 space-y-4">
            {/* Basic Info Card */}
            <div className="bg-muted rounded-xl p-4">
                <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-7 h-7 text-primary" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground">
                            {patient.name || 'Unnamed Patient'}
                        </h3>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                                <Phone className="w-4 h-4" />
                                {patient.phone}
                            </span>
                            {patient.email && (
                                <span className="flex items-center gap-1">
                                    <Mail className="w-4 h-4" />
                                    {patient.email}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border text-sm">
                    {patient.dateOfBirth && (
                        <div>
                            <p className="text-muted-foreground">Date of Birth</p>
                            <p className="text-foreground font-medium">
                                {new Date(patient.dateOfBirth).toLocaleDateString('en-IN')}
                            </p>
                        </div>
                    )}
                    {patient.gender && (
                        <div>
                            <p className="text-muted-foreground">Gender</p>
                            <p className="text-foreground font-medium capitalize">{patient.gender}</p>
                        </div>
                    )}
                    {patient.address && (
                        <div className="col-span-2">
                            <p className="text-muted-foreground">Address</p>
                            <p className="text-foreground">
                                {patient.address}
                                {patient.city && `, ${patient.city}`}
                                {patient.state && `, ${patient.state}`}
                                {patient.pincode && ` - ${patient.pincode}`}
                            </p>
                        </div>
                    )}
                    <div>
                        <p className="text-muted-foreground">Registered</p>
                        <p className="text-foreground">
                            {new Date(patient.createdAt).toLocaleDateString('en-IN')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Section Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                <TabButton
                    active={activeSection === 'info'}
                    onClick={() => setActiveSection('info')}
                    icon={<Activity className="w-4 h-4" />}
                    label="Overview"
                />
                <TabButton
                    active={activeSection === 'consultations'}
                    onClick={() => setActiveSection('consultations')}
                    icon={<MessageSquare className="w-4 h-4" />}
                    label={`Consultations (${patient.consultations.length})`}
                />
                <TabButton
                    active={activeSection === 'labOrders'}
                    onClick={() => setActiveSection('labOrders')}
                    icon={<TestTube2 className="w-4 h-4" />}
                    label={`Lab Orders (${patient.labOrders.length})`}
                />
                <TabButton
                    active={activeSection === 'orders'}
                    onClick={() => setActiveSection('orders')}
                    icon={<Truck className="w-4 h-4" />}
                    label={`Orders (${patient.orders.length})`}
                />
            </div>

            {/* Section Content */}
            <AnimatePresence mode="wait">
                {activeSection === 'info' && (
                    <motion.div
                        key="info"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <OverviewSection patient={patient} />
                    </motion.div>
                )}
                {activeSection === 'consultations' && (
                    <motion.div
                        key="consultations"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <ConsultationsSection consultations={patient.consultations} />
                    </motion.div>
                )}
                {activeSection === 'labOrders' && (
                    <motion.div
                        key="labOrders"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <LabOrdersSection labOrders={patient.labOrders} />
                    </motion.div>
                )}
                {activeSection === 'orders' && (
                    <motion.div
                        key="orders"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <OrdersSection orders={patient.orders} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function TabButton({
    active,
    onClick,
    icon,
    label,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                active
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
        >
            {icon}
            {label}
        </button>
    );
}

function OverviewSection({ patient }: { patient: AdminPatientDetail }) {
    const stats = [
        {
            label: 'Total Consultations',
            value: patient.consultations.length,
            icon: <MessageSquare className="w-5 h-5 text-purple-600" />,
            color: 'bg-purple-100',
        },
        {
            label: 'Lab Orders',
            value: patient.labOrders.length,
            icon: <TestTube2 className="w-5 h-5 text-blue-600" />,
            color: 'bg-blue-100',
        },
        {
            label: 'Deliveries',
            value: patient.orders.length,
            icon: <Truck className="w-5 h-5 text-teal-600" />,
            color: 'bg-teal-100',
        },
    ];

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
                {stats.map((stat) => (
                    <div key={stat.label} className="bg-muted rounded-lg p-3 text-center">
                        <div
                            className={cn(
                                'w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2',
                                stat.color
                            )}
                        >
                            {stat.icon}
                        </div>
                        <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Recent Activity */}
            <div>
                <h4 className="font-medium text-foreground mb-2">Recent Activity</h4>
                <div className="space-y-2">
                    {patient.consultations.slice(0, 3).map((c) => {
                        const verticalConfig = VERTICAL_CONFIG[c.vertical as HealthVertical];
                        const statusConfig = CONSULTATION_STATUS_CONFIG[c.status] || {
                            label: c.status,
                            color: 'text-gray-600',
                            bgColor: 'bg-gray-100',
                        };
                        return (
                            <div key={c.id} className="flex items-center gap-3 text-sm">
                                <MessageSquare className="w-4 h-4 text-purple-500" />
                                <span className={verticalConfig?.color || 'text-foreground'}>
                                    {verticalConfig?.label || c.vertical}
                                </span>
                                <span className={cn('px-2 py-0.5 rounded text-xs', statusConfig.bgColor, statusConfig.color)}>
                                    {statusConfig.label}
                                </span>
                                <span className="text-muted-foreground ml-auto">
                                    {new Date(c.createdAt).toLocaleDateString('en-IN')}
                                </span>
                            </div>
                        );
                    })}
                    {patient.consultations.length === 0 && (
                        <p className="text-sm text-muted-foreground">No recent activity</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function ConsultationsSection({
    consultations,
}: {
    consultations: AdminPatientDetail['consultations'];
}) {
    if (consultations.length === 0) {
        return (
            <div className="text-center py-6">
                <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No consultations yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {consultations.map((c) => {
                const verticalConfig = VERTICAL_CONFIG[c.vertical as HealthVertical];
                const statusConfig = CONSULTATION_STATUS_CONFIG[c.status] || {
                    label: c.status,
                    color: 'text-gray-600',
                    bgColor: 'bg-gray-100',
                };
                return (
                    <div key={c.id} className="bg-muted rounded-lg p-3">
                        <div className="flex items-start justify-between">
                            <div>
                                <span className={cn('font-medium', verticalConfig?.color || 'text-foreground')}>
                                    {verticalConfig?.label || c.vertical}
                                </span>
                                <span className={cn('ml-2 px-2 py-0.5 rounded text-xs', statusConfig.bgColor, statusConfig.color)}>
                                    {statusConfig.label}
                                </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {new Date(c.createdAt).toLocaleDateString('en-IN')}
                            </span>
                        </div>
                        {c.doctorName && (
                            <p className="text-sm text-muted-foreground mt-1">
                                Dr. {c.doctorName}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function LabOrdersSection({ labOrders }: { labOrders: AdminPatientDetail['labOrders'] }) {
    if (labOrders.length === 0) {
        return (
            <div className="text-center py-6">
                <TestTube2 className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No lab orders yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {labOrders.map((lo) => {
                const statusConfig = LAB_ORDER_STATUS_CONFIG[lo.status as LabOrderStatus] || {
                    label: lo.status,
                    color: 'text-gray-600',
                    bgColor: 'bg-gray-100',
                };
                return (
                    <div key={lo.id} className="bg-muted rounded-lg p-3">
                        <div className="flex items-start justify-between">
                            <div>
                                <span className="font-medium text-foreground">
                                    {lo.panelName || 'Lab Test'}
                                </span>
                                <span className={cn('ml-2 px-2 py-0.5 rounded text-xs', statusConfig.bgColor, statusConfig.color)}>
                                    {statusConfig.label}
                                </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {new Date(lo.createdAt).toLocaleDateString('en-IN')}
                            </span>
                        </div>
                        {lo.bookedDate && (
                            <p className="text-sm text-muted-foreground mt-1">
                                <Clock className="w-3.5 h-3.5 inline mr-1" />
                                Booked for {new Date(lo.bookedDate).toLocaleDateString('en-IN')}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function OrdersSection({ orders }: { orders: AdminPatientDetail['orders'] }) {
    if (orders.length === 0) {
        return (
            <div className="text-center py-6">
                <Truck className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No orders yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {orders.map((o) => {
                const statusConfig = ORDER_STATUS_CONFIG[o.status as OrderStatus] || {
                    label: o.status,
                    color: 'text-gray-600',
                    bgColor: 'bg-gray-100',
                };
                return (
                    <div key={o.id} className="bg-muted rounded-lg p-3">
                        <div className="flex items-start justify-between">
                            <div>
                                <span className="font-medium text-foreground">
                                    Order #{o.id.slice(-6).toUpperCase()}
                                </span>
                                <span className={cn('ml-2 px-2 py-0.5 rounded text-xs', statusConfig.bgColor, statusConfig.color)}>
                                    {statusConfig.label}
                                </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {new Date(o.createdAt).toLocaleDateString('en-IN')}
                            </span>
                        </div>
                        <p className="text-sm text-foreground font-medium mt-1">
                            ₹{(o.totalAmountPaise / 100).toLocaleString('en-IN')}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}
