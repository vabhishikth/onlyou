/**
 * Lab Results Viewer Tests
 * PR 13: Patient Tracking Screens — Lab results summary with abnormal flags
 * Spec: master spec Section 4.5 — Lab Results Presentation
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';

// Override expo-router mock to provide labOrderId
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({
    useRouter: () => mockRouter,
    useSegments: () => [],
    useLocalSearchParams: () => ({ labOrderId: 'lab-1' }),
    Slot: ({ children }: any) => children,
    Stack: { Screen: () => null },
    Link: ({ children }: any) => children,
}));

// Get mocked hooks
const mockUseQuery = require('@apollo/client').useQuery;

// Must import after mocks are set up
import LabResultsScreen from '../../../app/lab/[labOrderId]/results';

beforeEach(() => {
    jest.clearAllMocks();
});

describe('LabResultsScreen', () => {
    const mockLabOrder = {
        id: 'lab-1',
        status: 'RESULTS_READY',
        testPanel: ['TSH', 'CBC', 'Ferritin', 'Vitamin_D'],
        panelName: 'Hair Loss Basic Panel',
        criticalValues: false,
        resultFileUrl: 'https://s3.ap-south-1.amazonaws.com/results/lab-1.pdf',
        abnormalFlags: JSON.stringify({
            TSH: { status: 'normal', value: '2.5', normalRange: '0.4-4.0 mIU/L' },
            CBC: { status: 'normal', value: '14.2', normalRange: '12-16 g/dL' },
            Ferritin: { status: 'abnormal', value: '8', normalRange: '12-150 ng/mL' },
            Vitamin_D: { status: 'critical', value: '5', normalRange: '30-100 ng/mL' },
        }),
        doctorNote: 'Ferritin and Vitamin D are low. Starting iron and D3 supplementation.',
        orderedAt: '2026-02-15T10:00:00Z',
        doctorReviewedAt: '2026-02-18T14:00:00Z',
    };

    describe('Loading state', () => {
        it('shows loading indicator while fetching', () => {
            mockUseQuery.mockReturnValue({
                data: null,
                loading: true,
                error: null,
                refetch: jest.fn(),
            });

            const { getByText } = render(<LabResultsScreen />);

            expect(getByText('Loading results...')).toBeTruthy();
        });
    });

    describe('Error state', () => {
        it('shows error when lab order not found', () => {
            mockUseQuery.mockReturnValue({
                data: { labOrder: null },
                loading: false,
                error: null,
                refetch: jest.fn(),
            });

            const { getByText } = render(<LabResultsScreen />);

            expect(getByText('Lab order not found')).toBeTruthy();
        });

        it('shows Go Back button on error', () => {
            mockUseQuery.mockReturnValue({
                data: { labOrder: null },
                loading: false,
                error: null,
                refetch: jest.fn(),
            });

            const { getByText } = render(<LabResultsScreen />);

            fireEvent.press(getByText('Go Back'));
            expect(mockRouter.back).toHaveBeenCalled();
        });
    });

    describe('Results display', () => {
        beforeEach(() => {
            mockUseQuery.mockReturnValue({
                data: { labOrder: mockLabOrder },
                loading: false,
                error: null,
                refetch: jest.fn(),
            });
        });

        it('renders the header with Lab Results title', () => {
            const { getByText } = render(<LabResultsScreen />);

            expect(getByText('Lab Results')).toBeTruthy();
        });

        it('displays the panel name', () => {
            const { getByText } = render(<LabResultsScreen />);

            expect(getByText('Hair Loss Basic Panel')).toBeTruthy();
        });

        it('displays test names in the panel info', () => {
            const { getByText } = render(<LabResultsScreen />);

            expect(getByText('TSH, CBC, Ferritin, Vitamin_D')).toBeTruthy();
        });

        it('renders Results Summary section', () => {
            const { getByText } = render(<LabResultsScreen />);

            expect(getByText('Results Summary')).toBeTruthy();
        });

        it('displays test values in the results table', () => {
            const { getByText } = render(<LabResultsScreen />);

            // Check test name (formatted from code — all-caps stay all-caps)
            expect(getByText('TSH')).toBeTruthy();
            expect(getByText('Ferritin')).toBeTruthy();

            // Check values
            expect(getByText('2.5')).toBeTruthy();
            expect(getByText('8')).toBeTruthy();
            expect(getByText('5')).toBeTruthy();

            // Check normal ranges
            expect(getByText('0.4-4.0 mIU/L')).toBeTruthy();
            expect(getByText('12-150 ng/mL')).toBeTruthy();
        });

        it('displays the doctor note', () => {
            const { getByText } = render(<LabResultsScreen />);

            expect(getByText("Doctor's Note")).toBeTruthy();
            expect(getByText('Ferritin and Vitamin D are low. Starting iron and D3 supplementation.')).toBeTruthy();
        });

        it('shows View Full Lab Report button when resultFileUrl exists', () => {
            const { getByText } = render(<LabResultsScreen />);

            expect(getByText(/View Full Lab Report/)).toBeTruthy();
        });

        it('opens PDF when View Full Lab Report is pressed', () => {
            jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve(true));

            const { getByText } = render(<LabResultsScreen />);

            fireEvent.press(getByText(/View Full Lab Report/));
            expect(Linking.openURL).toHaveBeenCalledWith(
                'https://s3.ap-south-1.amazonaws.com/results/lab-1.pdf',
            );
        });

        it('navigates back when back arrow is pressed', () => {
            const { getByText } = render(<LabResultsScreen />);

            fireEvent.press(getByText('<'));
            expect(mockRouter.back).toHaveBeenCalled();
        });
    });

    describe('Critical values', () => {
        it('shows critical values banner when criticalValues is true', () => {
            mockUseQuery.mockReturnValue({
                data: {
                    labOrder: { ...mockLabOrder, criticalValues: true },
                },
                loading: false,
                error: null,
                refetch: jest.fn(),
            });

            const { getByText } = render(<LabResultsScreen />);

            expect(getByText('Critical Values Detected')).toBeTruthy();
        });

        it('does NOT show critical values banner when criticalValues is false', () => {
            mockUseQuery.mockReturnValue({
                data: {
                    labOrder: { ...mockLabOrder, criticalValues: false },
                },
                loading: false,
                error: null,
                refetch: jest.fn(),
            });

            const { queryByText } = render(<LabResultsScreen />);

            expect(queryByText('Critical Values Detected')).toBeNull();
        });
    });

    describe('Empty/missing data', () => {
        it('handles missing abnormalFlags gracefully', () => {
            mockUseQuery.mockReturnValue({
                data: {
                    labOrder: {
                        ...mockLabOrder,
                        abnormalFlags: null,
                        resultFileUrl: null,
                        doctorNote: null,
                    },
                },
                loading: false,
                error: null,
                refetch: jest.fn(),
            });

            const { getByText, queryByText } = render(<LabResultsScreen />);

            // Should show "Results Pending" message
            expect(getByText('Results Pending')).toBeTruthy();
            // Should NOT show results summary
            expect(queryByText('Results Summary')).toBeNull();
            // Should NOT show doctor's note
            expect(queryByText("Doctor's Note")).toBeNull();
        });

        it('handles invalid JSON in abnormalFlags', () => {
            mockUseQuery.mockReturnValue({
                data: {
                    labOrder: {
                        ...mockLabOrder,
                        abnormalFlags: 'invalid-json',
                        resultFileUrl: null,
                    },
                },
                loading: false,
                error: null,
                refetch: jest.fn(),
            });

            const { getByText } = render(<LabResultsScreen />);

            // Should not crash, shows pending since no parsed flags
            expect(getByText('Results Pending')).toBeTruthy();
        });

        it('does not show View Full Lab Report when no resultFileUrl', () => {
            mockUseQuery.mockReturnValue({
                data: {
                    labOrder: { ...mockLabOrder, resultFileUrl: null },
                },
                loading: false,
                error: null,
                refetch: jest.fn(),
            });

            const { queryByText } = render(<LabResultsScreen />);

            expect(queryByText(/View Full Lab Report/)).toBeNull();
        });
    });
});
