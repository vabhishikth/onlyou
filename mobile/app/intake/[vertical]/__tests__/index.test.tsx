/**
 * Treatment Detail Screen Tests
 * PR 5: Treatment + Questionnaire + Photo Restyle
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Must be named 'mock' prefix for Jest hoisting
let mockVertical = 'hair-loss';
const mockPush = jest.fn();
const mockBack = jest.fn();

// Override the expo-router mock to use our variable
jest.mock('expo-router', () => ({
    useRouter: () => ({
        push: mockPush,
        replace: jest.fn(),
        back: mockBack,
    }),
    useSegments: () => [],
    useLocalSearchParams: () => ({ vertical: mockVertical }),
    Slot: ({ children }: { children: React.ReactNode }) => children,
    Stack: {
        Screen: () => null,
    },
    Link: ({ children }: { children: React.ReactNode }) => children,
}));

// Import screen after mock
import IntakeIntroScreen from '../index';

beforeEach(() => {
    jest.clearAllMocks();
    mockVertical = 'hair-loss';
});

describe('IntakeIntroScreen', () => {
    describe('Screen structure', () => {
        it('renders the screen with testID', () => {
            const { getByTestId } = render(<IntakeIntroScreen />);
            expect(getByTestId('intake-intro-screen')).toBeTruthy();
        });

        it('renders back button', () => {
            const { getByTestId } = render(<IntakeIntroScreen />);
            expect(getByTestId('back-button')).toBeTruthy();
        });

        it('navigates back when back button is pressed', () => {
            const { getByTestId } = render(<IntakeIntroScreen />);
            fireEvent.press(getByTestId('back-button'));
            expect(mockBack).toHaveBeenCalled();
        });
    });

    describe('Hair Loss vertical', () => {
        beforeEach(() => {
            mockVertical = 'hair-loss';
        });

        it('displays Hair Loss Treatment title', () => {
            const { getByText } = render(<IntakeIntroScreen />);
            expect(getByText('Hair Loss Treatment')).toBeTruthy();
        });

        it('displays subtitle with "clinically proven" (not FDA-approved)', () => {
            const { getAllByText } = render(<IntakeIntroScreen />);
            // Should appear in subtitle and/or plan items
            expect(getAllByText(/clinically proven/i).length).toBeGreaterThan(0);
        });

        it('renders vertical icon with correct testID', () => {
            const { getByTestId } = render(<IntakeIntroScreen />);
            expect(getByTestId('vertical-icon')).toBeTruthy();
        });

        it('displays What to expect section', () => {
            const { getByText } = render(<IntakeIntroScreen />);
            expect(getByText('What to expect')).toBeTruthy();
        });

        it('displays check items with green circles', () => {
            const { getByTestId } = render(<IntakeIntroScreen />);
            expect(getByTestId('expect-item-0')).toBeTruthy();
            expect(getByTestId('expect-item-1')).toBeTruthy();
            expect(getByTestId('expect-item-2')).toBeTruthy();
        });

        it('displays Your plan includes section', () => {
            const { getByText } = render(<IntakeIntroScreen />);
            expect(getByText('Your plan includes')).toBeTruthy();
        });

        it('displays plan items with accent dot bullets', () => {
            const { getByTestId } = render(<IntakeIntroScreen />);
            expect(getByTestId('plan-item-0')).toBeTruthy();
        });

        it('displays questionnaire card', () => {
            const { getByTestId } = render(<IntakeIntroScreen />);
            expect(getByTestId('questionnaire-card')).toBeTruthy();
        });

        it('displays Clock icon in questionnaire card', () => {
            const { getByTestId } = render(<IntakeIntroScreen />);
            expect(getByTestId('clock-icon')).toBeTruthy();
        });

        it('displays "Takes about 5 minutes" in questionnaire card', () => {
            const { getByText } = render(<IntakeIntroScreen />);
            expect(getByText(/takes about 5 minutes/i)).toBeTruthy();
        });

        it('displays Start Questionnaire CTA button', () => {
            const { getByTestId } = render(<IntakeIntroScreen />);
            expect(getByTestId('start-questionnaire-button')).toBeTruthy();
        });

        it('navigates to questions when CTA is pressed', () => {
            const { getByTestId } = render(<IntakeIntroScreen />);
            fireEvent.press(getByTestId('start-questionnaire-button'));
            expect(mockPush).toHaveBeenCalledWith('/intake/hair-loss/questions');
        });
    });

    describe('Sexual Health vertical', () => {
        beforeEach(() => {
            mockVertical = 'sexual-health';
        });

        it('displays Sexual Health Treatment title', () => {
            const { getByText } = render(<IntakeIntroScreen />);
            expect(getByText('Sexual Health Treatment')).toBeTruthy();
        });

        it('renders vertical icon', () => {
            const { getByTestId } = render(<IntakeIntroScreen />);
            expect(getByTestId('vertical-icon')).toBeTruthy();
        });

        it('navigates to questions when CTA is pressed', () => {
            const { getByTestId } = render(<IntakeIntroScreen />);
            fireEvent.press(getByTestId('start-questionnaire-button'));
            expect(mockPush).toHaveBeenCalledWith('/intake/sexual-health/questions');
        });
    });

    describe('PCOS vertical', () => {
        beforeEach(() => {
            mockVertical = 'pcos';
        });

        it('displays PCOS Treatment title', () => {
            const { getByText } = render(<IntakeIntroScreen />);
            expect(getByText('PCOS Treatment')).toBeTruthy();
        });

        it('renders vertical icon', () => {
            const { getByTestId } = render(<IntakeIntroScreen />);
            expect(getByTestId('vertical-icon')).toBeTruthy();
        });

        it('navigates to questions when CTA is pressed', () => {
            const { getByTestId } = render(<IntakeIntroScreen />);
            fireEvent.press(getByTestId('start-questionnaire-button'));
            expect(mockPush).toHaveBeenCalledWith('/intake/pcos/questions');
        });
    });

    describe('Weight Management vertical', () => {
        beforeEach(() => {
            mockVertical = 'weight-management';
        });

        it('displays Weight Management Treatment title', () => {
            const { getByText } = render(<IntakeIntroScreen />);
            expect(getByText('Weight Management Treatment')).toBeTruthy();
        });

        it('renders vertical icon', () => {
            const { getByTestId } = render(<IntakeIntroScreen />);
            expect(getByTestId('vertical-icon')).toBeTruthy();
        });

        it('navigates to questions when CTA is pressed', () => {
            const { getByTestId } = render(<IntakeIntroScreen />);
            fireEvent.press(getByTestId('start-questionnaire-button'));
            expect(mockPush).toHaveBeenCalledWith('/intake/weight-management/questions');
        });
    });

    describe('Sticky CTA with gradient', () => {
        it('renders sticky CTA container', () => {
            const { getByTestId } = render(<IntakeIntroScreen />);
            expect(getByTestId('sticky-cta-container')).toBeTruthy();
        });

        it('renders gradient fade above CTA', () => {
            const { getByTestId } = render(<IntakeIntroScreen />);
            expect(getByTestId('cta-gradient')).toBeTruthy();
        });
    });
});
