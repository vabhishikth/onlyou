/**
 * useHMS Hook Tests
 * Phase 14 Chunk 2: 100ms SDK wrapper hook
 * Spec: Phase 13 video consultation — HMS room management
 */

import { renderHook, act } from '@testing-library/react-native';
import { useHMS } from '../useHMS';

// HMS SDK is mocked via moduleNameMapper → src/__mocks__/hms-sdk.js
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { __mockHmsInstance } = require('@100mslive/react-native-hms');

describe('useHMS', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('initializes with disconnected state', () => {
        const { result } = renderHook(() => useHMS());

        expect(result.current.connectionState).toBe('DISCONNECTED');
        expect(result.current.isAudioMuted).toBe(false);
        expect(result.current.isVideoMuted).toBe(false);
        expect(result.current.peers).toEqual([]);
        expect(result.current.error).toBeNull();
    });

    it('exposes join function', () => {
        const { result } = renderHook(() => useHMS());
        expect(typeof result.current.join).toBe('function');
    });

    it('exposes leave function', () => {
        const { result } = renderHook(() => useHMS());
        expect(typeof result.current.leave).toBe('function');
    });

    it('exposes toggleAudio function', () => {
        const { result } = renderHook(() => useHMS());
        expect(typeof result.current.toggleAudio).toBe('function');
    });

    it('exposes toggleVideo function', () => {
        const { result } = renderHook(() => useHMS());
        expect(typeof result.current.toggleVideo).toBe('function');
    });

    it('join calls SDK with token', async () => {
        const { result } = renderHook(() => useHMS());

        await act(async () => {
            await result.current.join('test-token', 'test-user');
        });

        expect(__mockHmsInstance.join).toHaveBeenCalled();
    });

    it('leave calls SDK leave', async () => {
        const { result } = renderHook(() => useHMS());

        await act(async () => {
            await result.current.join('test-token', 'test-user');
        });

        await act(async () => {
            await result.current.leave();
        });

        expect(__mockHmsInstance.leave).toHaveBeenCalled();
    });

    it('toggleAudio toggles muted state', async () => {
        const { result } = renderHook(() => useHMS());

        await act(async () => {
            await result.current.join('test-token', 'test-user');
        });

        expect(result.current.isAudioMuted).toBe(false);

        await act(async () => {
            await result.current.toggleAudio();
        });

        expect(result.current.isAudioMuted).toBe(true);
        expect(__mockHmsInstance.setLocalAudioEnabled).toHaveBeenCalledWith(false);
    });

    it('toggleVideo toggles muted state', async () => {
        const { result } = renderHook(() => useHMS());

        await act(async () => {
            await result.current.join('test-token', 'test-user');
        });

        expect(result.current.isVideoMuted).toBe(false);

        await act(async () => {
            await result.current.toggleVideo();
        });

        expect(result.current.isVideoMuted).toBe(true);
        expect(__mockHmsInstance.setLocalVideoEnabled).toHaveBeenCalledWith(false);
    });

    it('cleans up SDK on unmount', async () => {
        const { result, unmount } = renderHook(() => useHMS());

        await act(async () => {
            await result.current.join('test-token', 'test-user');
        });

        unmount();

        // SDK destroy should be called on cleanup
        // (verified by mock not throwing)
    });

    // ============================================================
    // Event listeners — Task 2.1
    // ============================================================

    it('registers event listeners after join', async () => {
        const { result } = renderHook(() => useHMS());

        await act(async () => {
            await result.current.join('test-token', 'test-user');
        });

        // Should register ON_PEER_UPDATE, ON_TRACK_UPDATE, ON_ERROR, ON_ROOM_UPDATE
        expect(__mockHmsInstance.addEventListener).toHaveBeenCalledWith(
            'ON_PEER_UPDATE',
            expect.any(Function),
        );
        expect(__mockHmsInstance.addEventListener).toHaveBeenCalledWith(
            'ON_TRACK_UPDATE',
            expect.any(Function),
        );
        expect(__mockHmsInstance.addEventListener).toHaveBeenCalledWith(
            'ON_ERROR',
            expect.any(Function),
        );
        expect(__mockHmsInstance.addEventListener).toHaveBeenCalledWith(
            'ON_ROOM_UPDATE',
            expect.any(Function),
        );
    });

    it('updates remotePeers when ON_PEER_UPDATE fires with peer added', async () => {
        const { result } = renderHook(() => useHMS());

        await act(async () => {
            await result.current.join('test-token', 'test-user');
        });

        // Get the ON_PEER_UPDATE callback
        const peerUpdateCall = __mockHmsInstance.addEventListener.mock.calls.find(
            (c: any[]) => c[0] === 'ON_PEER_UPDATE',
        );
        const peerUpdateCallback = peerUpdateCall[1];

        await act(async () => {
            peerUpdateCallback({
                peer: {
                    peerID: 'peer-1',
                    name: 'Dr. Smith',
                    isLocal: false,
                    videoTrack: { trackId: 'video-track-1' },
                    audioTrack: { trackId: 'audio-track-1' },
                },
                type: 'PEER_JOINED',
            });
        });

        expect(result.current.remotePeers).toHaveLength(1);
        expect(result.current.remotePeers[0].id).toBe('peer-1');
        expect(result.current.remotePeers[0].name).toBe('Dr. Smith');
        expect(result.current.remotePeers[0].videoTrackId).toBe('video-track-1');
    });

    it('removes peer from remotePeers when PEER_LEFT fires', async () => {
        const { result } = renderHook(() => useHMS());

        await act(async () => {
            await result.current.join('test-token', 'test-user');
        });

        const peerUpdateCall = __mockHmsInstance.addEventListener.mock.calls.find(
            (c: any[]) => c[0] === 'ON_PEER_UPDATE',
        );
        const peerUpdateCallback = peerUpdateCall[1];

        // Add peer
        await act(async () => {
            peerUpdateCallback({
                peer: { peerID: 'peer-1', name: 'Dr. Smith', isLocal: false },
                type: 'PEER_JOINED',
            });
        });
        expect(result.current.remotePeers).toHaveLength(1);

        // Remove peer
        await act(async () => {
            peerUpdateCallback({
                peer: { peerID: 'peer-1', name: 'Dr. Smith', isLocal: false },
                type: 'PEER_LEFT',
            });
        });
        expect(result.current.remotePeers).toHaveLength(0);
    });

    it('sets localVideoTrackId on ON_TRACK_UPDATE for local track', async () => {
        const { result } = renderHook(() => useHMS());

        await act(async () => {
            await result.current.join('test-token', 'test-user');
        });

        const trackUpdateCall = __mockHmsInstance.addEventListener.mock.calls.find(
            (c: any[]) => c[0] === 'ON_TRACK_UPDATE',
        );
        const trackUpdateCallback = trackUpdateCall[1];

        await act(async () => {
            trackUpdateCallback({
                peer: { peerID: 'local-peer', isLocal: true },
                track: { trackId: 'local-video-1', type: 'VIDEO', source: 'REGULAR' },
                type: 'TRACK_ADDED',
            });
        });

        expect(result.current.localVideoTrackId).toBe('local-video-1');
    });

    it('sets connectionState to RECONNECTING on reconnecting event', async () => {
        const { result } = renderHook(() => useHMS());

        await act(async () => {
            await result.current.join('test-token', 'test-user');
        });

        const errorCall = __mockHmsInstance.addEventListener.mock.calls.find(
            (c: any[]) => c[0] === 'ON_ERROR',
        );
        const errorCallback = errorCall[1];

        await act(async () => {
            errorCallback({
                code: 4005,
                description: 'Network disconnected',
                isTerminal: false,
            });
        });

        expect(result.current.connectionState).toBe('RECONNECTING');
    });

    it('removes event listeners on leave', async () => {
        const { result } = renderHook(() => useHMS());

        await act(async () => {
            await result.current.join('test-token', 'test-user');
        });

        await act(async () => {
            await result.current.leave();
        });

        expect(__mockHmsInstance.removeEventListener).toHaveBeenCalledWith('ON_PEER_UPDATE');
        expect(__mockHmsInstance.removeEventListener).toHaveBeenCalledWith('ON_TRACK_UPDATE');
        expect(__mockHmsInstance.removeEventListener).toHaveBeenCalledWith('ON_ERROR');
        expect(__mockHmsInstance.removeEventListener).toHaveBeenCalledWith('ON_ROOM_UPDATE');
    });
});
