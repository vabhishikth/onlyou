'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { motion } from 'framer-motion';
import { Search, Pill, FileDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui';
import {
    DOCTOR_PRESCRIPTIONS,
    DoctorPrescriptionsResponse,
    DoctorPrescriptionItem,
} from '@/graphql/prescription';
import Link from 'next/link';

// Spec: master spec Section 5.4 — Prescriptions List

const VERTICAL_LABELS: Record<string, string> = {
    HAIR_LOSS: 'Hair Loss',
    SEXUAL_HEALTH: 'Sexual Health',
    PCOS: 'PCOS',
    WEIGHT_MANAGEMENT: 'Weight',
};

const VERTICAL_FILTERS = [
    { value: 'ALL', label: 'All' },
    { value: 'HAIR_LOSS', label: 'Hair Loss' },
    { value: 'SEXUAL_HEALTH', label: 'Sexual Health' },
    { value: 'PCOS', label: 'PCOS' },
    { value: 'WEIGHT_MANAGEMENT', label: 'Weight' },
];

export default function PrescriptionsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [verticalFilter, setVerticalFilter] = useState('ALL');

    const { data, loading } = useQuery<DoctorPrescriptionsResponse>(
        DOCTOR_PRESCRIPTIONS,
        {
            variables: {},
            fetchPolicy: 'cache-and-network',
        }
    );

    const prescriptions = data?.doctorPrescriptions || [];

    const filtered = useMemo(() => {
        let items = prescriptions;

        if (verticalFilter !== 'ALL') {
            items = items.filter((p) => p.vertical === verticalFilter);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            items = items.filter((p) =>
                (p.patientName || '').toLowerCase().includes(q)
            );
        }

        return items;
    }, [prescriptions, verticalFilter, searchQuery]);

    const getMedCount = (medications: unknown): number => {
        if (Array.isArray(medications)) return medications.length;
        return 0;
    };

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-2xl lg:text-3xl font-serif font-bold text-foreground">
                    Prescriptions
                </h1>
                <p className="text-muted-foreground mt-1">
                    View and manage patient prescriptions.
                </p>
            </motion.div>

            {/* Search and filters */}
            <div className="mb-6 space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by patient name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {VERTICAL_FILTERS.map((f) => (
                        <button
                            key={f.value}
                            onClick={() => setVerticalFilter(f.value)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                verticalFilter === f.value
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading state */}
            {loading && (
                <div data-testid="prescriptions-loading" className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="card-premium p-5 animate-pulse">
                            <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                            <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {!loading && filtered.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card-premium p-12 text-center"
                >
                    <Pill className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-foreground mb-2">
                        No Prescriptions
                    </h2>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                        Prescriptions created through case reviews will appear here.
                    </p>
                </motion.div>
            )}

            {/* Prescription cards */}
            {!loading && filtered.length > 0 && (
                <div className="space-y-3">
                    {filtered.map((rx) => (
                        <Link
                            key={rx.id}
                            href={`/doctor/case/${rx.consultationId}`}
                        >
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="card-premium p-5 hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-foreground truncate">
                                            {rx.patientName || 'Unknown Patient'}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                            {VERTICAL_LABELS[rx.vertical] || rx.vertical}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span>{getMedCount(rx.medications)} medications</span>
                                        <span>
                                            Issued {formatDistanceToNow(new Date(rx.issuedAt), { addSuffix: true })}
                                        </span>
                                    </div>
                                </div>
                                {rx.pdfUrl && (
                                    <div data-testid="pdf-indicator" className="flex-shrink-0 ml-3">
                                        <FileDown className="w-5 h-5 text-primary" />
                                    </div>
                                )}
                            </motion.div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
