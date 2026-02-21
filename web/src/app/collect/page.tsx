'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock,
    CheckCircle,
    Phone,
    Navigation,
    AlertTriangle,
    Loader2,
    X,
    User,
    Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    COLLECT_TODAY_SUMMARY,
    TODAY_ASSIGNMENTS,
    NEARBY_LABS,
    COLLECT_MARK_COLLECTED,
    COLLECT_MARK_UNAVAILABLE,
    COLLECT_REPORT_LATE,
    COLLECT_DELIVER_TO_LAB,
    CollectTodaySummaryResponse,
    TodayAssignmentsResponse,
    NearbyLabsResponse,
    TodayAssignment,
    NearbyLab,
    COLLECT_STATUS_CONFIG,
    UNAVAILABLE_REASONS,
} from '@/graphql/collect-portal';

// Spec: master spec Section 7.2 — Collection Portal (collect.onlyou.life)
// THE SIMPLEST PORTAL. Used on the road, one hand, between collections.
// Single screen — NO tabs. Just today's list.

export default function CollectPage() {
    const [selectedAssignment, setSelectedAssignment] = useState<TodayAssignment | null>(null);
    const [showCollectDialog, setShowCollectDialog] = useState(false);
    const [showUnavailableDialog, setShowUnavailableDialog] = useState(false);
    const [showLateDialog, setShowLateDialog] = useState(false);
    const [showDeliverDialog, setShowDeliverDialog] = useState(false);
    const [tubeCount, setTubeCount] = useState(3);
    const [unavailableReason, setUnavailableReason] = useState('');
    const [newEta, setNewEta] = useState('');
    const [selectedLab, setSelectedLab] = useState<NearbyLab | null>(null);

    const { data: summaryData, loading: summaryLoading } = useQuery<CollectTodaySummaryResponse>(
        COLLECT_TODAY_SUMMARY,
        { pollInterval: 30000 }
    );

    const { data: assignmentsData, loading: assignmentsLoading, refetch } =
        useQuery<TodayAssignmentsResponse>(TODAY_ASSIGNMENTS, {
            pollInterval: 30000,
        });

    const { data: labsData, loading: labsLoading } = useQuery<NearbyLabsResponse>(NEARBY_LABS);

    const [markCollected, { loading: collecting }] = useMutation(COLLECT_MARK_COLLECTED, {
        onCompleted: () => {
            setShowCollectDialog(false);
            setSelectedAssignment(null);
            refetch();
        },
    });

    const [markUnavailable, { loading: markingUnavailable }] = useMutation(COLLECT_MARK_UNAVAILABLE, {
        onCompleted: () => {
            setShowUnavailableDialog(false);
            setSelectedAssignment(null);
            setUnavailableReason('');
            refetch();
        },
    });

    const [reportLate, { loading: reportingLate }] = useMutation(COLLECT_REPORT_LATE, {
        onCompleted: () => {
            setShowLateDialog(false);
            setSelectedAssignment(null);
            setNewEta('');
        },
    });

    const [deliverToLab, { loading: delivering }] = useMutation(COLLECT_DELIVER_TO_LAB, {
        onCompleted: () => {
            setShowDeliverDialog(false);
            setSelectedAssignment(null);
            setSelectedLab(null);
            refetch();
        },
    });

    const summary = summaryData?.collectTodaySummary;
    const assignments = assignmentsData?.todayAssignments || [];
    const labs = labsData?.nearbyLabs || [];

    const PENDING_STATUSES = new Set(['PHLEBOTOMIST_ASSIGNED', 'PENDING']);
    const COLLECTED_STATUSES = new Set(['SAMPLE_COLLECTED', 'COLLECTED']);
    const COMPLETED_STATUSES = new Set(['DELIVERED_TO_LAB', 'COLLECTION_FAILED']);

    const pendingAssignments = assignments.filter((a) => PENDING_STATUSES.has(a.status));
    const collectedAssignments = assignments.filter((a) => COLLECTED_STATUSES.has(a.status));
    const completedAssignments = assignments.filter((a) => COMPLETED_STATUSES.has(a.status));

    const handleMarkCollected = () => {
        if (!selectedAssignment) return;
        markCollected({
            variables: {
                input: {
                    labOrderId: selectedAssignment.id,
                    tubeCount,
                },
            },
        });
    };

    const handleMarkUnavailable = () => {
        if (!selectedAssignment || !unavailableReason) return;
        markUnavailable({
            variables: {
                input: {
                    labOrderId: selectedAssignment.id,
                    reason: unavailableReason,
                },
            },
        });
    };

    const handleReportLate = () => {
        if (!selectedAssignment || !newEta) return;
        reportLate({
            variables: {
                input: {
                    labOrderId: selectedAssignment.id,
                    newEta,
                },
            },
        });
    };

    const handleDeliverToLab = () => {
        if (!selectedAssignment || !selectedLab) return;
        deliverToLab({
            variables: {
                input: {
                    labOrderId: selectedAssignment.id,
                    labId: selectedLab.id,
                },
            },
        });
    };

    const openCollectDialog = (assignment: TodayAssignment) => {
        setSelectedAssignment(assignment);
        setTubeCount(3);
        setShowCollectDialog(true);
    };

    const openUnavailableDialog = (assignment: TodayAssignment) => {
        setSelectedAssignment(assignment);
        setUnavailableReason('');
        setShowUnavailableDialog(true);
    };

    const openLateDialog = (assignment: TodayAssignment) => {
        setSelectedAssignment(assignment);
        setNewEta('');
        setShowLateDialog(true);
    };

    const openDeliverDialog = (assignment: TodayAssignment) => {
        setSelectedAssignment(assignment);
        setSelectedLab(null);
        setShowDeliverDialog(true);
    };

    const openGoogleMaps = (address: string) => {
        window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, '_blank');
    };

    const callPatient = (phone: string) => {
        window.location.href = `tel:${phone}`;
    };

    const loading = summaryLoading || assignmentsLoading;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
        );
    }

    return (
        <div className="p-4 max-w-lg mx-auto">
            {/* Running Late Button — at very top, always visible */}
            {pendingAssignments.length > 0 && (
                <button
                    onClick={() => openLateDialog(pendingAssignments[0] as TodayAssignment)}
                    className="w-full mb-4 py-3 bg-amber-100 text-amber-700 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-amber-200 transition-colors"
                >
                    <Clock className="w-5 h-5" />
                    Running Late?
                </button>
            )}

            {/* Summary stats */}
            {summary && (
                <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
                    <SummaryPill label="Total" count={summary.total} color="bg-gray-100 text-gray-600" />
                    <SummaryPill label="Pending" count={summary.pending} color="bg-blue-100 text-blue-600" />
                    <SummaryPill label="Done" count={summary.completed} color="bg-green-100 text-green-600" />
                    {summary.failed > 0 && (
                        <SummaryPill label="Failed" count={summary.failed} color="bg-red-100 text-red-600" />
                    )}
                </div>
            )}

            {/* Today's Collections header */}
            <h2 className="text-lg font-semibold text-foreground mb-3">
                Today&apos;s Collections ({assignments.length})
            </h2>

            {/* Empty state */}
            {assignments.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="card-premium p-8 text-center"
                >
                    <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-teal-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        No Collections Today
                    </h3>
                    <p className="text-muted-foreground">
                        You&apos;ll be notified when new collections are assigned.
                    </p>
                </motion.div>
            )}

            {/* Assignment list */}
            <div className="space-y-3">
                {/* Pending first */}
                {pendingAssignments.map((assignment, index) => (
                    <motion.div
                        key={assignment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <AssignmentCard
                            assignment={assignment}
                            onNavigate={() => openGoogleMaps(assignment.fullAddress)}
                            onCall={() => callPatient(assignment.patientPhone)}
                            onCollect={() => openCollectDialog(assignment)}
                            onUnavailable={() => openUnavailableDialog(assignment)}
                        />
                    </motion.div>
                ))}

                {/* Collected — need to deliver */}
                {collectedAssignments.map((assignment, index) => (
                    <motion.div
                        key={assignment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: (pendingAssignments.length + index) * 0.05 }}
                    >
                        <CollectedCard
                            assignment={assignment}
                            onDeliver={() => openDeliverDialog(assignment)}
                        />
                    </motion.div>
                ))}

                {/* Completed — view only */}
                {completedAssignments.map((assignment, index) => (
                    <motion.div
                        key={assignment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            delay: (pendingAssignments.length + collectedAssignments.length + index) * 0.05,
                        }}
                    >
                        <CompletedCard assignment={assignment} />
                    </motion.div>
                ))}
            </div>

            {/* Mark Collected Dialog */}
            <AnimatePresence>
                {showCollectDialog && selectedAssignment && (
                    <Dialog onClose={() => setShowCollectDialog(false)}>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">
                                Mark Collected
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                {selectedAssignment.patientFirstName} — {selectedAssignment.panelName}
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-foreground mb-3 text-center">
                                How many tubes collected?
                            </label>
                            <div className="flex items-center justify-center gap-6">
                                <button
                                    onClick={() => setTubeCount(Math.max(1, tubeCount - 1))}
                                    className="w-14 h-14 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-2xl font-bold"
                                >
                                    -
                                </button>
                                <span className="text-4xl font-bold text-foreground w-16 text-center">
                                    {tubeCount}
                                </span>
                                <button
                                    onClick={() => setTubeCount(tubeCount + 1)}
                                    className="w-14 h-14 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-2xl font-bold"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={handleMarkCollected}
                            disabled={collecting}
                            className="w-full py-4 bg-green-600 text-white rounded-xl font-semibold text-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {collecting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <CheckCircle className="w-5 h-5" />
                            )}
                            Confirm Collection
                        </button>
                    </Dialog>
                )}
            </AnimatePresence>

            {/* Patient Unavailable Dialog */}
            <AnimatePresence>
                {showUnavailableDialog && selectedAssignment && (
                    <Dialog onClose={() => setShowUnavailableDialog(false)}>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-8 h-8 text-red-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">
                                Patient Unavailable
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                {selectedAssignment.patientFirstName}
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Select reason
                            </label>
                            <div className="space-y-2">
                                {UNAVAILABLE_REASONS.map((reason) => (
                                    <button
                                        key={reason.value}
                                        onClick={() => setUnavailableReason(reason.value)}
                                        className={cn(
                                            'w-full p-3 rounded-lg border text-left transition-all',
                                            unavailableReason === reason.value
                                                ? 'border-red-500 bg-red-50 text-red-700'
                                                : 'border-border hover:border-red-300'
                                        )}
                                    >
                                        {reason.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleMarkUnavailable}
                            disabled={markingUnavailable || !unavailableReason}
                            className="w-full py-4 bg-red-600 text-white rounded-xl font-semibold text-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {markingUnavailable ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <AlertTriangle className="w-5 h-5" />
                            )}
                            Submit
                        </button>
                    </Dialog>
                )}
            </AnimatePresence>

            {/* Running Late Dialog */}
            <AnimatePresence>
                {showLateDialog && selectedAssignment && (
                    <Dialog onClose={() => setShowLateDialog(false)}>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                                <Clock className="w-8 h-8 text-amber-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">
                                Running Late
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Patient will be notified
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-foreground mb-2">
                                New arrival time
                            </label>
                            <input
                                type="time"
                                value={newEta}
                                onChange={(e) => setNewEta(e.target.value)}
                                className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground text-lg text-center"
                            />
                        </div>

                        <button
                            onClick={handleReportLate}
                            disabled={reportingLate || !newEta}
                            className="w-full py-4 bg-amber-600 text-white rounded-xl font-semibold text-lg hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {reportingLate ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Clock className="w-5 h-5" />
                            )}
                            Notify Patient
                        </button>
                    </Dialog>
                )}
            </AnimatePresence>

            {/* Deliver to Lab Dialog */}
            <AnimatePresence>
                {showDeliverDialog && selectedAssignment && (
                    <Dialog onClose={() => setShowDeliverDialog(false)}>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                                <Building2 className="w-8 h-8 text-purple-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">
                                Deliver to Lab
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                {selectedAssignment.tubeCount} tube(s) — {selectedAssignment.panelName}
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Select lab
                            </label>
                            {labsLoading ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {labs.map((lab) => (
                                        <button
                                            key={lab.id}
                                            onClick={() => setSelectedLab(lab)}
                                            className={cn(
                                                'w-full p-3 rounded-lg border text-left transition-all',
                                                selectedLab?.id === lab.id
                                                    ? 'border-purple-500 bg-purple-50'
                                                    : 'border-border hover:border-purple-300'
                                            )}
                                        >
                                            <p className="font-medium text-foreground">{lab.name}</p>
                                            <p className="text-sm text-muted-foreground">{lab.address}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleDeliverToLab}
                            disabled={delivering || !selectedLab}
                            className="w-full py-4 bg-purple-600 text-white rounded-xl font-semibold text-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {delivering ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Building2 className="w-5 h-5" />
                            )}
                            Confirm Delivery
                        </button>
                    </Dialog>
                )}
            </AnimatePresence>
        </div>
    );
}

