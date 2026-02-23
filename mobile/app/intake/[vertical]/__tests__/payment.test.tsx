/**
 * Payment Screen Tests
 * PR 14: Payment Integration — Razorpay checkout in intake flow
 * Spec: master spec Section 12 — Razorpay Integration
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// Mock react-native-razorpay
const mockRazorpayOpen = jest.fn();
jest.mock('react-native-razorpay', () => ({
    default: {
        open: mockRazorpayOpen,
    },
}));

// Override expo-router mock with payment params
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
    useRouter: () => ({
        push: mockPush,
        replace: mockReplace,
        back: mockBack,
    }),
    useSegments: () => [],
    useLocalSearchParams: () => ({
        vertical: 'hair-loss',
        responses: '{"duration":"Less than 6 months"}',
        photos: '[]',
        planId: 'plan-hl-1',
        amountPaise: '99900',
        planName: 'Hair Loss Monthly',
        durationMonths: '1',
    }),
    Slot: ({ children }: any) => children,
    Stack: { Screen: () => null },
    Link: ({ children }: any) => children,
}));

// Get mocked mutation function
const mockUseMutation = require('@apollo/client').useMutation;

// Import after mocks
import PaymentScreen from '../payment';

// Mock mutation functions
const mockCreatePaymentOrder = jest.fn();
const mockVerifyPayment = jest.fn();
const mockSubmitIntake = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();

    // Default: return 3 mutation hooks in order
    // 1st call: createPaymentOrder
    // 2nd call: verifyPayment
    // 3rd call: submitIntake
    let callIndex = 0;
    mockUseMutation.mockImplementation(() => {
        const fns = [mockCreatePaymentOrder, mockVerifyPayment, mockSubmitIntake];
        const fn = fns[callIndex] || jest.fn();
        callIndex++;
        return [fn, { loading: false }];
    });
});

describe('PaymentScreen', () => {
    describe('Rendering', () => {
        it('renders payment summary header', () => {
            const { getByText } = render(<PaymentScreen />);
            expect(getByText('Payment')).toBeTruthy();
        });

        it('displays plan name', () => {
            const { getByText } = render(<PaymentScreen />);
            expect(getByText(/Hair Loss Monthly/)).toBeTruthy();
        });

        it('displays formatted amount', () => {
            const { getByText } = render(<PaymentScreen />);
            expect(getByText(/₹999/)).toBeTruthy();
        });

        it('shows secure payment notice', () => {
            const { getByText } = render(<PaymentScreen />);
            expect(getByText(/Secure payment/i)).toBeTruthy();
        });

        it('renders Pay button with amount', () => {
            const { getByTestId } = render(<PaymentScreen />);
            expect(getByTestId('pay-button')).toBeTruthy();
        });
    });

    describe('Payment flow', () => {
        it('calls createPaymentOrder when Pay button pressed', async () => {
            mockCreatePaymentOrder.mockResolvedValue({
                data: {
                    createPaymentOrder: {
                        success: true,
                        paymentId: 'pay-123',
                        razorpayOrderId: 'order_abc123',
                        amountPaise: 99900,
                        currency: 'INR',
                    },
                },
            });

            const { getByTestId } = render(<PaymentScreen />);

            await act(async () => {
                fireEvent.press(getByTestId('pay-button'));
            });

            expect(mockCreatePaymentOrder).toHaveBeenCalledWith({
                variables: {
                    input: expect.objectContaining({
                        amountPaise: 99900,
                        planId: 'plan-hl-1',
                        vertical: 'HAIR_LOSS',
                    }),
                },
            });
        });

        it('opens Razorpay checkout after order created', async () => {
            mockCreatePaymentOrder.mockResolvedValue({
                data: {
                    createPaymentOrder: {
                        success: true,
                        paymentId: 'pay-123',
                        razorpayOrderId: 'order_abc123',
                        amountPaise: 99900,
                        currency: 'INR',
                    },
                },
            });

            mockRazorpayOpen.mockResolvedValue({
                razorpay_payment_id: 'rpay_123',
                razorpay_order_id: 'order_abc123',
                razorpay_signature: 'sig_abc',
            });

            const { getByTestId } = render(<PaymentScreen />);

            await act(async () => {
                fireEvent.press(getByTestId('pay-button'));
            });

            expect(mockRazorpayOpen).toHaveBeenCalledWith(
                expect.objectContaining({
                    order_id: 'order_abc123',
                    amount: 99900,
                    currency: 'INR',
                    name: 'Onlyou',
                }),
            );
        });

        it('calls verifyPayment after Razorpay success', async () => {
            mockCreatePaymentOrder.mockResolvedValue({
                data: {
                    createPaymentOrder: {
                        success: true,
                        paymentId: 'pay-123',
                        razorpayOrderId: 'order_abc123',
                        amountPaise: 99900,
                        currency: 'INR',
                    },
                },
            });

            mockRazorpayOpen.mockResolvedValue({
                razorpay_payment_id: 'rpay_123',
                razorpay_order_id: 'order_abc123',
                razorpay_signature: 'sig_abc',
            });

            mockVerifyPayment.mockResolvedValue({
                data: { verifyPayment: { success: true, message: 'Verified' } },
            });

            mockSubmitIntake.mockResolvedValue({
                data: {
                    submitIntake: {
                        success: true,
                        consultation: { id: 'consult-1', vertical: 'HAIR_LOSS', status: 'PENDING' },
                    },
                },
            });

            const { getByTestId } = render(<PaymentScreen />);

            await act(async () => {
                fireEvent.press(getByTestId('pay-button'));
            });

            expect(mockVerifyPayment).toHaveBeenCalledWith({
                variables: {
                    input: {
                        razorpayOrderId: 'order_abc123',
                        razorpayPaymentId: 'rpay_123',
                        razorpaySignature: 'sig_abc',
                    },
                },
            });
        });

        it('submits intake after payment verified', async () => {
            mockCreatePaymentOrder.mockResolvedValue({
                data: {
                    createPaymentOrder: {
                        success: true,
                        paymentId: 'pay-123',
                        razorpayOrderId: 'order_abc123',
                        amountPaise: 99900,
                        currency: 'INR',
                    },
                },
            });

            mockRazorpayOpen.mockResolvedValue({
                razorpay_payment_id: 'rpay_123',
                razorpay_order_id: 'order_abc123',
                razorpay_signature: 'sig_abc',
            });

            mockVerifyPayment.mockResolvedValue({
                data: { verifyPayment: { success: true, message: 'Verified' } },
            });

            mockSubmitIntake.mockResolvedValue({
                data: {
                    submitIntake: {
                        success: true,
                        consultation: { id: 'consult-1', vertical: 'HAIR_LOSS', status: 'PENDING' },
                    },
                },
            });

            const { getByTestId } = render(<PaymentScreen />);

            await act(async () => {
                fireEvent.press(getByTestId('pay-button'));
            });

            expect(mockSubmitIntake).toHaveBeenCalledWith({
                variables: {
                    input: expect.objectContaining({
                        vertical: 'HAIR_LOSS',
                        responses: { duration: 'Less than 6 months' },
                    }),
                },
            });
        });

        it('passes planId to submitIntake after payment', async () => {
            mockCreatePaymentOrder.mockResolvedValue({
                data: {
                    createPaymentOrder: {
                        success: true,
                        paymentId: 'pay-123',
                        razorpayOrderId: 'order_abc123',
                        amountPaise: 99900,
                        currency: 'INR',
                    },
                },
            });

            mockRazorpayOpen.mockResolvedValue({
                razorpay_payment_id: 'rpay_123',
                razorpay_order_id: 'order_abc123',
                razorpay_signature: 'sig_abc',
            });

            mockVerifyPayment.mockResolvedValue({
                data: { verifyPayment: { success: true, message: 'Verified' } },
            });

            mockSubmitIntake.mockResolvedValue({
                data: {
                    submitIntake: {
                        success: true,
                        consultation: { id: 'consult-1', vertical: 'HAIR_LOSS', status: 'PENDING' },
                    },
                },
            });

            const { getByTestId } = render(<PaymentScreen />);

            await act(async () => {
                fireEvent.press(getByTestId('pay-button'));
            });

            expect(mockSubmitIntake).toHaveBeenCalledWith({
                variables: {
                    input: expect.objectContaining({
                        planId: 'plan-hl-1',
                    }),
                },
            });
        });

        it('navigates to complete screen after full flow', async () => {
            mockCreatePaymentOrder.mockResolvedValue({
                data: {
                    createPaymentOrder: {
                        success: true,
                        paymentId: 'pay-123',
                        razorpayOrderId: 'order_abc123',
                        amountPaise: 99900,
                        currency: 'INR',
                    },
                },
            });

            mockRazorpayOpen.mockResolvedValue({
                razorpay_payment_id: 'rpay_123',
                razorpay_order_id: 'order_abc123',
                razorpay_signature: 'sig_abc',
            });

            mockVerifyPayment.mockResolvedValue({
                data: { verifyPayment: { success: true, message: 'Verified' } },
            });

            mockSubmitIntake.mockResolvedValue({
                data: {
                    submitIntake: {
                        success: true,
                        consultation: { id: 'consult-1', vertical: 'HAIR_LOSS', status: 'PENDING' },
                    },
                },
            });

            const { getByTestId } = render(<PaymentScreen />);

            await act(async () => {
                fireEvent.press(getByTestId('pay-button'));
            });

            expect(mockReplace).toHaveBeenCalledWith(
                expect.objectContaining({
                    pathname: '/intake/hair-loss/complete',
                }),
            );
        });
    });

    describe('Error handling', () => {
        it('shows error when createPaymentOrder fails', async () => {
            mockCreatePaymentOrder.mockResolvedValue({
                data: {
                    createPaymentOrder: {
                        success: false,
                        message: 'Order creation failed',
                    },
                },
            });

            const { getByTestId, getByText } = render(<PaymentScreen />);

            await act(async () => {
                fireEvent.press(getByTestId('pay-button'));
            });

            await waitFor(() => {
                expect(getByText(/Order creation failed/)).toBeTruthy();
            });
        });

        it('handles Razorpay cancellation (code 2)', async () => {
            mockCreatePaymentOrder.mockResolvedValue({
                data: {
                    createPaymentOrder: {
                        success: true,
                        paymentId: 'pay-123',
                        razorpayOrderId: 'order_abc123',
                        amountPaise: 99900,
                        currency: 'INR',
                    },
                },
            });

            mockRazorpayOpen.mockRejectedValue({
                code: 2,
                description: 'Payment cancelled by user',
            });

            const { getByTestId, getByText } = render(<PaymentScreen />);

            await act(async () => {
                fireEvent.press(getByTestId('pay-button'));
            });

            await waitFor(() => {
                expect(getByText(/cancelled/i)).toBeTruthy();
            });
        });

        it('handles Razorpay payment failure', async () => {
            mockCreatePaymentOrder.mockResolvedValue({
                data: {
                    createPaymentOrder: {
                        success: true,
                        paymentId: 'pay-123',
                        razorpayOrderId: 'order_abc123',
                        amountPaise: 99900,
                        currency: 'INR',
                    },
                },
            });

            mockRazorpayOpen.mockRejectedValue({
                code: 0,
                description: 'Payment failed',
            });

            const { getByTestId, getByText } = render(<PaymentScreen />);

            await act(async () => {
                fireEvent.press(getByTestId('pay-button'));
            });

            await waitFor(() => {
                expect(getByText(/failed/i)).toBeTruthy();
            });
        });

        it('handles verification failure', async () => {
            mockCreatePaymentOrder.mockResolvedValue({
                data: {
                    createPaymentOrder: {
                        success: true,
                        paymentId: 'pay-123',
                        razorpayOrderId: 'order_abc123',
                        amountPaise: 99900,
                        currency: 'INR',
                    },
                },
            });

            mockRazorpayOpen.mockResolvedValue({
                razorpay_payment_id: 'rpay_123',
                razorpay_order_id: 'order_abc123',
                razorpay_signature: 'sig_abc',
            });

            mockVerifyPayment.mockResolvedValue({
                data: { verifyPayment: { success: false, message: 'Signature mismatch' } },
            });

            const { getByTestId, getByText } = render(<PaymentScreen />);

            await act(async () => {
                fireEvent.press(getByTestId('pay-button'));
            });

            await waitFor(() => {
                expect(getByText(/Signature mismatch/)).toBeTruthy();
            });
        });
    });

    describe('Navigation', () => {
        it('navigates back when back button pressed', () => {
            const { getByText } = render(<PaymentScreen />);
            fireEvent.press(getByText('<'));
            expect(mockBack).toHaveBeenCalled();
        });
    });
});
