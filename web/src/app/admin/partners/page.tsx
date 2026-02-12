'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2,
    Syringe,
    Pill,
    Plus,
    Search,
    MoreVertical,
    Phone,
    Mail,
    MapPin,
    Clock,
    Star,
    CheckCircle,
    XCircle,
    Loader2,
    AlertTriangle,
    ChevronDown,
    Users,
    Calendar,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    DIAGNOSTIC_CENTRES,
    PHLEBOTOMISTS,
    PHARMACIES,
    TOGGLE_DIAGNOSTIC_CENTRE_ACTIVE,
    TOGGLE_PHLEBOTOMIST_ACTIVE,
    TOGGLE_PHARMACY_ACTIVE,
    CREATE_DIAGNOSTIC_CENTRE,
    CREATE_PHLEBOTOMIST,
    CREATE_PHARMACY,
    DiagnosticCentresResponse,
    PhlebotomistsResponse,
    PharmaciesResponse,
    DiagnosticCentre,
    PhlebotomistDetails,
    PharmacyDetails,
} from '@/graphql/admin';

// Spec: master spec Section 7.5 — Partner Management
// Three tabs: Diagnostic Centres, Phlebotomists, Pharmacies

type PartnerTab = 'labs' | 'phlebotomists' | 'pharmacies';

const TABS: { id: PartnerTab; label: string; icon: React.ReactNode }[] = [
    { id: 'labs', label: 'Labs', icon: <Building2 className="w-4 h-4" /> },
    { id: 'phlebotomists', label: 'Phlebotomists', icon: <Syringe className="w-4 h-4" /> },
    { id: 'pharmacies', label: 'Pharmacies', icon: <Pill className="w-4 h-4" /> },
];

export default function PartnersPage() {
    const [activeTab, setActiveTab] = useState<PartnerTab>('labs');
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);

    return (
        <div className="p-4 lg:p-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
            >
                <h1 className="text-xl lg:text-2xl font-bold text-foreground">
                    Partner Management
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage diagnostic centres, phlebotomists, and pharmacies
                </p>
            </motion.div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id);
                            setSearchQuery('');
                        }}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                            activeTab === tab.id
                                ? 'bg-primary text-white'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        )}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Search and Add */}
            <div className="flex gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder={`Search ${activeTab}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add New</span>
                </button>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                {activeTab === 'labs' && (
                    <motion.div
                        key="labs"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <DiagnosticCentresTab search={searchQuery} />
                    </motion.div>
                )}
                {activeTab === 'phlebotomists' && (
                    <motion.div
                        key="phlebotomists"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <PhlebotomistsTab search={searchQuery} />
                    </motion.div>
                )}
                {activeTab === 'pharmacies' && (
                    <motion.div
                        key="pharmacies"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <PharmaciesTab search={searchQuery} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add Modal */}
            {showAddModal && (
                <AddPartnerModal
                    type={activeTab}
                    onClose={() => setShowAddModal(false)}
                />
            )}
        </div>
    );
}

// =============================================
// DIAGNOSTIC CENTRES TAB
// =============================================

