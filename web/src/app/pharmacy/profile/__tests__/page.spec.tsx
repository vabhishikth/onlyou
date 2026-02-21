/**
 * Pharmacy Portal — Profile Page Tests
 * PR 28 Task 2: Pharmacy portal tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import PharmacyProfilePage from '../page';
import { PHARMACY_INFO } from '@/graphql/pharmacy-portal';

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockPharmacyInfo = {
    id: 'pharm-1',
    name: 'MedPlus Pharmacy',
    address: '789 Med Lane, Andheri',
    city: 'Mumbai',
    isActive: true,
};

const pharmacyInfoMock: MockedResponse = {
    request: { query: PHARMACY_INFO },
    result: { data: { pharmacyInfo: mockPharmacyInfo } },
};

function renderWithProvider(mocks: MockedResponse[] = []) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            <PharmacyProfilePage />
        </MockedProvider>
    );
}

describe('Pharmacy Profile Page', () => {
    it('should display pharmacy name', async () => {
        renderWithProvider([pharmacyInfoMock]);

        await waitFor(() => {
            expect(screen.getByText('MedPlus Pharmacy')).toBeDefined();
        });
    });

    it('should show active status', async () => {
        renderWithProvider([pharmacyInfoMock]);

        await waitFor(() => {
            expect(screen.getByText('Active')).toBeDefined();
        });
    });

    it('should show logout button', async () => {
        renderWithProvider([pharmacyInfoMock]);

        await waitFor(() => {
            expect(screen.getByText('Logout')).toBeDefined();
        });
    });
});
