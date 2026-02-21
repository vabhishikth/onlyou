/**
 * Admin Patients Page Tests
 * PR 27 Task 3: Partners + patients tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import PatientsPage from '../page';
import { ADMIN_PATIENTS, ADMIN_PATIENT_DETAIL } from '@/graphql/admin';

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockPatients = [
    {
        id: 'p-1',
        phone: '+919876543210',
        name: 'Rahul Sharma',
        email: 'rahul@example.com',
        dateOfBirth: '1990-01-15',
        gender: 'MALE',
        city: 'Mumbai',
        state: 'Maharashtra',
        createdAt: '2026-01-01T00:00:00Z',
        activeConsultations: 2,
        pendingLabOrders: 1,
        pendingDeliveries: 0,
        lastActivityAt: '2026-02-20T10:00:00Z',
    },
    {
        id: 'p-2',
        phone: '+919876000000',
        name: 'Priya Patel',
        email: null,
        dateOfBirth: null,
        gender: 'FEMALE',
        city: 'Delhi',
        state: 'Delhi',
        createdAt: '2026-02-01T00:00:00Z',
        activeConsultations: 0,
        pendingLabOrders: 0,
        pendingDeliveries: 1,
        lastActivityAt: null,
    },
];

const mockPatientDetail = {
    id: 'p-1',
    phone: '+919876543210',
    name: 'Rahul Sharma',
    email: 'rahul@example.com',
    dateOfBirth: '1990-01-15',
    gender: 'MALE',
    address: '123 Main St, Andheri West',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400058',
    createdAt: '2026-01-01T00:00:00Z',
    consultations: [
        { id: 'c-1', vertical: 'HAIR_LOSS', status: 'COMPLETED', createdAt: '2026-01-10T00:00:00Z', doctorName: 'Dr. Singh' },
        { id: 'c-2', vertical: 'HAIR_LOSS', status: 'IN_REVIEW', createdAt: '2026-02-15T00:00:00Z', doctorName: 'Dr. Mehta' },
    ],
    labOrders: [
        { id: 'lo-1', status: 'RESULTS_READY', bookedDate: '2026-02-01', panelName: 'Hair Loss Panel', createdAt: '2026-01-25T00:00:00Z' },
    ],
    orders: [
        { id: 'o-1', status: 'DELIVERED', totalAmountPaise: 250000, createdAt: '2026-02-10T00:00:00Z' },
    ],
    notes: [],
};

const patientsMock: MockedResponse = {
    request: {
        query: ADMIN_PATIENTS,
        variables: {
            filter: {
                search: undefined,
                pageSize: 50,
            },
        },
    },
    result: {
        data: {
            adminPatients: {
                patients: mockPatients,
                total: 2,
                page: 1,
                pageSize: 50,
            },
        },
    },
};

const patientDetailMock: MockedResponse = {
    request: {
        query: ADMIN_PATIENT_DETAIL,
        variables: { patientId: 'p-1' },
    },
    result: {
        data: {
            adminPatientDetail: mockPatientDetail,
        },
    },
};

function renderWithProvider(mocks: MockedResponse[] = []) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            <PatientsPage />
        </MockedProvider>
    );
}

describe('PatientsPage', () => {
    it('should render page header', async () => {
        renderWithProvider([patientsMock]);

        expect(screen.getByText('Patient Management')).toBeDefined();
    });

    it('should have search input', () => {
        renderWithProvider([patientsMock]);

        const searchInput = screen.getByPlaceholderText(/search/i);
        expect(searchInput).toBeDefined();
    });

    it('should display patient cards with names', async () => {
        renderWithProvider([patientsMock]);

        await waitFor(() => {
            expect(screen.getByText('Rahul Sharma')).toBeDefined();
            expect(screen.getByText('Priya Patel')).toBeDefined();
        });
    });

    it('should show patient phone on cards', async () => {
        renderWithProvider([patientsMock]);

        await waitFor(() => {
            expect(screen.getByText(/987654/)).toBeDefined();
        });
    });

    it('should show activity stats on patient cards', async () => {
        renderWithProvider([patientsMock]);

        await waitFor(() => {
            // Rahul has 2 consultations, 1 lab order
            expect(screen.getByText(/2 consultations/)).toBeDefined();
            expect(screen.getByText(/1 lab order/)).toBeDefined();
        });
    });

    it('should show patient city on cards', async () => {
        renderWithProvider([patientsMock]);

        await waitFor(() => {
            expect(screen.getByText('Mumbai')).toBeDefined();
            expect(screen.getByText('Delhi')).toBeDefined();
        });
    });
});
