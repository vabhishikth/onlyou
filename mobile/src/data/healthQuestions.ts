/**
 * Health Snapshot Questions Data
 * Questions per condition for Step 4 of onboarding
 */

import { HealthGoal } from '@/store/onboardingStore';

export interface QuestionOption {
    id: string;
    label: string;
}

export interface Question {
    id: string;
    text: string;
    type: 'single' | 'multi' | 'number' | 'number_toggle';
    options?: QuestionOption[];
    numberSuffix?: string;
    toggleOptions?: string[];
    followUp?: {
        condition: { optionId: string };
        question: Question;
    };
}

export interface ConditionQuestions {
    condition: HealthGoal;
    questions: Question[];
}

export const HEALTH_QUESTIONS: ConditionQuestions[] = [
    {
        condition: 'HAIR_LOSS',
        questions: [
            {
                id: 'hair_duration',
                text: 'How long have you noticed hair thinning?',
                type: 'single',
                options: [
                    { id: 'less_6_months', label: 'Less than 6 months' },
                    { id: '6_12_months', label: '6-12 months' },
                    { id: '1_3_years', label: '1-3 years' },
                    { id: '3_plus_years', label: '3+ years' },
                ],
            },
            {
                id: 'hair_location',
                text: 'Where do you notice it most?',
                type: 'single',
                options: [
                    { id: 'crown', label: 'Crown / top of head' },
                    { id: 'temples', label: 'Temples / hairline' },
                    { id: 'all_over', label: 'All over' },
                    { id: 'patchy', label: 'Patchy spots' },
                ],
            },
            {
                id: 'hair_family',
                text: 'Family history of hair loss?',
                type: 'single',
                options: [
                    { id: 'father', label: "Yes — father's side" },
                    { id: 'mother', label: "Yes — mother's side" },
                    { id: 'both', label: 'Yes — both sides' },
                    { id: 'no', label: 'No' },
                    { id: 'not_sure', label: 'Not sure' },
                ],
            },
            {
                id: 'hair_treatments',
                text: 'Have you tried any treatments?',
                type: 'multi',
                options: [
                    { id: 'minoxidil', label: 'Minoxidil' },
                    { id: 'finasteride', label: 'Finasteride' },
                    { id: 'prp', label: 'PRP therapy' },
                    { id: 'transplant', label: 'Hair transplant' },
                    { id: 'oils_supplements', label: 'Oils & supplements' },
                    { id: 'nothing', label: 'Nothing yet' },
                ],
            },
        ],
    },
    {
        condition: 'SEXUAL_HEALTH',
        questions: [
            {
                id: 'sexual_frequency',
                text: 'How often do you experience difficulty?',
                type: 'single',
                options: [
                    { id: 'rarely', label: 'Rarely' },
                    { id: 'sometimes', label: 'Sometimes' },
                    { id: 'often', label: 'Often' },
                    { id: 'almost_always', label: 'Almost always' },
                ],
            },
            {
                id: 'sexual_duration',
                text: 'How long has this been a concern?',
                type: 'single',
                options: [
                    { id: 'less_3_months', label: 'Less than 3 months' },
                    { id: '3_6_months', label: '3-6 months' },
                    { id: '6_12_months', label: '6-12 months' },
                    { id: 'more_year', label: 'More than a year' },
                ],
            },
            {
                id: 'sexual_medications',
                text: 'Are you currently taking any medications?',
                type: 'single',
                options: [
                    { id: 'yes', label: 'Yes' },
                    { id: 'no', label: 'No' },
                ],
            },
        ],
    },
    {
        condition: 'WEIGHT_MANAGEMENT',
        questions: [
            {
                id: 'weight_current',
                text: "What's your current weight?",
                type: 'number',
                numberSuffix: 'kg',
            },
            {
                id: 'weight_height',
                text: "What's your height?",
                type: 'number_toggle',
                toggleOptions: ['cm', 'ft'],
            },
            {
                id: 'weight_target',
                text: "What's your target weight?",
                type: 'number',
                numberSuffix: 'kg',
            },
            {
                id: 'weight_treatments',
                text: 'Have you tried any weight loss treatments?',
                type: 'multi',
                options: [
                    { id: 'glp1', label: 'GLP-1 medications' },
                    { id: 'orlistat', label: 'Orlistat' },
                    { id: 'diet_programs', label: 'Diet programs' },
                    { id: 'nothing', label: 'Nothing yet' },
                ],
            },
        ],
    },
    {
        condition: 'PCOS',
        questions: [
            {
                id: 'pcos_symptoms',
                text: 'Which symptoms are you experiencing?',
                type: 'multi',
                options: [
                    { id: 'irregular_periods', label: 'Irregular periods' },
                    { id: 'acne', label: 'Acne' },
                    { id: 'hair_thinning', label: 'Hair thinning' },
                    { id: 'weight_gain', label: 'Weight gain' },
                    { id: 'excess_hair', label: 'Excess facial/body hair' },
                    { id: 'difficulty_conceiving', label: 'Difficulty conceiving' },
                ],
            },
            {
                id: 'pcos_diagnosed',
                text: 'Have you been diagnosed with PCOS?',
                type: 'single',
                options: [
                    { id: 'yes', label: 'Yes, officially diagnosed' },
                    { id: 'suspected', label: 'Suspected but not confirmed' },
                    { id: 'no', label: 'No diagnosis yet' },
                ],
            },
            {
                id: 'pcos_treatment_goal',
                text: "What's your main treatment goal?",
                type: 'single',
                options: [
                    { id: 'regulate_periods', label: 'Regulate periods' },
                    { id: 'clear_skin', label: 'Clear skin' },
                    { id: 'lose_weight', label: 'Lose weight' },
                    { id: 'fertility', label: 'Improve fertility' },
                    { id: 'overall', label: 'Overall symptom management' },
                ],
            },
        ],
    },
];

export function getQuestionsForCondition(condition: HealthGoal): Question[] {
    const found = HEALTH_QUESTIONS.find((c) => c.condition === condition);
    return found?.questions || [];
}
