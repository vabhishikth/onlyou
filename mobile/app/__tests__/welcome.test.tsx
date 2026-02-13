/**
 * Welcome Screen Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import WelcomeScreen from '../welcome';

// Get mocked router
const mockRouter = require('expo-router').useRouter();

describe('WelcomeScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the welcome screen', () => {
        const { getByTestId } = render(<WelcomeScreen />);
        expect(getByTestId('welcome-screen')).toBeTruthy();
    });

    it('renders the onlyou logo', () => {
        const { getByTestId } = render(<WelcomeScreen />);
        expect(getByTestId('welcome-logo')).toBeTruthy();
    });

    it('displays hero text', () => {
        const { getByText } = render(<WelcomeScreen />);
        expect(getByText(/Get your/)).toBeTruthy();
        expect(getByText('personalized')).toBeTruthy();
    });

    it('displays subtitle', () => {
        const { getByText } = render(<WelcomeScreen />);
        expect(getByText('Your free online visit starts here.')).toBeTruthy();
    });

    describe('Category cards', () => {
        it('renders sexual health card', () => {
            const { getByTestId } = render(<WelcomeScreen />);
            expect(getByTestId('category-card-sexual-health')).toBeTruthy();
        });

        it('renders hair loss card', () => {
            const { getByTestId } = render(<WelcomeScreen />);
            expect(getByTestId('category-card-hair-loss')).toBeTruthy();
        });

        it('renders weight management card', () => {
            const { getByTestId } = render(<WelcomeScreen />);
            expect(getByTestId('category-card-weight-management')).toBeTruthy();
        });

        it('renders PCOS card', () => {
            const { getByTestId } = render(<WelcomeScreen />);
            expect(getByTestId('category-card-pcos')).toBeTruthy();
        });

        it('navigates to intake when sexual health card is pressed', () => {
            const { getByTestId } = render(<WelcomeScreen />);
            fireEvent.press(getByTestId('category-card-sexual-health'));
            expect(mockRouter.push).toHaveBeenCalledWith('/intake/sexual-health');
        });

        it('navigates to intake when hair loss card is pressed', () => {
            const { getByTestId } = render(<WelcomeScreen />);
            fireEvent.press(getByTestId('category-card-hair-loss'));
            expect(mockRouter.push).toHaveBeenCalledWith('/intake/hair-loss');
        });
    });

    describe('Buttons', () => {
        it('renders Get started button', () => {
            const { getByTestId } = render(<WelcomeScreen />);
            expect(getByTestId('get-started-button')).toBeTruthy();
        });

        it('renders Log in button', () => {
            const { getByTestId } = render(<WelcomeScreen />);
            expect(getByTestId('login-button')).toBeTruthy();
        });

        it('navigates to auth when Get started is pressed', () => {
            const { getByTestId } = render(<WelcomeScreen />);
            fireEvent.press(getByTestId('get-started-button'));
            expect(mockRouter.push).toHaveBeenCalledWith('/(auth)/phone');
        });

        it('navigates to auth when Log in is pressed', () => {
            const { getByTestId } = render(<WelcomeScreen />);
            fireEvent.press(getByTestId('login-button'));
            expect(mockRouter.push).toHaveBeenCalledWith('/(auth)/phone');
        });
    });

    describe('Footer', () => {
        it('displays privacy text', () => {
            const { getByText } = render(<WelcomeScreen />);
            expect(getByText('Your privacy choices')).toBeTruthy();
        });

        it('displays free shipping text', () => {
            const { getByText } = render(<WelcomeScreen />);
            expect(getByText('Free shipping for all prescriptions')).toBeTruthy();
        });
    });
});