function DiagnosticCentresTab({ search }: { search: string }) {
    const { data, loading, error, refetch } = useQuery<DiagnosticCentresResponse>(
        DIAGNOSTIC_CENTRES,
        {
            variables: { search: search || undefined },
        }
    );

    const [toggleActive] = useMutation(TOGGLE_DIAGNOSTIC_CENTRE_ACTIVE, {
        onCompleted: () => refetch(),
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="card-premium p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-error mx-auto mb-3" />
                <p className="text-foreground font-medium">Failed to load diagnostic centres</p>
                <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
            </div>
        );
    }

    const centres = data?.diagnosticCentres.centres || [];

    if (centres.length === 0) {
        return (
            <div className="card-premium p-8 text-center">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-foreground font-medium">No diagnostic centres found</p>
                <p className="text-sm text-muted-foreground mt-1">
                    {search ? 'Try a different search term' : 'Add your first diagnostic centre'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {centres.map((centre) => (
                <DiagnosticCentreCard
                    key={centre.id}
                    centre={centre}
                    onToggleActive={(isActive) =>
                        toggleActive({ variables: { id: centre.id, isActive } })
                    }
                />
            ))}
        </div>
    );
}

function DiagnosticCentreCard({
    centre,
    onToggleActive,
}: {
    centre: DiagnosticCentre;
    onToggleActive: (isActive: boolean) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div className="card-premium overflow-hidden">
            <div
                className="p-4 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-foreground truncate">
                                {centre.name}
                            </h3>
                            <span
                                className={cn(
                                    'px-2 py-0.5 rounded-full text-xs font-medium',
                                    centre.isActive
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-600'
                                )}
                            >
                                {centre.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {centre.city}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {centre.avgTurnaroundHours}h TAT
                            </span>
                            {centre.rating && (
                                <span className="flex items-center gap-1">
                                    <Star className="w-3.5 h-3.5 text-amber-500" />
                                    {centre.rating.toFixed(1)}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMenu(!showMenu);
                                }}
                                className="p-2 rounded-lg hover:bg-muted transition-colors"
                            >
                                <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </button>
                            {showMenu && (
                                <PartnerActionMenu
                                    isActive={centre.isActive}
                                    onToggleActive={() => {
                                        onToggleActive(!centre.isActive);
                                        setShowMenu(false);
                                    }}
                                    onClose={() => setShowMenu(false)}
                                />
                            )}
                        </div>
                        <ChevronDown
                            className={cn(
                                'w-4 h-4 text-muted-foreground transition-transform',
                                expanded && 'rotate-180'
                            )}
                        />
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border overflow-hidden"
                    >
                        <div className="p-4 space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-muted-foreground">Address</p>
                                    <p className="text-foreground">
                                        {centre.address}, {centre.city}, {centre.state} - {centre.pincode}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Contact</p>
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-3.5 h-3.5" />
                                        <span>{centre.phone}</span>
                                    </div>
                                    {centre.email && (
                                        <div className="flex items-center gap-2 mt-1">
                                            <Mail className="w-3.5 h-3.5" />
                                            <span>{centre.email}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {centre.contactPerson && (
                                <div>
                                    <p className="text-muted-foreground">Contact Person</p>
                                    <p className="text-foreground">{centre.contactPerson}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-muted-foreground mb-1">Tests Offered</p>
                                <div className="flex flex-wrap gap-1">
                                    {centre.testsOffered.map((test) => (
                                        <span
                                            key={test}
                                            className="px-2 py-0.5 bg-muted rounded text-xs"
                                        >
                                            {test}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// =============================================
// PHLEBOTOMISTS TAB
// =============================================

function PhlebotomistsTab({ search }: { search: string }) {
    const { data, loading, error, refetch } = useQuery<PhlebotomistsResponse>(
        PHLEBOTOMISTS,
        {
            variables: { search: search || undefined },
        }
    );

    const [toggleActive] = useMutation(TOGGLE_PHLEBOTOMIST_ACTIVE, {
        onCompleted: () => refetch(),
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="card-premium p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-error mx-auto mb-3" />
                <p className="text-foreground font-medium">Failed to load phlebotomists</p>
                <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
            </div>
        );
    }

    const phlebotomists = data?.phlebotomists.phlebotomists || [];

    if (phlebotomists.length === 0) {
        return (
            <div className="card-premium p-8 text-center">
                <Syringe className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-foreground font-medium">No phlebotomists found</p>
                <p className="text-sm text-muted-foreground mt-1">
                    {search ? 'Try a different search term' : 'Add your first phlebotomist'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {phlebotomists.map((phlebotomist) => (
                <PhlebotomistCard
                    key={phlebotomist.id}
                    phlebotomist={phlebotomist}
                    onToggleActive={(isActive) =>
                        toggleActive({ variables: { id: phlebotomist.id, isActive } })
                    }
                />
            ))}
        </div>
    );
}

function PhlebotomistCard({
    phlebotomist,
    onToggleActive,
}: {
    phlebotomist: PhlebotomistDetails;
    onToggleActive: (isActive: boolean) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    const successRate =
        phlebotomist.completedCollections + phlebotomist.failedCollections > 0
            ? (
                  (phlebotomist.completedCollections /
                      (phlebotomist.completedCollections + phlebotomist.failedCollections)) *
                  100
              ).toFixed(0)
            : 'N/A';

    return (
        <div className="card-premium overflow-hidden">
            <div
                className="p-4 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-foreground truncate">
                                {phlebotomist.name}
                            </h3>
                            <span
                                className={cn(
                                    'px-2 py-0.5 rounded-full text-xs font-medium',
                                    phlebotomist.isActive
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-600'
                                )}
                            >
                                {phlebotomist.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {phlebotomist.currentCity}
                            </span>
                            <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                {phlebotomist.todayAssignments}/{phlebotomist.maxDailyCollections} today
                            </span>
                            {phlebotomist.rating && (
                                <span className="flex items-center gap-1">
                                    <Star className="w-3.5 h-3.5 text-amber-500" />
                                    {phlebotomist.rating.toFixed(1)}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMenu(!showMenu);
                                }}
                                className="p-2 rounded-lg hover:bg-muted transition-colors"
                            >
                                <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </button>
                            {showMenu && (
                                <PartnerActionMenu
                                    isActive={phlebotomist.isActive}
                                    onToggleActive={() => {
                                        onToggleActive(!phlebotomist.isActive);
                                        setShowMenu(false);
                                    }}
                                    onClose={() => setShowMenu(false)}
                                />
                            )}
                        </div>
                        <ChevronDown
                            className={cn(
                                'w-4 h-4 text-muted-foreground transition-transform',
                                expanded && 'rotate-180'
                            )}
                        />
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border overflow-hidden"
                    >
                        <div className="p-4 space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-muted-foreground">Contact</p>
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-3.5 h-3.5" />
                                        <span>{phlebotomist.phone}</span>
                                    </div>
                                    {phlebotomist.email && (
                                        <div className="flex items-center gap-2 mt-1">
                                            <Mail className="w-3.5 h-3.5" />
                                            <span>{phlebotomist.email}</span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Availability</p>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>{phlebotomist.availableDays.join(', ')}</span>
                                    </div>
                                    {phlebotomist.availableTimeStart && phlebotomist.availableTimeEnd && (
                                        <div className="flex items-center gap-2 mt-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>
                                                {phlebotomist.availableTimeStart} - {phlebotomist.availableTimeEnd}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-muted rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-foreground">
                                        {phlebotomist.completedCollections}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Completed</p>
                                </div>
                                <div className="bg-muted rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-foreground">
                                        {phlebotomist.failedCollections}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Failed</p>
                                </div>
                                <div className="bg-muted rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-foreground">{successRate}%</p>
                                    <p className="text-xs text-muted-foreground">Success Rate</p>
                                </div>
                            </div>
                            {phlebotomist.certification && (
                                <div>
                                    <p className="text-muted-foreground">Certification</p>
                                    <p className="text-foreground">{phlebotomist.certification}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-muted-foreground mb-1">Serviceable Areas</p>
                                <div className="flex flex-wrap gap-1">
                                    {phlebotomist.serviceableAreas.map((area) => (
                                        <span
                                            key={area}
                                            className="px-2 py-0.5 bg-muted rounded text-xs"
                                        >
                                            {area}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// =============================================
// PHARMACIES TAB
// =============================================

function PharmaciesTab({ search }: { search: string }) {
    const { data, loading, error, refetch } = useQuery<PharmaciesResponse>(
        PHARMACIES,
        {
            variables: { search: search || undefined },
        }
    );

    const [toggleActive] = useMutation(TOGGLE_PHARMACY_ACTIVE, {
        onCompleted: () => refetch(),
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="card-premium p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-error mx-auto mb-3" />
                <p className="text-foreground font-medium">Failed to load pharmacies</p>
                <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
            </div>
        );
    }

    const pharmacies = data?.pharmacies.pharmacies || [];

    if (pharmacies.length === 0) {
        return (
            <div className="card-premium p-8 text-center">
                <Pill className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-foreground font-medium">No pharmacies found</p>
                <p className="text-sm text-muted-foreground mt-1">
                    {search ? 'Try a different search term' : 'Add your first pharmacy'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {pharmacies.map((pharmacy) => (
                <PharmacyCard
                    key={pharmacy.id}
                    pharmacy={pharmacy}
                    onToggleActive={(isActive) =>
                        toggleActive({ variables: { id: pharmacy.id, isActive } })
                    }
                />
            ))}
        </div>
    );
}

function PharmacyCard({
    pharmacy,
    onToggleActive,
}: {
    pharmacy: PharmacyDetails;
    onToggleActive: (isActive: boolean) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div className="card-premium overflow-hidden">
            <div
                className="p-4 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-foreground truncate">
                                {pharmacy.name}
                            </h3>
                            <span
                                className={cn(
                                    'px-2 py-0.5 rounded-full text-xs font-medium',
                                    pharmacy.isActive
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-600'
                                )}
                            >
                                {pharmacy.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {pharmacy.city}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                ~{pharmacy.avgPreparationMinutes}min prep
                            </span>
                            {pharmacy.rating && (
                                <span className="flex items-center gap-1">
                                    <Star className="w-3.5 h-3.5 text-amber-500" />
                                    {pharmacy.rating.toFixed(1)}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMenu(!showMenu);
                                }}
                                className="p-2 rounded-lg hover:bg-muted transition-colors"
                            >
                                <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </button>
                            {showMenu && (
                                <PartnerActionMenu
                                    isActive={pharmacy.isActive}
                                    onToggleActive={() => {
                                        onToggleActive(!pharmacy.isActive);
                                        setShowMenu(false);
                                    }}
                                    onClose={() => setShowMenu(false)}
                                />
                            )}
                        </div>
                        <ChevronDown
                            className={cn(
                                'w-4 h-4 text-muted-foreground transition-transform',
                                expanded && 'rotate-180'
                            )}
                        />
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border overflow-hidden"
                    >
                        <div className="p-4 space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-muted-foreground">Address</p>
                                    <p className="text-foreground">
                                        {pharmacy.address}, {pharmacy.city}, {pharmacy.state} - {pharmacy.pincode}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Contact</p>
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-3.5 h-3.5" />
                                        <span>{pharmacy.phone}</span>
                                    </div>
                                    {pharmacy.email && (
                                        <div className="flex items-center gap-2 mt-1">
                                            <Mail className="w-3.5 h-3.5" />
                                            <span>{pharmacy.email}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {pharmacy.contactPerson && (
                                <div>
                                    <p className="text-muted-foreground">Contact Person</p>
                                    <p className="text-foreground">{pharmacy.contactPerson}</p>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-muted-foreground">Drug License</p>
                                    <p className="text-foreground font-mono text-xs">
                                        {pharmacy.drugLicenseNumber}
                                    </p>
                                </div>
                                {pharmacy.gstNumber && (
                                    <div>
                                        <p className="text-muted-foreground">GST Number</p>
                                        <p className="text-foreground font-mono text-xs">
                                            {pharmacy.gstNumber}
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-muted-foreground mb-1">Serviceable Areas</p>
                                <div className="flex flex-wrap gap-1">
                                    {pharmacy.serviceableAreas.map((area) => (
                                        <span
                                            key={area}
                                            className="px-2 py-0.5 bg-muted rounded text-xs"
                                        >
                                            {area}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// =============================================
// SHARED COMPONENTS
// =============================================

function PartnerActionMenu({
    isActive,
    onToggleActive,
    onClose,
}: {
    isActive: boolean;
    onToggleActive: () => void;
    onClose: () => void;
}) {
    return (
        <>
            <div className="fixed inset-0 z-10" onClick={onClose} />
            <div className="absolute right-0 top-full mt-1 z-20 bg-background border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
                <button
                    onClick={onToggleActive}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                >
                    {isActive ? (
                        <>
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span>Deactivate</span>
                        </>
                    ) : (
                        <>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>Activate</span>
                        </>
                    )}
                </button>
            </div>
        </>
    );
}

// =============================================
// ADD PARTNER MODAL
// =============================================

function AddPartnerModal({
    type,
    onClose,
}: {
    type: PartnerTab;
    onClose: () => void;
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [createDiagnosticCentre] = useMutation(CREATE_DIAGNOSTIC_CENTRE);
    const [createPhlebotomist] = useMutation(CREATE_PHLEBOTOMIST);
    const [createPharmacy] = useMutation(CREATE_PHARMACY);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        contactPerson: '',
        // Lab specific
        testsOffered: '',
        avgTurnaroundHours: '24',
        // Phlebotomist specific
        certification: '',
        availableDays: 'Mon,Tue,Wed,Thu,Fri',
        availableTimeStart: '08:00',
        availableTimeEnd: '18:00',
        maxDailyCollections: '10',
        serviceableAreas: '',
        // Pharmacy specific
        drugLicenseNumber: '',
        gstNumber: '',
        avgPreparationMinutes: '30',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (type === 'labs') {
                await createDiagnosticCentre({
                    variables: {
                        input: {
                            name: formData.name,
                            address: formData.address,
                            city: formData.city,
                            state: formData.state,
                            pincode: formData.pincode,
                            phone: formData.phone,
                            email: formData.email || undefined,
                            contactPerson: formData.contactPerson || undefined,
                            testsOffered: formData.testsOffered.split(',').map((t) => t.trim()).filter(Boolean),
                            avgTurnaroundHours: parseInt(formData.avgTurnaroundHours) || 24,
                        },
                    },
                    refetchQueries: [{ query: DIAGNOSTIC_CENTRES }],
                });
            } else if (type === 'phlebotomists') {
                await createPhlebotomist({
                    variables: {
                        input: {
                            name: formData.name,
                            phone: formData.phone,
                            email: formData.email || undefined,
                            certification: formData.certification || undefined,
                            availableDays: formData.availableDays.split(',').map((d) => d.trim()),
                            availableTimeStart: formData.availableTimeStart || undefined,
                            availableTimeEnd: formData.availableTimeEnd || undefined,
                            maxDailyCollections: parseInt(formData.maxDailyCollections) || 10,
                            currentCity: formData.city,
                            serviceableAreas: formData.serviceableAreas.split(',').map((a) => a.trim()).filter(Boolean),
                        },
                    },
                    refetchQueries: [{ query: PHLEBOTOMISTS }],
                });
            } else if (type === 'pharmacies') {
                await createPharmacy({
                    variables: {
                        input: {
                            name: formData.name,
                            address: formData.address,
                            city: formData.city,
                            state: formData.state,
                            pincode: formData.pincode,
                            phone: formData.phone,
                            email: formData.email || undefined,
                            contactPerson: formData.contactPerson || undefined,
                            drugLicenseNumber: formData.drugLicenseNumber,
                            gstNumber: formData.gstNumber || undefined,
                            serviceableAreas: formData.serviceableAreas.split(',').map((a) => a.trim()).filter(Boolean),
                            avgPreparationMinutes: parseInt(formData.avgPreparationMinutes) || 30,
                        },
                    },
                    refetchQueries: [{ query: PHARMACIES }],
                });
            }
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create partner');
        } finally {
            setLoading(false);
        }
    };

    const getTitle = () => {
        switch (type) {
            case 'labs':
                return 'Add Diagnostic Centre';
            case 'phlebotomists':
                return 'Add Phlebotomist';
            case 'pharmacies':
                return 'Add Pharmacy';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative bg-background rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden"
            >
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-lg font-semibold">{getTitle()}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                    <div className="space-y-4">
                        {/* Common fields */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Name *</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Phone *</label>
                            <input
                                type="tel"
                                required
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>

                        {/* Address fields for labs and pharmacies */}
                        {(type === 'labs' || type === 'pharmacies') && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Address *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">City *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            className="w-full px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">State *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.state}
                                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                            className="w-full px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Pincode *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.pincode}
                                            onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                            className="w-full px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Contact Person</label>
                                        <input
                                            type="text"
                                            value={formData.contactPerson}
                                            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                            className="w-full px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Lab specific fields */}
                        {type === 'labs' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Tests Offered (comma-separated) *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="CBC, Thyroid, Lipid Profile..."
                                        value={formData.testsOffered}
                                        onChange={(e) => setFormData({ ...formData, testsOffered: e.target.value })}
                                        className="w-full px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Avg Turnaround (hours)</label>
                                    <input
                                        type="number"
                                        value={formData.avgTurnaroundHours}
                                        onChange={(e) => setFormData({ ...formData, avgTurnaroundHours: e.target.value })}
                                        className="w-full px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                            </>
                        )}

                        {/* Phlebotomist specific fields */}
                        {type === 'phlebotomists' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-1">City *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        className="w-full px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Certification</label>
                                    <input
                                        type="text"
                                        value={formData.certification}
                                        onChange={(e) => setFormData({ ...formData, certification: e.target.value })}
                                        className="w-full px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Available Days (comma-separated)</label>
                                    <input
                                        type="text"
                                        value={formData.availableDays}
                                        onChange={(e) => setFormData({ ...formData, availableDays: e.target.value })}
                                        className="w-full px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Start Time</label>
                                        <input
                                            type="time"
                                            value={formData.availableTimeStart}
                                            onChange={(e) => setFormData({ ...formData, availableTimeStart: e.target.value })}
                                            className="w-full px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">End Time</label>
                                        <input
                                            type="time"
                                            value={formData.availableTimeEnd}
                                            onChange={(e) => setFormData({ ...formData, availableTimeEnd: e.target.value })}
                                            className="w-full px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Max Daily Collections</label>
                                    <input
                                        type="number"
                                        value={formData.maxDailyCollections}
                                        onChange={(e) => setFormData({ ...formData, maxDailyCollections: e.target.value })}
                                        className="w-full px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Serviceable Areas (comma-separated pincodes) *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="560001, 560002, 560003..."
                                        value={formData.serviceableAreas}
                                        onChange={(e) => setFormData({ ...formData, serviceableAreas: e.target.value })}
                                        className="w-full px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                            </>
                        )}

                        {/* Pharmacy specific fields */}
                        {type === 'pharmacies' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Drug License Number *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.drugLicenseNumber}
                                        onChange={(e) => setFormData({ ...formData, drugLicenseNumber: e.target.value })}
                                        className="w-full px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">GST Number</label>
                                    <input
                                        type="text"
                                        value={formData.gstNumber}
                                        onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                                        className="w-full px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Serviceable Areas (comma-separated pincodes) *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="560001, 560002, 560003..."
                                        value={formData.serviceableAreas}
                                        onChange={(e) => setFormData({ ...formData, serviceableAreas: e.target.value })}
                                        className="w-full px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Avg Preparation Time (minutes)</label>
                                    <input
                                        type="number"
                                        value={formData.avgPreparationMinutes}
                                        onChange={(e) => setFormData({ ...formData, avgPreparationMinutes: e.target.value })}
                                        className="w-full px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    <div className="mt-6 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Create
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
