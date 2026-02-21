'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock,
    CheckCircle,
    Play,
    User,
    Loader2,
    X,
    FlaskConical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    LAB_IN_PROGRESS_SAMPLES,
    LAB_START_PROCESSING,
    LabInProgressSamplesResponse,
    LabSampleSummary,
    LAB_SAMPLE_STATUS_CONFIG,
} from '@/graphql/lab-portal';

// Spec: master spec Section 7.1 — Lab Portal
// In Progress tab: samples being processed
// "Mark Processing Started" button for received samples

export default function LabProcessingPage() {
    const [selectedSample, setSelectedSample] = useState<LabSampleSummary | null>(null);
    const [showStartDialog, setShowStartDialog] = useState(false);

    const { data, loading, refetch } = useQuery<LabInProgressSamplesResponse>(
        LAB_IN_PROGRESS_SAMPLES,
        { pollInterval: 30000 }
    );

    const [startProcessing, { loading: starting }] = useMutation(LAB_START_PROCESSING, {
        onCompleted: () => {
            setShowStartDialog(false);
            setSelectedSample(null);
            refetch();
        },
    });

    const samples = data?.labInProgressSamples || [];
    const receivedSamples = samples.filter((s) => s.status === 'SAMPLE_RECEIVED');
    const processingSamples = samples.filter((s) => s.status === 'PROCESSING');

    const handleStartProcessing = () => {
        if (!selectedSample) return;
        startProcessing({
            variables: { labOrderId: selectedSample.id },
        });
    };

    const openStartDialog = (sample: LabSampleSummary) => {
        setSelectedSample(sample);
        setShowStartDialog(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="p-4 max-w-lg mx-auto">
            {/* Empty state */}
            {samples.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="card-premium p-8 text-center"
                >
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        No Samples In Progress
                    </h3>
                    <p className="text-muted-foreground">
                        Samples will appear here once received.
                    </p>
                </motion.div>
            )}

            {/* Received samples — ready to start processing */}
            {receivedSamples.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                        Received ({receivedSamples.length})
                    </h2>
                    <div className="space-y-3">
                        {receivedSamples.map((sample, index) => (
                            <motion.div
                                key={sample.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <SampleCard
                                    sample={sample}
                                    actionLabel="Start Processing"
                                    actionIcon={<Play className="w-5 h-5" />}
                                    actionColor="bg-blue-600 hover:bg-blue-700"
                                    onAction={() => openStartDialog(sample)}
                                />
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Processing samples */}
            {processingSamples.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-purple-600" />
                        In Progress ({processingSamples.length})
                    </h2>
                    <div className="space-y-3">
                        {processingSamples.map((sample, index) => (
                            <motion.div
                                key={sample.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <SampleCard sample={sample} showUploadHint />
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Start Processing Dialog */}
            <AnimatePresence>
                {showStartDialog && selectedSample && (
                    <Dialog onClose={() => setShowStartDialog(false)}>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                                <FlaskConical className="w-8 h-8 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">
                                Start Processing
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Sample {selectedSample.sampleId}
                            </p>
                        </div>

                        <div className="bg-muted rounded-lg p-4 mb-6">
                            <p className="font-medium text-foreground mb-2">{selectedSample.panelName}</p>
                            <div className="flex flex-wrap gap-1">
                                {selectedSample.testsOrdered.map((test) => (
                                    <span
                                        key={test}
                                        className="px-2 py-0.5 bg-background rounded text-xs text-muted-foreground"
                                    >
                                        {test}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleStartProcessing}
                            disabled={starting}
                            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {starting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Play className="w-5 h-5" />
                            )}
                            Start Processing
                        </button>
                    </Dialog>
                )}
            </AnimatePresence>
        </div>
    );
}

function SampleCard({
    sample,
    actionLabel,
    actionIcon,
    actionColor,
    onAction,
    showUploadHint,
}: {
    sample: LabSampleSummary;
    actionLabel?: string;
    actionIcon?: React.ReactNode;
    actionColor?: string;
    onAction?: () => void;
    showUploadHint?: boolean;
}) {
    const statusConfig = LAB_SAMPLE_STATUS_CONFIG[sample.status] || {
        label: sample.status,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
    };

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

            {/* Action button */}
            {onAction && actionLabel && (
                <button
                    onClick={onAction}
                    className={cn(
                        'w-full h-12 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2',
                        actionColor || 'bg-blue-600 hover:bg-blue-700'
                    )}
                >
                    {actionIcon}
                    {actionLabel}
                </button>
            )}

            {/* Upload hint */}
            {showUploadHint && (
                <div className="text-sm text-muted-foreground text-center p-2 bg-muted rounded-lg">
                    When complete, go to Upload tab to submit results
                </div>
            )}
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
