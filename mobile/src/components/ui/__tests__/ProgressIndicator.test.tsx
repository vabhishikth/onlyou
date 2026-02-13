/**
 * ProgressIndicator Tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ProgressIndicator } from '../ProgressIndicator';

describe('ProgressIndicator', () => {
    it('renders correct number of dots', () => {
        const { getByTestId } = render(
            <ProgressIndicator totalSteps={5} currentStep={0} testID="progress" />
        );
        const container = getByTestId('progress');
        // Should have 5 child dots
        expect(container.children.length).toBe(5);
    });

    it('renders with first step active', () => {
        const { getByTestId } = render(
            <ProgressIndicator totalSteps={4} currentStep={0} testID="progress" />
        );
        expect(getByTestId('progress')).toBeTruthy();
    });

    it('renders with middle step active', () => {
        const { getByTestId } = render(
            <ProgressIndicator totalSteps={4} currentStep={2} testID="progress" />
        );
        expect(getByTestId('progress')).toBeTruthy();
    });

    it('renders with last step active', () => {
        const { getByTestId } = render(
            <ProgressIndicator totalSteps={4} currentStep={3} testID="progress" />
        );
        expect(getByTestId('progress')).toBeTruthy();
    });

    it('renders single step', () => {
        const { getByTestId } = render(
            <ProgressIndicator totalSteps={1} currentStep={0} testID="progress" />
        );
        const container = getByTestId('progress');
        expect(container.children.length).toBe(1);
    });
});
