/**
 * SelectionCard Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SelectionCard } from '../SelectionCard';
import * as Haptics from 'expo-haptics';

describe('SelectionCard', () => {
    const mockOnPress = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders with title', () => {
        const { getByText } = render(
            <SelectionCard
                title="Hair Loss"
                onPress={mockOnPress}
                selected={false}
            />
        );
        expect(getByText('Hair Loss')).toBeTruthy();
    });

    it('renders with title and subtitle', () => {
        const { getByText } = render(
            <SelectionCard
                title="Hair Loss"
                subtitle="Regrow thicker hair"
                onPress={mockOnPress}
                selected={false}
            />
        );
        expect(getByText('Hair Loss')).toBeTruthy();
        expect(getByText('Regrow thicker hair')).toBeTruthy();
    });

    it('renders with icon', () => {
        const TestIcon = () => <Text>Icon</Text>;
        const { getByText } = render(
            <SelectionCard
                title="Hair Loss"
                icon={<TestIcon />}
                onPress={mockOnPress}
                selected={false}
            />
        );
        expect(getByText('Icon')).toBeTruthy();
    });

    it('calls onPress when pressed', () => {
        const { getByText } = render(
            <SelectionCard
                title="Hair Loss"
                onPress={mockOnPress}
                selected={false}
            />
        );
        fireEvent.press(getByText('Hair Loss'));
        expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('triggers haptic feedback when pressed', () => {
        const { getByText } = render(
            <SelectionCard
                title="Hair Loss"
                onPress={mockOnPress}
                selected={false}
            />
        );
        fireEvent.press(getByText('Hair Loss'));
        expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('does not call onPress when disabled', () => {
        const { getByText } = render(
            <SelectionCard
                title="Hair Loss"
                onPress={mockOnPress}
                selected={false}
                disabled
            />
        );
        fireEvent.press(getByText('Hair Loss'));
        expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('does not trigger haptic when disabled', () => {
        const { getByText } = render(
            <SelectionCard
                title="Hair Loss"
                onPress={mockOnPress}
                selected={false}
                disabled
            />
        );
        fireEvent.press(getByText('Hair Loss'));
        expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });

    describe('Selection state', () => {
        it('can be selected', () => {
            const { getByTestId } = render(
                <SelectionCard
                    title="Hair Loss"
                    onPress={mockOnPress}
                    selected={true}
                    testID="card"
                />
            );
            // Component renders without error when selected
            expect(getByTestId('card')).toBeTruthy();
        });

        it('can be unselected', () => {
            const { getByTestId } = render(
                <SelectionCard
                    title="Hair Loss"
                    onPress={mockOnPress}
                    selected={false}
                    testID="card"
                />
            );
            expect(getByTestId('card')).toBeTruthy();
        });
    });
});
