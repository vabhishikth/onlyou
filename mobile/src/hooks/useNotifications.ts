import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useMutation, gql } from '@apollo/client';

// Spec: Notification system — mobile push token registration
// Registers Expo Push Token with backend via registerDeviceToken mutation

const REGISTER_DEVICE_TOKEN = gql`
    mutation RegisterDeviceToken($token: String!, $platform: String!) {
        registerDeviceToken(token: $token, platform: $platform)
    }
`;

const REMOVE_DEVICE_TOKEN = gql`
    mutation RemoveDeviceToken($token: String!) {
        removeDeviceToken(token: $token)
    }
`;

// Configure notification display behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export interface UseNotificationsReturn {
    expoPushToken: string | null;
    error: string | null;
    registerForPushNotifications: () => Promise<void>;
    unregisterPushNotifications: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
    const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const tokenRef = useRef<string | null>(null);

    const [registerMutate] = useMutation(REGISTER_DEVICE_TOKEN);
    const [removeMutate] = useMutation(REMOVE_DEVICE_TOKEN);

    const registerForPushNotifications = useCallback(async () => {
        try {
            setError(null);

            // Check existing permission
            const { status: existingStatus } = await Notifications.getPermissionsAsync();

            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                return;
            }

            // Get Expo Push Token
            const tokenData = await Notifications.getExpoPushTokenAsync();
            const token = tokenData.data;

            // Register with backend
            await registerMutate({
                variables: {
                    token,
                    platform: Platform.OS,
                },
            });

            tokenRef.current = token;
            setExpoPushToken(token);
        } catch (err: any) {
            setError(err?.message || 'Failed to register for push notifications');
        }
    }, [registerMutate]);

    const unregisterPushNotifications = useCallback(async () => {
        try {
            const token = tokenRef.current;
            if (token) {
                await removeMutate({
                    variables: { token },
                });
            }
            tokenRef.current = null;
            setExpoPushToken(null);
        } catch (err: any) {
            setError(err?.message || 'Failed to unregister push notifications');
        }
    }, [removeMutate]);

    // Set up Android notification channel
    useEffect(() => {
        if (Platform.OS === 'android') {
            Notifications.setNotificationChannelAsync('default', {
                name: 'Onlyou',
                importance: Notifications.AndroidImportance.MAX,
            });
        }
    }, []);

    return {
        expoPushToken,
        error,
        registerForPushNotifications,
        unregisterPushNotifications,
    };
}
