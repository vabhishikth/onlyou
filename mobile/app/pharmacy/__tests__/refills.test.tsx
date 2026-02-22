/**
 * Spec: Phase 15 — Mobile auto-refill management
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

const mockUseQuery = require('@apollo/client').useQuery;
const mockUseMutation = require('@apollo/client').useMutation;

import RefillsScreen from '../refills';

const mockRefills = [
    {
        id: 'ar-1',
        prescriptionId: 'rx-1',
        intervalDays: 30,
        nextRefillDate: '2026-03-15T00:00:00Z',
        isActive: true,
    },
    {
        id: 'ar-2',
        prescriptionId: 'rx-2',
        intervalDays: 60,
        nextRefillDate: '2026-04-10T00:00:00Z',
        isActive: true,
    },
];

describe('Refills Screen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUseMutation.mockReturnValue([
            jest.fn().mockResolvedValue({ data: {} }),
            { loading: false },
        ]);
    });

    it('should render auto-refills title', () => {
        mockUseQuery.mockReturnValue({
            data: { myAutoRefills: mockRefills },
            loading: false,
            error: null,
            refetch: jest.fn(),
        });

        render(<RefillsScreen />);
        expect(screen.getByText('Auto-Refills')).toBeTruthy();
    });

    it('should show refill cards with interval and next date', () => {
        mockUseQuery.mockReturnValue({
            data: { myAutoRefills: mockRefills },
            loading: false,
            error: null,
            refetch: jest.fn(),
        });

        render(<RefillsScreen />);
        expect(screen.getByText(/30 days/)).toBeTruthy();
        expect(screen.getByText(/60 days/)).toBeTruthy();
    });

    it('should show cancel button on each refill', () => {
        mockUseQuery.mockReturnValue({
            data: { myAutoRefills: mockRefills },
            loading: false,
            error: null,
            refetch: jest.fn(),
        });

        render(<RefillsScreen />);
        const cancelButtons = screen.getAllByText('Cancel Refill');
        expect(cancelButtons.length).toBe(2);
    });

    it('should show empty state when no refills', () => {
        mockUseQuery.mockReturnValue({
            data: { myAutoRefills: [] },
            loading: false,
            error: null,
            refetch: jest.fn(),
        });

        render(<RefillsScreen />);
        expect(screen.getByText(/no auto-refills/i)).toBeTruthy();
    });

    it('should show create refill button', () => {
        mockUseQuery.mockReturnValue({
            data: { myAutoRefills: mockRefills },
            loading: false,
            error: null,
            refetch: jest.fn(),
        });

        render(<RefillsScreen />);
        expect(screen.getByText(/new refill/i)).toBeTruthy();
    });

    it('should show loading indicator', () => {
        mockUseQuery.mockReturnValue({
            data: null,
            loading: true,
            error: null,
            refetch: jest.fn(),
        });

        render(<RefillsScreen />);
        expect(screen.getByTestId('refills-loading')).toBeTruthy();
    });
});
