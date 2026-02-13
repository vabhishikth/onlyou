/**
 * Onboarding Store
 * Zustand store for managing onboarding flow state
 */

import { create } from 'zustand';

export type HealthGoal = 'HAIR_LOSS' | 'SEXUAL_HEALTH' | 'WEIGHT_MANAGEMENT' | 'PCOS';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

interface BasicInfo {
    fullName: string;
    dateOfBirth: string; // DD-MM-YYYY format
    gender: Gender | null;
}

interface LocationInfo {
    pincode: string;
    state: string;
    city: string;
    telehealthConsent: boolean;
}

// Health snapshot responses per condition
interface HealthSnapshot {
    condition: HealthGoal;
    responses: Record<string, string | string[] | number>;
}

interface OnboardingState {
    // Step 1: Health Goals
    healthGoals: HealthGoal[];

    // Step 2: Basic Info
    basicInfo: BasicInfo;

    // Step 3: Location
    locationInfo: LocationInfo;

    // Step 4: Health Snapshots (one per selected health goal)
    healthSnapshots: HealthSnapshot[];

    // Current step tracking
    currentStep: number;

    // Actions
    setHealthGoals: (goals: HealthGoal[]) => void;
    toggleHealthGoal: (goal: HealthGoal) => void;
    setBasicInfo: (info: Partial<BasicInfo>) => void;
    setLocationInfo: (info: Partial<LocationInfo>) => void;
    setHealthSnapshot: (condition: HealthGoal, responses: Record<string, string | string[] | number>) => void;
    setCurrentStep: (step: number) => void;
    reset: () => void;
}

const initialState = {
    healthGoals: [] as HealthGoal[],
    basicInfo: {
        fullName: '',
        dateOfBirth: '',
        gender: null as Gender | null,
    },
    locationInfo: {
        pincode: '',
        state: '',
        city: '',
        telehealthConsent: false,
    },
    healthSnapshots: [] as HealthSnapshot[],
    currentStep: 1,
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
    ...initialState,

    setHealthGoals: (goals) => set({ healthGoals: goals }),

    toggleHealthGoal: (goal) =>
        set((state) => ({
            healthGoals: state.healthGoals.includes(goal)
                ? state.healthGoals.filter((g) => g !== goal)
                : [...state.healthGoals, goal],
        })),

    setBasicInfo: (info) =>
        set((state) => ({
            basicInfo: { ...state.basicInfo, ...info },
        })),

    setLocationInfo: (info) =>
        set((state) => ({
            locationInfo: { ...state.locationInfo, ...info },
        })),

    setHealthSnapshot: (condition, responses) =>
        set((state) => {
            const existing = state.healthSnapshots.filter((s) => s.condition !== condition);
            return {
                healthSnapshots: [...existing, { condition, responses }],
            };
        }),

    setCurrentStep: (step) => set({ currentStep: step }),

    reset: () => set(initialState),
}));
