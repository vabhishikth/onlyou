/**
 * Edit Profile Screen Tests
 * PR 29 Task 1: Edit profile screen tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { useQuery, useMutation } from '@apollo/client';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        back: mockBack,
    }),
    useSegments: () => [],
    useLocalSearchParams: () => ({}),
    Slot: ({ children }: { children: React.ReactNode }) => children,
    Stack: { Screen: () => null },
    Link: ({ children }: { children: React.ReactNode }) => children,
}));

const mockProfileData = {
    me: {
        id: 'user-1',
        phone: '+919876543210',
        name: 'Rahul Sharma',
        email: 'rahul@example.com',
        isProfileComplete: true,
        patientProfile: {
            id: 'patient-1',
            dateOfBirth: '1990-05-15',
            gender: 'MALE',
            addressLine1: '123 MG Road',
            addressLine2: 'Apt 4B',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
        },
        createdAt: '2026-01-01T00:00:00Z',
    },
};

const mockUpdateProfile = jest.fn().mockResolvedValue({ data: { updateProfile: { success: true } } });

import EditProfileScreen from '../edit';

beforeEach(() => {
    jest.clearAllMocks();
    (useMutation as jest.Mock).mockReturnValue([mockUpdateProfile, { loading: false }]);
});

describe('EditProfileScreen', () => {
    describe('Form population', () => {
        beforeEach(() => {
            (useQuery as jest.Mock).mockReturnValue({
                data: mockProfileData,
                loading: false,
                error: undefined,
            });
        });

        it('renders the edit profile header', () => {
            const { getByText } = render(<EditProfileScreen />);
            expect(getByText('Edit Profile')).toBeTruthy();
        });

        it('shows basic information section', () => {
            const { getByText } = render(<EditProfileScreen />);
            expect(getByText('Basic Information')).toBeTruthy();
            expect(getByText(/Full Name/)).toBeTruthy();
        });

        it('shows address section', () => {
            const { getByText } = render(<EditProfileScreen />);
            expect(getByText('Address')).toBeTruthy();
        });

        it('shows gender selection buttons', () => {
            const { getByText } = render(<EditProfileScreen />);
            expect(getByText('Male')).toBeTruthy();
            expect(getByText('Female')).toBeTruthy();
            expect(getByText('Other')).toBeTruthy();
        });

        it('shows save button', () => {
            const { getByText } = render(<EditProfileScreen />);
            expect(getByText('Save Changes')).toBeTruthy();
        });
    });

    describe('Loading state', () => {
        it('shows loading when fetching profile', () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: undefined,
                loading: true,
                error: undefined,
            });

            const { queryByText } = render(<EditProfileScreen />);
            // While loading, form fields shouldn't be visible yet
            expect(queryByText('Save Changes')).toBeNull();
        });
    });
});