function SummaryPill({
    label,
    count,
    color,
}: {
    label: string;
    count: number;
    color: string;
}) {
    return (
        <div className={cn('px-4 py-2 rounded-full flex items-center gap-2 flex-shrink-0', color)}>
            <span className="font-bold">{count}</span>
            <span className="text-sm">{label}</span>
        </div>
    );
}

function AssignmentCard({
    assignment,
    onNavigate,
    onCall,
    onCollect,
    onUnavailable,
}: {
    assignment: TodayAssignment;
    onNavigate: () => void;
    onCall: () => void;
    onCollect: () => void;
    onUnavailable: () => void;
}) {
    const statusConfig = COLLECT_STATUS_CONFIG[assignment.status] || {
        label: assignment.status,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        icon: '⚪',
    };

    return (
        <div className="card-premium p-4 border-l-4 border-blue-500">
            {/* Time and status */}
            <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-bold text-blue-600">{assignment.timeWindow}</span>
                <span className={cn('px-2 py-0.5 rounded text-xs font-medium', statusConfig.bgColor, statusConfig.color)}>
                    {statusConfig.icon} {statusConfig.label}
                </span>
            </div>

            {/* Patient info */}
            <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold text-foreground">{assignment.patientFirstName}</span>
                    <span className="text-muted-foreground">—</span>
                    <span className="text-muted-foreground">{assignment.patientArea}</span>
                </div>
                <p className="text-sm text-muted-foreground">{assignment.panelName}</p>
            </div>

            {/* Action buttons — BIG, 48px height minimum */}
            <div className="grid grid-cols-3 gap-2 mb-2">
                <button
                    onClick={onNavigate}
                    className="h-12 bg-blue-100 text-blue-600 rounded-lg font-medium text-sm flex flex-col items-center justify-center hover:bg-blue-200"
                >
                    <Navigation className="w-5 h-5" />
                    <span className="text-xs">Navigate</span>
                </button>
                <button
                    onClick={onCall}
                    className="h-12 bg-green-100 text-green-600 rounded-lg font-medium text-sm flex flex-col items-center justify-center hover:bg-green-200"
                >
                    <Phone className="w-5 h-5" />
                    <span className="text-xs">Call</span>
                </button>
                <button
                    onClick={onUnavailable}
                    className="h-12 bg-red-100 text-red-600 rounded-lg font-medium text-sm flex flex-col items-center justify-center hover:bg-red-200"
                >
                    <AlertTriangle className="w-5 h-5" />
                    <span className="text-xs">Unavailable</span>
                </button>
            </div>

            {/* Main action button */}
            <button
                onClick={onCollect}
                className="w-full h-14 bg-green-600 text-white rounded-xl font-semibold text-base flex items-center justify-center gap-2 hover:bg-green-700"
            >
                <CheckCircle className="w-6 h-6" />
                Mark Collected
            </button>
        </div>
    );
}

