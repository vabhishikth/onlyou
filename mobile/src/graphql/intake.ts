import { gql } from '@apollo/client';

// Types
export type HealthVertical = 'HAIR_LOSS' | 'SEXUAL_HEALTH' | 'PCOS' | 'WEIGHT_MANAGEMENT';

export interface VerticalInfo {
    id: HealthVertical;
    name: string;
    description: string;
    tagline: string;
    pricePerMonth: number;
    icon: string;
    color: string;
}

export interface QuestionOption {
    label?: string;
    value?: string;
}

export interface Question {
    id: string;
    type: 'single_choice' | 'multiple_choice' | 'text' | 'number';
    question: string;
    options?: string[];
    placeholder?: string;
    required: boolean;
}

export interface QuestionnaireSection {
    id: string;
    title: string;
    questions: Question[];
}

export interface PhotoRequirement {
    id: string;
    label: string;
    required: boolean;
    instructions?: string;
}

export interface QuestionnaireSchema {
    version: number;
    sections: QuestionnaireSection[];
    photoRequirements: PhotoRequirement[];
}

export interface QuestionnaireTemplate {
    id: string;
    vertical: HealthVertical;
    version: number;
    schema: QuestionnaireSchema;
    isActive: boolean;
}

export interface PhotoInput {
    type: string;
    url: string;
}

export interface SubmitIntakeInput {
    vertical: HealthVertical;
    responses: Record<string, unknown>;
    photos?: PhotoInput[];
}

export interface SaveDraftInput {
    vertical: HealthVertical;
    responses: Record<string, unknown>;
    intakeResponseId?: string;
}

export interface IntakeResponse {
    id: string;
    patientProfileId: string;
    questionnaireTemplateId: string;
    responses: Record<string, unknown>;
    isDraft: boolean;
    submittedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Consultation {
    id: string;
    vertical: HealthVertical;
    status: string;
    createdAt: string;
}

// Queries
export const GET_AVAILABLE_VERTICALS = gql`
    query GetAvailableVerticals {
        availableVerticals {
            id
            name
            description
            tagline
            pricePerMonth
            icon
            color
        }
    }
`;

export const GET_QUESTIONNAIRE_TEMPLATE = gql`
    query GetQuestionnaireTemplate($input: GetQuestionnaireInput!) {
        questionnaireTemplate(input: $input) {
            id
            vertical
            version
            schema
            isActive
        }
    }
`;

export const GET_MY_INTAKES = gql`
    query GetMyIntakes {
        myIntakes {
            id
            patientProfileId
            questionnaireTemplateId
            responses
            isDraft
            submittedAt
            createdAt
            updatedAt
        }
    }
`;

export const GET_MY_INTAKE_BY_VERTICAL = gql`
    query GetMyIntakeByVertical($vertical: HealthVertical!) {
        myIntakeByVertical(vertical: $vertical) {
            id
            patientProfileId
            questionnaireTemplateId
            responses
            isDraft
            submittedAt
            createdAt
            updatedAt
        }
    }
`;

// Mutations
export const SAVE_INTAKE_DRAFT = gql`
    mutation SaveIntakeDraft($input: SaveDraftInput!) {
        saveIntakeDraft(input: $input) {
            success
            message
            intakeResponse {
                id
                responses
                isDraft
            }
        }
    }
`;

export const SUBMIT_INTAKE = gql`
    mutation SubmitIntake($input: SubmitIntakeInput!) {
        submitIntake(input: $input) {
            success
            message
            intakeResponse {
                id
                submittedAt
            }
            consultation {
                id
                vertical
                status
            }
        }
    }
`;

// Upload mutations
export interface PresignedUrlInput {
    fileType: string;
    contentType?: string;
}

export interface PresignedUrlResponse {
    uploadUrl: string;
    fileUrl: string;
    key: string;
}

export const GET_PRESIGNED_UPLOAD_URL = gql`
    mutation GetPresignedUploadUrl($input: GetPresignedUrlInput!) {
        getPresignedUploadUrl(input: $input) {
            uploadUrl
            fileUrl
            key
        }
    }
`;
