import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConditionSpecificPanel, QuickActions } from '../condition-panels';

// Spec: master spec Section 5 — Condition-Specific Dashboard Panels

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('ConditionSpecificPanel', () => {
    describe('HairLossPanel Q-mapping', () => {
        it('should display Q7 as Norwood Scale pattern (not Q3)', () => {
            const responses = {
                Q3: 'Receding hairline',       // primary concern — should NOT appear under Pattern
                Q7: 'Type III',                  // Norwood scale — SHOULD appear under Pattern
            };

            render(
                <ConditionSpecificPanel
                    vertical="HAIR_LOSS"
                    responses={responses}
                />
            );

            // Pattern should show Q7 (Norwood), not Q3 (primary concern)
            expect(screen.getByText('Pattern (Norwood Scale)')).toBeDefined();
            expect(screen.getByText('Type III')).toBeDefined();
        });

        it('should display Q8 as Family History (not Q5)', () => {
            const responses = {
                Q5: 'Rapid — significant change recently',  // progression — should NOT appear under Family History
                Q8: 'Yes, father side',                       // family history — SHOULD appear
            };

            render(
                <ConditionSpecificPanel
                    vertical="HAIR_LOSS"
                    responses={responses}
                />
            );

            // Family History should show Q8, not Q5
            expect(screen.getByText('Family History')).toBeDefined();
            expect(screen.getByText('Yes, father side')).toBeDefined();
        });

        it('should not confuse Q3 with Norwood pattern or Q5 with family history', () => {
            // This test ensures that when BOTH old and new Q-keys are present,
            // only the correct ones are displayed in the right places
            const responses = {
                Q3: 'Receding hairline',                      // primary concern (NOT pattern)
                Q5: 'Rapid — significant change recently',    // progression (NOT family history)
                Q7: 'Type IV',                                 // Norwood scale (pattern)
                Q8: 'No family history',                       // family history
                Q4: 'Less than 6 months',                      // onset
            };

            render(
                <ConditionSpecificPanel
                    vertical="HAIR_LOSS"
                    responses={responses}
                />
            );

            // Pattern should be Type IV (Q7), not "Receding hairline" (Q3)
            expect(screen.getByText('Type IV')).toBeDefined();
            // Family history should be "No family history" (Q8), not Q5
            expect(screen.getByText('No family history')).toBeDefined();
            // Onset should be Q4
            expect(screen.getByText('Less than 6 months')).toBeDefined();
        });

        it('should show Norwood severity badge for known patterns', () => {
            const responses = {
                Q7: 'Type V',
            };

            render(
                <ConditionSpecificPanel
                    vertical="HAIR_LOSS"
                    responses={responses}
                />
            );

            expect(screen.getByText('Type V')).toBeDefined();
            // Type V is "severe" severity
            expect(screen.getByText(/Severe/i)).toBeDefined();
        });

        it('should display previous treatments from Q17', () => {
            const responses = {
                Q17: ['Minoxidil', 'Finasteride'],
            };

            render(
                <ConditionSpecificPanel
                    vertical="HAIR_LOSS"
                    responses={responses}
                />
            );

            expect(screen.getByText('Previous Treatments')).toBeDefined();
            expect(screen.getByText('Minoxidil')).toBeDefined();
            expect(screen.getByText('Finasteride')).toBeDefined();
        });

        it('should show finasteride side effects warning', () => {
            const responses = {
                Q17: ['Finasteride'],
                Q19: ['Sexual side effects'],
            };

            render(
                <ConditionSpecificPanel
                    vertical="HAIR_LOSS"
                    responses={responses}
                />
            );

            expect(screen.getByText('Previous Finasteride Side Effects')).toBeDefined();
        });
    });

    describe('vertical routing', () => {
        it('should render HairLossPanel for HAIR_LOSS vertical', () => {
            render(
                <ConditionSpecificPanel
                    vertical="HAIR_LOSS"
                    responses={{ Q7: 'Type II' }}
                />
            );
            expect(screen.getByText('Hair Loss Assessment')).toBeDefined();
        });

        it('should render SexualHealthPanel for SEXUAL_HEALTH vertical', () => {
            render(
                <ConditionSpecificPanel
                    vertical="SEXUAL_HEALTH"
                    responses={{ Q3: '6 months' }}
                />
            );
            expect(screen.getByText('Sexual Health Assessment')).toBeDefined();
        });

        it('should render WeightPanel for WEIGHT_MANAGEMENT vertical', () => {
            render(
                <ConditionSpecificPanel
                    vertical="WEIGHT_MANAGEMENT"
                    responses={{ Q3: 85 }}
                />
            );
            expect(screen.getByText('Weight Assessment')).toBeDefined();
        });

        it('should render PCOSPanel for PCOS vertical', () => {
            render(
                <ConditionSpecificPanel
                    vertical="PCOS"
                    responses={{ Q4: 'Irregular' }}
                />
            );
            expect(screen.getByText('PCOS Assessment')).toBeDefined();
        });

        it('should return null for unknown vertical', () => {
            const { container } = render(
                <ConditionSpecificPanel
                    vertical={'UNKNOWN' as any}
                    responses={{}}
                />
            );
            expect(container.innerHTML).toBe('');
        });
    });
});

