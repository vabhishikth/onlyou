/**
 * RecordingConsentModal Component Tests
 * Phase 14 Chunk 5: Recording consent modal
 * Spec: Phase 13 — Recording consent required before joining video session
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockUseMutation = require('@apollo/client').useMutation;

import RecordingConsentModal from '../RecordingConsentModal';

beforeEach(() => {
    jest.clearAllMocks();
    mockUseMutation.mockReturnValue([
        jest.fn().mockResolvedValue({
            data: { giveRecordingConsent: { id: 'vs-1', recordingConsentGiven: true } },
        }),
        { loading: false },
    ]);
});

describe('RecordingConsentModal', () => {
    const defaultProps = {
        visible: true,
        onClose: jest.fn(),
        onConsent: jest.fn(),
        videoSessionId: 'vs-1',
    };

    describe('Initial render', () => {
        it('renders the modal when visible', () => {
            const { getByText } = render(<RecordingConsentModal {...defaultProps} />);
            expect(getByText('Recording Consent')).toBeTruthy();
        });

        it('displays legal consent text about TPG 2020', () => {
            const { getByText } = render(<RecordingConsentModal {...defaultProps} />);
            expect(getByText(/recorded for quality/i)).toBeTruthy();
        });

        it('shows a consent checkbox that is unchecked by default', () => {
            const { getByTestId } = render(<RecordingConsentModal {...defaultProps} />);
            const checkbox = getByTestId('consent-checkbox');
            expect(checkbox).toBeTruthy();
        });

        it('shows "I Consent" button disabled initially', () => {
            const { getByText } = render(<RecordingConsentModal {...defaultProps} />);
            const button = getByText('I Consent');
            expect(button).toBeTruthy();
        });

        it('shows Cancel button', () => {
            const { getByText } = render(<RecordingConsentModal {...defaultProps} />);
            expect(getByText('Cancel')).toBeTruthy();
        });

        it('does not show content when not visible', () => {
            const { queryByText } = render(
                <RecordingConsentModal {...defaultProps} visible={false} />,
            );
            expect(queryByText('Recording Consent')).toBeNull();
        });
    });

    describe('Consent flow', () => {
        it('enables "I Consent" button after checking the checkbox', () => {
            const { getByTestId, getByText } = render(
                <RecordingConsentModal {...defaultProps} />,
            );

            fireEvent.press(getByTestId('consent-checkbox'));
            const button = getByText('I Consent');
            expect(button).toBeTruthy();
        });

        it('calls giveRecordingConsent mutation when "I Consent" is pressed', () => {
            const mockMutate = jest.fn().mockResolvedValue({
                data: { giveRecordingConsent: { id: 'vs-1', recordingConsentGiven: true } },
            });
            mockUseMutation.mockReturnValue([mockMutate, { loading: false }]);

            const { getByTestId, getByText } = render(
                <RecordingConsentModal {...defaultProps} />,
            );

            // Check checkbox first
            fireEvent.press(getByTestId('consent-checkbox'));
            // Then press consent button
            fireEvent.press(getByText('I Consent'));

            expect(mockMutate).toHaveBeenCalled();
        });

        it('calls onClose when Cancel is pressed', () => {
            const onClose = jest.fn();
            const { getByText } = render(
                <RecordingConsentModal {...defaultProps} onClose={onClose} />,
            );

            fireEvent.press(getByText('Cancel'));
            expect(onClose).toHaveBeenCalled();
        });
    });
});
