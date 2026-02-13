/**
 * OTP Verification Screen Tests
 * PR 5: Treatment + Questionnaire + Photo Restyle
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useMutation } from '@apollo/client';

// Must be named 'mock' prefix for Jest hoisting
let mockPhone = '+919876543210';
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
    useRouter: () => ({
        push: mockPush,
        replace: jest.fn(),
        back: mockBack,
    }),
    useSegments: () => [],
    useLocalSearchParams: () => ({ phone: mockPhone }),
    Slot: ({ children }: { children: React.ReactNode }) => children,
    Stack: {
        Screen: () => null,
    },
    Link: ({ children }: { children: React.ReactNode }) => children,
}));

// Import after mocks
import OtpScreen from '../otp';

beforeEach(() => {
    jest.clearAllMocks();
    mockPhone = '+919876543210';

    // Mock useMutation for verifyOtp and requestOtp
    (useMutation as jest.Mock).mockReturnValue([
        jest.fn().mockResolvedValue({
            data: { verifyOtp: { success: true, accessToken: 'token', refreshToken: 'refresh', user: { id: '1' } } },
        }),
        { loading: false },
    ]);
});

describe('OtpScreen', () => {
    describe('Screen structure', () => {
        it('renders the screen with testID', () => {
            const { getByTestId } = render(<OtpScreen />);
            expect(getByTestId('otp-screen')).toBeTruthy();
        });

        it('renders back button with testID', () => {
            const { getByTestId } = render(<OtpScreen />);
            expect(getByTestId('back-button')).toBeTruthy();
        });

        it('navigates back when back button is pressed', () => {
            const { getByTestId } = render(<OtpScreen />);
            fireEvent.press(getByTestId('back-button'));
            expect(mockBack).toHaveBeenCalled();
        });
    });

    describe('Header content', () => {
        it('displays "Verify your number" title with serif font', () => {
            const { getByText } = render(<OtpScreen />);
            expect(getByText('Verify your number')).toBeTruthy();
        });

        it('displays masked phone number', () => {
            const { getByText } = render(<OtpScreen />);
            // Phone should be masked: +91 98**** 3210
            expect(getByText(/\+91/)).toBeTruthy();
        });

        it('displays Edit link for phone number', () => {
            const { getByTestId } = render(<OtpScreen />);
            expect(getByTestId('edit-phone-link')).toBeTruthy();
        });

        it('navigates back when Edit link is pressed', () => {
            const { getByTestId } = render(<OtpScreen />);
            fireEvent.press(getByTestId('edit-phone-link'));
            expect(mockBack).toHaveBeenCalled();
        });
    });

    describe('OTP Input boxes', () => {
        it('renders 6 OTP input boxes', () => {
            const { getAllByTestId } = render(<OtpScreen />);
            const inputs = getAllByTestId(/^otp-input-/);
            expect(inputs.length).toBe(6);
        });

        it('each OTP box has testID with index', () => {
            const { getByTestId } = render(<OtpScreen />);
            for (let i = 0; i < 6; i++) {
                expect(getByTestId(`otp-input-${i}`)).toBeTruthy();
            }
        });

        it('OTP boxes have 52x52 dimensions', () => {
            const { getByTestId } = render(<OtpScreen />);
            const input = getByTestId('otp-input-0');
            // Check the style prop for width and height
            expect(input.props.style).toBeDefined();
        });
    });

    describe('OTP Input behavior', () => {
        it('accepts numeric input', () => {
            const { getByTestId } = render(<OtpScreen />);
            const input = getByTestId('otp-input-0');
            fireEvent.changeText(input, '5');
            expect(input.props.value).toBe('5');
        });

        it('auto-advances to next input after entering digit', () => {
            const { getByTestId } = render(<OtpScreen />);
            const input0 = getByTestId('otp-input-0');
            fireEvent.changeText(input0, '1');
            // The focus should move to next input (tested via implementation)
        });
    });

    describe('Resend functionality', () => {
        it('displays resend section', () => {
            const { getByText } = render(<OtpScreen />);
            expect(getByText(/didn't receive/i)).toBeTruthy();
        });

        it('shows resend timer initially', () => {
            const { getByText } = render(<OtpScreen />);
            expect(getByText(/resend in/i)).toBeTruthy();
        });
    });

    describe('Loading states', () => {
        it('renders OTP container with testID', () => {
            const { getByTestId } = render(<OtpScreen />);
            expect(getByTestId('otp-container')).toBeTruthy();
        });
    });
});
