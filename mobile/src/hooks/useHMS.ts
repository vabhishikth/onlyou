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
        // ON_JOIN fires when we successfully enter the room (backup path).
        // Primary CONNECTED + peer detection happens in join() after sdk.join() resolves.
        // This handler catches cases where the SDK fires ON_JOIN before our await returns.
        sdk.addEventListener(
            HMSUpdateListenerActions.ON_JOIN,
            (data: any) => {
                setConnectionState('CONNECTED');
                const existingPeers: any[] = data?.room?.peers || [];
                const initial: RemotePeer[] = existingPeers
                    .filter((p: any) => !p.isLocal)
                    .map((p: any) => ({
                        id: p.peerID,
                        name: p.name || 'Peer',
                        videoTrackId: p.videoTrack?.trackId,
                        audioTrackId: p.audioTrack?.trackId,
                    }));
                if (initial.length > 0) {
                    setRemotePeers((prev) => {
                        // Don't overwrite if join() already populated from sdk.room.peers
                        if (prev.length > 0) return prev;
                        return initial;
                    });
                }
            },
        );

        // Peer updates: join, leave, role change (for peers who join AFTER us)
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
        // Use functional setter to avoid stale closure over connectionState
        sdk.addEventListener(
            HMSUpdateListenerActions.ON_ROOM_UPDATE,
            (data: any) => {
                if (data?.type === 'RECONNECTED') {
                    setConnectionState((prev) =>
                        prev === 'RECONNECTING' ? 'CONNECTED' : prev,
                    );
                }
            },
        );
    }, []);

    const removeEventListeners = useCallback((sdk: any) => {
        sdk.removeEventListener(HMSUpdateListenerActions.ON_JOIN);
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

            // Register listeners BEFORE sdk.join() so we don't miss ON_JOIN or any
            // PEER_JOINED events that fire during the join handshake (e.g. doctor already in room)
            registerEventListeners(sdk);

            const config = new HMSConfig({ authToken: token, username: userName });
            await sdk.join(config);

            // sdk.join() resolves when we are fully in the room.
            // Set CONNECTED here as the primary path — ON_JOIN is a backup that may
            // or may not fire synchronously depending on the SDK build.
            setConnectionState('CONNECTED');

            // After joining, read peers already in the room directly from the SDK.
            // This catches the doctor if they joined before the patient. ON_JOIN may
            // not populate data.room.peers reliably on all SDK versions.
            const existingPeers: any[] = sdk.room?.peers ?? [];
            const initial: RemotePeer[] = existingPeers
                .filter((p: any) => !p.isLocal)
                .map((p: any) => ({
                    id: p.peerID,
                    name: p.name || 'Peer',
                    videoTrackId: p.videoTrack?.trackId,
                    audioTrackId: p.audioTrack?.trackId,
                }));
            if (initial.length > 0) {
                setRemotePeers(initial);
            }
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
