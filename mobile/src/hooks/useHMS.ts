import { useState, useRef, useCallback, useEffect } from 'react';
import { HMSSDK, HMSConfig } from '@100mslive/react-native-hms';

// Spec: Phase 14 Chunk 2 — Custom hook wrapping 100ms React Native SDK

export type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING';

export interface HMSPeer {
    id: string;
    name: string;
    isLocal: boolean;
}

export interface UseHMSReturn {
    join: (token: string, userName: string) => Promise<void>;
    leave: () => Promise<void>;
    toggleAudio: () => Promise<void>;
    toggleVideo: () => Promise<void>;
    peers: HMSPeer[];
    isAudioMuted: boolean;
    isVideoMuted: boolean;
    connectionState: ConnectionState;
    error: string | null;
}

export function useHMS(): UseHMSReturn {
    const [connectionState, setConnectionState] = useState<ConnectionState>('DISCONNECTED');
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);
    const [peers, setPeers] = useState<HMSPeer[]>([]);
    const [error, setError] = useState<string | null>(null);

    const sdkRef = useRef<any>(null);

    const join = useCallback(async (token: string, userName: string) => {
        try {
            setConnectionState('CONNECTING');
            setError(null);

            const sdk = await HMSSDK.build();
            sdkRef.current = sdk;

            const config = new HMSConfig({ authToken: token, username: userName });
            await sdk.join(config);

            setConnectionState('CONNECTED');
        } catch (err: any) {
            setError(err?.message || 'Failed to join room');
            setConnectionState('DISCONNECTED');
        }
    }, []);

    const leave = useCallback(async () => {
        try {
            if (sdkRef.current) {
                await sdkRef.current.leave();
                setConnectionState('DISCONNECTED');
                setPeers([]);
                setIsAudioMuted(false);
                setIsVideoMuted(false);
            }
        } catch (err: any) {
            setError(err?.message || 'Failed to leave room');
        }
    }, []);

    const toggleAudio = useCallback(async () => {
        if (sdkRef.current) {
            const newState = !isAudioMuted;
            await sdkRef.current.setLocalAudioEnabled(!newState);
            setIsAudioMuted(newState);
        }
    }, [isAudioMuted]);

    const toggleVideo = useCallback(async () => {
        if (sdkRef.current) {
            const newState = !isVideoMuted;
            await sdkRef.current.setLocalVideoEnabled(!newState);
            setIsVideoMuted(newState);
        }
    }, [isVideoMuted]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (sdkRef.current) {
                sdkRef.current.destroy?.();
                sdkRef.current = null;
            }
        };
    }, []);

    return {
        join,
        leave,
        toggleAudio,
        toggleVideo,
        peers,
        isAudioMuted,
        isVideoMuted,
        connectionState,
        error,
    };
}
