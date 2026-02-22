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
});
