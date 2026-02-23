// Runtime stub for react-native-razorpay
// Used when the native Razorpay SDK is not installed (Expo Go)
// In Expo Go, this simulates a successful payment so the full intake flow can be tested.
// For real payments, create a custom dev build with react-native-razorpay installed.

const RazorpayCheckout = {
    open: async (options: Record<string, unknown>) => {
        console.warn(
            '[Razorpay Stub] open() called — install react-native-razorpay for real payments.\n' +
            'Simulating successful payment for testing...',
        );

        // Simulate a brief delay like a real payment flow
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Return mock payment result matching Razorpay's response shape
        return {
            razorpay_order_id: options.order_id || 'stub_order_id',
            razorpay_payment_id: 'stub_pay_' + Date.now(),
            razorpay_signature: 'stub_signature_for_testing',
        };
    },
};

export default RazorpayCheckout;
