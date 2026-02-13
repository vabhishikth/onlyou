import '@testing-library/jest-native/extend-expect';

// Mock react-native-reanimated with a complete custom mock (avoid worklets native module issues)
jest.mock('react-native-reanimated', () => {
    const ReactNative = require('react-native');

    const useSharedValue = (initial) => ({ value: initial });
    const useAnimatedStyle = (fn) => fn();
    const withSpring = (value) => value;
    const withTiming = (value) => value;

    return {
        default: {
            createAnimatedComponent: (Component) => Component,
            View: ReactNative.View,
            Text: ReactNative.Text,
            call: () => { },
        },
        useSharedValue,
        useAnimatedStyle,
        withSpring,
        withTiming,
        interpolate: (value, inputRange, outputRange) => outputRange[0],
        createAnimatedComponent: (Component) => Component,
        View: ReactNative.View,
        Text: ReactNative.Text,
        Animated: {
            View: ReactNative.View,
            Text: ReactNative.Text,
            createAnimatedComponent: (Component) => Component,
        },
    };
});

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
    impactAsync: jest.fn(),
    ImpactFeedbackStyle: {
        Light: 'light',
        Medium: 'medium',
        Heavy: 'heavy',
    },
}));

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => {
    const { View } = require('react-native');
    return {
        LinearGradient: View,
    };
});

// Mock lucide-react-native
jest.mock('lucide-react-native', () => {
    const { View } = require('react-native');
    return {
        ChevronLeft: () => View,
        Check: () => View,
    };
});

// Silence console warnings during tests
global.console = {
    ...console,
    warn: jest.fn(),
    error: jest.fn(),
};
