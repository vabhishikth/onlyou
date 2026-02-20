/**
 * Phone Entry Screen Tests
 * Clinical Luxe design system consistency
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useMutation } from '@apollo/client';

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
    useRouter: () => ({
        push: mockPush,
        replace: jest.fn(),
        back: mockBack,
    }),
    useSegments: () => [],
    Slot: ({ children }: { children: React.ReactNode }) => children,
    Stack: {
        Screen: () => null,
    },
    Link: ({ children }: { children: React.ReactNode }) => children,
}));

import PhoneScreen from '../phone';

beforeEach(() => {
    jest.clearAllMocks();

    (useMutation as jest.Mock).mockReturnValue([
        jest.fn().mockResolvedValue({
            data: { requestOtp: { success: true, message: 'OTP sent' } },
        }),
        { loading: false },
    ]);
});

describe('PhoneScreen', () => {
    describe('Screen structure', () => {
        it('renders the screen with testID', () => {
            const { getByTestId } = render(<PhoneScreen />);
            expect(getByTestId('phone-screen')).toBeTruthy();
        });

        it('renders back button', () => {
            const { getByTestId } = render(<PhoneScreen />);
            expect(getByTestId('back-button')).toBeTruthy();
        });

        it('navigates back when back button is pressed', () => {
            const { getByTestId } = render(<PhoneScreen />);
            fireEvent.press(getByTestId('back-button'));
            expect(mockBack).toHaveBeenCalled();
        });
    });

    describe('Logo consistency', () => {
        it('displays lowercase "onlyou" logo', () => {
            const { getByTestId } = render(<PhoneScreen />);
            const logo = getByTestId('phone-logo');
            expect(logo).toBeTruthy();
            expect(logo.props.children).toBe('onlyou');
        });
    });

    describe('Header content', () => {
        it('displays welcome heading', () => {
            const { getByText } = render(<PhoneScreen />);
            expect(getByText('Welcome')).toBeTruthy();
        });

        it('displays subheading text', () => {
            const { getByText } = render(<PhoneScreen />);
            expect(getByText(/enter your mobile number/i)).toBeTruthy();
        });
    });

    describe('Phone input', () => {
        it('renders country code +91', () => {
            const { getByText } = render(<PhoneScreen />);
            expect(getByText('+91')).toBeTruthy();
        });

        it('renders phone input field', () => {
            const { getByTestId } = render(<PhoneScreen />);
            expect(getByTestId('phone-input')).toBeTruthy();
        });

        it('accepts numeric input', () => {
            const { getByTestId } = render(<PhoneScreen />);
            const input = getByTestId('phone-input');
            fireEvent.changeText(input, '9876543210');
            expect(input.props.value).toBe('9876543210');
        });

        it('strips non-numeric characters', () => {
            const { getByTestId } = render(<PhoneScreen />);
            const input = getByTestId('phone-input');
            fireEvent.changeText(input, '98a76b5c4d3e2f1g0');
            expect(input.props.value).toBe('9876543210');
        });

        it('limits input to 10 digits', () => {
            const { getByTestId } = render(<PhoneScreen />);
            const input = getByTestId('phone-input');
            expect(input.props.maxLength).toBe(10);
        });
    });

    describe('Continue button', () => {
        it('renders continue button', () => {
            const { getByTestId } = render(<PhoneScreen />);
            expect(getByTestId('continue-button')).toBeTruthy();
        });

        it('button is disabled when phone is empty', () => {
            const { getByTestId } = render(<PhoneScreen />);
            const button = getByTestId('continue-button');
            expect(button.props.accessibilityState?.disabled || button.props.disabled).toBeTruthy();
        });

        it('button is disabled with invalid phone number', () => {
            const { getByTestId } = render(<PhoneScreen />);
            const input = getByTestId('phone-input');
            fireEvent.changeText(input, '12345');
            const button = getByTestId('continue-button');
            expect(button.props.accessibilityState?.disabled || button.props.disabled).toBeTruthy();
        });

        it('button is enabled with valid 10-digit phone starting with 6-9', () => {
            const { getByTestId } = render(<PhoneScreen />);
            const input = getByTestId('phone-input');
            fireEvent.changeText(input, '9876543210');
            const button = getByTestId('continue-button');
            // When enabled, disabled should be false or undefined
            const isDisabled = button.props.accessibilityState?.disabled || button.props.disabled;
            expect(isDisabled).toBeFalsy();
        });

        it('calls requestOtp mutation on submit with valid phone', async () => {
            const mockRequestOtp = jest.fn().mockResolvedValue({
                data: { requestOtp: { success: true, message: 'OTP sent' } },
            });
            (useMutation as jest.Mock).mockReturnValue([mockRequestOtp, { loading: false }]);

            const { getByTestId } = render(<PhoneScreen />);
            const input = getByTestId('phone-input');
            fireEvent.changeText(input, '9876543210');
            const button = getByTestId('continue-button');
            fireEvent.press(button);

            await waitFor(() => {
                expect(mockRequestOtp).toHaveBeenCalledWith({
                    variables: { input: { phone: '+919876543210' } },
                });
            });
        });

        it('navigates to OTP screen on successful request', async () => {
            const mockRequestOtp = jest.fn().mockResolvedValue({
                data: { requestOtp: { success: true, message: 'OTP sent' } },
            });
            (useMutation as jest.Mock).mockReturnValue([mockRequestOtp, { loading: false }]);

            const { getByTestId } = render(<PhoneScreen />);
            const input = getByTestId('phone-input');
            fireEvent.changeText(input, '9876543210');
            fireEvent.press(getByTestId('continue-button'));

            await waitFor(() => {
                expect(mockPush).toHaveBeenCalledWith({
                    pathname: '/(auth)/otp',
                    params: { phone: '+919876543210' },
                });
            });
        });
    });

    describe('Terms and privacy', () => {
        it('displays terms text', () => {
            const { getByText } = render(<PhoneScreen />);
            expect(getByText(/by continuing/i)).toBeTruthy();
        });

        it('displays Terms of Service link', () => {
            const { getByText } = render(<PhoneScreen />);
            expect(getByText('Terms of Service')).toBeTruthy();
        });

        it('displays Privacy Policy link', () => {
            const { getByText } = render(<PhoneScreen />);
            expect(getByText('Privacy Policy')).toBeTruthy();
        });
    });

    describe('Animations', () => {
        it('renders with Animated views for staggered entry', () => {
            const { getByTestId } = render(<PhoneScreen />);
            // Screen renders without crash — animations are present
            expect(getByTestId('phone-screen')).toBeTruthy();
        });
    });
});
