'use client';

import { motion } from 'framer-motion';
import {
    Stethoscope,
    Heart,
    Activity,
    Sparkles,
    Scale,
    TrendingDown,
    AlertTriangle,
    Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HealthVertical } from '@/graphql/dashboard';

// Spec: master spec Section 5 — Condition-Specific Dashboard Panels

interface ConditionPanelProps {
    vertical: HealthVertical;
    responses: Record<string, any>;
    className?: string;
}

// Hair Loss specific indicators
const NORWOOD_SCALE: Record<string, { label: string; severity: 'mild' | 'moderate' | 'severe' }> = {
    'Type I': { label: 'Minimal recession', severity: 'mild' },
    'Type II': { label: 'Adult hairline (1-2 cm recession)', severity: 'mild' },
    'Type III': { label: 'Temporal recession', severity: 'moderate' },
    'Type III Vertex': { label: 'Frontal + crown thinning', severity: 'moderate' },
    'Type IV': { label: 'Significant frontal + crown loss', severity: 'moderate' },
    'Type V': { label: 'Bridge between frontal and crown narrowing', severity: 'severe' },
    'Type VI': { label: 'Bridge lost, single large bald area', severity: 'severe' },
    'Type VII': { label: 'Most advanced, only horseshoe pattern remains', severity: 'severe' },
};

// ED risk factors
const ED_CARDIAC_RISKS = [
    'Diabetes',
    'Hypertension',
    'Heart disease',
    'High cholesterol',
    'Recent cardiac event',
];

export function ConditionSpecificPanel({ vertical, responses, className }: ConditionPanelProps) {
    switch (vertical) {
        case 'HAIR_LOSS':
            return <HairLossPanel responses={responses} className={className} />;
        case 'SEXUAL_HEALTH':
            return <SexualHealthPanel responses={responses} className={className} />;
        case 'WEIGHT_MANAGEMENT':
            return <WeightPanel responses={responses} className={className} />;
        case 'PCOS':
            return <PCOSPanel responses={responses} className={className} />;
        default:
            return null;
    }
}

