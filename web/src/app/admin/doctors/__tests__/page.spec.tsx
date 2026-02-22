/**
 * Admin Doctors Page Tests
 * Phase 12: Doctor list + add form tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import DoctorsPage from '../page';
import { ADMIN_DOCTORS } from '@/graphql/doctors';

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('next/link', () => {
    return ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>;
});

const mockDoctors = [
    {
        id: 'dp-1',
        userId: 'user-doc-1',
        registrationNo: 'KA/12345/2020',
        specialization: 'Dermatology',
        specializations: ['Dermatology', 'Trichology'],
        verticals: ['HAIR_LOSS'],
        qualifications: ['MBBS', 'MD Dermatology'],
        yearsOfExperience: 10,
        bio: null,
        avatarUrl: null,
        signatureUrl: null,
        isAvailable: true,
        isActive: true,
        seniorDoctor: true,
        dailyCaseLimit: 15,
        consultationFee: 20000,
        lastAssignedAt: '2026-02-20T10:00:00Z',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-02-20T10:00:00Z',
    },
    {
        id: 'dp-2',
        userId: 'user-doc-2',
        registrationNo: 'MH/67890/2021',
        specialization: 'Urology',
        specializations: ['Urology', 'Andrology'],
        verticals: ['SEXUAL_HEALTH'],
        qualifications: ['MBBS', 'MS Urology'],
        yearsOfExperience: 8,
        bio: 'Experienced urologist',
        avatarUrl: null,
        signatureUrl: null,
        isAvailable: false,
        isActive: true,
        seniorDoctor: false,
        dailyCaseLimit: 10,
        consultationFee: 25000,
        lastAssignedAt: null,
        createdAt: '2026-01-15T00:00:00Z',
        updatedAt: '2026-01-15T00:00:00Z',
    },
];

const doctorsMock: MockedResponse = {
    request: {
        query: ADMIN_DOCTORS,
        variables: {},
    },
    result: {
        data: {
            doctors: mockDoctors,
        },
    },
};

const emptyMock: MockedResponse = {
    request: {
        query: ADMIN_DOCTORS,
        variables: {},
    },
    result: {
        data: {
            doctors: [],
        },
    },
};

function renderWithProvider(mocks: MockedResponse[] = []) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            <DoctorsPage />
        </MockedProvider>
    );
}

describe('DoctorsPage', () => {
    it('should render page header', () => {
        renderWithProvider([doctorsMock]);
        expect(screen.getByText('Doctor Management')).toBeDefined();
    });

    it('should render search input and Add Doctor button', () => {
        renderWithProvider([doctorsMock]);
        expect(screen.getByPlaceholderText(/search/i)).toBeDefined();
        expect(screen.getByText('Add Doctor')).toBeDefined();
    });

    it('should render vertical filter tabs', () => {
        renderWithProvider([doctorsMock]);
        expect(screen.getByText('All')).toBeDefined();
        expect(screen.getByText('Hair Loss')).toBeDefined();
        expect(screen.getByText('Sexual Health')).toBeDefined();
        expect(screen.getByText('PCOS')).toBeDefined();
        expect(screen.getByText('Weight Management')).toBeDefined();
    });

    it('should display doctor cards with data', async () => {
        renderWithProvider([doctorsMock]);

        await waitFor(() => {
            expect(screen.getByText('KA/12345/2020')).toBeDefined();
            expect(screen.getByText('MH/67890/2021')).toBeDefined();
        });
    });

    it('should show specialization tags on doctor cards', async () => {
        renderWithProvider([doctorsMock]);

        await waitFor(() => {
            expect(screen.getByText('Dermatology')).toBeDefined();
            expect(screen.getByText('Trichology')).toBeDefined();
        });
    });

    it('should show availability status', async () => {
        renderWithProvider([doctorsMock]);

        await waitFor(() => {
            expect(screen.getByText('Available')).toBeDefined();
            expect(screen.getByText('Unavailable')).toBeDefined();
        });
    });

    it('should show Senior badge for senior doctors', async () => {
        renderWithProvider([doctorsMock]);

        await waitFor(() => {
            expect(screen.getByText('Senior')).toBeDefined();
        });
    });

    it('should show empty state when no doctors', async () => {
        renderWithProvider([emptyMock]);

        await waitFor(() => {
            expect(screen.getByText('No doctors found')).toBeDefined();
        });
    });
});
