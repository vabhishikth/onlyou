/**
 * BackButton Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BackButton } from '../BackButton';
import * as Haptics from 'expo-haptics';

describe('BackButton', () => {
    const mockOnPress = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly', () => {
        const { getByTestId } = render(
            <BackButton onPress={mockOnPress} testID="back-button" />
        );
        expect(getByTestId('back-button')).toBeTruthy();
    });

    it('calls onPress when pressed', () => {
        const { getByTestId } = render(
            <BackButton onPress={mockOnPress} testID="back-button" />
        );
        fireEvent.press(getByTestId('back-button'));
        expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('triggers haptic feedback when pressed', () => {
        const { getByTestId } = render(
            <BackButton onPress={mockOnPress} testID="back-button" />
        );
        fireEvent.press(getByTestId('back-button'));
        expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });
});
