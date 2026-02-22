'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FlaskConical,
    Clock,
    CheckCircle,
    User,
    AlertTriangle,
    Loader2,
    Package,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    LAB_TODAY_SUMMARY,
    LAB_INCOMING_SAMPLES,
    LAB_MARK_SAMPLE_RECEIVED,
    LAB_REPORT_SAMPLE_ISSUE,
    LAB_MARK_RESULTS_READY,
    LabTodaySummaryResponse,
    LabIncomingSamplesResponse,
    LabSampleSummary,
    LAB_SAMPLE_STATUS_CONFIG,
    SAMPLE_ISSUE_REASONS,
} from '@/graphql/lab-portal';

// Spec: master spec Section 7.1 — Lab Portal
// Incoming tab: list of samples to acknowledge
// Big "Mark Received" button, "Report Issue" button

export default function LabIncomingPage() {
    const [selectedSample, setSelectedSample] = useState<LabSampleSummary | null>(null);
    const [showReceiveDialog, setShowReceiveDialog] = useState(false);
    const [showIssueDialog, setShowIssueDialog] = useState(false);
    const [tubeCount, setTubeCount] = useState(3);
    const [issueReason, setIssueReason] = useState('');

    const { data: summaryData, loading: summaryLoading } = useQuery<LabTodaySummaryResponse>(
        LAB_TODAY_SUMMARY,
        { pollInterval: 30000 }
    );

    const { data: samplesData, loading: samplesLoading, refetch } = useQuery<LabIncomingSamplesResponse>(
        LAB_INCOMING_SAMPLES,
        { pollInterval: 30000 }
    );

    const [markReceived, { loading: markingReceived }] = useMutation(LAB_MARK_SAMPLE_RECEIVED, {
        onCompleted: () => {
            setShowReceiveDialog(false);
            setSelectedSample(null);
            refetch();
        },
    });

    const [reportIssue, { loading: reportingIssue }] = useMutation(LAB_REPORT_SAMPLE_ISSUE, {
        onCompleted: () => {
            setShowIssueDialog(false);
            setSelectedSample(null);
            setIssueReason('');
            refetch();
        },
    });

    // Spec: Phase 16 — Mark Results Ready as distinct step
    const [markResultsReady] = useMutation(LAB_MARK_RESULTS_READY, {
        onCompleted: () => refetch(),
    });

    const summary = summaryData?.labTodaySummary;
    const samples = samplesData?.labIncomingSamples || [];

    const handleMarkReceived = () => {
        if (!selectedSample) return;
        markReceived({
            variables: {
                input: {
                    labOrderId: selectedSample.id,
                    tubeCount,
                },
            },
        });
    };

    const handleReportIssue = () => {
        if (!selectedSample || !issueReason) return;
        reportIssue({
            variables: {
                input: {
                    labOrderId: selectedSample.id,
                    reason: issueReason,
                },
            },
        });
    };

    const openReceiveDialog = (sample: LabSampleSummary) => {
        setSelectedSample(sample);
        setTubeCount(sample.tubeCount || 3);
        setShowReceiveDialog(true);
    };

    const openIssueDialog = (sample: LabSampleSummary) => {
        setSelectedSample(sample);
        setIssueReason('');
        setShowIssueDialog(true);
    };

    if (summaryLoading || samplesLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="p-4 max-w-lg mx-auto">
            {/* Summary stats */}
            {summary && (
                <div className="grid grid-cols-3 gap-2 mb-6">
                    <SummaryCard
                        label="Incoming"
                        count={summary.incoming}
                        icon={<FlaskConical className="w-4 h-4" />}
                        color="bg-amber-100 text-amber-600"
                        active
                    />
                    <SummaryCard
                        label="In Progress"
                        count={summary.inProgress}
                        icon={<Clock className="w-4 h-4" />}
                        color="bg-blue-100 text-blue-600"
                    />
                    <SummaryCard
                        label="Completed"
                        count={summary.completed}
                        icon={<CheckCircle className="w-4 h-4" />}
                        color="bg-green-100 text-green-600"
                    />
                </div>
            )}

            {/* Section title */}
            <h2 className="text-lg font-semibold text-foreground mb-3">
                Incoming Samples
            </h2>

            {/* Empty state */}
            {samples.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="card-premium p-8 text-center"
                >
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        All Clear
                    </h3>
                    <p className="text-muted-foreground">
                        No samples waiting to be received.
                    </p>
                </motion.div>
            )}

            {/* Sample list */}
            <div className="space-y-3">
                {samples.map((sample, index) => (
                    <motion.div
                        key={sample.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <SampleCard
                            sample={sample}
                            onMarkReceived={() => openReceiveDialog(sample)}
                            onReportIssue={() => openIssueDialog(sample)}
                            onMarkReady={() => markResultsReady({ variables: { labOrderId: sample.id } })}
                        />
                    </motion.div>
                ))}
            </div>

            {/* Mark Received Dialog */}
            <AnimatePresence>
                {showReceiveDialog && selectedSample && (
                    <Dialog onClose={() => setShowReceiveDialog(false)}>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                                <Package className="w-8 h-8 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">
                                Confirm Receipt
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Sample {selectedSample.sampleId}
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Number of Tubes Received
                            </label>
                            <div className="flex items-center justify-center gap-4">
                                <button
                                    onClick={() => setTubeCount(Math.max(1, tubeCount - 1))}
                                    className="w-12 h-12 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-xl font-bold"
                                >
                                    -
                                </button>
                                <span className="text-3xl font-bold text-foreground w-16 text-center">
                                    {tubeCount}
                                </span>
                                <button
                                    onClick={() => setTubeCount(tubeCount + 1)}
                                    className="w-12 h-12 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-xl font-bold"
                                >
                                    +
                                </button>
                            </div>
                            {selectedSample.tubeCount && selectedSample.tubeCount !== tubeCount && (
                                <p className="text-sm text-amber-600 text-center mt-2">
                                    Expected: {selectedSample.tubeCount} tubes
                                </p>
                            )}
                        </div>

                        <button
                            onClick={handleMarkReceived}
                            disabled={markingReceived}
                            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {markingReceived ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <CheckCircle className="w-5 h-5" />
                            )}
                            Mark Received
                        </button>
                    </Dialog>
                )}
            </AnimatePresence>

            {/* Report Issue Dialog */}
            <AnimatePresence>
                {showIssueDialog && selectedSample && (
                    <Dialog onClose={() => setShowIssueDialog(false)}>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-8 h-8 text-red-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">
                                Report Issue
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Sample {selectedSample.sampleId}
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-foreground mb-2">
                                What&apos;s the issue?
                            </label>
                            <div className="space-y-2">
                                {SAMPLE_ISSUE_REASONS.map((reason) => (
                                    <button
                                        key={reason.value}
                                        onClick={() => setIssueReason(reason.value)}
                                        className={cn(
                                            'w-full p-3 rounded-lg border text-left transition-all',
                                            issueReason === reason.value
                                                ? 'border-red-500 bg-red-50 text-red-700'
                                                : 'border-border hover:border-red-300'
                                        )}
                                    >
                                        {reason.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg mb-4">
                            A free recollection will be automatically scheduled for the patient.
                        </div>

                        <button
                            onClick={handleReportIssue}
                            disabled={reportingIssue || !issueReason}
                            className="w-full py-4 bg-red-600 text-white rounded-xl font-semibold text-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {reportingIssue ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <AlertTriangle className="w-5 h-5" />
                            )}
                            Report Issue
                        </button>
                    </Dialog>
                )}
            </AnimatePresence>
        </div>
    );
}

function SummaryCard({
    label,
    count,
    icon,
    color,
    active,
}: {
    label: string;
    count: number;
    icon: React.ReactNode;
    color: string;
    active?: boolean;
}) {
    return (
        <div
            className={cn(
                'card-premium p-3 text-center',
                active && 'ring-2 ring-blue-500'
            )}
        >
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1', color)}>
                {icon}
            </div>
            <p className="text-2xl font-bold text-foreground">{count}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    );
}

function SampleCard({
    sample,
    onMarkReceived,
    onReportIssue,
    onMarkReady,
}: {
    sample: LabSampleSummary;
    onMarkReceived: () => void;
    onReportIssue: () => void;
    onMarkReady: () => void;
}) {
    const statusConfig = LAB_SAMPLE_STATUS_CONFIG[sample.status] || {
        label: sample.status,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
    };

    const deliveredTime = sample.deliveredAt
        ? new Date(sample.deliveredAt).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
          })
        : null;

    return (
        <div className="card-premium p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-semibold text-foreground">
                            {sample.sampleId}
                        </span>
                        <span className={cn('px-2 py-0.5 rounded text-xs font-medium', statusConfig.bgColor, statusConfig.color)}>
                            {statusConfig.label}
                        </span>
                    </div>
                    <p className="text-sm text-foreground font-medium">{sample.panelName}</p>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">{sample.patientInitials}</span>
                </div>
            </div>

            {/* Details */}
            <div className="text-sm text-muted-foreground mb-3">
                {sample.deliveredBy && (
                    <p>Delivered by: {sample.deliveredBy}</p>
                )}
                {deliveredTime && (
                    <p>Arrived: {deliveredTime}</p>
                )}
                {sample.tubeCount && (
                    <p>Expected tubes: {sample.tubeCount}</p>
                )}
            </div>

            {/* Tests */}
            {sample.testsOrdered.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                    {sample.testsOrdered.slice(0, 4).map((test) => (
                        <span
                            key={test}
                            className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground"
                        >
                            {test}
                        </span>
                    ))}
                    {sample.testsOrdered.length > 4 && (
                        <span className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">
                            +{sample.testsOrdered.length - 4}
                        </span>
                    )}
                </div>
            )}

            {/* Phase 16: Mark Results Ready button for uploaded results */}
            {sample.status === 'RESULTS_UPLOADED' && (
                <button
                    data-testid={`mark-ready-${sample.id}`}
                    onClick={onMarkReady}
                    className="w-full h-12 mb-2 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 flex items-center justify-center gap-2"
                >
                    <CheckCircle className="w-5 h-5" />
                    Mark Results Ready
                </button>
            )}

            {/* Actions — Big buttons, 48px height minimum */}
            <div className="flex gap-2">
                <button
                    onClick={onMarkReceived}
                    className="flex-1 h-12 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                    <CheckCircle className="w-5 h-5" />
                    Mark Received
                </button>
                <button
                    onClick={onReportIssue}
                    className="h-12 px-4 bg-red-100 text-red-600 rounded-lg font-semibold text-sm hover:bg-red-200 flex items-center justify-center"
                >
                    <AlertTriangle className="w-5 h-5" />
                </button>
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
