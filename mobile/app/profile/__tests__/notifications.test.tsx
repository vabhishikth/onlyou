/**
 * Notifications Settings Screen Tests
 * PR 29 Task 2: Notifications screen tests
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

const mockNotificationPrefs = {
    notificationPreferences: {
        pushEnabled: true,
        smsEnabled: true,
        whatsappEnabled: true,
        emailEnabled: true,
        marketingEnabled: false,
    },
};

const mockUpdatePrefs = jest.fn().mockResolvedValue({ data: {} });

import NotificationsScreen from '../notifications';

beforeEach(() => {
    jest.clearAllMocks();
    (useMutation as jest.Mock).mockReturnValue([mockUpdatePrefs, { loading: false }]);
});

describe('NotificationsScreen', () => {
    describe('Toggle display', () => {
        beforeEach(() => {
            (useQuery as jest.Mock).mockReturnValue({
                data: mockNotificationPrefs,
                loading: false,
                error: undefined,
            });
        });

        it('renders the notifications header', () => {
            const { getByText } = render(<NotificationsScreen />);
            expect(getByText('Notifications')).toBeTruthy();
        });

        it('shows important updates section with toggles', () => {
            const { getByText } = render(<NotificationsScreen />);
            expect(getByText('Important Updates')).toBeTruthy();
            expect(getByText('Push Notifications')).toBeTruthy();
            expect(getByText('SMS')).toBeTruthy();
            expect(getByText('WhatsApp')).toBeTruthy();
            expect(getByText('Email')).toBeTruthy();
        });

        it('shows marketing section', () => {
            const { getByText } = render(<NotificationsScreen />);
            expect(getByText('Marketing')).toBeTruthy();
            expect(getByText('Promotional Offers')).toBeTruthy();
        });

        it('shows critical alerts info note', () => {
            const { getByText } = render(<NotificationsScreen />);
            expect(getByText(/always notify you about critical updates/)).toBeTruthy();
        });
    });
});
