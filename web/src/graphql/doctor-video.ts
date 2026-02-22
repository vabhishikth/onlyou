import { gql } from '@apollo/client';

// Spec: Phase 13 — Doctor video consultation management endpoints

// Get doctor's recurring availability slots
export const MY_AVAILABILITY = gql`
    query MyAvailability {
        myAvailability {
            id
            doctorId
            dayOfWeek
            startTime
            endTime
            slotDurationMinutes
            isActive
        }
    }
`;

// Set recurring availability slots
export const SET_MY_AVAILABILITY = gql`
    mutation SetMyAvailability($slots: [SetAvailabilitySlotInput!]!) {
        setMyAvailability(slots: $slots) {
            id
            doctorId
            dayOfWeek
            startTime
            endTime
            slotDurationMinutes
            isActive
        }
    }
`;

// Mark patient as no-show (5-min grace period enforced server-side)
export const MARK_NO_SHOW = gql`
    mutation MarkNoShow($videoSessionId: String!) {
        markNoShow(videoSessionId: $videoSessionId) {
            status
            noShowMarkedBy
            adminAlert
        }
    }
`;

// Complete a video session with notes
export const COMPLETE_VIDEO_SESSION = gql`
    mutation CompleteVideoSession($videoSessionId: String!, $notes: String!, $callType: String) {
        completeVideoSession(videoSessionId: $videoSessionId, notes: $notes, callType: $callType) {
            id
            status
            notes
            callType
            actualEndTime
        }
    }
`;

// Mark consultation as awaiting lab results
export const MARK_AWAITING_LABS = gql`
    mutation MarkAwaitingLabs($videoSessionId: String!, $labNotes: String!) {
        markAwaitingLabs(videoSessionId: $videoSessionId, labNotes: $labNotes)
    }
`;

// Types
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface AvailabilitySlot {
    id: string;
    doctorId: string;
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    slotDurationMinutes: number;
    isActive: boolean;
}

export interface MyAvailabilityResponse {
    myAvailability: AvailabilitySlot[];
}

export interface SetAvailabilitySlotInput {
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
}

export interface SetMyAvailabilityResponse {
    setMyAvailability: AvailabilitySlot[];
}

export interface NoShowResult {
    status: string;
    noShowMarkedBy: string;
    adminAlert: boolean;
}

export interface MarkNoShowResponse {
    markNoShow: NoShowResult;
}

export interface CompletedSession {
    id: string;
    status: string;
    notes: string;
    callType: string;
    actualEndTime: string;
}

export interface CompleteVideoSessionResponse {
    completeVideoSession: CompletedSession;
}

export interface MarkAwaitingLabsResponse {
    markAwaitingLabs: boolean;
}

// Helper: Day of week display order and labels
export const DAYS_OF_WEEK: { value: DayOfWeek; label: string; short: string }[] = [
    { value: 'MONDAY', label: 'Monday', short: 'Mon' },
    { value: 'TUESDAY', label: 'Tuesday', short: 'Tue' },
    { value: 'WEDNESDAY', label: 'Wednesday', short: 'Wed' },
    { value: 'THURSDAY', label: 'Thursday', short: 'Thu' },
    { value: 'FRIDAY', label: 'Friday', short: 'Fri' },
    { value: 'SATURDAY', label: 'Saturday', short: 'Sat' },
    { value: 'SUNDAY', label: 'Sunday', short: 'Sun' },
];

// Helper: Common time slots for availability (IST, 24hr)
export const TIME_SLOTS = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00',
];