describe('QuickActions', () => {
    it('should show Request Video Call button when DOCTOR_REVIEWING and onScheduleVideo provided', () => {
        const onScheduleVideo = jest.fn();

        render(
            <QuickActions
                consultationId="test-123"
                vertical="HAIR_LOSS"
                status="DOCTOR_REVIEWING"
                onScheduleVideo={onScheduleVideo}
            />
        );

        expect(screen.getByText('Request Video Call')).toBeDefined();
    });

    it('should call onScheduleVideo when Request Video Call is clicked', () => {
        const onScheduleVideo = jest.fn();

        render(
            <QuickActions
                consultationId="test-123"
                vertical="HAIR_LOSS"
                status="DOCTOR_REVIEWING"
                onScheduleVideo={onScheduleVideo}
            />
        );

        fireEvent.click(screen.getByText('Request Video Call'));
        expect(onScheduleVideo).toHaveBeenCalledTimes(1);
    });

    it('should not show Request Video Call when onScheduleVideo is not provided', () => {
        render(
            <QuickActions
                consultationId="test-123"
                vertical="HAIR_LOSS"
                status="DOCTOR_REVIEWING"
            />
        );

        expect(screen.queryByText('Request Video Call')).toBeNull();
    });

    it('should show Create Prescription and Order Blood Work when DOCTOR_REVIEWING', () => {
        render(
            <QuickActions
                consultationId="test-123"
                vertical="HAIR_LOSS"
                status="DOCTOR_REVIEWING"
            />
        );

        expect(screen.getByText('Create Prescription')).toBeDefined();
        expect(screen.getByText('Order Blood Work')).toBeDefined();
    });

    it('should not show any actions when status is not DOCTOR_REVIEWING', () => {
        const { container } = render(
            <QuickActions
                consultationId="test-123"
                vertical="HAIR_LOSS"
                status="APPROVED"
            />
        );

        // Component returns null when no visible actions
        expect(container.innerHTML).toBe('');
    });

    it('should render prescribe link with correct href', () => {
        render(
            <QuickActions
                consultationId="test-456"
                vertical="HAIR_LOSS"
                status="DOCTOR_REVIEWING"
            />
        );

        const prescribeLink = screen.getByText('Create Prescription').closest('a');
        expect(prescribeLink?.getAttribute('href')).toBe('/doctor/case/test-456/prescribe');
    });

    it('should render blood work link with correct href', () => {
        render(
            <QuickActions
                consultationId="test-456"
                vertical="HAIR_LOSS"
                status="DOCTOR_REVIEWING"
            />
        );

        const bloodWorkLink = screen.getByText('Order Blood Work').closest('a');
        expect(bloodWorkLink?.getAttribute('href')).toBe('/doctor/case/test-456/blood-work');
    });
});
