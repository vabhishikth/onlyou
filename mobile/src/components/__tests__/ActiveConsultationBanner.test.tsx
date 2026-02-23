/**
 * ActiveConsultationBanner Component Tests
 * TDD: Tests written FIRST before implementation
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ActiveConsultationBanner from '../ActiveConsultationBanner';

// Get mocked router
const mockRouter = require('expo-router').useRouter();

beforeEach(() => {
    jest.clearAllMocks();
});

describe('ActiveConsultationBanner', () => {
    const activeConsultation = {
        id: 'c1',
        vertical: 'HAIR_LOSS' as const,
        status: 'DOCTOR_REVIEWING',
        createdAt: new Date().toISOString(),
    };

    const approvedConsultation = {
        id: 'c2',
        vertical: 'SEXUAL_HEALTH' as const,
        status: 'APPROVED',
        createdAt: new Date().toISOString(),
    };

    const rejectedConsultation = {
        id: 'c3',
        vertical: 'PCOS' as const,
        status: 'REJECTED',
        createdAt: new Date().toISOString(),
    };

    describe('when no active consultations', () => {
        it('returns null when consultations array is empty', () => {
            const { queryByTestId } = render(
                <ActiveConsultationBanner consultations={[]} />
            );
            expect(queryByTestId('active-consultation-banner')).toBeNull();
        });

        it('returns null when all consultations are APPROVED', () => {
            const { queryByTestId } = render(
                <ActiveConsultationBanner consultations={[approvedConsultation]} />
            );
            expect(queryByTestId('active-consultation-banner')).toBeNull();
        });

        it('returns null when all consultations are REJECTED', () => {
            const { queryByTestId } = render(
                <ActiveConsultationBanner consultations={[rejectedConsultation]} />
            );
            expect(queryByTestId('active-consultation-banner')).toBeNull();
        });
    });

    describe('active consultation banner', () => {
        it('renders when there is an active consultation', () => {
            const { getByTestId } = render(
                <ActiveConsultationBanner consultations={[activeConsultation]} />
            );
            expect(getByTestId('active-consultation-banner')).toBeTruthy();
        });

        it('displays "Consultation" title', () => {
            const { getByText } = render(
                <ActiveConsultationBanner consultations={[activeConsultation]} />
            );
            expect(getByText('Consultation')).toBeTruthy();
        });

        it('displays patient-facing status label', () => {
            const { getByText } = render(
                <ActiveConsultationBanner consultations={[activeConsultation]} />
            );
            expect(getByText('A doctor is reviewing your case')).toBeTruthy();
        });

        it('navigates to activity tab when pressed', () => {
            const { getByTestId } = render(
                <ActiveConsultationBanner consultations={[activeConsultation]} />
            );
            fireEvent.press(getByTestId('active-consultation-banner'));
            expect(mockRouter.push).toHaveBeenCalledWith('/(tabs)/activity');
        });

        it('shows stethoscope icon container', () => {
            const { getByTestId } = render(
                <ActiveConsultationBanner consultations={[activeConsultation]} />
            );
            expect(getByTestId('consultation-icon')).toBeTruthy();
        });
    });

    describe('status labels', () => {
        const statusTests = [
            { status: 'PENDING_ASSESSMENT', label: 'Your assessment is being reviewed' },
            { status: 'AI_REVIEWED', label: 'AI review complete, awaiting doctor' },
            { status: 'DOCTOR_REVIEWING', label: 'A doctor is reviewing your case' },
            { status: 'VIDEO_SCHEDULED', label: 'Video consultation scheduled' },
            { status: 'VIDEO_COMPLETED', label: 'Video complete, awaiting prescription' },
            { status: 'AWAITING_LABS', label: 'Lab tests required before prescription' },
            { status: 'NEEDS_INFO', label: 'Doctor needs additional information' },
        ];

        statusTests.forEach(({ status, label }) => {
            it(`displays correct label for ${status}`, () => {
                const consultation = {
                    id: 'c1',
                    vertical: 'HAIR_LOSS' as const,
                    status,
                    createdAt: new Date().toISOString(),
                };
                const { getByText } = render(
                    <ActiveConsultationBanner consultations={[consultation]} />
                );
                expect(getByText(label)).toBeTruthy();
            });
        });
    });

    describe('priority logic', () => {
        it('shows the most recent active consultation', () => {
            const olderConsultation = {
                id: 'c-old',
                vertical: 'HAIR_LOSS' as const,
                status: 'PENDING_ASSESSMENT',
                createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            };
            const newerConsultation = {
                id: 'c-new',
                vertical: 'SEXUAL_HEALTH' as const,
                status: 'VIDEO_SCHEDULED',
                createdAt: new Date().toISOString(),
            };

            const { getByText } = render(
                <ActiveConsultationBanner
                    consultations={[olderConsultation, newerConsultation]}
                />
            );
            // Should show the newer consultation's status
            expect(getByText('Video consultation scheduled')).toBeTruthy();
        });

        it('skips APPROVED and REJECTED to find first active', () => {
            const consultations = [
                approvedConsultation,
                rejectedConsultation,
                activeConsultation,
            ];

            const { getByText } = render(
                <ActiveConsultationBanner consultations={consultations} />
            );
            expect(getByText('A doctor is reviewing your case')).toBeTruthy();
        });
    });
});
