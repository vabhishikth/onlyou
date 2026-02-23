/**
 * useNotifications Hook Tests
 * TDD: Tests written FIRST, then implementation.
 *
 * Tests push token registration flow:
 * 1. Request permission
 * 2. Get Expo Push Token
 * 3. Call registerDeviceToken mutation
 * 4. Cleanup on logout (removeDeviceToken)
 */

import { renderHook, act } from '@testing-library/react-native';

// Use var for jest.mock hoisting compatibility
var mockGetPermissionsAsync = jest.fn();
var mockRequestPermissionsAsync = jest.fn();
var mockGetExpoPushTokenAsync = jest.fn();
var mockRegisterMutate = jest.fn();
var mockRemoveMutate = jest.fn();

jest.mock('expo-notifications', () => ({
    getPermissionsAsync: (...args: any[]) => mockGetPermissionsAsync(...args),
    requestPermissionsAsync: (...args: any[]) => mockRequestPermissionsAsync(...args),
    getExpoPushTokenAsync: (...args: any[]) => mockGetExpoPushTokenAsync(...args),
    addNotificationReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    setNotificationHandler: jest.fn(),
    AndroidImportance: { MAX: 5 },
    setNotificationChannelAsync: jest.fn(),
}));

jest.mock('expo-device', () => ({
    isDevice: true,
}));

jest.mock('react-native', () => ({
    Platform: { OS: 'android' },
}));

jest.mock('@apollo/client', () => ({
    ...jest.requireActual('@apollo/client'),
    useMutation: jest.fn().mockImplementation((mutation: any) => {
        const mutationStr = mutation?.loc?.source?.body || '';
        if (mutationStr.includes('removeDeviceToken')) {
            return [mockRemoveMutate, { loading: false }];
        }
        return [mockRegisterMutate, { loading: false }];
    }),
    gql: jest.fn((strings: TemplateStringsArray) => ({
        loc: { source: { body: strings[0] } },
    })),
}));

import { useNotifications } from '../useNotifications';

describe('useNotifications', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should request permission and register token when permission granted', async () => {
        mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
        mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });
        mockGetExpoPushTokenAsync.mockResolvedValue({
            data: 'ExponentPushToken[abc123]',
        });
        mockRegisterMutate.mockResolvedValue({ data: { registerDeviceToken: { id: '1' } } });

        const { result } = renderHook(() => useNotifications());

        await act(async () => {
            await result.current.registerForPushNotifications();
        });

        expect(mockRequestPermissionsAsync).toHaveBeenCalled();
        expect(mockGetExpoPushTokenAsync).toHaveBeenCalled();
        expect(mockRegisterMutate).toHaveBeenCalledWith({
            variables: {
                token: 'ExponentPushToken[abc123]',
                platform: 'android',
            },
        });
        expect(result.current.expoPushToken).toBe('ExponentPushToken[abc123]');
    });

    it('should skip registration when permission denied', async () => {
        mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
        mockRequestPermissionsAsync.mockResolvedValue({ status: 'denied' });

        const { result } = renderHook(() => useNotifications());

        await act(async () => {
            await result.current.registerForPushNotifications();
        });

        expect(mockGetExpoPushTokenAsync).not.toHaveBeenCalled();
        expect(mockRegisterMutate).not.toHaveBeenCalled();
        expect(result.current.expoPushToken).toBeNull();
    });

    it('should skip permission request when already granted', async () => {
        mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
        mockGetExpoPushTokenAsync.mockResolvedValue({
            data: 'ExponentPushToken[xyz789]',
        });
        mockRegisterMutate.mockResolvedValue({ data: { registerDeviceToken: { id: '2' } } });

        const { result } = renderHook(() => useNotifications());

        await act(async () => {
            await result.current.registerForPushNotifications();
        });

        expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
        expect(mockGetExpoPushTokenAsync).toHaveBeenCalled();
        expect(mockRegisterMutate).toHaveBeenCalled();
    });

    it('should call removeDeviceToken on unregister', async () => {
        mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
        mockGetExpoPushTokenAsync.mockResolvedValue({
            data: 'ExponentPushToken[abc123]',
        });
        mockRegisterMutate.mockResolvedValue({ data: { registerDeviceToken: { id: '1' } } });
        mockRemoveMutate.mockResolvedValue({ data: { removeDeviceToken: { success: true } } });

        const { result } = renderHook(() => useNotifications());

        await act(async () => {
            await result.current.registerForPushNotifications();
        });

        await act(async () => {
            await result.current.unregisterPushNotifications();
        });

        expect(mockRemoveMutate).toHaveBeenCalledWith({
            variables: { token: 'ExponentPushToken[abc123]' },
        });
        expect(result.current.expoPushToken).toBeNull();
    });

    it('should handle errors gracefully', async () => {
        mockGetPermissionsAsync.mockRejectedValue(new Error('Permission check failed'));

        const { result } = renderHook(() => useNotifications());

        await act(async () => {
            await result.current.registerForPushNotifications();
        });

        expect(result.current.error).toBe('Permission check failed');
        expect(result.current.expoPushToken).toBeNull();
    });
});
