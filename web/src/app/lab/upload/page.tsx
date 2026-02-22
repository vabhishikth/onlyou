'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload,
    CheckCircle,
    User,
    Loader2,
    X,
    FileText,
    AlertTriangle,
    Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    LAB_IN_PROGRESS_SAMPLES,
    LAB_COMPLETED_SAMPLES,
    LAB_UPLOAD_RESULTS,
    LabInProgressSamplesResponse,
    LabCompletedSamplesResponse,
    LabSampleSummary,
    LAB_SAMPLE_STATUS_CONFIG,
    ABNORMAL_FLAG_OPTIONS,
} from '@/graphql/lab-portal';

// Spec: master spec Section 7.1 — Lab Portal
// Upload tab: upload results with abnormal flags
// Critical values trigger warning

export default function LabUploadPage() {
    const [selectedSample, setSelectedSample] = useState<LabSampleSummary | null>(null);
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [resultFileUrl, setResultFileUrl] = useState('');
    const [abnormalFlags, setAbnormalFlags] = useState<Record<string, string>>({});

    const { data: progressData, loading: progressLoading, refetch: refetchProgress } =
        useQuery<LabInProgressSamplesResponse>(LAB_IN_PROGRESS_SAMPLES, {
            pollInterval: 30000,
        });

    const { data: completedData, loading: completedLoading, refetch: refetchCompleted } =
        useQuery<LabCompletedSamplesResponse>(LAB_COMPLETED_SAMPLES, {
            pollInterval: 30000,
        });

    const [uploadResults, { loading: uploading }] = useMutation(LAB_UPLOAD_RESULTS, {
        onCompleted: () => {
            setShowUploadDialog(false);
            setSelectedSample(null);
            setResultFileUrl('');
            setAbnormalFlags({});
            refetchProgress();
            refetchCompleted();
        },
    });

    const processingSamples = (progressData?.labInProgressSamples || []).filter(
        (s) => s.status === 'PROCESSING'
    );
    const completedSamples = completedData?.labCompletedSamples || [];

    const handleUploadResults = () => {
        if (!selectedSample || !resultFileUrl) return;
        uploadResults({
            variables: {
                input: {
                    labOrderId: selectedSample.id,
                    resultFileUrl,
                    abnormalFlags,
                },
            },
        });
    };

    const openUploadDialog = (sample: LabSampleSummary) => {
        setSelectedSample(sample);
        // Initialize all tests as NORMAL
        const initialFlags: Record<string, string> = {};
        sample.testsOrdered.forEach((test) => {
            initialFlags[test] = 'NORMAL';
        });
        setAbnormalFlags(initialFlags);
        setResultFileUrl('');
        setShowUploadDialog(true);
    };

    const hasCriticalValues = Object.values(abnormalFlags).some((v) => v === 'CRITICAL');

    const loading = progressLoading || completedLoading;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="p-4 max-w-lg mx-auto">
            {/* Processing samples — ready to upload */}
            {processingSamples.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-purple-600" />
                        Ready for Upload ({processingSamples.length})
                    </h2>
                    <div className="space-y-3">
                        {processingSamples.map((sample, index) => (
                            <motion.div
                                key={sample.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <SampleCard
                                    sample={sample}
                                    actionLabel="Upload Results"
                                    actionIcon={<Upload className="w-5 h-5" />}
                                    actionColor="bg-green-600 hover:bg-green-700"
                                    onAction={() => openUploadDialog(sample)}
                                />
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Completed today */}
            <div>
                <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Completed Today ({completedSamples.length})
                </h2>

                {completedSamples.length === 0 && processingSamples.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="card-premium p-8 text-center"
                    >
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                            <Upload className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                            No Samples to Upload
                        </h3>
                        <p className="text-muted-foreground">
                            Samples will appear here once processing starts.
                        </p>
                    </motion.div>
                )}

                {completedSamples.length > 0 && (
                    <div className="space-y-3">
                        {completedSamples.map((sample, index) => (
                            <motion.div
                                key={sample.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <CompletedSampleCard sample={sample} />
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Upload Results Dialog */}
            <AnimatePresence>
                {showUploadDialog && selectedSample && (
                    <Dialog onClose={() => setShowUploadDialog(false)}>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                                <Upload className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">
                                Upload Results
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Sample {selectedSample.sampleId} — {selectedSample.panelName}
                            </p>
                        </div>

                        {/* Result file URL */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Result PDF URL
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={resultFileUrl}
                                    onChange={(e) => setResultFileUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="flex-1 px-4 py-3 border border-border rounded-lg bg-background text-foreground"
                                />
                                <button
                                    className="px-4 py-3 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80"
                                    title="Upload file"
                                >
                                    <FileText className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Upload PDF or enter URL
                            </p>
                        </div>

                        {/* Abnormal flags per test */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Flag Each Test Result
                            </label>
                            <div className="space-y-3">
                                {selectedSample.testsOrdered.map((test) => (
                                    <div key={test} className="flex items-center justify-between gap-2 p-3 bg-muted rounded-lg">
                                        <span className="text-sm font-medium text-foreground">{test}</span>
                                        <div className="flex gap-1">
                                            {ABNORMAL_FLAG_OPTIONS.map((option) => (
                                                <button
                                                    key={option.value}
                                                    onClick={() =>
                                                        setAbnormalFlags((prev) => ({
                                                            ...prev,
                                                            [test]: option.value,
                                                        }))
                                                    }
                                                    className={cn(
                                                        'px-3 py-1.5 rounded text-xs font-medium transition-all',
                                                        abnormalFlags[test] === option.value
                                                            ? option.value === 'NORMAL'
                                                                ? 'bg-green-600 text-white'
                                                                : option.value === 'ABNORMAL'
                                                                    ? 'bg-amber-500 text-white'
                                                                    : 'bg-red-600 text-white'
                                                            : 'bg-background text-muted-foreground hover:bg-muted/50'
                                                    )}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Critical values warning */}
                        {hasCriticalValues && (
                            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-red-800">Critical Values Detected</p>
                                        <p className="text-sm text-red-600 mt-1">
                                            This will trigger urgent notifications to the doctor and patient.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleUploadResults}
                            disabled={uploading || !resultFileUrl}
                            className={cn(
                                'w-full py-4 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50',
                                hasCriticalValues
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-green-600 hover:bg-green-700'
                            )}
                        >
                            {uploading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Upload className="w-5 h-5" />
                            )}
                            Submit Results
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
}: {
    sample: LabSampleSummary;
    actionLabel: string;
    actionIcon: React.ReactNode;
    actionColor: string;
    onAction: () => void;
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
                    {sample.testsOrdered.map((test) => (
                        <span
                            key={test}
                            className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground"
                        >
                            {test}
                        </span>
                    ))}
                </div>
            )}

            {/* Phase 16: Structured result input */}
            <button
                data-testid={`structured-upload-${sample.id}`}
                onClick={onAction}
                className={cn(
                    'w-full h-12 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2',
                    actionColor
                )}
            >
                {actionIcon}
                {actionLabel}
            </button>
        </div>
    );
}

function CompletedSampleCard({ sample }: { sample: LabSampleSummary }) {
    return (
        <div className="card-premium p-4 opacity-75">
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="font-mono font-semibold text-foreground">
                            {sample.sampleId}
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{sample.panelName}</p>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span className="text-sm">{sample.patientInitials}</span>
                </div>
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
