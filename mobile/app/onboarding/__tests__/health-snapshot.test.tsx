/**
 * Health Snapshot Screen Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import HealthSnapshotScreen from '../health-snapshot';
import { useOnboardingStore } from '@/store/onboardingStore';

// Get mocked router
const mockRouter = require('expo-router').useRouter();

// Reset store before each test
beforeEach(() => {
    jest.clearAllMocks();
    useOnboardingStore.getState().reset();
    // Pre-populate with hair loss selected
    useOnboardingStore.getState().setHealthGoals(['HAIR_LOSS']);
});

describe('HealthSnapshotScreen', () => {
    it('renders the screen', () => {
        const { getByTestId } = render(<HealthSnapshotScreen />);
        expect(getByTestId('health-snapshot-screen')).toBeTruthy();
    });

    it('displays the first question for hair loss', () => {
        const { getByText } = render(<HealthSnapshotScreen />);
        expect(getByText('How long have you noticed hair thinning?')).toBeTruthy();
    });

    it('displays condition badge', () => {
        const { getByText } = render(<HealthSnapshotScreen />);
        expect(getByText('Hair Loss')).toBeTruthy();
    });

    it('displays progress indicator', () => {
        const { getByText } = render(<HealthSnapshotScreen />);
        expect(getByText(/Question 1 of/)).toBeTruthy();
    });

    describe('Question options', () => {
        it('renders all answer options', () => {
            const { getByText } = render(<HealthSnapshotScreen />);
            expect(getByText('Less than 6 months')).toBeTruthy();
            expect(getByText('6-12 months')).toBeTruthy();
            expect(getByText('1-3 years')).toBeTruthy();
            expect(getByText('3+ years')).toBeTruthy();
        });

        it('allows selecting an option', () => {
            const { getByTestId } = render(<HealthSnapshotScreen />);
            const option = getByTestId('option-less_6_months');

            fireEvent.press(option);

            // Option should be selectable without error
            expect(option).toBeTruthy();
        });
    });

    describe('Navigation', () => {
        it('renders back button', () => {
            const { getByTestId } = render(<HealthSnapshotScreen />);
            expect(getByTestId('health-snapshot-back')).toBeTruthy();
        });

        it('renders next button', () => {
            const { getByTestId } = render(<HealthSnapshotScreen />);
            expect(getByTestId('health-snapshot-next-button')).toBeTruthy();
        });

        it('calls router.back when back is pressed on first question', () => {
            const { getByTestId } = render(<HealthSnapshotScreen />);

            fireEvent.press(getByTestId('health-snapshot-back'));

            expect(mockRouter.back).toHaveBeenCalled();
        });
    });

    describe('Multiple conditions', () => {
        beforeEach(() => {
            useOnboardingStore.getState().reset();
            useOnboardingStore.getState().setHealthGoals(['HAIR_LOSS', 'PCOS']);
        });

        it('shows total questions across all conditions', () => {
            const { getByText } = render(<HealthSnapshotScreen />);
            // Hair loss has 4 questions, PCOS has 3 = 7 total
            expect(getByText(/Question 1 of 7/)).toBeTruthy();
        });
    });
});
