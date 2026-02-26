/**
 * Doctor Video Room Tests — Task 3.1: Edge case handling
 * Spec: Phase 14 — Patient disconnect, max duration, beforeunload
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';

// Stable mock router reference to prevent infinite re-renders
const mockPush = jest.fn();
const mockRouter = { push: mockPush };
jest.mock('next/navigation', () => ({
    useRouter: () => mockRouter,
}));

// Mock Apollo
jest.mock('@apollo/client', () => ({
    ...jest.requireActual('@apollo/client'),
    useQuery: jest.fn(() => ({ data: null, loading: false })),
    useMutation: jest.fn(() => [jest.fn(), { loading: false }]),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => {
    const Stub = (props: any) => <span data-testid={props['data-testid']} />;
    return {
        PhoneOff: Stub, Mic: Stub, MicOff: Stub, Video: Stub, VideoOff: Stub,
        Clock: Stub, FileText: Stub, ChevronRight: Stub, ChevronLeft: Stub,
        Image: Stub, AlertTriangle: Stub, X: Stub, Wifi: Stub, WifiOff: Stub,
    };
});

// Mutable HMS state for per-test control
let mockHMSState = {
    isConnected: true,
    peers: [] as any[],
    isAudioEnabled: true,
    isVideoEnabled: true,
    remoteVideoTrack: null as any,
};

// Stable hmsActions reference
const mockJoin = jest.fn().mockResolvedValue(undefined);
const mockLeave = jest.fn().mockResolvedValue(undefined);
const mockSetLocalAudioEnabled = jest.fn();
const mockSetLocalVideoEnabled = jest.fn();
const mockAttachVideo = jest.fn();
const stableHmsActions = {
    join: mockJoin,
    leave: mockLeave,
    setLocalAudioEnabled: mockSetLocalAudioEnabled,
    setLocalVideoEnabled: mockSetLocalVideoEnabled,
    attachVideo: mockAttachVideo,
};

// Selector identity tokens — stable references
const SEL_CONNECTED = Symbol('isConnected');
const SEL_PEERS = Symbol('peers');
const SEL_AUDIO = Symbol('audioEnabled');
const SEL_VIDEO = Symbol('videoEnabled');

jest.mock('@100mslive/react-sdk', () => ({
    useHMSActions: () => stableHmsActions,
    useHMSStore: (selector: any) => {
        if (selector === SEL_CONNECTED) return mockHMSState.isConnected;
        if (selector === SEL_PEERS) return mockHMSState.peers;
        if (selector === SEL_AUDIO) return mockHMSState.isAudioEnabled;
        if (selector === SEL_VIDEO) return mockHMSState.isVideoEnabled;
        // selectVideoTrackByPeerID returns a function-based selector
        if (typeof selector === 'function') {
            return selector(mockHMSState);
        }
        return undefined;
    },
    selectIsConnectedToRoom: SEL_CONNECTED,
    selectPeers: SEL_PEERS,
    selectIsLocalAudioEnabled: SEL_AUDIO,
    selectIsLocalVideoEnabled: SEL_VIDEO,
    selectVideoTrackByPeerID: (_peerId: string) => (state: any) => state.remoteVideoTrack,
    HMSRoomProvider: ({ children }: any) => <>{children}</>,
}));

const mockSession = {
    id: 'vs-1',
    patientName: 'Test Patient',
    consultationId: 'con-1',
    hmsToken: 'test-token',
    roomId: 'room-1',
};

import DoctorVideoRoomPage from '../page';

beforeEach(() => {
    jest.clearAllMocks();
    mockHMSState = {
        isConnected: true,
        peers: [
            { id: 'local-1', isLocal: true, name: 'Doctor' },
            { id: 'patient-1', isLocal: false, name: 'Test Patient', videoTrack: 'vt-1' },
        ],
        isAudioEnabled: true,
        isVideoEnabled: true,
        remoteVideoTrack: { id: 'vt-1', enabled: true },
    };

    // Stable sessionStorage mock
    const storageData: Record<string, string> = {
        activeVideoSession: JSON.stringify(mockSession),
    };
    Object.defineProperty(window, 'sessionStorage', {
        value: {
            getItem: jest.fn((key: string) => storageData[key] || null),
            setItem: jest.fn((key: string, val: string) => { storageData[key] = val; }),
            removeItem: jest.fn((key: string) => { delete storageData[key]; }),
        },
        writable: true,
        configurable: true,
    });
});

describe('DoctorVideoRoomPage — Edge Cases', () => {
    describe('Patient disconnect handling', () => {
        it('shows "Patient disconnected" banner when remote peer leaves', async () => {
            // Start with patient present
            const { rerender } = render(<DoctorVideoRoomPage />);

            await waitFor(() => {
                expect(screen.getByText('Test Patient')).toBeDefined();
            });

            // Patient leaves — remotePeer disappears
            mockHMSState.peers = [
                { id: 'local-1', isLocal: true, name: 'Doctor' },
            ];
            mockHMSState.remoteVideoTrack = null;

            rerender(<DoctorVideoRoomPage />);

            await waitFor(() => {
                expect(screen.getByText(/Patient disconnected/i)).toBeDefined();
            });
        });

        it('hides disconnect banner when patient reconnects', async () => {
            const { rerender } = render(<DoctorVideoRoomPage />);

            // Patient leaves
            mockHMSState.peers = [{ id: 'local-1', isLocal: true, name: 'Doctor' }];
            mockHMSState.remoteVideoTrack = null;
            rerender(<DoctorVideoRoomPage />);

            await waitFor(() => {
                expect(screen.getByText(/Patient disconnected/i)).toBeDefined();
            });

            // Patient reconnects
            mockHMSState.peers = [
                { id: 'local-1', isLocal: true, name: 'Doctor' },
                { id: 'patient-2', isLocal: false, name: 'Test Patient', videoTrack: 'vt-2' },
            ];
            mockHMSState.remoteVideoTrack = { id: 'vt-2', enabled: true };
            rerender(<DoctorVideoRoomPage />);

            await waitFor(() => {
                expect(screen.queryByText(/Patient disconnected/i)).toBeNull();
            });
        });
    });

    describe('Max duration warning', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('shows warning banner at 40 minutes', async () => {
            render(<DoctorVideoRoomPage />);

            // Advance 40 minutes (2400 seconds)
            act(() => {
                jest.advanceTimersByTime(2400 * 1000);
            });

            await waitFor(() => {
                expect(screen.getByText(/40 minutes/i)).toBeDefined();
            });
        });
    });

    describe('Confirm before leaving', () => {
        it('registers beforeunload handler when connected', () => {
            const addEventSpy = jest.spyOn(window, 'addEventListener');
            render(<DoctorVideoRoomPage />);

            expect(addEventSpy).toHaveBeenCalledWith(
                'beforeunload',
                expect.any(Function),
            );
            addEventSpy.mockRestore();
        });
    });

    // Task 4.2: Structured notes (SOAP format)
    describe('Structured notes form', () => {
        it('shows SOAP fields in the complete session form', async () => {
            render(<DoctorVideoRoomPage />);

            // Click "Session Notes" button to open the form
            const notesBtn = screen.getByTitle('Session Notes');
            fireEvent.click(notesBtn);

            await waitFor(() => {
                expect(screen.getByText('Complete Session')).toBeDefined();
            });

            // SOAP fields should be present
            expect(screen.getByPlaceholderText(/Chief Complaint/i)).toBeDefined();
            expect(screen.getByPlaceholderText(/Observations/i)).toBeDefined();
            expect(screen.getByPlaceholderText(/Assessment/i)).toBeDefined();
            expect(screen.getByPlaceholderText(/Plan/i)).toBeDefined();
        });
    });
});
