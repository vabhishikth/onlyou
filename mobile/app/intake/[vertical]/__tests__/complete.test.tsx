/**
 * Complete Screen Tests
 * Verifies post-intake completion screen and navigation
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: mockReplace,
        back: jest.fn(),
    }),
    useSegments: () => [],
    useLocalSearchParams: () => ({
        vertical: 'hair-loss',
        consultationId: 'consult-123',
    }),
    Slot: ({ children }: any) => children,
    Stack: { Screen: () => null },
    Link: ({ children }: any) => children,
}));

import CompleteScreen from '../complete';

beforeEach(() => {
    jest.clearAllMocks();
});

describe('CompleteScreen', () => {
    it('renders success message', () => {
        const { getByText } = render(<CompleteScreen />);
        expect(getByText('Assessment Submitted!')).toBeTruthy();
    });

    it('shows vertical name in subtitle', () => {
        const { getByText } = render(<CompleteScreen />);
        expect(getByText(/Hair Loss/)).toBeTruthy();
    });

    it('shows what happens next timeline', () => {
        const { getByText } = render(<CompleteScreen />);
        expect(getByText('Assessment received')).toBeTruthy();
        expect(getByText('Doctor review')).toBeTruthy();
        expect(getByText('Treatment plan ready')).toBeTruthy();
    });

    it('navigates to activity tab when Track Progress pressed', () => {
        const { getByText } = render(<CompleteScreen />);
        fireEvent.press(getByText('Track Progress'));
        expect(mockReplace).toHaveBeenCalledWith('/(tabs)/activity');
    });

    it('navigates to home when Go to Home pressed', () => {
        const { getByText } = render(<CompleteScreen />);
        fireEvent.press(getByText('Go to Home'));
        expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
});