function HairLossPanel({ responses, className }: { responses: Record<string, any>; className?: string | undefined }) {
    // Extract key indicators from responses
    const pattern = responses?.Q3 || responses?.pattern; // Hamilton-Norwood grade
    const familyHistory = responses?.Q5 || responses?.familyHistory;
    const onset = responses?.Q4 || responses?.onset;
    const previousTreatments = responses?.Q17 || responses?.previousTreatments || [];
    const finasterideSideEffects = responses?.Q19 || responses?.sideEffects || [];

    const norwoodInfo = pattern ? NORWOOD_SCALE[pattern] : null;

    const hasFinasterideHistory = Array.isArray(previousTreatments) &&
        previousTreatments.includes('Finasteride');
    const hadSexualSideEffects = Array.isArray(finasterideSideEffects) &&
        finasterideSideEffects.includes('Sexual side effects');

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn('card-premium p-6', className)}
        >
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Hair Loss Assessment
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Pattern/Norwood Scale */}
                {pattern && (
                    <div className="p-4 bg-muted rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Pattern (Norwood Scale)</p>
                        <p className="font-medium text-foreground">{pattern}</p>
                        {norwoodInfo && (
                            <span className={cn(
                                'inline-block mt-2 px-2 py-0.5 text-xs rounded-lg',
                                norwoodInfo.severity === 'mild' && 'bg-success/10 text-success',
                                norwoodInfo.severity === 'moderate' && 'bg-warning/10 text-warning',
                                norwoodInfo.severity === 'severe' && 'bg-error/10 text-error',
                            )}>
                                {norwoodInfo.severity.charAt(0).toUpperCase() + norwoodInfo.severity.slice(1)} • {norwoodInfo.label}
                            </span>
                        )}
                    </div>
                )}

                {/* Family History */}
                {familyHistory && (
                    <div className="p-4 bg-muted rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Family History</p>
                        <p className="font-medium text-foreground">{familyHistory}</p>
                    </div>
                )}

                {/* Onset */}
                {onset && (
                    <div className="p-4 bg-muted rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">When Started</p>
                        <p className="font-medium text-foreground">{onset}</p>
                    </div>
                )}

                {/* Previous treatments */}
                {Array.isArray(previousTreatments) && previousTreatments.length > 0 && (
                    <div className="p-4 bg-muted rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Previous Treatments</p>
                        <div className="flex flex-wrap gap-1">
                            {previousTreatments.map((t: string) => (
                                <span key={t} className="px-2 py-0.5 text-xs bg-background rounded-lg">
                                    {t}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Warnings */}
            {hadSexualSideEffects && hasFinasterideHistory && (
                <div className="mt-4 p-3 rounded-xl bg-warning/10 border border-warning/30">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                            <p className="font-medium text-warning">Previous Finasteride Side Effects</p>
                            <p className="text-muted-foreground">
                                Patient reported sexual side effects with previous finasteride use. Consider minoxidil-only protocol.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

function SexualHealthPanel({ responses, className }: { responses: Record<string, any>; className?: string | undefined }) {
    // Extract ED-specific indicators
    const edDuration = responses?.Q3 || responses?.duration;
    const erectionQuality = responses?.Q4 || responses?.erectionQuality;
    const medicalConditions = responses?.Q13 || responses?.conditions || [];
    const medications = responses?.Q14 || responses?.medications || [];
    const recentCardiacEvent = responses?.Q16 || responses?.recentCardiac;
    const nitrates = Array.isArray(medications) && medications.includes('nitrates');
    const hasCardiacRisks = Array.isArray(medicalConditions) &&
        medicalConditions.some((c: string) => ED_CARDIAC_RISKS.some(r => c.toLowerCase().includes(r.toLowerCase())));

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn('card-premium p-6', className)}
        >
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500" />
                Sexual Health Assessment
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Duration */}
                {edDuration && (
                    <div className="p-4 bg-muted rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">ED Duration</p>
                        <p className="font-medium text-foreground">{edDuration}</p>
                    </div>
                )}

                {/* Erection Quality */}
                {erectionQuality && (
                    <div className="p-4 bg-muted rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Erection Quality</p>
                        <p className="font-medium text-foreground">{erectionQuality}</p>
                    </div>
                )}
            </div>

            {/* Cardiovascular Alert */}
            {(nitrates || recentCardiacEvent === 'yes' || hasCardiacRisks) && (
                <div className={cn(
                    'mt-4 p-3 rounded-xl border',
                    nitrates ? 'bg-error/10 border-error/30' : 'bg-warning/10 border-warning/30'
                )}>
                    <div className="flex items-start gap-2">
                        <AlertTriangle className={cn(
                            'w-4 h-4 mt-0.5 flex-shrink-0',
                            nitrates ? 'text-error' : 'text-warning'
                        )} />
                        <div className="text-sm">
                            {nitrates ? (
                                <>
                                    <p className="font-medium text-error">NITRATES - ABSOLUTE CONTRAINDICATION</p>
                                    <p className="text-muted-foreground">
                                        Patient is on nitrates. PDE5 inhibitors are CONTRAINDICATED.
                                    </p>
                                </>
                            ) : recentCardiacEvent === 'yes' ? (
                                <>
                                    <p className="font-medium text-warning">Recent Cardiac Event</p>
                                    <p className="text-muted-foreground">
                                        Cardiology clearance required before prescribing PDE5 inhibitors.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="font-medium text-warning">Cardiovascular Risk Factors</p>
                                    <p className="text-muted-foreground">
                                        Patient has cardiovascular risk factors. Consider cardiovascular workup.
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

function WeightPanel({ responses, className }: { responses: Record<string, any>; className?: string | undefined }) {
    // Extract weight-specific indicators
    const currentWeight = responses?.Q3 || responses?.weight;
    const height = responses?.Q4 || responses?.height;
    const targetWeight = responses?.Q5 || responses?.targetWeight;
    const bmi = responses?.bmi || (currentWeight && height ?
        (currentWeight / ((height / 100) * (height / 100))).toFixed(1) : null);
    const medicalConditions = responses?.Q13 || responses?.conditions || [];

    const hasDiabetes = Array.isArray(medicalConditions) &&
        medicalConditions.some((c: string) => c.toLowerCase().includes('diabetes'));
    const hasPregnancy = responses?.Q15 === 'Yes';

    const bmiCategory = bmi ? (
        parseFloat(bmi) < 18.5 ? 'Underweight' :
        parseFloat(bmi) < 25 ? 'Normal' :
        parseFloat(bmi) < 30 ? 'Overweight' :
        parseFloat(bmi) < 35 ? 'Obese Class I' :
        parseFloat(bmi) < 40 ? 'Obese Class II' :
        'Obese Class III'
    ) : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn('card-premium p-6', className)}
        >
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Scale className="w-5 h-5 text-emerald-500" />
                Weight Assessment
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Current Weight */}
                {currentWeight && (
                    <div className="p-4 bg-muted rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Current Weight</p>
                        <p className="font-medium text-foreground">{currentWeight} kg</p>
                    </div>
                )}

                {/* BMI */}
                {bmi && (
                    <div className="p-4 bg-muted rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">BMI</p>
                        <p className="font-medium text-foreground">{bmi}</p>
                        {bmiCategory && (
                            <span className={cn(
                                'inline-block mt-1 px-2 py-0.5 text-xs rounded-lg',
                                bmiCategory === 'Normal' && 'bg-success/10 text-success',
                                bmiCategory === 'Overweight' && 'bg-warning/10 text-warning',
                                bmiCategory.includes('Obese') && 'bg-error/10 text-error',
                            )}>
                                {bmiCategory}
                            </span>
                        )}
                    </div>
                )}

                {/* Target */}
                {targetWeight && (
                    <div className="p-4 bg-muted rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Target Weight</p>
                        <p className="font-medium text-foreground">{targetWeight} kg</p>
                        {currentWeight && (
                            <p className="text-xs text-muted-foreground mt-1">
                                <TrendingDown className="w-3 h-3 inline mr-1" />
                                {currentWeight - targetWeight} kg to lose
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Contraindications */}
            {(hasDiabetes || hasPregnancy) && (
                <div className="mt-4 p-3 rounded-xl bg-info/10 border border-info/30">
                    <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-info mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                            {hasPregnancy ? (
                                <>
                                    <p className="font-medium text-info">Pregnancy/Breastfeeding</p>
                                    <p className="text-muted-foreground">
                                        Weight loss medications are contraindicated during pregnancy/breastfeeding.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="font-medium text-info">Diabetes - Consider GLP-1</p>
                                    <p className="text-muted-foreground">
                                        Patient has diabetes. GLP-1 agonists may provide dual benefit for weight and glycemic control.
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

function PCOSPanel({ responses, className }: { responses: Record<string, any>; className?: string | undefined }) {
    // Extract PCOS-specific indicators
    const symptoms = responses?.Q3 || responses?.symptoms || [];
    const menstrualPattern = responses?.Q4 || responses?.menstrualPattern;
    const hirsutism = responses?.Q5 || responses?.hirsutism;
    const pregnancyStatus = responses?.Q21 || responses?.pregnancy;
    const conditions = responses?.Q22 || responses?.conditions || [];

    const isPregnant = pregnancyStatus === 'Yes, pregnant';
    const hasBloodClotHistory = Array.isArray(conditions) &&
        conditions.some((c: string) => c.toLowerCase().includes('blood clot'));

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn('card-premium p-6', className)}
        >
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-500" />
                PCOS Assessment
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Menstrual Pattern */}
                {menstrualPattern && (
                    <div className="p-4 bg-muted rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Menstrual Pattern</p>
                        <p className="font-medium text-foreground">{menstrualPattern}</p>
                    </div>
                )}

                {/* Hirsutism */}
                {hirsutism && (
                    <div className="p-4 bg-muted rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Hirsutism</p>
                        <p className="font-medium text-foreground">{hirsutism}</p>
                    </div>
                )}

                {/* Main Symptoms */}
                {Array.isArray(symptoms) && symptoms.length > 0 && (
                    <div className="p-4 bg-muted rounded-xl sm:col-span-2">
                        <p className="text-xs text-muted-foreground mb-1">Primary Concerns</p>
                        <div className="flex flex-wrap gap-1">
                            {symptoms.map((s: string) => (
                                <span key={s} className="px-2 py-0.5 text-xs bg-background rounded-lg">
                                    {s}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Contraindications */}
            {(isPregnant || hasBloodClotHistory) && (
                <div className={cn(
                    'mt-4 p-3 rounded-xl border',
                    isPregnant ? 'bg-error/10 border-error/30' : 'bg-warning/10 border-warning/30'
                )}>
                    <div className="flex items-start gap-2">
                        <AlertTriangle className={cn(
                            'w-4 h-4 mt-0.5 flex-shrink-0',
                            isPregnant ? 'text-error' : 'text-warning'
                        )} />
                        <div className="text-sm">
                            {isPregnant ? (
                                <>
                                    <p className="font-medium text-error">PREGNANCY - ABSOLUTE CONTRAINDICATION</p>
                                    <p className="text-muted-foreground">
                                        Spironolactone and hormonal treatments are teratogenic. Only lifestyle + metformin if indicated.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="font-medium text-warning">Blood Clot History</p>
                                    <p className="text-muted-foreground">
                                        Combined OCPs are contraindicated. Consider progestin-only or non-hormonal options.
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

// Quick Actions Component
interface QuickActionsProps {
    consultationId: string;
    vertical: HealthVertical;
    status: string;
}

export function QuickActions({ consultationId, status }: QuickActionsProps) {
    const isPending = status === 'DOCTOR_REVIEWING';

    const actions = [
        {
            id: 'prescribe',
            label: 'Create Prescription',
            icon: <Stethoscope className="w-4 h-4" />,
            href: `/doctor/case/${consultationId}/prescribe`,
            primary: true,
            show: isPending,
        },
        {
            id: 'blood-work',
            label: 'Order Blood Work',
            icon: <Activity className="w-4 h-4" />,
            href: `/doctor/case/${consultationId}/blood-work`,
            primary: false,
            show: isPending,
        },
    ];

    const visibleActions = actions.filter(a => a.show);

    if (visibleActions.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-premium p-6"
        >
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Stethoscope className="w-5 h-5" />
                Quick Actions
            </h3>
            <div className="flex flex-wrap gap-3">
                {visibleActions.map((action) => (
                    <a
                        key={action.id}
                        href={action.href}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                            action.primary
                                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                : 'bg-muted text-foreground hover:bg-muted/80'
                        )}
                    >
                        {action.icon}
                        {action.label}
                    </a>
                ))}
            </div>
        </motion.div>
    );
}
