import { gql } from '@apollo/client';

// Spec: Phase 12 — Doctor Management GraphQL Operations

// Queries

export const ADMIN_DOCTORS = gql`
    query AdminDoctors($vertical: HealthVertical, $isAvailable: Boolean) {
        doctors(vertical: $vertical, isAvailable: $isAvailable) {
            id
            userId
            registrationNo
            specialization
            specializations
            verticals
            qualifications
            yearsOfExperience
            bio
            avatarUrl
            signatureUrl
            isAvailable
            isActive
            seniorDoctor
            dailyCaseLimit
            consultationFee
            lastAssignedAt
            createdAt
            updatedAt
        }
    }
`;

export const DOCTOR_BY_ID = gql`
    query DoctorById($id: String!) {
        doctorById(id: $id) {
            id
            userId
            registrationNo
            specialization
            specializations
            verticals
            qualifications
            yearsOfExperience
            bio
            avatarUrl
            signatureUrl
            isAvailable
            isActive
            seniorDoctor
            dailyCaseLimit
            consultationFee
            lastAssignedAt
            createdAt
            updatedAt
        }
    }
`;

export const DOCTOR_STATS = gql`
    query DoctorStats($id: String!) {
        doctorStats(id: $id) {
            activeCases
            completedToday
            dailyCaseLimit
            avgResponseTimeHours
            isAvailable
            seniorDoctor
        }
    }
`;

// Mutations

export const CREATE_DOCTOR = gql`
    mutation CreateDoctor($input: CreateDoctorInput!) {
        createDoctor(input: $input) {
            id
            userId
            registrationNo
            specializations
            verticals
            dailyCaseLimit
            consultationFee
            isAvailable
            isActive
            seniorDoctor
            createdAt
        }
    }
`;

export const UPDATE_DOCTOR = gql`
    mutation UpdateDoctor($id: String!, $input: UpdateDoctorInput!) {
        updateDoctor(id: $id, input: $input) {
            id
            specializations
            verticals
            dailyCaseLimit
            consultationFee
            seniorDoctor
            bio
        }
    }
`;

export const TOGGLE_DOCTOR_AVAILABILITY = gql`
    mutation ToggleDoctorAvailability($id: String!) {
        toggleDoctorAvailability(id: $id) {
            id
            isAvailable
        }
    }
`;

export const DEACTIVATE_DOCTOR = gql`
    mutation DeactivateDoctor($id: String!) {
        deactivateDoctor(id: $id)
    }
`;

// Types

export interface DoctorProfile {
    id: string;
    userId: string;
    registrationNo: string;
    specialization: string;
    specializations: string[];
    verticals: string[];
    qualifications: string[];
    yearsOfExperience: number;
    bio: string | null;
    avatarUrl: string | null;
    signatureUrl: string | null;
    isAvailable: boolean;
    isActive: boolean;
    seniorDoctor: boolean;
    dailyCaseLimit: number;
    consultationFee: number;
    lastAssignedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface DoctorStatsData {
    activeCases: number;
    completedToday: number;
    dailyCaseLimit: number;
    avgResponseTimeHours: number;
    isAvailable: boolean;
    seniorDoctor: boolean;
}

export const VERTICAL_LABELS: Record<string, string> = {
    HAIR_LOSS: 'Hair Loss',
    SEXUAL_HEALTH: 'Sexual Health',
    PCOS: 'PCOS',
    WEIGHT_MANAGEMENT: 'Weight Management',
};

export const VERTICAL_COLORS: Record<string, { text: string; bg: string }> = {
    HAIR_LOSS: { text: 'text-amber-600', bg: 'bg-amber-100' },
    SEXUAL_HEALTH: { text: 'text-blue-600', bg: 'bg-blue-100' },
    PCOS: { text: 'text-pink-600', bg: 'bg-pink-100' },
    WEIGHT_MANAGEMENT: { text: 'text-green-600', bg: 'bg-green-100' },
};
