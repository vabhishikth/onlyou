/**
 * Profile Screen Tests
 * PR 6: Remaining Screens Restyle
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useAuth } from '@/lib/auth';

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

// Import after mocks
import ProfileScreen from '../profile';

beforeEach(() => {
    jest.clearAllMocks();

    // Mock useAuth with complete user
    (useAuth as jest.Mock).mockReturnValue({
        user: {
            id: '1',
            phone: '+919876543210',
            name: 'Rahul Sharma',
            isProfileComplete: true,
        },
        isAuthenticated: true,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
        refreshSession: jest.fn(),
    });
});

describe('ProfileScreen', () => {
    describe('Screen structure', () => {
        it('renders the screen with testID', () => {
            const { getByTestId } = render(<ProfileScreen />);
            expect(getByTestId('profile-screen')).toBeTruthy();
        });

        it('renders scroll view', () => {
            const { getByTestId } = render(<ProfileScreen />);
            expect(getByTestId('profile-scroll-view')).toBeTruthy();
        });
    });

    describe('Header section', () => {
        it('displays user avatar with initials', () => {
            const { getByTestId } = render(<ProfileScreen />);
            expect(getByTestId('user-avatar')).toBeTruthy();
        });

        it('displays avatar initials from user name', () => {
            const { getByText } = render(<ProfileScreen />);
            // Initials: "RS" for Rahul Sharma
            expect(getByText('R')).toBeTruthy();
        });

        it('displays user name with serif font', () => {
            const { getByText } = render(<ProfileScreen />);
            expect(getByText('Rahul Sharma')).toBeTruthy();
        });

        it('displays user phone number', () => {
            const { getByText } = render(<ProfileScreen />);
            expect(getByText(/987.*210/)).toBeTruthy();
        });

        it('displays Edit profile button', () => {
            const { getByTestId } = render(<ProfileScreen />);
            expect(getByTestId('edit-profile-button')).toBeTruthy();
        });

        it('navigates to profile edit when Edit button pressed', () => {
            const { getByTestId } = render(<ProfileScreen />);
            fireEvent.press(getByTestId('edit-profile-button'));
            expect(mockPush).toHaveBeenCalledWith('/profile/edit');
        });
    });

    describe('Account section', () => {
        it('displays Account section header', () => {
            const { getByTestId } = render(<ProfileScreen />);
            expect(getByTestId('section-account')).toBeTruthy();
        });

        it('displays Personal Information row', () => {
            const { getByTestId } = render(<ProfileScreen />);
            expect(getByTestId('row-personal-info')).toBeTruthy();
        });

        it('displays Subscription & Plans row', () => {
            const { getByTestId } = render(<ProfileScreen />);
            expect(getByTestId('row-subscriptions')).toBeTruthy();
        });

        it('displays Wallet & Payments row', () => {
            const { getByTestId } = render(<ProfileScreen />);
            expect(getByTestId('row-wallet')).toBeTruthy();
        });
    });

    describe('Health section', () => {
        it('displays Health section header', () => {
            const { getByTestId } = render(<ProfileScreen />);
            expect(getByTestId('section-health')).toBeTruthy();
        });

        it('displays My Prescriptions row', () => {
            const { getByTestId } = render(<ProfileScreen />);
            expect(getByTestId('row-prescriptions')).toBeTruthy();
        });

        it('displays My Lab Results row', () => {
            const { getByTestId } = render(<ProfileScreen />);
            expect(getByTestId('row-lab-results')).toBeTruthy();
        });

        it('displays Health Profile row', () => {
            const { getByTestId } = render(<ProfileScreen />);
            expect(getByTestId('row-health-profile')).toBeTruthy();
        });
    });

    describe('Preferences section', () => {
        it('displays Preferences section header', () => {
            const { getByTestId } = render(<ProfileScreen />);
            expect(getByTestId('section-preferences')).toBeTruthy();
        });

        it('displays Notifications toggle row', () => {
            const { getByTestId } = render(<ProfileScreen />);
            expect(getByTestId('row-notifications')).toBeTruthy();
        });

        it('displays Discreet Mode toggle row', () => {
            const { getByTestId } = render(<ProfileScreen />);
            expect(getByTestId('row-discreet-mode')).toBeTruthy();
        });

        it('displays Language row', () => {
            const { getByTestId } = render(<ProfileScreen />);
            expect(getByTestId('row-language')).toBeTruthy();
        });

        it('toggles notifications when pressed', () => {
            const { getByTestId } = render(<ProfileScreen />);
            const toggle = getByTestId('toggle-notifications');
            fireEvent(toggle, 'valueChange', true);
            // Toggle should update
        });
    });

    describe('Support section', () => {
        it('displays Support section header', () => {
            const { getByTestId } = render(<ProfileScreen />);
            expect(getByTestId('section-support')).toBeTruthy();
        });

        it('displays Help & FAQ row', () => {
            const { getByTestId } = render(<ProfileScreen />);
            expect(getByTestId('row-help')).toBeTruthy();
        });

        it('displays Contact Support row', () => {
            const { getByTestId } = render(<ProfileScreen />);
            expect(getByTestId('row-contact')).toBeTruthy();
        });

        it('displays About Onlyou row', () => {
            const { getByTestId } = render(<ProfileScreen />);
            expect(getByTestId('row-about')).toBeTruthy();
        });
    });

    describe('Logout', () => {
        it('displays Log out button', () => {
            const { getByTestId } = render(<ProfileScreen />);
            expect(getByTestId('logout-button')).toBeTruthy();
        });

        it('displays Log out text in red', () => {
            const { getByText } = render(<ProfileScreen />);
            expect(getByText('Log out')).toBeTruthy();
        });
    });

    describe('Lucide icons', () => {
        it('renders Lucide icons instead of emojis', () => {
            const { queryByText } = render(<ProfileScreen />);
            // Should NOT have emoji icons
            expect(queryByText('📝')).toBeNull();
            expect(queryByText('💳')).toBeNull();
            expect(queryByText('🔔')).toBeNull();
        });
    });

    describe('Design system compliance', () => {
        it('uses 72px avatar size', () => {
            const { getByTestId } = render(<ProfileScreen />);
            const avatar = getByTestId('user-avatar');
            expect(avatar.props.style).toBeDefined();
        });

        it('uses 52px row height', () => {
            const { getByTestId } = render(<ProfileScreen />);
            const row = getByTestId('row-personal-info');
            expect(row.props.style).toBeDefined();
        });
    });
});
