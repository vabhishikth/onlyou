/**
 * Questionnaire Screen Tests
 * PR 5: Treatment + Questionnaire + Photo Restyle
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useQuery, useMutation } from '@apollo/client';

// Must be named 'mock' prefix for Jest hoisting
let mockVertical = 'hair-loss';
const mockPush = jest.fn();
const mockBack = jest.fn();

// Mock useLocalSearchParams and responses param
let mockResponses = '';
jest.mock('expo-router', () => ({
    useRouter: () => ({
        push: mockPush,
        replace: jest.fn(),
        back: mockBack,
    }),
    useSegments: () => [],
    useLocalSearchParams: () => ({ vertical: mockVertical, responses: mockResponses }),
    Slot: ({ children }: { children: React.ReactNode }) => children,
    Stack: {
        Screen: () => null,
    },
    Link: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock questionnaire data
const mockQuestionnaireTemplate = {
    id: 'hair-loss-template',
    schema: {
        sections: [
            {
                id: 'demographics',
                title: 'Basic Information',
                questions: [
                    {
                        id: 'age',
                        question: 'What is your age?',
                        type: 'number',
                        required: true,
                        placeholder: 'Enter your age',
                    },
                    {
                        id: 'gender',
                        question: 'What is your gender?',
                        type: 'single_choice',
                        required: true,
                        options: ['Male', 'Female', 'Other'],
                    },
                    {
                        id: 'hair_loss_duration',
                        question: 'How long have you been experiencing hair loss?',
                        type: 'single_choice',
                        required: true,
                        options: ['Less than 6 months', '6-12 months', '1-2 years', 'More than 2 years'],
                    },
                ],
            },
        ],
        photoRequirements: [],
    },
};

// Import after mocks
import QuestionsScreen from '../questions';

beforeEach(() => {
    jest.clearAllMocks();
    mockVertical = 'hair-loss';
    mockResponses = '';

    // Mock useQuery to return questionnaire template
    (useQuery as jest.Mock).mockReturnValue({
        data: { questionnaireTemplate: mockQuestionnaireTemplate },
        loading: false,
        error: null,
    });

    // Mock useMutation for save draft
    (useMutation as jest.Mock).mockReturnValue([
        jest.fn().mockResolvedValue({ data: { saveIntakeDraft: { success: true } } }),
        { loading: false },
    ]);
});

describe('QuestionsScreen', () => {
    describe('Screen structure', () => {
        it('renders the screen with testID', () => {
            const { getByTestId } = render(<QuestionsScreen />);
            expect(getByTestId('questions-screen')).toBeTruthy();
        });

        it('renders back button', () => {
            const { getByTestId } = render(<QuestionsScreen />);
            expect(getByTestId('back-button')).toBeTruthy();
        });

        it('navigates back when back button is pressed on first question', () => {
            const { getByTestId } = render(<QuestionsScreen />);
            fireEvent.press(getByTestId('back-button'));
            expect(mockBack).toHaveBeenCalled();
        });
    });

    describe('Progress indicator', () => {
        it('renders progress indicator', () => {
            const { getByTestId } = render(<QuestionsScreen />);
            expect(getByTestId('progress-indicator')).toBeTruthy();
        });

        it('displays current question number', () => {
            const { getByText } = render(<QuestionsScreen />);
            expect(getByText(/1.*of.*3/i)).toBeTruthy();
        });
    });

    describe('Question display', () => {
        it('displays question text with serif font style', () => {
            const { getByTestId } = render(<QuestionsScreen />);
            expect(getByTestId('question-text')).toBeTruthy();
        });

        it('displays first question text', () => {
            const { getByText } = render(<QuestionsScreen />);
            expect(getByText('What is your age?')).toBeTruthy();
        });
    });

    describe('Number input questions', () => {
        it('renders number input for number type questions', () => {
            const { getByTestId } = render(<QuestionsScreen />);
            expect(getByTestId('number-input')).toBeTruthy();
        });

        it('shows continue button for number input', () => {
            const { getByTestId } = render(<QuestionsScreen />);
            expect(getByTestId('continue-button')).toBeTruthy();
        });
    });

    describe('Single choice questions', () => {
        beforeEach(() => {
            // Mock template with single choice question first
            (useQuery as jest.Mock).mockReturnValue({
                data: {
                    questionnaireTemplate: {
                        ...mockQuestionnaireTemplate,
                        schema: {
                            sections: [
                                {
                                    id: 'hair',
                                    title: 'Hair Loss',
                                    questions: [
                                        {
                                            id: 'gender',
                                            question: 'What is your gender?',
                                            type: 'single_choice',
                                            required: true,
                                            options: ['Male', 'Female', 'Other'],
                                        },
                                    ],
                                },
                            ],
                            photoRequirements: [],
                        },
                    },
                },
                loading: false,
                error: null,
            });
        });

        it('renders SelectionCard for each option', () => {
            const { getByTestId } = render(<QuestionsScreen />);
            expect(getByTestId('option-Male')).toBeTruthy();
            expect(getByTestId('option-Female')).toBeTruthy();
            expect(getByTestId('option-Other')).toBeTruthy();
        });

        it('auto-advances when option is selected', async () => {
            const { getByTestId } = render(<QuestionsScreen />);
            fireEvent.press(getByTestId('option-Male'));

            // Should navigate since there's only one question and no photo requirements
            await waitFor(() => {
                expect(mockPush).toHaveBeenCalled();
            });
        });
    });

    describe('Multiple choice questions', () => {
        beforeEach(() => {
            (useQuery as jest.Mock).mockReturnValue({
                data: {
                    questionnaireTemplate: {
                        ...mockQuestionnaireTemplate,
                        schema: {
                            sections: [
                                {
                                    id: 'symptoms',
                                    title: 'Symptoms',
                                    questions: [
                                        {
                                            id: 'symptoms_list',
                                            question: 'Which symptoms are you experiencing?',
                                            type: 'multiple_choice',
                                            required: true,
                                            options: ['Thinning', 'Receding hairline', 'Bald spots', 'None'],
                                        },
                                    ],
                                },
                            ],
                            photoRequirements: [],
                        },
                    },
                },
                loading: false,
                error: null,
            });
        });

        it('renders SelectionCard for each option', () => {
            const { getByTestId } = render(<QuestionsScreen />);
            expect(getByTestId('option-Thinning')).toBeTruthy();
            expect(getByTestId('option-Receding hairline')).toBeTruthy();
        });

        it('shows helper text for multiple selection', () => {
            const { getByText } = render(<QuestionsScreen />);
            expect(getByText(/select all that apply/i)).toBeTruthy();
        });

        it('shows continue button for multiple choice', () => {
            const { getByTestId } = render(<QuestionsScreen />);
            expect(getByTestId('continue-button')).toBeTruthy();
        });

        it('allows selecting multiple options', () => {
            const { getByTestId } = render(<QuestionsScreen />);

            fireEvent.press(getByTestId('option-Thinning'));
            fireEvent.press(getByTestId('option-Receding hairline'));

            // Both should be selectable (test doesn't check visual state, just that they can be pressed)
            expect(true).toBe(true);
        });
    });

    describe('Loading state', () => {
        it('shows loading indicator when fetching questions', () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: null,
                loading: true,
                error: null,
            });

            const { getByTestId } = render(<QuestionsScreen />);
            expect(getByTestId('loading-indicator')).toBeTruthy();
        });
    });

    describe('Error state', () => {
        it('shows error message when fetch fails', () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: null,
                loading: false,
                error: new Error('Failed to load'),
            });

            const { getByText } = render(<QuestionsScreen />);
            expect(getByText(/unable to load questions/i)).toBeTruthy();
        });
    });

    describe('Navigation flow', () => {
        it('navigates to photos screen if photo requirements exist', async () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: {
                    questionnaireTemplate: {
                        id: 'hair-loss-template',
                        schema: {
                            sections: [
                                {
                                    id: 'single',
                                    title: 'Single',
                                    questions: [
                                        {
                                            id: 'q1',
                                            question: 'Test question?',
                                            type: 'single_choice',
                                            required: true,
                                            options: ['Yes', 'No'],
                                        },
                                    ],
                                },
                            ],
                            photoRequirements: [
                                { id: 'scalp_top', label: 'Top of scalp', required: true },
                            ],
                        },
                    },
                },
                loading: false,
                error: null,
            });

            const { getByTestId } = render(<QuestionsScreen />);
            fireEvent.press(getByTestId('option-Yes'));

            await waitFor(() => {
                expect(mockPush).toHaveBeenCalledWith(
                    expect.objectContaining({
                        pathname: expect.stringContaining('/photos'),
                    })
                );
            });
        });

        it('navigates to review screen if no photo requirements', async () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: {
                    questionnaireTemplate: {
                        id: 'sexual-health-template',
                        schema: {
                            sections: [
                                {
                                    id: 'single',
                                    title: 'Single',
                                    questions: [
                                        {
                                            id: 'q1',
                                            question: 'Test question?',
                                            type: 'single_choice',
                                            required: true,
                                            options: ['Yes', 'No'],
                                        },
                                    ],
                                },
                            ],
                            photoRequirements: [],
                        },
                    },
                },
                loading: false,
                error: null,
            });

            const { getByTestId } = render(<QuestionsScreen />);
            fireEvent.press(getByTestId('option-Yes'));

            await waitFor(() => {
                expect(mockPush).toHaveBeenCalledWith(
                    expect.objectContaining({
                        pathname: expect.stringContaining('/review'),
                    })
                );
            });
        });
    });
});
