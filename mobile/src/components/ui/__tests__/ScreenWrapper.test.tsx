/**
 * ScreenWrapper Tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { ScreenWrapper } from '../ScreenWrapper';

describe('ScreenWrapper', () => {
    it('renders children', () => {
        const { getByText } = render(
            <ScreenWrapper>
                <Text>Content</Text>
            </ScreenWrapper>
        );
        expect(getByText('Content')).toBeTruthy();
    });

    it('renders footer when provided', () => {
        const { getByText } = render(
            <ScreenWrapper footer={<Text>Footer Button</Text>}>
                <Text>Content</Text>
            </ScreenWrapper>
        );
        expect(getByText('Footer Button')).toBeTruthy();
    });

    it('renders without footer', () => {
        const { getByText, queryByText } = render(
            <ScreenWrapper>
                <Text>Content</Text>
            </ScreenWrapper>
        );
        expect(getByText('Content')).toBeTruthy();
        expect(queryByText('Footer Button')).toBeNull();
    });

    it('renders with testID', () => {
        const { getByTestId } = render(
            <ScreenWrapper testID="screen-wrapper">
                <Text>Content</Text>
            </ScreenWrapper>
        );
        expect(getByTestId('screen-wrapper')).toBeTruthy();
    });

    it('renders scrollable by default', () => {
        const { getByTestId } = render(
            <ScreenWrapper testID="screen">
                <Text>Content</Text>
            </ScreenWrapper>
        );
        expect(getByTestId('screen')).toBeTruthy();
    });

    it('renders non-scrollable when specified', () => {
        const { getByTestId } = render(
            <ScreenWrapper scrollable={false} testID="screen">
                <Text>Content</Text>
            </ScreenWrapper>
        );
        expect(getByTestId('screen')).toBeTruthy();
    });
});
