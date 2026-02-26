/**
 * Doctor Video Sessions — Task 3.2: Improvements
 * Spec: Phase 14 — Poll interval, status badges, filtering
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// Stable mocks
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
}));

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => {
    const Stub = (props: any) => <span data-testid={props['data-testid']} />;
    return {
        Video: Stub, Clock: Stub, AlertTriangle: Stub, CheckCircle: Stub,
        XCircle: Stub, PhoneCall: Stub, User: Stub, Filter: Stub,
    };
});

const now = new Date();
const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

const mockSessions = [
    {
        id: 'vs-today-1',
        consultationId: 'c-1',
        patientName: 'Today Patient',
        patientId: 'p-1',
        status: 'WAITING_FOR_DOCTOR',
        scheduledStartTime: new Date(now.getTime() - 2 * 60 * 1000).toISOString(),
        scheduledEndTime: new Date(now.getTime() + 13 * 60 * 1000).toISOString(),
        recordingConsentGiven: true,
    },
    {
        id: 'vs-today-2',
        consultationId: 'c-2',
        patientName: 'Scheduled Today',
        patientId: 'p-2',
        status: 'SCHEDULED',
        scheduledStartTime: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        scheduledEndTime: new Date(now.getTime() + 2.25 * 60 * 60 * 1000).toISOString(),
        recordingConsentGiven: false,
    },
    {
        id: 'vs-tomorrow',
        consultationId: 'c-3',
        patientName: 'Tomorrow Patient',
        patientId: 'p-3',
        status: 'SCHEDULED',
        scheduledStartTime: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        scheduledEndTime: new Date(now.getTime() + 24.25 * 60 * 60 * 1000).toISOString(),
        recordingConsentGiven: false,
    },
];

// Mutable mock state for useQuery
let mockQueryData: any = { doctorVideoSessions: mockSessions };
let mockQueryLoading = false;
let capturedPollInterval: number | undefined;

jest.mock('@apollo/client', () => ({
    ...jest.requireActual('@apollo/client'),
    useQuery: jest.fn((_query: any, options?: any) => {
        capturedPollInterval = options?.pollInterval;
        return {
            data: mockQueryLoading ? null : mockQueryData,
            loading: mockQueryLoading,
            refetch: jest.fn(),
        };
    }),
    useMutation: jest.fn(() => [jest.fn(), { loading: false }]),
}));

import VideoSessionsPage from '../page';

beforeEach(() => {
    jest.clearAllMocks();
    mockQueryData = { doctorVideoSessions: mockSessions };
    mockQueryLoading = false;
    capturedPollInterval = undefined;
});

describe('VideoSessionsPage — Improvements', () => {
    describe('Poll interval', () => {
        it('uses 5-second poll interval for responsive updates', () => {
            render(<VideoSessionsPage />);
            expect(capturedPollInterval).toBe(5000);
        });
    });

    describe('Status badges', () => {
        it('shows "Patient is waiting!" with pulse for WAITING_FOR_DOCTOR', () => {
            render(<VideoSessionsPage />);
            const badge = screen.getByText('Patient is waiting!');
            expect(badge).toBeDefined();
            expect(badge.className).toMatch(/animate-pulse/);
        });
    });

    describe('Session filtering', () => {
        it('shows only today\'s sessions by default', () => {
            render(<VideoSessionsPage />);
            // Today's sessions should be visible
            expect(screen.getByText('Today Patient')).toBeDefined();
            expect(screen.getByText('Scheduled Today')).toBeDefined();
            // Tomorrow's session should NOT be visible by default
            expect(screen.queryByText('Tomorrow Patient')).toBeNull();
        });

        it('shows all upcoming sessions when toggle is clicked', () => {
            render(<VideoSessionsPage />);
            // Click the "All Upcoming" toggle
            const toggle = screen.getByText(/all upcoming/i);
            fireEvent.click(toggle);

            // Now all sessions should be visible
            expect(screen.getByText('Today Patient')).toBeDefined();
            expect(screen.getByText('Scheduled Today')).toBeDefined();
            expect(screen.getByText('Tomorrow Patient')).toBeDefined();
        });

        it('switches back to today view when Today is clicked', () => {
            render(<VideoSessionsPage />);
            // Click "All Upcoming"
            const allToggle = screen.getByText(/all upcoming/i);
            fireEvent.click(allToggle);
            expect(screen.getByText('Tomorrow Patient')).toBeDefined();

            // Click "Today"
            const todayToggle = screen.getByText(/^today$/i);
            fireEvent.click(todayToggle);
            expect(screen.queryByText('Tomorrow Patient')).toBeNull();
        });
    });
});
