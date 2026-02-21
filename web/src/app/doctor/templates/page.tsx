'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { motion } from 'framer-motion';
import { FileText, ChevronDown, ChevronUp, Pill } from 'lucide-react';
import {
    AVAILABLE_TEMPLATES,
    AvailableTemplatesResponse,
    TemplateDefinition,
} from '@/graphql/prescription';

// Spec: master spec Section 5.4 — Prescription Templates

type VerticalTab = 'HAIR_LOSS' | 'SEXUAL_HEALTH' | 'PCOS' | 'WEIGHT_MANAGEMENT';

const VERTICAL_TABS: { value: VerticalTab; label: string }[] = [
    { value: 'HAIR_LOSS', label: 'Hair Loss' },
    { value: 'SEXUAL_HEALTH', label: 'Sexual Health' },
    { value: 'PCOS', label: 'PCOS' },
    { value: 'WEIGHT_MANAGEMENT', label: 'Weight' },
];

export default function TemplatesPage() {
    const [activeTab, setActiveTab] = useState<VerticalTab>('HAIR_LOSS');
    const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

    const { data, loading } = useQuery<AvailableTemplatesResponse>(
        AVAILABLE_TEMPLATES,
        {
            variables: { vertical: activeTab },
            fetchPolicy: 'cache-and-network',
        }
    );

    const templates = data?.availableTemplates?.templates || {};
    const templateEntries = Object.entries(templates) as [string, TemplateDefinition][];

    const handleTabClick = (tab: VerticalTab) => {
        setActiveTab(tab);
        setExpandedTemplate(null);
    };

    const toggleExpand = (key: string) => {
        setExpandedTemplate(expandedTemplate === key ? null : key);
    };

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-2xl lg:text-3xl font-serif font-bold text-foreground">
                    Templates
                </h1>
                <p className="text-muted-foreground mt-1">
                    Prescription templates by condition vertical.
                </p>
            </motion.div>

            {/* Vertical tabs */}
            <div className="flex gap-2 mb-6 flex-wrap">
                {VERTICAL_TABS.map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => handleTabClick(tab.value)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                            activeTab === tab.value
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Loading state */}
            {loading && (
                <div data-testid="templates-loading" className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="card-premium p-6 animate-pulse">
                            <div className="h-5 bg-muted rounded w-1/3 mb-2" />
                            <div className="h-4 bg-muted rounded w-2/3" />
                        </div>
                    ))}
                </div>
            )}

            {/* Template cards */}
            {!loading && templateEntries.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card-premium p-12 text-center"
                >
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-foreground mb-2">
                        No Templates
                    </h2>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                        No prescription templates available for this vertical yet.
                    </p>
                </motion.div>
            )}

            {!loading && templateEntries.length > 0 && (
                <div className="space-y-4">
                    {templateEntries.map(([key, template]) => (
                        <motion.div
                            key={key}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="card-premium overflow-hidden"
                        >
                            <button
                                onClick={() => toggleExpand(key)}
                                className="w-full p-6 text-left flex items-start justify-between gap-4"
                            >
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground">
                                        {template.name}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {template.description}
                                    </p>
                                    {template.whenToUse && (
                                        <p className="text-xs text-muted-foreground/70 mt-1">
                                            When to use: {template.whenToUse}
                                        </p>
                                    )}
                                </div>
                                {expandedTemplate === key ? (
                                    <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
                                )}
                            </button>

                            {expandedTemplate === key && template.medications && (
                                <div className="px-6 pb-6 border-t border-border pt-4">
                                    <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                                        <Pill className="w-4 h-4" />
                                        Medications
                                    </h4>
                                    <div className="space-y-3">
                                        {template.medications.map((med, idx) => (
                                            <div
                                                key={idx}
                                                className="bg-muted/50 rounded-lg p-3"
                                            >
                                                <div className="font-medium text-sm text-foreground">
                                                    {med.name}
                                                </div>
                                                <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                                                    <span>{med.dosage}</span>
                                                    <span>{med.frequency}</span>
                                                    {med.duration && <span>{med.duration}</span>}
                                                </div>
                                                {med.instructions && (
                                                    <p className="text-xs text-muted-foreground/70 mt-1">
                                                        {med.instructions}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
