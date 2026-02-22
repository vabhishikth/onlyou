import { gql } from '@apollo/client';

// Spec: Phase 14 Chunk 1 — Mobile GraphQL video operations + types

// ============================================
// Status enums (mirror Prisma VideoSessionStatus / BookedSlotStatus)
// ============================================

export type VideoSessionStatus =
    | 'SCHEDULED'
    | 'WAITING_FOR_PATIENT'
    | 'WAITING_FOR_DOCTOR'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'NO_SHOW_PATIENT'
    | 'NO_SHOW_DOCTOR';

export type BookedSlotStatus =
    | 'BOOKED'
    | 'CANCELLED'
    | 'COMPLETED'
    | 'NO_SHOW';

// ============================================
// Response types
// ============================================

export interface AvailableSlotWindow {
    date: string;       // "2026-03-01"
    startTime: string;  // "10:00"
    endTime: string;    // "10:15"
}

export interface AvailableSlotsResponse {
    doctorId: string;
    slots: AvailableSlotWindow[];
    connectivityWarning: string;
}

export interface BookedSlot {
    id: string;
    videoSessionId: string;
    doctorId: string;
    patientId: string;
    consultationId: string;
    slotDate: string;
    startTime: string;
    endTime: string;
    status: BookedSlotStatus;
    createdAt: string;
}

export interface VideoSession {
    id: string;
    consultationId: string;
    doctorId: string;
    patientId: string;
    roomId?: string;
    status: VideoSessionStatus;
    scheduledStartTime: string;
    scheduledEndTime: string;
    actualStartTime?: string;
    actualEndTime?: string;
    durationSeconds?: number;
    recordingConsentGiven: boolean;
    callType: string;
    notes?: string;
    createdAt: string;
}

export interface BookingResponse {
    bookedSlot: BookedSlot;
    videoSession: VideoSession;
    connectivityWarning: string;
}

export interface JoinSessionResponse {
    roomId: string;
    token: string;
}

export interface CancelBookingResult {
    id: string;
    status: BookedSlotStatus;
}

// ============================================
// Queries
// ============================================

export const GET_AVAILABLE_VIDEO_SLOTS = gql`
    query GetAvailableVideoSlots($consultationId: String!) {
        availableVideoSlots(consultationId: $consultationId) {
            doctorId
            slots {
                date
                startTime
                endTime
            }
            connectivityWarning
        }
    }
`;

export const GET_MY_UPCOMING_VIDEO_SESSIONS = gql`
    query GetMyUpcomingVideoSessions {
        myUpcomingVideoSessions {
            id
            videoSessionId
            doctorId
            patientId
            consultationId
            slotDate
            startTime
            endTime
            status
            createdAt
        }
    }
`;

// ============================================
// Mutations
// ============================================

export const BOOK_VIDEO_SLOT = gql`
    mutation BookVideoSlot($consultationId: String!, $slotDate: String!, $startTime: String!) {
        bookVideoSlot(consultationId: $consultationId, slotDate: $slotDate, startTime: $startTime) {
            bookedSlot {
                id
                videoSessionId
                doctorId
                patientId
                consultationId
                slotDate
                startTime
                endTime
                status
            }
            videoSession {
                id
                consultationId
                doctorId
                patientId
                status
                scheduledStartTime
                scheduledEndTime
                recordingConsentGiven
            }
            connectivityWarning
        }
    }
`;

export const CANCEL_VIDEO_BOOKING = gql`
    mutation CancelVideoBooking($bookedSlotId: String!, $reason: String!) {
        cancelVideoBooking(bookedSlotId: $bookedSlotId, reason: $reason) {
            id
            status
        }
    }
`;

export const RESCHEDULE_VIDEO_BOOKING = gql`
    mutation RescheduleVideoBooking($bookedSlotId: String!, $newSlotDate: String!, $newStartTime: String!) {
        rescheduleVideoBooking(bookedSlotId: $bookedSlotId, newSlotDate: $newSlotDate, newStartTime: $newStartTime) {
            bookedSlot {
                id
                videoSessionId
                slotDate
                startTime
                endTime
                status
            }
            videoSession {
                id
                status
                scheduledStartTime
                scheduledEndTime
            }
            connectivityWarning
        }
    }
`;

export const JOIN_VIDEO_SESSION = gql`
    mutation JoinVideoSession($videoSessionId: String!) {
        joinVideoSession(videoSessionId: $videoSessionId) {
            roomId
            token
        }
    }
`;

export const GIVE_RECORDING_CONSENT = gql`
    mutation GiveRecordingConsent($videoSessionId: String!) {
        giveRecordingConsent(videoSessionId: $videoSessionId) {
            id
            recordingConsentGiven
        }
    }
`;

// ============================================
// Patient-friendly status labels
// ============================================

export const VIDEO_SESSION_STATUS_LABELS: Record<VideoSessionStatus, { label: string; icon: string }> = {
    SCHEDULED: { label: 'Scheduled', icon: '📅' },
    WAITING_FOR_PATIENT: { label: 'Doctor is waiting', icon: '⏳' },
    WAITING_FOR_DOCTOR: { label: 'Waiting for doctor', icon: '⏳' },
    IN_PROGRESS: { label: 'In progress', icon: '📹' },
    COMPLETED: { label: 'Complete', icon: '✅' },
    CANCELLED: { label: 'Cancelled', icon: '❌' },
    NO_SHOW_PATIENT: { label: 'Missed — please reschedule', icon: '⚠️' },
    NO_SHOW_DOCTOR: { label: 'Doctor unavailable — rescheduling', icon: '⚠️' },
};

export const BOOKED_SLOT_STATUS_LABELS: Record<BookedSlotStatus, { label: string; icon: string }> = {
    BOOKED: { label: 'Booked', icon: '📅' },
    CANCELLED: { label: 'Cancelled', icon: '❌' },
    COMPLETED: { label: 'Completed', icon: '✅' },
    NO_SHOW: { label: 'No-show', icon: '⚠️' },
};
