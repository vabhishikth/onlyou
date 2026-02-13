/**
 * Basic Info Screen Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BasicInfoScreen from '../basic-info';
import { useOnboardingStore } from '@/store/onboardingStore';

// Get mocked router
const mockRouter = require('expo-router').useRouter();

// Reset store before each test
beforeEach(() => {
    jest.clearAllMocks();
    useOnboardingStore.getState().reset();
});

describe('BasicInfoScreen', () => {
    it('renders the screen', () => {
        const { getByTestId } = render(<BasicInfoScreen />);
        expect(getByTestId('basic-info-screen')).toBeTruthy();
    });

    it('displays the heading', () => {
        const { getByText } = render(<BasicInfoScreen />);
        expect(getByText('Tell us about yourself')).toBeTruthy();
    });

    describe('Full name input', () => {
        it('renders full name input', () => {
            const { getByTestId } = render(<BasicInfoScreen />);
            expect(getByTestId('basic-info-fullname')).toBeTruthy();
        });

        it('updates store when name is entered', () => {
            const { getByTestId } = render(<BasicInfoScreen />);
            const input = getByTestId('basic-info-fullname');

            fireEvent.changeText(input, 'John Doe');

            const state = useOnboardingStore.getState();
            expect(state.basicInfo.fullName).toBe('John Doe');
        });
    });

    describe('Date of birth input', () => {
        it('renders date of birth input', () => {
            const { getByTestId } = render(<BasicInfoScreen />);
            expect(getByTestId('basic-info-dob')).toBeTruthy();
        });

        it('formats date with dashes as user types', () => {
            const { getByTestId } = render(<BasicInfoScreen />);
            const input = getByTestId('basic-info-dob');

            fireEvent.changeText(input, '01011990');

            const state = useOnboardingStore.getState();
            expect(state.basicInfo.dateOfBirth).toBe('01-01-1990');
        });
    });

    describe('Gender selection', () => {
        it('renders male chip', () => {
            const { getByTestId } = render(<BasicInfoScreen />);
            expect(getByTestId('basic-info-gender-male')).toBeTruthy();
        });

        it('renders female chip', () => {
            const { getByTestId } = render(<BasicInfoScreen />);
            expect(getByTestId('basic-info-gender-female')).toBeTruthy();
        });

        it('renders other chip', () => {
            const { getByTestId } = render(<BasicInfoScreen />);
            expect(getByTestId('basic-info-gender-other')).toBeTruthy();
        });

        it('selects gender when chip is pressed', () => {
            const { getByTestId } = render(<BasicInfoScreen />);

            fireEvent.press(getByTestId('basic-info-gender-male'));

            const state = useOnboardingStore.getState();
            expect(state.basicInfo.gender).toBe('MALE');
        });

        it('changes selection when different chip is pressed', () => {
            const { getByTestId } = render(<BasicInfoScreen />);

            fireEvent.press(getByTestId('basic-info-gender-male'));
            fireEvent.press(getByTestId('basic-info-gender-female'));

            const state = useOnboardingStore.getState();
            expect(state.basicInfo.gender).toBe('FEMALE');
        });
    });

    describe('Next button', () => {
        it('renders next button', () => {
            const { getByTestId } = render(<BasicInfoScreen />);
            expect(getByTestId('basic-info-next-button')).toBeTruthy();
        });
    });
});
