import '@testing-library/jest-native/extend-expect';

// Mock react-native-reanimated with a complete custom mock (avoid worklets native module issues)
jest.mock('react-native-reanimated', () => {
    const ReactNative = require('react-native');

    const useSharedValue = (initial) => ({ value: initial });
    const useAnimatedStyle = (fn) => fn();
    const withSpring = (value) => value;
    const withTiming = (value, config, callback) => {
        // Immediately call the callback if provided
        if (callback) {
            setTimeout(() => callback(true), 0);
        }
        return value;
    };

    // Mock Easing
    const Easing = {
        ease: 'ease',
        linear: 'linear',
        out: (fn) => fn,
        in: (fn) => fn,
        inOut: (fn) => fn,
    };

    // Mock FadeInUp animation builder
    const createAnimationBuilder = () => {
        const builder = {
            delay: () => builder,
            duration: () => builder,
            springify: () => builder,
            withInitialValues: () => builder,
        };
        return builder;
    };
    const FadeInUp = createAnimationBuilder();

    // Mock runOnJS
    const runOnJS = (fn) => fn;

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
        Easing,
        FadeInUp,
        FadeIn: createAnimationBuilder(),
        FadeOut: createAnimationBuilder(),
        FadeInRight: createAnimationBuilder(),
        FadeOutLeft: createAnimationBuilder(),
        SlideInUp: createAnimationBuilder(),
        SlideOutDown: createAnimationBuilder(),
        runOnJS,
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
    const MockIcon = () => View;
    return {
        ChevronLeft: MockIcon,
        ChevronRight: MockIcon,
        Check: MockIcon,
        Heart: MockIcon,
        Sparkles: MockIcon,
        Scale: MockIcon,
        Flower2: MockIcon,
        Truck: MockIcon,
        FlaskConical: MockIcon,
        ShieldCheck: MockIcon,
        Stethoscope: MockIcon,
        Package: MockIcon,
        MessageCircle: MockIcon,
    };
});

// Mock expo-splash-screen
jest.mock('expo-splash-screen', () => ({
    preventAutoHideAsync: jest.fn(() => Promise.resolve()),
    hideAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-router
const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
};
jest.mock('expo-router', () => ({
    useRouter: () => mockRouter,
    useSegments: () => [],
    useLocalSearchParams: () => ({}),
    Slot: ({ children }) => children,
    Stack: {
        Screen: () => null,
    },
    Link: ({ children }) => children,
}));

// Mock @/theme/fonts
jest.mock('@/theme/fonts', () => ({
    useFonts: () => [true], // Always return fonts loaded
    customFonts: {},
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
    const { View } = require('react-native');
    const React = require('react');
    return {
        SafeAreaProvider: ({ children }) => children,
        SafeAreaView: (props) => React.createElement(View, props),
        useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    };
});

// Mock @apollo/client
const mockUseLazyQuery = jest.fn(() => [
    jest.fn().mockResolvedValue({ data: { lookupPincode: { found: true, city: 'Mumbai', state: 'Maharashtra' } } }),
    { loading: false, data: null },
]);
const mockUseMutation = jest.fn(() => [
    jest.fn().mockResolvedValue({ data: { updateOnboarding: { success: true } } }),
    { loading: false },
]);
const mockUseQuery = jest.fn(() => ({
    data: null,
    loading: false,
    error: null,
    refetch: jest.fn(),
}));
jest.mock('@apollo/client', () => ({
    ...jest.requireActual('@apollo/client'),
    useQuery: mockUseQuery,
    useLazyQuery: mockUseLazyQuery,
    useMutation: mockUseMutation,
    gql: (strings) => strings.join(''),
}));

// Mock @/lib/auth
jest.mock('@/lib/auth', () => ({
    useAuth: jest.fn(() => ({
        user: { id: '1', phone: '+919876543210', name: 'Test User', isProfileComplete: true },
        isAuthenticated: true,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
        refreshSession: jest.fn(),
    })),
    AuthProvider: ({ children }) => children,
}));

// Silence console warnings during tests
global.console = {
    ...console,
    warn: jest.fn(),
    error: jest.fn(),
};
