// Runtime stub for @100mslive/react-native-hms
// Used when the native HMS SDK is not installed (Expo Go / dev builds without native modules)
// Video calling screens will render but actual video functionality requires a custom dev build
// with @100mslive/react-native-hms installed as a native dependency.

const mockHmsInstance = {
    join: async () => {
        console.warn('[HMS Stub] join() called — install @100mslive/react-native-hms for real video');
    },
    leave: async () => {},
    setLocalAudioEnabled: async () => {},
    setLocalVideoEnabled: async () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    destroy: async () => {},
};

export class HMSSDK {
    static async build() {
        return mockHmsInstance;
    }
}

export class HMSConfig {
    authToken: string;
    username: string;

    constructor(params: { authToken: string; username: string }) {
        this.authToken = params.authToken;
        this.username = params.username;
    }
}

export const HMSUpdateListenerActions = {
    ON_JOIN: 'ON_JOIN',
    ON_PEER_UPDATE: 'ON_PEER_UPDATE',
    ON_TRACK_UPDATE: 'ON_TRACK_UPDATE',
    ON_ERROR: 'ON_ERROR',
    ON_ROOM_UPDATE: 'ON_ROOM_UPDATE',
    RECONNECTING: 'RECONNECTING',
    RECONNECTED: 'RECONNECTED',
};