function CollectedCard({
    assignment,
    onDeliver,
}: {
    assignment: TodayAssignment;
    onDeliver: () => void;
}) {
    return (
        <div className="card-premium p-4 border-l-4 border-green-500">
            {/* Status */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-foreground">
                        Collected — {assignment.tubeCount} tubes
                    </span>
                </div>
                <span className="text-sm text-muted-foreground">
                    {assignment.collectedAt &&
                        new Date(assignment.collectedAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                </span>
            </div>

            {/* Patient info */}
            <p className="text-sm text-muted-foreground mb-3">
                {assignment.patientFirstName} — {assignment.panelName}
            </p>

            {/* Deliver button */}
            <button
                onClick={onDeliver}
                className="w-full h-12 bg-purple-600 text-white rounded-xl font-semibold text-base flex items-center justify-center gap-2 hover:bg-purple-700"
            >
                <Building2 className="w-5 h-5" />
                Deliver to Lab
            </button>
        </div>
    );
}

function CompletedCard({ assignment }: { assignment: TodayAssignment }) {
    const isFailed = assignment.status === 'COLLECTION_FAILED';

    return (
        <div className={cn(
            'card-premium p-4 opacity-60',
            isFailed ? 'border-l-4 border-red-400' : 'border-l-4 border-gray-300'
        )}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {isFailed ? (
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                    ) : (
                        <CheckCircle className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="font-medium text-foreground">
                        {assignment.patientFirstName}
                    </span>
                </div>
                <span className={cn(
                    'text-sm',
                    isFailed ? 'text-red-500' : 'text-green-600'
                )}>
                    {isFailed ? 'Failed' : 'Delivered'}
                </span>
            </div>
        </div>
    );
}

function Dialog({
    children,
    onClose,
}: {
    children: React.ReactNode;
    onClose: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        >
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25 }}
                className="relative bg-card rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-muted rounded-lg"
                >
                    <X className="w-5 h-5 text-muted-foreground" />
                </button>
                {children}
            </motion.div>
        </motion.div>
    );
}
