/**
 * Lab Portal — Profile Page Tests
 * PR 28 Task 1: Lab portal tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import LabProfilePage from '../page';
import { LAB_INFO } from '@/graphql/lab-portal';

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockLabInfo = {
    id: 'lab-1',
    name: 'SRL Diagnostics Mumbai',
    city: 'Mumbai',
    isActive: true,
};

const labInfoMock: MockedResponse = {
    request: { query: LAB_INFO },
    result: { data: { labInfo: mockLabInfo } },
};

function renderWithProvider(mocks: MockedResponse[] = []) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            <LabProfilePage />
        </MockedProvider>
    );
}

describe('Lab Profile Page', () => {
    it('should display lab name', async () => {
        renderWithProvider([labInfoMock]);

        await waitFor(() => {
            expect(screen.getByText('SRL Diagnostics Mumbai')).toBeDefined();
        });
    });

    it('should show active status', async () => {
        renderWithProvider([labInfoMock]);

        await waitFor(() => {
            expect(screen.getByText('Active')).toBeDefined();
        });
    });

    it('should show support section', async () => {
        renderWithProvider([labInfoMock]);

        await waitFor(() => {
            expect(screen.getByText(/Need Help/)).toBeDefined();
        });
    });

    it('should show logout button', async () => {
        renderWithProvider([labInfoMock]);

        await waitFor(() => {
            expect(screen.getByText('Logout')).toBeDefined();
        });
    });
});
