/**
 * Health Profile Screen Tests
 * PR 26 Task 3: /profile/health screen (TDD)
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { useQuery } from '@apollo/client';

// Must be named 'mock' prefix for Jest hoisting
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
    useRouter: () => ({
        push: mockPush,
        replace: jest.fn(),
        back: mockBack,
    }),
    useSegments: () => [],
    useLocalSearchParams: () => ({}),
    Slot: ({ children }: { children: React.ReactNode }) => children,
    Stack: {
        Screen: () => null,
    },
    Link: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock profile data
const mockProfileData = {
    me: {
        id: 'user-1',
        phone: '+919876543210',
        name: 'Rahul Sharma',
        email: 'rahul@test.com',
        isProfileComplete: true,
        patientProfile: {
            id: 'profile-1',
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

// Import after mocks
import HealthProfileScreen from '../health';

beforeEach(() => {
    jest.clearAllMocks();
});

describe('HealthProfileScreen', () => {
    describe('Loading state', () => {
        it('renders loading indicator while fetching', () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: undefined,
                loading: true,
                error: undefined,
            });

            const { getByTestId } = render(<HealthProfileScreen />);
            expect(getByTestId('health-profile-loading')).toBeTruthy();
        });
    });

    describe('Health profile display', () => {
        beforeEach(() => {
            (useQuery as jest.Mock).mockReturnValue({
                data: mockProfileData,
                loading: false,
                error: undefined,
            });
        });

        it('renders the screen with header', () => {
            const { getByText } = render(<HealthProfileScreen />);
            expect(getByText('Health Profile')).toBeTruthy();
        });

        it('displays gender', () => {
            const { getByText } = render(<HealthProfileScreen />);
            expect(getByText('Male')).toBeTruthy();
        });

        it('displays date of birth', () => {
            const { getByText } = render(<HealthProfileScreen />);
            expect(getByText(/May.*1990/)).toBeTruthy();
        });

        it('displays address', () => {
            const { getByText } = render(<HealthProfileScreen />);
            expect(getByText(/Mumbai/)).toBeTruthy();
        });
    });

    describe('Missing data', () => {
        it('handles missing patient profile gracefully', () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: {
                    me: {
                        ...mockProfileData.me,
                        patientProfile: null,
                    },
                },
                loading: false,
                error: undefined,
            });

            const { getByTestId } = render(<HealthProfileScreen />);
            expect(getByTestId('health-profile-incomplete')).toBeTruthy();
        });
    });
});
