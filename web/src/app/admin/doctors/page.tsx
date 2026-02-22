'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
    Search,
    Plus,
    UserCheck,
    UserX,
    Stethoscope,
    Activity,
    Clock,
    Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    ADMIN_DOCTORS,
    TOGGLE_DOCTOR_AVAILABILITY,
    DoctorProfile,
    VERTICAL_LABELS,
    VERTICAL_COLORS,
} from '@/graphql/doctors';

// Spec: Phase 12 — Admin Doctor List Page

export default function DoctorsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [verticalFilter, setVerticalFilter] = useState<string | null>(null);

    const { data, loading, error, refetch } = useQuery<{ doctors: DoctorProfile[] }>(
        ADMIN_DOCTORS,
        {
            variables: {
                ...(verticalFilter ? { vertical: verticalFilter } : {}),
            },
        },
    );

    const [toggleAvailability] = useMutation(TOGGLE_DOCTOR_AVAILABILITY, {
        onCompleted: () => refetch(),
    });

    const doctors = data?.doctors ?? [];

    const filtered = doctors.filter((d) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            d.registrationNo.toLowerCase().includes(q) ||
            d.specializations.some((s) => s.toLowerCase().includes(q))
        );
    });

    return (
        <div className="p-4 lg:p-8 space-y-6">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-xl lg:text-2xl font-bold">Doctor Management</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Onboard, manage, and monitor doctors across all verticals
                </p>
            </motion.div>

            {/* Search + Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by NMC registration or specialization..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-background text-sm"
                    />
                </div>
                <Link
                    href="/admin/doctors/add"
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
                >
                    <Plus className="w-4 h-4" />
                    Add Doctor
                </Link>
            </div>

            {/* Vertical Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                    onClick={() => setVerticalFilter(null)}
                    className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap',
                        !verticalFilter ? 'bg-primary text-white' : 'bg-muted text-muted-foreground',
                    )}
                >
                    All
                </button>
                {Object.entries(VERTICAL_LABELS).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setVerticalFilter(key)}
                        className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap',
                            verticalFilter === key ? 'bg-primary text-white' : 'bg-muted text-muted-foreground',
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading && (
                <div className="flex justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
                </div>
            )}

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    Failed to load doctors: {error.message}
                </div>
            )}

            {!loading && !error && filtered.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No doctors found</p>
                </div>
            )}

            {!loading && !error && filtered.length > 0 && (
                <div className="grid gap-4">
                    {filtered.map((doctor, i) => (
                        <motion.div
                            key={doctor.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                        >
                            <Link href={`/admin/doctors/${doctor.id}`}>
                                <div className="card-premium p-4 hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                <Stethoscope className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-sm truncate">
                                                        {doctor.registrationNo}
                                                    </p>
                                                    {doctor.seniorDoctor && (
                                                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                                                            <Shield className="w-3 h-3" />
                                                            Senior
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {doctor.specializations.map((spec) => (
                                                        <span key={spec} className="px-2 py-0.5 bg-muted rounded-full text-xs">
                                                            {spec}
                                                        </span>
                                                    ))}
                                                </div>
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                    {doctor.verticals.map((v) => (
                                                        <span
                                                            key={v}
                                                            className={cn(
                                                                'px-2 py-0.5 rounded-full text-xs font-medium',
                                                                VERTICAL_COLORS[v]?.bg ?? 'bg-gray-100',
                                                                VERTICAL_COLORS[v]?.text ?? 'text-gray-600',
                                                            )}
                                                        >
                                                            {VERTICAL_LABELS[v] ?? v}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-3">
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    toggleAvailability({ variables: { id: doctor.id } });
                                                }}
                                                className={cn(
                                                    'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium',
                                                    doctor.isAvailable
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-red-100 text-red-700',
                                                )}
                                            >
                                                {doctor.isAvailable ? (
                                                    <><UserCheck className="w-3 h-3" /> Available</>
                                                ) : (
                                                    <><UserX className="w-3 h-3" /> Unavailable</>
                                                )}
                                            </button>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Activity className="w-3 h-3" />
                                                    Limit: {doctor.dailyCaseLimit}
                                                </span>
                                                {doctor.lastAssignedAt && (
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(doctor.lastAssignedAt).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
