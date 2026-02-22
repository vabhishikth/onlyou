import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import VideoSessionsPage from '../page';
import { MARK_NO_SHOW, COMPLETE_VIDEO_SESSION, MARK_AWAITING_LABS } from '@/graphql/doctor-video';

// Spec: Phase 13 — Doctor video session management

// We need a query for doctor's sessions — use myUpcomingVideoSessions
// This query already exists in the backend but we need to define it for the doctor portal
const DOCTOR_VIDEO_SESSIONS = require('@/graphql/doctor-video').DOCTOR_VIDEO_SESSIONS;

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('next/link', () => {
    return ({ children, href, ...props }: any) => (
        <a href={href} {...props}>{children}</a>
    );
});

const now = new Date();
const pastGrace = new Date(now.getTime() - 10 * 60 * 1000); // 10 min ago
const futureSession = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

const mockSessions = [
    {
        id: 'vs-1',
        consultationId: 'consult-1',
        patientName: 'Rahul Sharma',
        patientId: 'patient-1',
        status: 'SCHEDULED',
        scheduledStartTime: pastGrace.toISOString(),
        scheduledEndTime: new Date(pastGrace.getTime() + 15 * 60 * 1000).toISOString(),
        recordingConsentGiven: false,
    },
    {
        id: 'vs-2',
        consultationId: 'consult-2',
        patientName: 'Priya Patel',
        patientId: 'patient-2',
        status: 'IN_PROGRESS',
        scheduledStartTime: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
        scheduledEndTime: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
        recordingConsentGiven: true,
    },
    {
        id: 'vs-3',
        consultationId: 'consult-3',
        patientName: 'Amit Kumar',
        patientId: 'patient-3',
        status: 'COMPLETED',
        scheduledStartTime: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        scheduledEndTime: new Date(now.getTime() - 105 * 60 * 1000).toISOString(),
        recordingConsentGiven: true,
    },
];

const sessionsMock: MockedResponse = {
    request: {
        query: DOCTOR_VIDEO_SESSIONS,
    },
    result: {
        data: { doctorVideoSessions: mockSessions },
    },
};

const emptySessionsMock: MockedResponse = {
    request: {
        query: DOCTOR_VIDEO_SESSIONS,
    },
    result: {
        data: { doctorVideoSessions: [] },
    },
};

const noShowMock: MockedResponse = {
    request: {
        query: MARK_NO_SHOW,
        variables: { videoSessionId: 'vs-1' },
    },
    result: {
        data: {
            markNoShow: {
                status: 'NO_SHOW',
                noShowMarkedBy: 'DOCTOR',
                adminAlert: true,
            },
        },
    },
};

const completeMock: MockedResponse = {
    request: {
        query: COMPLETE_VIDEO_SESSION,
        variables: {
            videoSessionId: 'vs-2',
            notes: 'Follow up in 2 weeks',
            callType: 'VIDEO',
        },
    },
    result: {
        data: {
            completeVideoSession: {
                id: 'vs-2',
                status: 'COMPLETED',
                notes: 'Follow up in 2 weeks',
                callType: 'VIDEO',
                actualEndTime: new Date().toISOString(),
            },
        },
    },
};

function renderWithProvider(mocks: MockedResponse[] = []) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            <VideoSessionsPage />
        </MockedProvider>
    );
}

describe('VideoSessionsPage', () => {
    it('should render loading state', () => {
        renderWithProvider([sessionsMock]);
        expect(screen.getByTestId('sessions-loading')).toBeDefined();
    });

    it('should render session list with patient names', async () => {
        renderWithProvider([sessionsMock]);

        await waitFor(() => {
            expect(screen.getByText('Rahul Sharma')).toBeDefined();
            expect(screen.getByText('Priya Patel')).toBeDefined();
            expect(screen.getByText('Amit Kumar')).toBeDefined();
        });
    });

    it('should show status badges for each session', async () => {
        renderWithProvider([sessionsMock]);

        await waitFor(() => {
            expect(screen.getByText('Scheduled')).toBeDefined();
            expect(screen.getByText('In Progress')).toBeDefined();
            expect(screen.getByText('Completed')).toBeDefined();
        });
    });

    it('should render empty state when no sessions', async () => {
        renderWithProvider([emptySessionsMock]);

        await waitFor(() => {
            expect(screen.getByText(/no video sessions/i)).toBeDefined();
        });
    });

    it('should show mark no-show button for scheduled sessions past grace period', async () => {
        renderWithProvider([sessionsMock, noShowMock]);

        await waitFor(() => {
            expect(screen.getByText('Rahul Sharma')).toBeDefined();
        });

        const noShowButton = screen.getByTestId('no-show-vs-1');
        expect(noShowButton).toBeDefined();
    });

    it('should show complete session button for in-progress sessions', async () => {
        renderWithProvider([sessionsMock, completeMock]);

        await waitFor(() => {
            expect(screen.getByText('Priya Patel')).toBeDefined();
        });

        const completeButton = screen.getByTestId('complete-vs-2');
        expect(completeButton).toBeDefined();
    });

    it('should show notes input when completing a session', async () => {
        renderWithProvider([sessionsMock, completeMock]);

        await waitFor(() => {
            expect(screen.getByText('Priya Patel')).toBeDefined();
        });

        const completeButton = screen.getByTestId('complete-vs-2');
        fireEvent.click(completeButton);

        expect(screen.getByTestId('session-notes-input')).toBeDefined();
        expect(screen.getByTestId('call-type-select')).toBeDefined();
    });
});
