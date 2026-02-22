/**
 * Collect Portal — Daily Roster Tests
 * Spec: Phase 16 — Phlebotomist daily roster view
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import RosterPage from '../page';
import { COLLECT_MY_DAILY_ROSTER } from '@/graphql/collect-portal';

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const today = new Date().toISOString().split('T')[0];

const mockRoster = [
    {
        id: 'r-1',
        patientFirstName: 'Amit',
        patientPhone: '+919999000001',
        patientArea: 'Andheri West',
        fullAddress: '101 Main St, Andheri West, Mumbai',
        timeWindow: '7:00 - 8:00 AM',
        panelName: 'Hair Loss Panel',
        testsOrdered: ['TSH', 'Ferritin', 'CBC'],
        status: 'PHLEBOTOMIST_ASSIGNED',
        requiresFasting: true,
    },
    {
        id: 'r-2',
        patientFirstName: 'Neha',
        patientPhone: '+919999000002',
        patientArea: 'Bandra',
        fullAddress: '202 Park Road, Bandra, Mumbai',
        timeWindow: '9:00 - 10:00 AM',
        panelName: 'PCOS Panel',
        testsOrdered: ['LH', 'FSH'],
        status: 'PHLEBOTOMIST_ASSIGNED',
        requiresFasting: false,
    },
];

const rosterMock: MockedResponse = {
    request: {
        query: COLLECT_MY_DAILY_ROSTER,
        variables: { date: today },
    },
    result: { data: { myDailyRoster: mockRoster } },
};

const emptyRosterMock: MockedResponse = {
    request: {
        query: COLLECT_MY_DAILY_ROSTER,
        variables: { date: today },
    },
    result: { data: { myDailyRoster: [] } },
};

function renderWithProvider(mocks: MockedResponse[] = []) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            <RosterPage />
        </MockedProvider>
    );
}

describe('Collect Roster Page', () => {
    it('should render daily roster title', async () => {
        renderWithProvider([rosterMock]);

        await waitFor(() => {
            expect(screen.getByText(/Daily Roster/)).toBeDefined();
        });
    });

    it('should show patient names and time windows', async () => {
        renderWithProvider([rosterMock]);

        await waitFor(() => {
            expect(screen.getByText('Amit')).toBeDefined();
            expect(screen.getByText('Neha')).toBeDefined();
            expect(screen.getByText('7:00 - 8:00 AM')).toBeDefined();
        });
    });

    it('should show fasting badge for fasting patients', async () => {
        renderWithProvider([rosterMock]);

        await waitFor(() => {
            expect(screen.getByText('Amit')).toBeDefined();
        });

        expect(screen.getByTestId('fasting-r-1')).toBeDefined();
    });

    it('should show area grouping', async () => {
        renderWithProvider([rosterMock]);

        await waitFor(() => {
            expect(screen.getByText(/Andheri West/)).toBeDefined();
            expect(screen.getByText(/Bandra/)).toBeDefined();
        });
    });

    it('should show empty state when no roster items', async () => {
        renderWithProvider([emptyRosterMock]);

        await waitFor(() => {
            expect(screen.getByText(/no collections/i)).toBeDefined();
        });
    });
});
