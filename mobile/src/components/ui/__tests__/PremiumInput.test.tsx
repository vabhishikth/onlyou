/**
 * PremiumInput Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PremiumInput } from '../PremiumInput';

describe('PremiumInput', () => {
    const mockOnChangeText = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders with label', () => {
        const { getByText } = render(
            <PremiumInput
                label="Full name"
                value=""
                onChangeText={mockOnChangeText}
            />
        );
        expect(getByText('Full name')).toBeTruthy();
    });

    it('displays the current value', () => {
        const { getByDisplayValue } = render(
            <PremiumInput
                label="Full name"
                value="John Doe"
                onChangeText={mockOnChangeText}
            />
        );
        expect(getByDisplayValue('John Doe')).toBeTruthy();
    });

    it('calls onChangeText when text changes', () => {
        const { getByTestId } = render(
            <PremiumInput
                label="Full name"
                value=""
                onChangeText={mockOnChangeText}
                testID="input"
            />
        );
        fireEvent.changeText(getByTestId('input'), 'Jane Doe');
        expect(mockOnChangeText).toHaveBeenCalledWith('Jane Doe');
    });

    it('displays error message when provided', () => {
        const { getByText } = render(
            <PremiumInput
                label="Email"
                value=""
                onChangeText={mockOnChangeText}
                error="Invalid email address"
            />
        );
        expect(getByText('Invalid email address')).toBeTruthy();
    });

    it('accepts keyboard type prop', () => {
        const { getByTestId } = render(
            <PremiumInput
                label="Phone"
                value=""
                onChangeText={mockOnChangeText}
                keyboardType="phone-pad"
                testID="input"
            />
        );
        expect(getByTestId('input').props.keyboardType).toBe('phone-pad');
    });

    it('accepts secureTextEntry for password fields', () => {
        const { getByTestId } = render(
            <PremiumInput
                label="Password"
                value=""
                onChangeText={mockOnChangeText}
                secureTextEntry
                testID="input"
            />
        );
        expect(getByTestId('input').props.secureTextEntry).toBe(true);
    });
});
