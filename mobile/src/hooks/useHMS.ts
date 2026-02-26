import { useState, useRef, useCallback, useEffect } from 'react';
import { HMSSDK, HMSConfig, HMSUpdateListenerActions } from '@100mslive/react-native-hms';

// Spec: Phase 14 Chunk 2 — Custom hook wrapping 100ms React Native SDK
// Task 2.1: Enhanced with event listeners, peer tracking, reconnection state

export type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING';

export interface HMSPeer {
    id: string;
    name: string;
    isLocal: boolean;
}

export interface RemotePeer {
    id: string;
    name: string;
    videoTrackId?: string;
    audioTrackId?: string;
}

export interface UseHMSReturn {
    join: (token: string, userName: string) => Promise<void>;
    leave: () => Promise<void>;
    toggleAudio: () => Promise<void>;
    toggleVideo: () => Promise<void>;
    peers: HMSPeer[];
    remotePeers: RemotePeer[];
    localVideoTrackId: string | null;
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
    const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
    const [localVideoTrackId, setLocalVideoTrackId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const sdkRef = useRef<any>(null);

    const registerEventListeners = useCallback((sdk: any) => {
        // Peer updates: join, leave, role change
        sdk.addEventListener(
            HMSUpdateListenerActions.ON_PEER_UPDATE,
            (data: any) => {
                const { peer, type } = data;
                if (peer.isLocal) return;

                if (type === 'PEER_JOINED') {
                    setRemotePeers((prev) => {
                        // Avoid duplicates
                        if (prev.some((p) => p.id === peer.peerID)) return prev;
                        return [
                            ...prev,
                            {
                                id: peer.peerID,
                                name: peer.name || 'Peer',
                                videoTrackId: peer.videoTrack?.trackId,
                                audioTrackId: peer.audioTrack?.trackId,
                            },
                        ];
                    });
                } else if (type === 'PEER_LEFT') {
                    setRemotePeers((prev) => prev.filter((p) => p.id !== peer.peerID));
                }
            },
        );

        // Track updates: added, removed, muted, unmuted
        sdk.addEventListener(
            HMSUpdateListenerActions.ON_TRACK_UPDATE,
            (data: any) => {
                const { peer, track, type } = data;
                if (
                    peer.isLocal &&
                    track?.type === 'VIDEO' &&
                    track?.source === 'REGULAR' &&
                    type === 'TRACK_ADDED'
                ) {
                    setLocalVideoTrackId(track.trackId);
                }

                // Update remote peer track IDs
                if (!peer.isLocal && track?.type === 'VIDEO') {
                    setRemotePeers((prev) =>
                        prev.map((p) =>
                            p.id === peer.peerID ? { ...p, videoTrackId: track.trackId } : p,
                        ),
                    );
                }
            },
        );

        // Error handling: detect reconnection
        sdk.addEventListener(
            HMSUpdateListenerActions.ON_ERROR,
            (data: any) => {
                if (!data.isTerminal) {
                    // Non-terminal error = reconnecting
                    setConnectionState('RECONNECTING');
                } else {
                    setError(data.description || 'Connection error');
                    setConnectionState('DISCONNECTED');
                }
            },
        );

        // Room updates: detect reconnection complete
        sdk.addEventListener(
            HMSUpdateListenerActions.ON_ROOM_UPDATE,
            (data: any) => {
                if (data?.type === 'ROOM_PEER_COUNT_UPDATED' || data?.type === 'RECONNECTED') {
                    if (connectionState === 'RECONNECTING') {
                        setConnectionState('CONNECTED');
                    }
                }
            },
        );
    }, [connectionState]);

    const removeEventListeners = useCallback((sdk: any) => {
        sdk.removeEventListener(HMSUpdateListenerActions.ON_PEER_UPDATE);
        sdk.removeEventListener(HMSUpdateListenerActions.ON_TRACK_UPDATE);
        sdk.removeEventListener(HMSUpdateListenerActions.ON_ERROR);
        sdk.removeEventListener(HMSUpdateListenerActions.ON_ROOM_UPDATE);
    }, []);

    const join = useCallback(async (token: string, userName: string) => {
        try {
            setConnectionState('CONNECTING');
            setError(null);

            const sdk = await HMSSDK.build();
            sdkRef.current = sdk;

            const config = new HMSConfig({ authToken: token, username: userName });
            await sdk.join(config);

            registerEventListeners(sdk);

            setConnectionState('CONNECTED');
        } catch (err: any) {
            setError(err?.message || 'Failed to join room');
            setConnectionState('DISCONNECTED');
        }
    }, [registerEventListeners]);

    const leave = useCallback(async () => {
        try {
            if (sdkRef.current) {
                removeEventListeners(sdkRef.current);
                await sdkRef.current.leave();
                setConnectionState('DISCONNECTED');
                setPeers([]);
                setRemotePeers([]);
                setLocalVideoTrackId(null);
                setIsAudioMuted(false);
                setIsVideoMuted(false);
            }
        } catch (err: any) {
            setError(err?.message || 'Failed to leave room');
        }
    }, [removeEventListeners]);

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
        remotePeers,
        localVideoTrackId,
        isAudioMuted,
        isVideoMuted,
        connectionState,
        error,
    };
}
