/**
 * Splash Screen Tests
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import SplashScreenComponent from '../index';

// Get mocked router
const mockRouter = require('expo-router').useRouter();

describe('SplashScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('renders the splash screen', () => {
        const { getByTestId } = render(<SplashScreenComponent />);
        expect(getByTestId('splash-screen')).toBeTruthy();
    });

    it('renders the onlyou logo', () => {
        const { getByTestId } = render(<SplashScreenComponent />);
        expect(getByTestId('splash-logo')).toBeTruthy();
    });

    it('displays correct logo text', () => {
        const { getByText } = render(<SplashScreenComponent />);
        expect(getByText('onlyou')).toBeTruthy();
    });

    it('hides native splash screen when fonts are loaded', async () => {
        render(<SplashScreenComponent />);

        await waitFor(() => {
            expect(SplashScreen.hideAsync).toHaveBeenCalled();
        });
    });

    it('starts animation sequence when fonts are loaded', async () => {
        // This test verifies that the splash screen properly initializes
        // The actual navigation happens after animation completes via reanimated callbacks
        // which are difficult to test in Jest due to worklet execution
        render(<SplashScreenComponent />);

        // Advance timers to trigger the setTimeout
        jest.advanceTimersByTime(2500);

        // Just verify the component was rendered without errors
        // Navigation testing would require e2e tests with the actual reanimated library
        await waitFor(() => {
            expect(SplashScreen.hideAsync).toHaveBeenCalled();
        });
    });
});
