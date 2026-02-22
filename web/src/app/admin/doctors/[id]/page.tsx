'use client';

import { useQuery, useMutation } from '@apollo/client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
    ArrowLeft,
    Stethoscope,
    Activity,
    Clock,
    Shield,
    UserCheck,
    UserX,
    AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    DOCTOR_BY_ID,
    DOCTOR_STATS,
    TOGGLE_DOCTOR_AVAILABILITY,
    DEACTIVATE_DOCTOR,
    DoctorProfile,
    DoctorStatsData,
    VERTICAL_LABELS,
    VERTICAL_COLORS,
} from '@/graphql/doctors';

// Spec: Phase 12 — Doctor Detail Page

export default function DoctorDetailPage() {
    const params = useParams();
    const id = params.id as string;

    const { data: doctorData, loading: doctorLoading, error: doctorError, refetch } = useQuery<{ doctorById: DoctorProfile }>(
        DOCTOR_BY_ID,
        { variables: { id } },
    );

    const { data: statsData, loading: statsLoading } = useQuery<{ doctorStats: DoctorStatsData }>(
        DOCTOR_STATS,
        { variables: { id } },
    );

    const [toggleAvailability] = useMutation(TOGGLE_DOCTOR_AVAILABILITY, {
        onCompleted: () => refetch(),
    });

    const [deactivate] = useMutation(DEACTIVATE_DOCTOR);

    const doctor = doctorData?.doctorById;
    const stats = statsData?.doctorStats;

    if (doctorLoading) {
        return (
            <div className="flex justify-center py-24">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    if (doctorError || !doctor) {
        return (
            <div className="p-4 lg:p-8">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {doctorError?.message || 'Doctor not found'}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-8 space-y-6 max-w-3xl">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <Link href="/admin/doctors" className="flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-foreground">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Doctors
                </Link>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Stethoscope className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold">{doctor.registrationNo}</h1>
                                {doctor.seniorDoctor && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                                        <Shield className="w-3 h-3" />
                                        Senior
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {doctor.specializations.join(', ')} &middot; {doctor.yearsOfExperience}yr exp
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => toggleAvailability({ variables: { id: doctor.id } })}
                        className={cn(
                            'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium',
                            doctor.isAvailable
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700',
                        )}
                    >
                        {doctor.isAvailable ? (
                            <><UserCheck className="w-4 h-4" /> Available</>
                        ) : (
                            <><UserX className="w-4 h-4" /> Unavailable</>
                        )}
                    </button>
                </div>
            </motion.div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="card-premium p-3 text-center">
                        <Activity className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                        <p className="text-lg font-bold">{stats.activeCases}</p>
                        <p className="text-xs text-muted-foreground">Active Cases</p>
                    </div>
                    <div className="card-premium p-3 text-center">
                        <Stethoscope className="w-5 h-5 mx-auto text-green-500 mb-1" />
                        <p className="text-lg font-bold">{stats.completedToday}</p>
                        <p className="text-xs text-muted-foreground">Completed Today</p>
                    </div>
                    <div className="card-premium p-3 text-center">
                        <Activity className="w-5 h-5 mx-auto text-purple-500 mb-1" />
                        <p className="text-lg font-bold">{stats.dailyCaseLimit}</p>
                        <p className="text-xs text-muted-foreground">Daily Limit</p>
                    </div>
                    <div className="card-premium p-3 text-center">
                        <Clock className="w-5 h-5 mx-auto text-amber-500 mb-1" />
                        <p className="text-lg font-bold">{stats.avgResponseTimeHours.toFixed(1)}h</p>
                        <p className="text-xs text-muted-foreground">Avg Response</p>
                    </div>
                </div>
            )}

            {statsLoading && (
                <div className="flex justify-center py-4">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
            )}

            {/* Details */}
            <div className="card-premium p-4 space-y-4">
                <h2 className="font-semibold">Doctor Details</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-muted-foreground">Registration No</p>
                        <p className="font-medium">{doctor.registrationNo}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Experience</p>
                        <p className="font-medium">{doctor.yearsOfExperience} years</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Consultation Fee</p>
                        <p className="font-medium">{(doctor.consultationFee / 100).toFixed(0)} INR</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Daily Case Limit</p>
                        <p className="font-medium">{doctor.dailyCaseLimit}</p>
                    </div>
                    <div className="col-span-2">
                        <p className="text-muted-foreground">Qualifications</p>
                        <p className="font-medium">{doctor.qualifications.join(', ')}</p>
                    </div>
                </div>

                {/* Verticals */}
                <div>
                    <p className="text-sm text-muted-foreground mb-1">Verticals</p>
                    <div className="flex flex-wrap gap-1.5">
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

                {doctor.bio && (
                    <div>
                        <p className="text-sm text-muted-foreground mb-1">Bio</p>
                        <p className="text-sm">{doctor.bio}</p>
                    </div>
                )}

                {doctor.lastAssignedAt && (
                    <div>
                        <p className="text-sm text-muted-foreground mb-1">Last Assigned</p>
                        <p className="text-sm">{new Date(doctor.lastAssignedAt).toLocaleString()}</p>
                    </div>
                )}
            </div>

            {/* Danger Zone */}
            {doctor.isActive && (
                <div className="card-premium p-4 border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <h3 className="font-semibold text-red-700">Danger Zone</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                        Deactivating will prevent this doctor from receiving new cases.
                    </p>
                    <button
                        onClick={() => {
                            if (confirm('Are you sure you want to deactivate this doctor?')) {
                                deactivate({ variables: { id: doctor.id } }).then(() => refetch());
                            }
                        }}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
                    >
                        Deactivate Doctor
                    </button>
                </div>
            )}
        </div>
    );
}
