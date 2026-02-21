/**
 * Admin Partners Page Tests
 * PR 27 Task 3: Partners + patients tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import PartnersPage from '../page';
import { DIAGNOSTIC_CENTRES, PHLEBOTOMISTS, PHARMACIES } from '@/graphql/admin';

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockLabs = [
    {
        id: 'lab-1',
        name: 'SRL Diagnostics',
        address: '123 Lab Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        phone: '+919811111111',
        email: 'info@srl.com',
        contactPerson: 'Dr. Mehta',
        testsOffered: ['CBC', 'TSH', 'Vitamin D'],
        avgTurnaroundHours: 24,
        rating: 4.5,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
    },
    {
        id: 'lab-2',
        name: 'Thyrocare Labs',
        address: '456 Health Ave',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400050',
        phone: '+919822222222',
        email: null,
        contactPerson: null,
        testsOffered: ['Thyroid Panel', 'Lipid Profile'],
        avgTurnaroundHours: 48,
        rating: 4.0,
        isActive: false,
        createdAt: '2026-01-15T00:00:00Z',
    },
];

const mockPhlebotomists = [
    {
        id: 'ph-1',
        name: 'Amit Singh',
        phone: '+919800000000',
        email: 'amit@example.com',
        certification: 'DMLT',
        availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        availableTimeStart: '06:00',
        availableTimeEnd: '14:00',
        maxDailyCollections: 10,
        currentCity: 'Mumbai',
        serviceableAreas: ['400058', '400050'],
        completedCollections: 150,
        failedCollections: 5,
        rating: 4.8,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        todayAssignments: 3,
    },
];

const mockPharmacies = [
    {
        id: 'pharm-1',
        name: 'MedPlus Pharmacy',
        address: '789 Med Lane',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400058',
        phone: '+919833333333',
        email: 'medplus@example.com',
        contactPerson: 'Raj Patel',
        drugLicenseNumber: 'DL-MH-12345',
        gstNumber: 'GST123456',
        serviceableAreas: ['400058', '400050', '400001'],
        avgPreparationMinutes: 45,
        rating: 4.2,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
    },
];

const labsMock: MockedResponse = {
    request: {
        query: DIAGNOSTIC_CENTRES,
        variables: {},
    },
    result: {
        data: {
            diagnosticCentres: {
                centres: mockLabs,
                total: 2,
            },
        },
    },
};

const phlebotomistsMock: MockedResponse = {
    request: {
        query: PHLEBOTOMISTS,
        variables: {},
    },
    result: {
        data: {
            phlebotomists: {
                phlebotomists: mockPhlebotomists,
                total: 1,
            },
        },
    },
};

const pharmaciesMock: MockedResponse = {
    request: {
        query: PHARMACIES,
        variables: {},
    },
    result: {
        data: {
            pharmacies: {
                pharmacies: mockPharmacies,
                total: 1,
            },
        },
    },
};

function renderWithProvider(mocks: MockedResponse[] = []) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            <PartnersPage />
        </MockedProvider>
    );
}

describe('PartnersPage', () => {
    it('should render page header', async () => {
        renderWithProvider([labsMock]);

        expect(screen.getByText('Partner Management')).toBeDefined();
    });

    it('should render three partner tabs', () => {
        renderWithProvider([labsMock]);

        expect(screen.getByText('Labs')).toBeDefined();
        expect(screen.getByText('Phlebotomists')).toBeDefined();
        expect(screen.getByText('Pharmacies')).toBeDefined();
    });

    it('should display lab partner cards on Labs tab', async () => {
        renderWithProvider([labsMock]);

        await waitFor(() => {
            expect(screen.getByText('SRL Diagnostics')).toBeDefined();
            expect(screen.getByText('Thyrocare Labs')).toBeDefined();
        });
    });

    it('should show active/inactive status on lab cards', async () => {
        renderWithProvider([labsMock]);

        await waitFor(() => {
            expect(screen.getByText('Active')).toBeDefined();
            expect(screen.getByText('Inactive')).toBeDefined();
        });
    });

    it('should show city on partner cards', async () => {
        renderWithProvider([labsMock]);

        await waitFor(() => {
            expect(screen.getAllByText('Mumbai').length).toBeGreaterThan(0);
        });
    });

    it('should switch to Phlebotomists tab', async () => {
        renderWithProvider([labsMock, phlebotomistsMock]);

        fireEvent.click(screen.getByText('Phlebotomists'));

        await waitFor(() => {
            expect(screen.getByText('Amit Singh')).toBeDefined();
        });
    });

    it('should switch to Pharmacies tab', async () => {
        renderWithProvider([labsMock, pharmaciesMock]);

        fireEvent.click(screen.getByText('Pharmacies'));

        await waitFor(() => {
            expect(screen.getByText('MedPlus Pharmacy')).toBeDefined();
        });
    });

    it('should have search input and add button', () => {
        renderWithProvider([labsMock]);

        const searchInput = screen.getByPlaceholderText(/search/i);
        expect(searchInput).toBeDefined();
        expect(screen.getByText(/Add New/i)).toBeDefined();
    });
});
