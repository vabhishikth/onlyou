/**
 * Spec: Phase 16 — Mobile biomarker trend detail screen
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';

const mockUseQuery = require('@apollo/client').useQuery;
const mockUseLocalSearchParams = jest.fn();
jest.mock('expo-router', () => ({
    useLocalSearchParams: () => mockUseLocalSearchParams(),
    useRouter: () => ({ back: jest.fn() }),
}));

import BiomarkerTrendScreen from '../[testCode]';

const mockTrend = {
    testCode: 'TSH',
    dataPoints: [
        { value: 3.2, recordedAt: '2025-12-15T00:00:00Z' },
        { value: 2.8, recordedAt: '2026-01-15T00:00:00Z' },
        { value: 2.5, recordedAt: '2026-02-15T00:00:00Z' },
    ],
    normalMin: 0.4,
    normalMax: 4.0,
    unit: 'mIU/L',
};

describe('Biomarker Trend Detail', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUseLocalSearchParams.mockReturnValue({ testCode: 'TSH' });
    });

    it('should render test code as title', () => {
        mockUseQuery.mockReturnValue({
            data: { myBiomarkerTrend: mockTrend },
            loading: false,
            error: null,
        });

        render(<BiomarkerTrendScreen />);
        expect(screen.getByText('TSH Trend')).toBeTruthy();
    });

    it('should show data points with values', () => {
        mockUseQuery.mockReturnValue({
            data: { myBiomarkerTrend: mockTrend },
            loading: false,
            error: null,
        });

        render(<BiomarkerTrendScreen />);
        expect(screen.getByText(/3.2/)).toBeTruthy();
        expect(screen.getByText(/2.8/)).toBeTruthy();
        expect(screen.getByText(/2.5/)).toBeTruthy();
    });

    it('should show normal range info', () => {
        mockUseQuery.mockReturnValue({
            data: { myBiomarkerTrend: mockTrend },
            loading: false,
            error: null,
        });

        render(<BiomarkerTrendScreen />);
        expect(screen.getByText(/0.4/)).toBeTruthy();
        expect(screen.getByText(/4.0/)).toBeTruthy();
    });

    it('should show unit label', () => {
        mockUseQuery.mockReturnValue({
            data: { myBiomarkerTrend: mockTrend },
            loading: false,
            error: null,
        });

        render(<BiomarkerTrendScreen />);
        expect(screen.getByText(/mIU\/L/)).toBeTruthy();
    });

    it('should show loading state', () => {
        mockUseQuery.mockReturnValue({
            data: null,
            loading: true,
            error: null,
        });

        render(<BiomarkerTrendScreen />);
        expect(screen.getByTestId('trend-loading')).toBeTruthy();
    });

    it('should show empty state when no data', () => {
        mockUseQuery.mockReturnValue({
            data: { myBiomarkerTrend: null },
            loading: false,
            error: null,
        });

        render(<BiomarkerTrendScreen />);
        expect(screen.getByText(/no trend data/i)).toBeTruthy();
    });
});
