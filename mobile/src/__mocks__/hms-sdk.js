// Manual mock for @100mslive/react-native-hms
// Phase 14 Chunk 2: Used in tests when HMS SDK is not installed

const React = require('react');
const { View } = require('react-native');

const mockHmsInstance = {
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
    setLocalAudioEnabled: jest.fn().mockResolvedValue(undefined),
    setLocalVideoEnabled: jest.fn().mockResolvedValue(undefined),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    destroy: jest.fn().mockResolvedValue(undefined),
};

module.exports = {
    HMSSDK: {
        build: jest.fn().mockResolvedValue(mockHmsInstance),
    },
    HMSConfig: jest.fn().mockImplementation((params) => params),
    HMSUpdateListenerActions: {
        ON_JOIN: 'ON_JOIN',
        ON_PEER_UPDATE: 'ON_PEER_UPDATE',
        ON_TRACK_UPDATE: 'ON_TRACK_UPDATE',
        ON_ERROR: 'ON_ERROR',
        ON_ROOM_UPDATE: 'ON_ROOM_UPDATE',
        RECONNECTING: 'RECONNECTING',
        RECONNECTED: 'RECONNECTED',
    },
    // Mock HmsView component for rendering video tracks
    HmsView: React.forwardRef((props, ref) =>
        React.createElement(View, {
            testID: props.testID || `hms-view-${props.trackId || 'unknown'}`,
            ref,
            ...props,
        }),
    ),
    HMSVideoViewMode: {
        DEFAULT: 'DEFAULT',
        ASPECT_FILL: 'ASPECT_FILL',
        ASPECT_FIT: 'ASPECT_FIT',
    },
    // Export the mock instance for test assertions
    __mockHmsInstance: mockHmsInstance,
};
