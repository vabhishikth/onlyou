/**
 * Location Screen Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import LocationScreen from '../location';
import { useOnboardingStore } from '@/store/onboardingStore';

// Get mocked router
const mockRouter = require('expo-router').useRouter();

// Reset store before each test
beforeEach(() => {
    jest.clearAllMocks();
    useOnboardingStore.getState().reset();
    // Pre-populate basic info for tests
    useOnboardingStore.getState().setBasicInfo({
        fullName: 'Test User',
        dateOfBirth: '01-01-1990',
        gender: 'MALE',
    });
    useOnboardingStore.getState().setHealthGoals(['HAIR_LOSS']);
});

describe('LocationScreen', () => {
    it('renders the screen', () => {
        const { getByTestId } = render(<LocationScreen />);
        expect(getByTestId('location-screen')).toBeTruthy();
    });

    it('displays the heading', () => {
        const { getByText } = render(<LocationScreen />);
        expect(getByText('Where do you live?')).toBeTruthy();
    });

    it('displays the subtitle', () => {
        const { getByText } = render(<LocationScreen />);
        expect(getByText('This helps us find doctors and delivery partners near you.')).toBeTruthy();
    });

    describe('Pincode input', () => {
        it('renders pincode input', () => {
            const { getByTestId } = render(<LocationScreen />);
            expect(getByTestId('location-pincode')).toBeTruthy();
        });

        it('updates store when pincode is entered', () => {
            const { getByTestId } = render(<LocationScreen />);
            const input = getByTestId('location-pincode');

            fireEvent.changeText(input, '400001');

            const state = useOnboardingStore.getState();
            expect(state.locationInfo.pincode).toBe('400001');
        });

        it('limits pincode to 6 digits', () => {
            const { getByTestId } = render(<LocationScreen />);
            const input = getByTestId('location-pincode');

            fireEvent.changeText(input, '12345678');

            const state = useOnboardingStore.getState();
            expect(state.locationInfo.pincode).toBe('123456');
        });
    });

    describe('State input', () => {
        it('renders state input', () => {
            const { getByTestId } = render(<LocationScreen />);
            expect(getByTestId('location-state')).toBeTruthy();
        });

        it('updates store when state is entered', () => {
            const { getByTestId } = render(<LocationScreen />);
            const input = getByTestId('location-state');

            fireEvent.changeText(input, 'Maharashtra');

            const state = useOnboardingStore.getState();
            expect(state.locationInfo.state).toBe('Maharashtra');
        });
    });

    describe('City input', () => {
        it('renders city input', () => {
            const { getByTestId } = render(<LocationScreen />);
            expect(getByTestId('location-city')).toBeTruthy();
        });

        it('updates store when city is entered', () => {
            const { getByTestId } = render(<LocationScreen />);
            const input = getByTestId('location-city');

            fireEvent.changeText(input, 'Mumbai');

            const state = useOnboardingStore.getState();
            expect(state.locationInfo.city).toBe('Mumbai');
        });
    });

    describe('Telehealth consent', () => {
        it('renders consent checkbox', () => {
            const { getByTestId } = render(<LocationScreen />);
            expect(getByTestId('location-consent-checkbox')).toBeTruthy();
        });

        it('toggles consent when pressed', () => {
            const { getByTestId } = render(<LocationScreen />);

            fireEvent.press(getByTestId('location-consent-checkbox'));

            const state = useOnboardingStore.getState();
            expect(state.locationInfo.telehealthConsent).toBe(true);
        });
    });

    describe('Next button', () => {
        it('renders next button', () => {
            const { getByTestId } = render(<LocationScreen />);
            expect(getByTestId('location-next-button')).toBeTruthy();
        });
    });
});
