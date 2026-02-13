/**
 * Health Goals Screen Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import HealthGoalsScreen from '../health-goals';
import { useOnboardingStore } from '@/store/onboardingStore';

// Get mocked router
const mockRouter = require('expo-router').useRouter();

// Reset store before each test
beforeEach(() => {
    jest.clearAllMocks();
    useOnboardingStore.getState().reset();
});

describe('HealthGoalsScreen', () => {
    it('renders the screen', () => {
        const { getByTestId } = render(<HealthGoalsScreen />);
        expect(getByTestId('health-goals-screen')).toBeTruthy();
    });

    it('displays the heading', () => {
        const { getByText } = render(<HealthGoalsScreen />);
        expect(getByText('What would you like to focus on?')).toBeTruthy();
    });

    it('displays the subtitle', () => {
        const { getByText } = render(<HealthGoalsScreen />);
        expect(getByText('Select all that apply. You can always explore more later.')).toBeTruthy();
    });

    describe('Health goal cards', () => {
        it('renders hair loss card', () => {
            const { getByTestId } = render(<HealthGoalsScreen />);
            expect(getByTestId('goal-card-hair-loss')).toBeTruthy();
        });

        it('renders sexual health card', () => {
            const { getByTestId } = render(<HealthGoalsScreen />);
            expect(getByTestId('goal-card-sexual-health')).toBeTruthy();
        });

        it('renders weight management card', () => {
            const { getByTestId } = render(<HealthGoalsScreen />);
            expect(getByTestId('goal-card-weight-management')).toBeTruthy();
        });

        it('renders PCOS card', () => {
            const { getByTestId } = render(<HealthGoalsScreen />);
            expect(getByTestId('goal-card-pcos')).toBeTruthy();
        });

        it('toggles selection when card is pressed', () => {
            const { getByTestId } = render(<HealthGoalsScreen />);
            const hairLossCard = getByTestId('goal-card-hair-loss');

            fireEvent.press(hairLossCard);

            const state = useOnboardingStore.getState();
            expect(state.healthGoals).toContain('HAIR_LOSS');
        });

        it('allows multiple selections', () => {
            const { getByTestId } = render(<HealthGoalsScreen />);

            fireEvent.press(getByTestId('goal-card-hair-loss'));
            fireEvent.press(getByTestId('goal-card-pcos'));

            const state = useOnboardingStore.getState();
            expect(state.healthGoals).toContain('HAIR_LOSS');
            expect(state.healthGoals).toContain('PCOS');
            expect(state.healthGoals.length).toBe(2);
        });

        it('deselects when pressed again', () => {
            const { getByTestId } = render(<HealthGoalsScreen />);
            const hairLossCard = getByTestId('goal-card-hair-loss');

            fireEvent.press(hairLossCard); // Select
            fireEvent.press(hairLossCard); // Deselect

            const state = useOnboardingStore.getState();
            expect(state.healthGoals).not.toContain('HAIR_LOSS');
        });
    });

    describe('Next button', () => {
        it('renders next button', () => {
            const { getByTestId } = render(<HealthGoalsScreen />);
            expect(getByTestId('health-goals-next-button')).toBeTruthy();
        });

        it('navigates to basic-info when Next is pressed with selection', () => {
            const { getByTestId } = render(<HealthGoalsScreen />);

            // Select a health goal first
            fireEvent.press(getByTestId('goal-card-hair-loss'));

            // Press next
            fireEvent.press(getByTestId('health-goals-next-button'));

            expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/basic-info');
        });
    });
});
