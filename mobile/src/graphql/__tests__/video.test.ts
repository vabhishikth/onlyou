/**
 * Video GraphQL Operations Tests
 * Phase 14 Chunk 1: Mobile GraphQL video operations + types
 * Spec: Phase 13 video resolver endpoints
 */

import {
    GET_AVAILABLE_VIDEO_SLOTS,
    BOOK_VIDEO_SLOT,
    CANCEL_VIDEO_BOOKING,
    RESCHEDULE_VIDEO_BOOKING,
    GET_MY_UPCOMING_VIDEO_SESSIONS,
    JOIN_VIDEO_SESSION,
    GIVE_RECORDING_CONSENT,
    VIDEO_SESSION_STATUS_LABELS,
    BOOKED_SLOT_STATUS_LABELS,
    type VideoSessionStatus,
    type BookedSlotStatus,
    type AvailableSlotWindow,
    type AvailableSlotsResponse,
    type BookedSlot,
    type VideoSession,
    type BookingResponse,
    type JoinSessionResponse,
    type CancelBookingResult,
} from '../video';

// jest.setup.js mocks gql as (strings) => strings.join(''), returning a plain string
const asString = (gqlResult: any): string => String(gqlResult);

describe('Video GraphQL operations', () => {
    describe('Queries are exported', () => {
        it('exports GET_AVAILABLE_VIDEO_SLOTS query', () => {
            expect(GET_AVAILABLE_VIDEO_SLOTS).toBeDefined();
            const body = asString(GET_AVAILABLE_VIDEO_SLOTS);
            expect(body).toContain('availableVideoSlots');
            expect(body).toContain('consultationId');
        });

        it('exports GET_MY_UPCOMING_VIDEO_SESSIONS query', () => {
            expect(GET_MY_UPCOMING_VIDEO_SESSIONS).toBeDefined();
            const body = asString(GET_MY_UPCOMING_VIDEO_SESSIONS);
            expect(body).toContain('myUpcomingVideoSessions');
        });
    });

    describe('Mutations are exported', () => {
        it('exports BOOK_VIDEO_SLOT mutation', () => {
            expect(BOOK_VIDEO_SLOT).toBeDefined();
            const body = asString(BOOK_VIDEO_SLOT);
            expect(body).toContain('bookVideoSlot');
            expect(body).toContain('consultationId');
            expect(body).toContain('slotDate');
            expect(body).toContain('startTime');
        });

        it('exports CANCEL_VIDEO_BOOKING mutation', () => {
            expect(CANCEL_VIDEO_BOOKING).toBeDefined();
            const body = asString(CANCEL_VIDEO_BOOKING);
            expect(body).toContain('cancelVideoBooking');
            expect(body).toContain('bookedSlotId');
            expect(body).toContain('reason');
        });

        it('exports RESCHEDULE_VIDEO_BOOKING mutation', () => {
            expect(RESCHEDULE_VIDEO_BOOKING).toBeDefined();
            const body = asString(RESCHEDULE_VIDEO_BOOKING);
            expect(body).toContain('rescheduleVideoBooking');
            expect(body).toContain('newSlotDate');
            expect(body).toContain('newStartTime');
        });

        it('exports JOIN_VIDEO_SESSION mutation', () => {
            expect(JOIN_VIDEO_SESSION).toBeDefined();
            const body = asString(JOIN_VIDEO_SESSION);
            expect(body).toContain('joinVideoSession');
            expect(body).toContain('videoSessionId');
        });

        it('exports GIVE_RECORDING_CONSENT mutation', () => {
            expect(GIVE_RECORDING_CONSENT).toBeDefined();
            const body = asString(GIVE_RECORDING_CONSENT);
            expect(body).toContain('giveRecordingConsent');
            expect(body).toContain('videoSessionId');
        });
    });

    describe('Status labels', () => {
        it('has labels for all VideoSessionStatus values', () => {
            const expectedStatuses: VideoSessionStatus[] = [
                'SCHEDULED',
                'WAITING_FOR_PATIENT',
                'WAITING_FOR_DOCTOR',
                'IN_PROGRESS',
                'COMPLETED',
                'CANCELLED',
                'NO_SHOW_PATIENT',
                'NO_SHOW_DOCTOR',
            ];

            for (const status of expectedStatuses) {
                expect(VIDEO_SESSION_STATUS_LABELS[status]).toBeDefined();
                expect(VIDEO_SESSION_STATUS_LABELS[status].label).toBeTruthy();
                expect(VIDEO_SESSION_STATUS_LABELS[status].icon).toBeTruthy();
            }
        });

        it('has labels for all BookedSlotStatus values', () => {
            const expectedStatuses: BookedSlotStatus[] = [
                'BOOKED',
                'CANCELLED',
                'COMPLETED',
                'NO_SHOW',
            ];

            for (const status of expectedStatuses) {
                expect(BOOKED_SLOT_STATUS_LABELS[status]).toBeDefined();
                expect(BOOKED_SLOT_STATUS_LABELS[status].label).toBeTruthy();
                expect(BOOKED_SLOT_STATUS_LABELS[status].icon).toBeTruthy();
            }
        });

        it('shows patient-friendly labels for video session statuses', () => {
            expect(VIDEO_SESSION_STATUS_LABELS.SCHEDULED.label).toContain('Scheduled');
            expect(VIDEO_SESSION_STATUS_LABELS.IN_PROGRESS.label).toContain('progress');
            expect(VIDEO_SESSION_STATUS_LABELS.COMPLETED.label).toContain('Complete');
        });
    });

    describe('Type structure validation', () => {
        it('BookingResponse query includes bookedSlot, videoSession, and connectivityWarning', () => {
            const body = asString(BOOK_VIDEO_SLOT);
            expect(body).toContain('bookedSlot');
            expect(body).toContain('videoSession');
            expect(body).toContain('connectivityWarning');
        });

        it('JoinSessionResponse query includes roomId and token', () => {
            const body = asString(JOIN_VIDEO_SESSION);
            expect(body).toContain('roomId');
            expect(body).toContain('token');
        });

        it('AvailableSlotsResponse query includes slots and connectivityWarning', () => {
            const body = asString(GET_AVAILABLE_VIDEO_SLOTS);
            expect(body).toContain('slots');
            expect(body).toContain('connectivityWarning');
            expect(body).toContain('doctorId');
        });

        it('CancelBookingResult query includes id and status', () => {
            const body = asString(CANCEL_VIDEO_BOOKING);
            expect(body).toContain('id');
            expect(body).toContain('status');
        });
    });
});
