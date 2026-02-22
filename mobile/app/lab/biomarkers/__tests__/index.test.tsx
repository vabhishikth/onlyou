/**
 * Spec: Phase 16 — Mobile biomarker dashboard
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';

const mockUseQuery = require('@apollo/client').useQuery;

import BiomarkersScreen from '../index';

const mockResults = [
    {
        id: 'br-1',
        testCode: 'TSH',
        testName: 'Thyroid Stimulating Hormone',
        value: 2.5,
        unit: 'mIU/L',
        normalRange: '0.4-4.0',
        flag: 'NORMAL',
        recordedAt: '2026-02-15T00:00:00Z',
    },
    {
        id: 'br-2',
        testCode: 'HB',
        testName: 'Hemoglobin',
        value: 10.2,
        unit: 'g/dL',
        normalRange: '12.0-16.0',
        flag: 'LOW',
        recordedAt: '2026-02-15T00:00:00Z',
    },
    {
        id: 'br-3',
        testCode: 'FBS',
        testName: 'Fasting Blood Sugar',
        value: 250,
        unit: 'mg/dL',
        normalRange: '70-100',
        flag: 'CRITICAL',
        recordedAt: '2026-02-15T00:00:00Z',
    },
];

const mockCritical = [
    {
        id: 'br-3',
        testCode: 'FBS',
        testName: 'Fasting Blood Sugar',
        value: 250,
        unit: 'mg/dL',
        normalRange: '70-100',
        flag: 'CRITICAL',
        recordedAt: '2026-02-15T00:00:00Z',
        acknowledged: false,
    },
];

describe('Biomarkers Dashboard', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render biomarkers title', () => {
        mockUseQuery.mockReturnValue({
            data: { myLatestLabResults: mockResults, myCriticalValues: [] },
            loading: false,
            error: null,
        });

        render(<BiomarkersScreen />);
        expect(screen.getByText('Biomarkers')).toBeTruthy();
    });

    it('should show result cards with test name and value', () => {
        mockUseQuery.mockReturnValue({
            data: { myLatestLabResults: mockResults, myCriticalValues: [] },
            loading: false,
            error: null,
        });

        render(<BiomarkersScreen />);
        expect(screen.getByText(/TSH/)).toBeTruthy();
        expect(screen.getByText(/2.5/)).toBeTruthy();
        expect(screen.getByText(/Hemoglobin/)).toBeTruthy();
    });

    it('should show flag badges for abnormal results', () => {
        mockUseQuery.mockReturnValue({
            data: { myLatestLabResults: mockResults, myCriticalValues: [] },
            loading: false,
            error: null,
        });

        render(<BiomarkersScreen />);
        expect(screen.getByText('LOW')).toBeTruthy();
        expect(screen.getByText('CRITICAL')).toBeTruthy();
    });

    it('should show critical alert section when critical values exist', () => {
        mockUseQuery.mockReturnValue({
            data: { myLatestLabResults: mockResults, myCriticalValues: mockCritical },
            loading: false,
            error: null,
        });

        render(<BiomarkersScreen />);
        expect(screen.getByText(/Critical Alert/i)).toBeTruthy();
    });

    it('should show empty state when no results', () => {
        mockUseQuery.mockReturnValue({
            data: { myLatestLabResults: [], myCriticalValues: [] },
            loading: false,
            error: null,
        });

        render(<BiomarkersScreen />);
        expect(screen.getByText(/no biomarker/i)).toBeTruthy();
    });

    it('should show loading indicator', () => {
        mockUseQuery.mockReturnValue({
            data: null,
            loading: true,
            error: null,
        });

        render(<BiomarkersScreen />);
        expect(screen.getByTestId('biomarkers-loading')).toBeTruthy();
    });

    it('should show normal range for each result', () => {
        mockUseQuery.mockReturnValue({
            data: { myLatestLabResults: mockResults, myCriticalValues: [] },
            loading: false,
            error: null,
        });

        render(<BiomarkersScreen />);
        expect(screen.getByText(/0.4-4.0/)).toBeTruthy();
        expect(screen.getByText(/12.0-16.0/)).toBeTruthy();
    });
});
