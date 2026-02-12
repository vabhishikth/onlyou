import { gql } from '@apollo/client';

// Spec: master spec Section 5.4 (Prescription Builder)

// Get available templates for a vertical
export const AVAILABLE_TEMPLATES = gql`
    query AvailableTemplates($vertical: HealthVertical!) {
        availableTemplates(vertical: $vertical) {
            vertical
            templates
        }
    }
`;

// Get suggested template based on patient profile
export const SUGGEST_TEMPLATE = gql`
    query SuggestTemplate($consultationId: String!) {
        suggestTemplate(consultationId: $consultationId) {
            suggestedTemplate
            templateDefinition {
                name
                description
                whenToUse
                medications {
                    name
                    dosage
                    frequency
                    duration
                    instructions
                }
            }
            contraindications {
                isBlocked
                requiresDoctorReview
                suggestMinoxidilOnly
                reasons
                flags
            }
        }
    }
`;

// Check contraindications for a specific template
export const CHECK_CONTRAINDICATIONS = gql`
    query CheckContraindications($input: CheckContraindicationsInput!) {
        checkContraindications(input: $input) {
            canProceed
            result {
                isBlocked
                requiresDoctorReview
                suggestMinoxidilOnly
                reasons
                flags
            }
            alternativeTemplate
        }
    }
`;

// Create prescription
export const CREATE_PRESCRIPTION = gql`
    mutation CreatePrescription($input: CreatePrescriptionInput!) {
        createPrescription(input: $input) {
            success
            message
            prescription {
                id
                consultationId
                pdfUrl
                medications
                instructions
                validUntil
                issuedAt
                doctorName
                doctorRegistrationNo
                patientName
                patientPhone
                createdAt
            }
        }
    }
`;

// Get prescription by consultation
export const PRESCRIPTION_BY_CONSULTATION = gql`
    query PrescriptionByConsultation($consultationId: String!) {
        prescriptionByConsultation(consultationId: $consultationId) {
            id
            consultationId
            pdfUrl
            medications
            instructions
            validUntil
            issuedAt
            doctorName
            createdAt
        }
    }
`;

// Types
export type PrescriptionTemplate =
    | 'STANDARD'
    | 'MINOXIDIL_ONLY'
    | 'CONSERVATIVE'
    | 'COMBINATION_PLUS'
    | 'ADVANCED'
    | 'FEMALE_AGA'
    | 'CUSTOM';

export interface Medication {
    name: string;
    dosage: string;
    frequency: string;
    duration?: string | undefined;
    instructions?: string | undefined;
}

export interface TemplateDefinition {
    name: string;
    description: string;
    whenToUse: string;
    medications: Medication[];
}

export interface ContraindicationResult {
    isBlocked: boolean;
    requiresDoctorReview: boolean;
    suggestMinoxidilOnly?: boolean;
    reasons: string[];
    flags: string[];
}

export interface TemplateSuggestion {
    suggestedTemplate: PrescriptionTemplate;
    templateDefinition: TemplateDefinition;
    contraindications: ContraindicationResult;
}

export interface SuggestTemplateResponse {
    suggestTemplate: TemplateSuggestion;
}

export interface AvailableTemplatesResponse {
    availableTemplates: {
        vertical: string;
        templates: Record<string, TemplateDefinition>;
    };
}

export interface CheckContraindicationsResponse {
    checkContraindications: {
        canProceed: boolean;
        result: ContraindicationResult;
        alternativeTemplate?: PrescriptionTemplate;
    };
}

export interface PrescriptionData {
    id: string;
    consultationId: string;
    pdfUrl?: string;
    medications: Medication[];
    instructions?: string;
    validUntil: string;
    issuedAt: string;
    doctorName?: string;
    doctorRegistrationNo?: string;
    patientName?: string;
    patientPhone?: string;
    createdAt: string;
}

export interface CreatePrescriptionResponse {
    createPrescription: {
        success: boolean;
        message: string;
        prescription?: PrescriptionData;
    };
}

// Template display config
export const TEMPLATE_CONFIG: Record<
    PrescriptionTemplate,
    { label: string; description: string; color: string }
> = {
    STANDARD: {
        label: 'Standard',
        description: 'Finasteride + Minoxidil for typical AGA',
        color: 'primary',
    },
    MINOXIDIL_ONLY: {
        label: 'Minoxidil Only',
        description: 'When finasteride is contraindicated or declined',
        color: 'accent',
    },
    CONSERVATIVE: {
        label: 'Conservative',
        description: 'For young patients (<22) or mild cases',
        color: 'info',
    },
    COMBINATION_PLUS: {
        label: 'Combination Plus',
        description: 'Standard + Ketoconazole for dandruff/seborrheic component',
        color: 'warning',
    },
    ADVANCED: {
        label: 'Advanced',
        description: 'Aggressive treatment for significant hair loss',
        color: 'error',
    },
    FEMALE_AGA: {
        label: 'Female AGA',
        description: 'Minoxidil 2% + Spironolactone for women',
        color: 'purple',
    },
    CUSTOM: {
        label: 'Custom',
        description: 'Build prescription from scratch',
        color: 'neutral',
    },
};
