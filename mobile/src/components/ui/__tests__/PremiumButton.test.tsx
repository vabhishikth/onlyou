/**
 * PremiumButton Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PremiumButton } from '../PremiumButton';
import * as Haptics from 'expo-haptics';

describe('PremiumButton', () => {
    const mockOnPress = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Primary variant', () => {
        it('renders with correct title', () => {
            const { getByText } = render(
                <PremiumButton title="Get Started" onPress={mockOnPress} />
            );
            expect(getByText('Get Started')).toBeTruthy();
        });

        it('calls onPress when pressed', () => {
            const { getByText } = render(
                <PremiumButton title="Get Started" onPress={mockOnPress} />
            );
            fireEvent.press(getByText('Get Started'));
            expect(mockOnPress).toHaveBeenCalledTimes(1);
        });

        it('triggers haptic feedback when pressed', () => {
            const { getByText } = render(
                <PremiumButton title="Get Started" onPress={mockOnPress} />
            );
            fireEvent.press(getByText('Get Started'));
            expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
        });

        it('does not call onPress when disabled', () => {
            const { getByText } = render(
                <PremiumButton title="Get Started" onPress={mockOnPress} disabled />
            );
            fireEvent.press(getByText('Get Started'));
            expect(mockOnPress).not.toHaveBeenCalled();
        });

        it('does not trigger haptic when disabled', () => {
            const { getByText } = render(
                <PremiumButton title="Get Started" onPress={mockOnPress} disabled />
            );
            fireEvent.press(getByText('Get Started'));
            expect(Haptics.impactAsync).not.toHaveBeenCalled();
        });
    });

    describe('Secondary variant', () => {
        it('renders secondary button', () => {
            const { getByText } = render(
                <PremiumButton title="Log in" onPress={mockOnPress} variant="secondary" />
            );
            expect(getByText('Log in')).toBeTruthy();
        });
    });

    describe('Ghost variant', () => {
        it('renders ghost button', () => {
            const { getByText } = render(
                <PremiumButton title="Skip" onPress={mockOnPress} variant="ghost" />
            );
            expect(getByText('Skip')).toBeTruthy();
        });
    });

    describe('Loading state', () => {
        it('shows loading indicator when loading', () => {
            const { queryByText } = render(
                <PremiumButton
                    title="Get Started"
                    onPress={mockOnPress}
                    loading
                    testID="button"
                />
            );
            expect(queryByText('Get Started')).toBeNull();
        });

        it('does not call onPress when loading', () => {
            const { getByTestId } = render(
                <PremiumButton
                    title="Get Started"
                    onPress={mockOnPress}
                    loading
                    testID="button"
                />
            );
            fireEvent.press(getByTestId('button'));
            expect(mockOnPress).not.toHaveBeenCalled();
        });
    });

    describe('Haptic feedback', () => {
        it('can disable haptic feedback', () => {
            const { getByText } = render(
                <PremiumButton
                    title="Get Started"
                    onPress={mockOnPress}
                    hapticFeedback={false}
                />
            );
            fireEvent.press(getByText('Get Started'));
            expect(Haptics.impactAsync).not.toHaveBeenCalled();
        });
    });
});
