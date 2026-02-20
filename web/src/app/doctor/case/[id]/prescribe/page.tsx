'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Pill,
    Plus,
    Trash2,
    Loader2,
    Shield,
    Info,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui';
import { CASE_DETAIL, CaseDetailResponse, VERTICAL_CONFIG, HealthVertical } from '@/graphql/dashboard';
import {
    SUGGEST_TEMPLATE,
    CHECK_CONTRAINDICATIONS,
    CREATE_PRESCRIPTION,
    SuggestTemplateResponse,
    CheckContraindicationsResponse,
    CreatePrescriptionResponse,
    PrescriptionTemplate,
    Medication,
    TEMPLATE_CONFIG,
} from '@/graphql/prescription';

// Spec: master spec Section 5.4 — Prescription Builder

export default function PrescribePage() {
    const params = useParams();
    const router = useRouter();
    const consultationId = params.id as string;

    const [selectedTemplate, setSelectedTemplate] = useState<PrescriptionTemplate | null>(null);
    const [customMedications, setCustomMedications] = useState<Medication[]>([]);
    const [instructions, setInstructions] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Fetch case data
    const { data: caseData, loading: caseLoading } = useQuery<CaseDetailResponse>(CASE_DETAIL, {
        variables: { consultationId },
    });

    // Get suggested template
    const { data: suggestionData, loading: suggestionLoading } = useQuery<SuggestTemplateResponse>(
        SUGGEST_TEMPLATE,
        {
            variables: { consultationId },
            onCompleted: (data) => {
                if (data?.suggestTemplate?.suggestedTemplate) {
                    setSelectedTemplate(data.suggestTemplate.suggestedTemplate);
                }
            },
        }
    );

    // Check contraindications when template changes
    const { data: contraindicationData, loading: checkingContraindications } =
        useQuery<CheckContraindicationsResponse>(CHECK_CONTRAINDICATIONS, {
            variables: {
                input: {
                    consultationId,
                    template: selectedTemplate,
                },
            },
            skip: !selectedTemplate,
        });

    // Create prescription mutation
    const [createPrescription, { loading: creating }] = useMutation<CreatePrescriptionResponse>(
        CREATE_PRESCRIPTION,
        {
            onCompleted: (data) => {
                if (data?.createPrescription?.success) {
                    router.push(`/doctor/case/${consultationId}?tab=prescription`);
                } else {
                    setError(data?.createPrescription?.message || 'Failed to create prescription');
                }
            },
            onError: (err) => {
                console.error('Create prescription error:', err);
                setError(err.message || 'Network error — please try again');
            },
        }
    );

    const suggestion = suggestionData?.suggestTemplate;
    const contraindications = contraindicationData?.checkContraindications;
    const caseDetail = caseData?.caseDetail;

    const handleAddMedication = () => {
        setCustomMedications([
            ...customMedications,
            { name: '', dosage: '', frequency: '' },
        ]);
    };

    const handleRemoveMedication = (index: number) => {
        setCustomMedications(customMedications.filter((_, i) => i !== index));
    };

    const handleUpdateMedication = (index: number, field: keyof Medication, value: string) => {
        setCustomMedications(prev => prev.map((med, i) => {
            if (i !== index) return med;
            return {
                ...med,
                [field]: value || undefined,
            } as Medication;
        }));
    };

    const handleSubmit = async () => {
        if (!selectedTemplate) return;
        setError(null);

        try {
            await createPrescription({
                variables: {
                    input: {
                        consultationId,
                        template: selectedTemplate,
                        customMedications:
                            selectedTemplate === 'CUSTOM' ? customMedications : undefined,
                        instructions: instructions || undefined,
                    },
                },
            });
        } catch (err) {
            // Handled by onError callback
        }
    };

    if (caseLoading || suggestionLoading) {
        return (
            <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const verticalConfig = caseDetail?.consultation?.vertical
        ? VERTICAL_CONFIG[caseDetail.consultation.vertical as HealthVertical]
        : null;

    return (
        <div className="min-h-screen bg-background pb-24">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-card border-b border-border">
                <div className="max-w-4xl mx-auto px-4 lg:px-8 py-4">
                    <div className="flex items-center gap-4">
                        <Link
                            href={`/doctor/case/${consultationId}`}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-lg lg:text-xl font-semibold text-foreground">
                                Create Prescription
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {caseDetail?.patient?.name} • {verticalConfig?.label}
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 lg:px-8 py-6 space-y-6">
                {/* Contraindication warning banner */}
                <AnimatePresence>
                    {suggestion?.contraindications && (
                        suggestion.contraindications.isBlocked ||
                        suggestion.contraindications.requiresDoctorReview ||
                        suggestion.contraindications.flags.length > 0
                    ) && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={cn(
                                'p-4 rounded-xl border',
                                suggestion.contraindications.isBlocked
                                    ? 'bg-error/10 border-error/30'
                                    : 'bg-warning/10 border-warning/30'
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <Shield
                                    className={cn(
                                        'w-5 h-5 mt-0.5',
                                        suggestion.contraindications.isBlocked
                                            ? 'text-error'
                                            : 'text-warning'
                                    )}
                                />
                                <div>
                                    <h3
                                        className={cn(
                                            'font-medium',
                                            suggestion.contraindications.isBlocked
                                                ? 'text-error'
                                                : 'text-warning'
                                        )}
                                    >
                                        {suggestion.contraindications.isBlocked
                                            ? 'Contraindication Detected'
                                            : 'Review Required'}
                                    </h3>
                                    <div className="mt-2 space-y-1 text-sm">
                                        {suggestion.contraindications.reasons.map((reason, i) => (
                                            <p key={i} className="text-foreground">
                                                • {reason}
                                            </p>
                                        ))}
                                        {suggestion.contraindications.flags.map((flag, i) => (
                                            <p key={i} className="text-muted-foreground">
                                                • {flag}
                                            </p>
                                        ))}
                                    </div>
                                    {suggestion.contraindications.suggestMinoxidilOnly && (
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            Suggested: Switch to Minoxidil Only template
                                        </p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Suggested template */}
                {suggestion && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card-premium p-6"
                    >
                        <div className="flex items-start gap-3 mb-4">
                            <div className="p-2 rounded-xl bg-primary/10">
                                <Info className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">
                                    AI-Suggested Template
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Based on patient profile and questionnaire responses
                                </p>
                            </div>
                        </div>
                        <div className="p-4 bg-muted rounded-xl">
                            <p className="font-medium text-foreground">
                                {suggestion.templateDefinition.name}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                {suggestion.templateDefinition.description}
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Template selection */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="card-premium p-6"
                >
                    <h3 className="font-semibold text-foreground mb-4">
                        Select Template
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(Object.keys(TEMPLATE_CONFIG) as PrescriptionTemplate[]).map(
                            (template) => {
                                const config = TEMPLATE_CONFIG[template];
                                const isSelected = selectedTemplate === template;
                                const isBlocked =
                                    template !== 'MINOXIDIL_ONLY' &&
                                    template !== 'CUSTOM' &&
                                    suggestion?.contraindications?.isBlocked;

                                return (
                                    <button
                                        key={template}
                                        onClick={() => !isBlocked && setSelectedTemplate(template)}
                                        disabled={isBlocked}
                                        className={cn(
                                            'p-4 rounded-xl border-2 text-left transition-all',
                                            isSelected
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border hover:border-primary/40',
                                            isBlocked && 'opacity-50 cursor-not-allowed'
                                        )}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium text-foreground">
                                                {config.label}
                                            </span>
                                            {isSelected && (
                                                <CheckCircle className="w-5 h-5 text-primary" />
                                            )}
                                            {isBlocked && (
                                                <XCircle className="w-5 h-5 text-error" />
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {config.description}
                                        </p>
                                    </button>
                                );
                            }
                        )}
                    </div>
                </motion.div>

                {/* Medications preview */}
                {selectedTemplate && selectedTemplate !== 'CUSTOM' && suggestion && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="card-premium p-6"
                    >
                        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                            <Pill className="w-5 h-5" />
                            Medications
                        </h3>
                        <div className="space-y-3">
                            {suggestion.templateDefinition.medications.map((med, i) => (
                                <div
                                    key={i}
                                    className="p-4 bg-muted rounded-xl"
                                >
                                    <p className="font-medium text-foreground">{med.name}</p>
                                    <div className="flex flex-wrap gap-2 mt-2 text-sm text-muted-foreground">
                                        <span className="px-2 py-0.5 bg-background rounded-lg">
                                            {med.dosage}
                                        </span>
                                        <span className="px-2 py-0.5 bg-background rounded-lg">
                                            {med.frequency}
                                        </span>
                                        {med.duration && (
                                            <span className="px-2 py-0.5 bg-background rounded-lg">
                                                {med.duration}
                                            </span>
                                        )}
                                    </div>
                                    {med.instructions && (
                                        <p className="text-sm text-muted-foreground mt-2">
                                            {med.instructions}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Custom medications editor */}
                {selectedTemplate === 'CUSTOM' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card-premium p-6"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-foreground flex items-center gap-2">
                                <Pill className="w-5 h-5" />
                                Custom Medications
                            </h3>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleAddMedication}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Medication
                            </Button>
                        </div>

                        {customMedications.length === 0 ? (
                            <p className="text-muted-foreground text-sm text-center py-8">
                                No medications added. Click "Add Medication" to start.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {customMedications.map((med, index) => (
                                    <div
                                        key={index}
                                        className="p-4 bg-muted rounded-xl space-y-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-muted-foreground">
                                                Medication {index + 1}
                                            </span>
                                            <button
                                                onClick={() => handleRemoveMedication(index)}
                                                className="text-error hover:text-error/80"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <Input
                                                placeholder="Medication name"
                                                value={med.name}
                                                onChange={(e) =>
                                                    handleUpdateMedication(index, 'name', e.target.value)
                                                }
                                            />
                                            <Input
                                                placeholder="Dosage (e.g., 5mg)"
                                                value={med.dosage}
                                                onChange={(e) =>
                                                    handleUpdateMedication(index, 'dosage', e.target.value)
                                                }
                                            />
                                            <Input
                                                placeholder="Frequency (e.g., Once daily)"
                                                value={med.frequency}
                                                onChange={(e) =>
                                                    handleUpdateMedication(index, 'frequency', e.target.value)
                                                }
                                            />
                                            <Input
                                                placeholder="Duration (optional)"
                                                value={med.duration || ''}
                                                onChange={(e) =>
                                                    handleUpdateMedication(index, 'duration', e.target.value)
                                                }
                                            />
                                        </div>
                                        <Input
                                            placeholder="Instructions (optional)"
                                            value={med.instructions || ''}
                                            onChange={(e) =>
                                                handleUpdateMedication(index, 'instructions', e.target.value)
                                            }
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Additional instructions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="card-premium p-6"
                >
                    <h3 className="font-semibold text-foreground mb-4">
                        Additional Instructions
                    </h3>
                    <textarea
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        placeholder="Add any additional instructions for the patient..."
                        className="w-full h-32 px-4 py-3 rounded-xl border border-border bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </motion.div>
            </main>

            {/* Error banner */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-4xl mx-auto px-4 lg:px-8"
                >
                    <div className="p-4 rounded-xl bg-error/10 border border-error/30 text-error text-sm flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                        <div>
                            <p className="font-medium">Prescription failed</p>
                            <p className="mt-1">{error}</p>
                        </div>
                        <button onClick={() => setError(null)} className="ml-auto shrink-0 hover:opacity-70">
                            <XCircle className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Bottom action bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-30">
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                    <div className="hidden sm:block">
                        {checkingContraindications ? (
                            <span className="text-sm text-muted-foreground flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Checking contraindications...
                            </span>
                        ) : contraindications?.canProceed === false ? (
                            <span className="text-sm text-error flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Cannot proceed with current template
                            </span>
                        ) : selectedTemplate ? (
                            <span className="text-sm text-success flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                Ready to prescribe
                            </span>
                        ) : (
                            <span className="text-sm text-muted-foreground">
                                Select a template to continue
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Link href={`/doctor/case/${consultationId}`} className="flex-1 sm:flex-none">
                            <Button variant="outline" className="w-full">
                                Cancel
                            </Button>
                        </Link>
                        <Button
                            onClick={handleSubmit}
                            disabled={
                                !selectedTemplate ||
                                (contraindications && !contraindications.canProceed) ||
                                creating ||
                                (selectedTemplate === 'CUSTOM' && customMedications.length === 0)
                            }
                            className="flex-1 sm:flex-none"
                        >
                            {creating ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Create Prescription
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
