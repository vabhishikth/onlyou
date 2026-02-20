/**
 * Plan Selection Screen Tests
 * PR 14: Payment Integration — Plan selection in intake flow
 * Spec: master spec Section 3.6 — Review & Consent → Plan Selection → Payment
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Override expo-router mock to provide vertical + intake params
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
    useRouter: () => ({
        push: mockPush,
        replace: jest.fn(),
        back: mockBack,
    }),
    useSegments: () => [],
    useLocalSearchParams: () => ({
        vertical: 'hair-loss',
        responses: '{"duration":"Less than 6 months"}',
        photos: '[]',
    }),
    Slot: ({ children }: any) => children,
    Stack: { Screen: () => null },
    Link: ({ children }: any) => children,
}));

// Get mocked hooks
const mockUseQuery = require('@apollo/client').useQuery;

// Import after mocks
import PlanSelectionScreen from '../plan-selection';

const mockPlans = [
    {
        id: 'plan-hl-1',
        vertical: 'HAIR_LOSS',
        name: 'Hair Loss Monthly',
        description: 'Monthly plan',
        priceInPaise: 99900,
        durationMonths: 1,
        features: ['Doctor consultation', 'Personalized treatment plan', 'Monthly medication'],
        isActive: true,
    },
    {
        id: 'plan-hl-3',
        vertical: 'HAIR_LOSS',
        name: 'Hair Loss Quarterly',
        description: 'Quarterly plan',
        priceInPaise: 249900,
        durationMonths: 3,
        features: ['Doctor consultation', 'Personalized treatment plan', 'Monthly medication', 'Save 17%'],
        isActive: true,
    },
    {
        id: 'plan-hl-12',
        vertical: 'HAIR_LOSS',
        name: 'Hair Loss Annual',
        description: 'Annual plan',
        priceInPaise: 899900,
        durationMonths: 12,
        features: ['Doctor consultation', 'Personalized treatment plan', 'Monthly medication', 'Save 25%', 'Priority support'],
        isActive: true,
    },
];

beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({
        data: { availablePlans: mockPlans },
        loading: false,
        error: null,
    });
});

describe('PlanSelectionScreen', () => {
    describe('Loading state', () => {
        it('shows loading indicator while fetching plans', () => {
            mockUseQuery.mockReturnValue({
                data: null,
                loading: true,
                error: null,
            });

            const { getByText } = render(<PlanSelectionScreen />);
            expect(getByText('Loading plans...')).toBeTruthy();
        });
    });

    describe('Error state', () => {
        it('shows error message when plans fail to load', () => {
            mockUseQuery.mockReturnValue({
                data: null,
                loading: false,
                error: new Error('Network error'),
            });

            const { getByText } = render(<PlanSelectionScreen />);
            expect(getByText('Unable to load plans')).toBeTruthy();
        });

        it('shows Go Back button on error', () => {
            mockUseQuery.mockReturnValue({
                data: null,
                loading: false,
                error: new Error('Network error'),
            });

            const { getByText } = render(<PlanSelectionScreen />);
            fireEvent.press(getByText('Go Back'));
            expect(mockBack).toHaveBeenCalled();
        });
    });

    describe('Plan display', () => {
        it('renders the header with Choose Your Plan title', () => {
            const { getByText } = render(<PlanSelectionScreen />);
            expect(getByText('Choose Your Plan')).toBeTruthy();
        });

        it('displays the vertical name', () => {
            const { getByText } = render(<PlanSelectionScreen />);
            expect(getByText('Hair Loss Treatment')).toBeTruthy();
        });

        it('renders all 3 plan cards', () => {
            const { getByTestId } = render(<PlanSelectionScreen />);
            expect(getByTestId('plan-card-1')).toBeTruthy();
            expect(getByTestId('plan-card-3')).toBeTruthy();
            expect(getByTestId('plan-card-12')).toBeTruthy();
        });

        it('displays Monthly plan with correct price', () => {
            const { getByText } = render(<PlanSelectionScreen />);
            expect(getByText('Monthly')).toBeTruthy();
            expect(getByText('₹999')).toBeTruthy();
        });

        it('displays Quarterly plan with correct price', () => {
            const { getByText } = render(<PlanSelectionScreen />);
            expect(getByText('Quarterly')).toBeTruthy();
            expect(getByText('₹2,499')).toBeTruthy();
        });

        it('displays Annual plan with correct price', () => {
            const { getByText } = render(<PlanSelectionScreen />);
            expect(getByText('Annual')).toBeTruthy();
            expect(getByText('₹8,999')).toBeTruthy();
        });

        it('shows savings badge for quarterly plan', () => {
            const { getByText } = render(<PlanSelectionScreen />);
            expect(getByText('Save 17%')).toBeTruthy();
        });

        it('shows savings badge for annual plan', () => {
            const { getByText } = render(<PlanSelectionScreen />);
            expect(getByText('Save 25%')).toBeTruthy();
        });

        it('shows What\'s included section', () => {
            const { getByText } = render(<PlanSelectionScreen />);
            expect(getByText("What's included")).toBeTruthy();
        });
    });

    describe('Plan selection', () => {
        it('disables continue button when no plan selected', () => {
            const { getByText } = render(<PlanSelectionScreen />);
            expect(getByText('Select a plan to continue')).toBeTruthy();
        });

        it('updates continue button text when plan is selected', () => {
            const { getByTestId, getByText } = render(<PlanSelectionScreen />);

            fireEvent.press(getByTestId('plan-card-1'));
            expect(getByText(/Continue to Payment/)).toBeTruthy();
            expect(getByText(/₹999/)).toBeTruthy();
        });

        it('shows features when plan is selected', () => {
            const { getByTestId, getByText } = render(<PlanSelectionScreen />);

            fireEvent.press(getByTestId('plan-card-1'));
            expect(getByText('Doctor consultation')).toBeTruthy();
        });
    });

    describe('Navigation', () => {
        it('navigates back when back button pressed', () => {
            const { getByText } = render(<PlanSelectionScreen />);

            fireEvent.press(getByText('<'));
            expect(mockBack).toHaveBeenCalled();
        });

        it('navigates to payment screen when continue pressed with selected plan', () => {
            const { getByTestId } = render(<PlanSelectionScreen />);

            // Select monthly plan
            fireEvent.press(getByTestId('plan-card-1'));

            // Press continue
            fireEvent.press(getByTestId('continue-to-payment'));

            expect(mockPush).toHaveBeenCalledWith(
                expect.objectContaining({
                    pathname: '/intake/hair-loss/payment',
                    params: expect.objectContaining({
                        planId: 'plan-hl-1',
                        amountPaise: '99900',
                    }),
                }),
            );
        });

        it('passes responses and photos params to payment screen', () => {
            const { getByTestId } = render(<PlanSelectionScreen />);

            fireEvent.press(getByTestId('plan-card-3'));
            fireEvent.press(getByTestId('continue-to-payment'));

            expect(mockPush).toHaveBeenCalledWith(
                expect.objectContaining({
                    params: expect.objectContaining({
                        responses: '{"duration":"Less than 6 months"}',
                        photos: '[]',
                    }),
                }),
            );
        });
    });
});
