/**
 * Edge Cases Hardening Tests
 * Phase 13: Video consultation edge cases
 * Spec: Phase 13 plan — Chunk 8
 *
 * TDD: Write tests FIRST, then implement to make them pass.
 * These tests exercise cross-cutting concerns and edge cases not
 * covered by individual service spec files.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { VideoResolver } from './video.resolver';
import { AvailabilityService } from './availability.service';
import { SlotBookingService, CONNECTIVITY_WARNING } from './slot-booking.service';
import { HmsService } from './hms.service';
import { VideoSchedulerService } from './video-scheduler.service';
import { VideoNotificationService } from './video-notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { VideoSessionStatus, BookedSlotStatus, ConsultationStatus } from '@prisma/client';

const mockAvailabilityService = {
  setRecurringAvailability: jest.fn(),
  getAvailability: jest.fn(),
  getAvailableDoctorSlots: jest.fn(),
};

const mockSlotBookingService = {
  bookSlot: jest.fn(),
  cancelBooking: jest.fn(),
  rescheduleBooking: jest.fn(),
  getUpcomingBookings: jest.fn(),
  handleNoShow: jest.fn(),
};

const mockHmsService = {
  generateToken: jest.fn(),
  handleWebhook: jest.fn(),
  verifyWebhookSignature: jest.fn(),
  handleDisconnect: jest.fn(),
  createRoom: jest.fn(),
};

const mockSchedulerService = {
  onVideoCompleted: jest.fn(),
  onAwaitingLabs: jest.fn(),
};

const mockPrisma = {
  videoSession: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  consultation: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('Video Edge Cases', () => {
  let resolver: VideoResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoResolver,
        { provide: AvailabilityService, useValue: mockAvailabilityService },
        { provide: SlotBookingService, useValue: mockSlotBookingService },
        { provide: HmsService, useValue: mockHmsService },
        { provide: VideoSchedulerService, useValue: mockSchedulerService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: VideoNotificationService, useValue: { notifySlotBooked: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    resolver = module.get<VideoResolver>(VideoResolver);
    jest.clearAllMocks();
  });

  // ============================================================
  // 1. Auto-reconnect on call drop
  // ============================================================

  describe('Auto-reconnect on call drop', () => {
    it('should return reconnect room over original when both exist', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        recordingConsentGiven: true,
        roomId: 'original-room',
        reconnectRoomId: 'reconnect-room-after-drop',
        disconnectCount: 1,
      });
      mockHmsService.generateToken.mockResolvedValue('token-reconnect');

      const user = { id: 'patient-1', role: 'PATIENT' };
      const result = await resolver.joinVideoSession(user, 'vs-1');

      expect(result.roomId).toBe('reconnect-room-after-drop');
      expect(result.token).toBe('token-reconnect');
    });

    it('should allow doctor to join reconnect room too', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        recordingConsentGiven: true,
        roomId: 'original-room',
        reconnectRoomId: 'reconnect-room-1',
        disconnectCount: 2,
      });
      mockHmsService.generateToken.mockResolvedValue('doctor-token');

      const user = { id: 'doctor-1', role: 'DOCTOR' };
      const result = await resolver.joinVideoSession(user, 'vs-1');

      expect(result.roomId).toBe('reconnect-room-1');
      expect(mockHmsService.generateToken).toHaveBeenCalledWith(
        'reconnect-room-1',
        'doctor-1',
        'doctor',
      );
    });

    it('should fall back to original room when reconnectRoomId is null', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        recordingConsentGiven: true,
        roomId: 'original-room',
        reconnectRoomId: null,
        disconnectCount: 0,
      });
      mockHmsService.generateToken.mockResolvedValue('orig-token');

      const user = { id: 'patient-1', role: 'PATIENT' };
      const result = await resolver.joinVideoSession(user, 'vs-1');

      expect(result.roomId).toBe('original-room');
    });
  });

  // ============================================================
  // 2. Audio/phone fallback callTypes
  // ============================================================

  describe('Audio/phone fallback', () => {
    it('should accept VIDEO as default callType', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        doctorId: 'doctor-1',
        status: VideoSessionStatus.IN_PROGRESS,
        consultationId: 'consult-1',
      });
      mockPrisma.videoSession.update.mockResolvedValue({
        id: 'vs-1',
        status: VideoSessionStatus.COMPLETED,
        callType: 'VIDEO',
      });
      mockSchedulerService.onVideoCompleted.mockResolvedValue(undefined);

      const user = { id: 'doctor-1', role: 'DOCTOR' };
      // No callType argument — should default to VIDEO
      const result = await resolver.completeVideoSession(user, 'vs-1', 'All good');

      expect(result.status).toBe(VideoSessionStatus.COMPLETED);
      expect(mockPrisma.videoSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            callType: 'VIDEO',
          }),
        }),
      );
    });

    it('should reject completeVideoSession when status is SCHEDULED (not in progress)', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        doctorId: 'doctor-1',
        status: VideoSessionStatus.SCHEDULED,
        consultationId: 'consult-1',
      });

      const user = { id: 'doctor-1', role: 'DOCTOR' };

      await expect(
        resolver.completeVideoSession(user, 'vs-1', 'Notes', 'PHONE_FALLBACK'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject completeVideoSession by non-assigned doctor', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        doctorId: 'doctor-1',
        status: VideoSessionStatus.IN_PROGRESS,
        consultationId: 'consult-1',
      });

      const user = { id: 'doctor-other', role: 'DOCTOR' };

      await expect(
        resolver.completeVideoSession(user, 'vs-1', 'Notes'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================
  // 3. Grace period server-side enforcement
  // ============================================================

  describe('Grace period enforcement', () => {
    it('should reject markNoShow when session is exactly at scheduled time (0 min elapsed)', async () => {
      const now = new Date();
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        doctorId: 'doctor-1',
        scheduledStartTime: new Date(now.getTime()), // Right now
        status: VideoSessionStatus.SCHEDULED,
      });

      const user = { id: 'doctor-1', role: 'DOCTOR' };

      await expect(
        resolver.markNoShow(user, 'vs-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject markNoShow at 4 minutes (under grace period)', async () => {
      const now = new Date();
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        doctorId: 'doctor-1',
        scheduledStartTime: new Date(now.getTime() - 4 * 60 * 1000), // 4 min ago
        status: VideoSessionStatus.SCHEDULED,
      });

      const user = { id: 'doctor-1', role: 'DOCTOR' };

      await expect(
        resolver.markNoShow(user, 'vs-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow markNoShow at exactly 5 minutes', async () => {
      const now = new Date();
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        doctorId: 'doctor-1',
        scheduledStartTime: new Date(now.getTime() - 5 * 60 * 1000 - 1000), // 5 min + 1 sec ago
        status: VideoSessionStatus.SCHEDULED,
      });
      mockSlotBookingService.handleNoShow.mockResolvedValue({
        status: VideoSessionStatus.NO_SHOW_PATIENT,
        noShowMarkedBy: 'doctor-1',
        adminAlert: false,
      });

      const user = { id: 'doctor-1', role: 'DOCTOR' };
      const result = await resolver.markNoShow(user, 'vs-1');

      expect(result.status).toBe(VideoSessionStatus.NO_SHOW_PATIENT);
    });

    it('should reject markNoShow by wrong doctor', async () => {
      const now = new Date();
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        doctorId: 'doctor-1',
        scheduledStartTime: new Date(now.getTime() - 10 * 60 * 1000),
        status: VideoSessionStatus.SCHEDULED,
      });

      const user = { id: 'doctor-other', role: 'DOCTOR' };

      await expect(
        resolver.markNoShow(user, 'vs-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================
  // 4. Doctor rescheduling flow
  // ============================================================

  describe('Doctor rescheduling', () => {
    it('should allow doctor to cancel session and transition back to DOCTOR_REVIEWING', async () => {
      mockSlotBookingService.cancelBooking.mockResolvedValue({
        id: 'bs-1',
        status: BookedSlotStatus.CANCELLED,
      });

      const user = { id: 'doctor-1', role: 'DOCTOR' };
      const result = await resolver.cancelVideoBooking(user, 'bs-1', 'Doctor rescheduling');

      expect(result.status).toBe(BookedSlotStatus.CANCELLED);
      expect(mockSlotBookingService.cancelBooking).toHaveBeenCalledWith(
        'bs-1',
        'doctor-1',
        'Doctor rescheduling',
      );
    });
  });

  // ============================================================
  // 5. Connectivity warning surfacing
  // ============================================================

  describe('Connectivity warning surfacing', () => {
    it('should include connectivity warning in getAvailableSlots response', async () => {
      mockAvailabilityService.getAvailableDoctorSlots.mockResolvedValue({
        doctorId: 'doctor-1',
        slots: [],
      });

      const result = await resolver.getAvailableSlots('consult-1');

      expect(result.connectivityWarning).toBe(CONNECTIVITY_WARNING);
      expect(result.connectivityWarning).toContain('stable internet connection');
      expect(result.connectivityWarning).toContain('audio-only phone call');
    });

    it('should include connectivity warning even when no slots available', async () => {
      mockAvailabilityService.getAvailableDoctorSlots.mockResolvedValue({
        doctorId: 'doctor-1',
        slots: [],
      });

      const result = await resolver.getAvailableSlots('consult-1');

      expect(result.connectivityWarning).toBe(CONNECTIVITY_WARNING);
      expect(result.slots).toHaveLength(0);
    });
  });

  // ============================================================
  // 6. Session access control
  // ============================================================

  describe('Session access control', () => {
    it('should allow doctor to join their own session', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        recordingConsentGiven: true,
        roomId: 'room-1',
        reconnectRoomId: null,
      });
      mockHmsService.generateToken.mockResolvedValue('doctor-token');

      const user = { id: 'doctor-1', role: 'DOCTOR' };
      const result = await resolver.joinVideoSession(user, 'vs-1');

      expect(result.roomId).toBe('room-1');
      expect(mockHmsService.generateToken).toHaveBeenCalledWith('room-1', 'doctor-1', 'doctor');
    });

    it('should block admin from joining a session (only patient/doctor allowed)', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        recordingConsentGiven: true,
        roomId: 'room-1',
      });

      const user = { id: 'admin-1', role: 'ADMIN' };

      await expect(
        resolver.joinVideoSession(user, 'vs-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent session on join', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue(null);

      const user = { id: 'patient-1', role: 'PATIENT' };

      await expect(
        resolver.joinVideoSession(user, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent session on consent', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue(null);

      const user = { id: 'patient-1', role: 'PATIENT' };

      await expect(
        resolver.giveRecordingConsent(user, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should block wrong patient from giving consent', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        patientId: 'patient-2', // Different patient
      });

      const user = { id: 'patient-1', role: 'PATIENT' };

      await expect(
        resolver.giveRecordingConsent(user, 'vs-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================
  // 7. Complete session edge cases
  // ============================================================

  describe('Complete session edge cases', () => {
    it('should throw NotFoundException when completing non-existent session', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue(null);

      const user = { id: 'doctor-1', role: 'DOCTOR' };

      await expect(
        resolver.completeVideoSession(user, 'non-existent', 'Notes'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should trigger onVideoCompleted after successful completion', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        doctorId: 'doctor-1',
        status: VideoSessionStatus.IN_PROGRESS,
        consultationId: 'consult-1',
      });
      mockPrisma.videoSession.update.mockResolvedValue({
        id: 'vs-1',
        status: VideoSessionStatus.COMPLETED,
      });
      mockSchedulerService.onVideoCompleted.mockResolvedValue(undefined);

      const user = { id: 'doctor-1', role: 'DOCTOR' };
      await resolver.completeVideoSession(user, 'vs-1', 'All good');

      expect(mockSchedulerService.onVideoCompleted).toHaveBeenCalledWith(
        'vs-1',
        expect.objectContaining({ consultationId: 'consult-1' }),
      );
    });
  });

  // ============================================================
  // 8. markAwaitingLabs edge cases
  // ============================================================

  describe('markAwaitingLabs edge cases', () => {
    it('should throw NotFoundException for non-existent session', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue(null);

      const user = { id: 'doctor-1', role: 'DOCTOR' };

      await expect(
        resolver.markAwaitingLabs(user, 'non-existent', 'Need labs'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should block wrong doctor from marking awaiting labs', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        doctorId: 'doctor-1',
        consultationId: 'consult-1',
        status: VideoSessionStatus.COMPLETED,
      });

      const user = { id: 'doctor-other', role: 'DOCTOR' };

      await expect(
        resolver.markAwaitingLabs(user, 'vs-1', 'Need CBC'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should pass correct consultationId and labNotes to scheduler', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        doctorId: 'doctor-1',
        consultationId: 'consult-abc',
        status: VideoSessionStatus.COMPLETED,
      });
      mockSchedulerService.onAwaitingLabs.mockResolvedValue(undefined);

      const user = { id: 'doctor-1', role: 'DOCTOR' };
      await resolver.markAwaitingLabs(user, 'vs-1', 'CBC, TSH, Vitamin D');

      expect(mockSchedulerService.onAwaitingLabs).toHaveBeenCalledWith(
        'consult-abc',
        'CBC, TSH, Vitamin D',
      );
    });
  });

  // ============================================================
  // 9. markNoShow edge cases
  // ============================================================

  describe('markNoShow edge cases', () => {
    it('should throw NotFoundException for non-existent session', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue(null);

      const user = { id: 'doctor-1', role: 'DOCTOR' };

      await expect(
        resolver.markNoShow(user, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should pass PATIENT as noShowParty when doctor marks no-show', async () => {
      const now = new Date();
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        doctorId: 'doctor-1',
        scheduledStartTime: new Date(now.getTime() - 10 * 60 * 1000),
        status: VideoSessionStatus.SCHEDULED,
      });
      mockSlotBookingService.handleNoShow.mockResolvedValue({
        status: VideoSessionStatus.NO_SHOW_PATIENT,
        noShowMarkedBy: 'doctor-1',
        adminAlert: true,
      });

      const user = { id: 'doctor-1', role: 'DOCTOR' };
      await resolver.markNoShow(user, 'vs-1');

      expect(mockSlotBookingService.handleNoShow).toHaveBeenCalledWith(
        'vs-1',
        'PATIENT',
        'doctor-1',
      );
    });
  });

  // ============================================================
  // Task 5.1: Full lifecycle integration tests
  // ============================================================

  describe('Full lifecycle: Happy path', () => {
    it('Book → Consent → Join (patient) → Join (doctor) → Complete', async () => {
      const patient = { id: 'patient-1', role: 'PATIENT' };
      const doctor = { id: 'doctor-1', role: 'DOCTOR' };

      // Step 1: Book slot
      mockSlotBookingService.bookSlot.mockResolvedValue({
        bookedSlot: { id: 'bs-1' },
        videoSession: { id: 'vs-1' },
        connectivityWarning: CONNECTIVITY_WARNING,
      });
      const booking = await resolver.bookVideoSlot(patient, 'consult-1', '2026-03-01', '10:00');
      expect(booking.bookedSlot.id).toBe('bs-1');

      // Step 2: Patient gives consent
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1', patientId: 'patient-1', doctorId: 'doctor-1',
      });
      mockPrisma.videoSession.update.mockResolvedValue({
        id: 'vs-1', recordingConsentGiven: true,
      });
      const consent = await resolver.giveRecordingConsent(patient, 'vs-1');
      expect(consent.recordingConsentGiven).toBe(true);

      // Step 3: Patient joins
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1', patientId: 'patient-1', doctorId: 'doctor-1',
        recordingConsentGiven: true, roomId: 'room-1', reconnectRoomId: null,
      });
      mockHmsService.generateToken.mockResolvedValue('patient-token');
      const patientJoin = await resolver.joinVideoSession(patient, 'vs-1');
      expect(patientJoin.token).toBe('patient-token');

      // Step 4: Doctor joins
      mockHmsService.generateToken.mockResolvedValue('doctor-token');
      const doctorJoin = await resolver.joinVideoSession(doctor, 'vs-1');
      expect(doctorJoin.token).toBe('doctor-token');
      expect(mockHmsService.generateToken).toHaveBeenCalledWith('room-1', 'doctor-1', 'doctor');

      // Step 5: Doctor completes
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1', doctorId: 'doctor-1', status: VideoSessionStatus.IN_PROGRESS,
        consultationId: 'consult-1',
      });
      mockPrisma.videoSession.update.mockResolvedValue({
        id: 'vs-1', status: VideoSessionStatus.COMPLETED, notes: 'Patient reviewed',
      });
      mockSchedulerService.onVideoCompleted.mockResolvedValue(undefined);
      const completed = await resolver.completeVideoSession(doctor, 'vs-1', 'Patient reviewed');
      expect(completed.status).toBe(VideoSessionStatus.COMPLETED);
      expect(mockSchedulerService.onVideoCompleted).toHaveBeenCalled();
    });
  });

  describe('Full lifecycle: Recording consent required', () => {
    it('should reject join without consent', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1', patientId: 'patient-1', doctorId: 'doctor-1',
        recordingConsentGiven: false, roomId: 'room-1',
      });

      const patient = { id: 'patient-1', role: 'PATIENT' };
      await expect(
        resolver.joinVideoSession(patient, 'vs-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Full lifecycle: Disconnect + reconnect', () => {
    it('Patient rejoins after disconnect using reconnectRoomId', async () => {
      const patient = { id: 'patient-1', role: 'PATIENT' };

      // Session has a reconnect room (created by webhook handler)
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1', patientId: 'patient-1', doctorId: 'doctor-1',
        recordingConsentGiven: true, roomId: 'room-1',
        reconnectRoomId: 'reconnect-room-1',
        status: VideoSessionStatus.IN_PROGRESS,
      });
      mockHmsService.generateToken.mockResolvedValue('reconnect-token');

      // Rejoin skips consent check
      const result = await resolver.rejoinVideoSession(patient, 'vs-1');
      expect(result.roomId).toBe('reconnect-room-1');
      expect(result.token).toBe('reconnect-token');
    });
  });

  describe('Full lifecycle: Cancel and rebook', () => {
    it('Patient cancels slot then rebooks at a new time', async () => {
      const patient = { id: 'patient-1', role: 'PATIENT' };

      // Cancel existing booking
      mockSlotBookingService.cancelBooking.mockResolvedValue({
        id: 'bs-1', status: BookedSlotStatus.CANCELLED,
      });
      const cancelled = await resolver.cancelVideoBooking(patient, 'bs-1', 'Changed mind');
      expect(cancelled.status).toBe(BookedSlotStatus.CANCELLED);

      // Rebook at new time
      mockSlotBookingService.bookSlot.mockResolvedValue({
        bookedSlot: { id: 'bs-2' },
        videoSession: { id: 'vs-2' },
        connectivityWarning: CONNECTIVITY_WARNING,
      });
      const rebooked = await resolver.bookVideoSlot(patient, 'consult-1', '2026-03-02', '14:00');
      expect(rebooked.bookedSlot.id).toBe('bs-2');
    });
  });

  describe('Full lifecycle: Post-call summary', () => {
    it('Patient retrieves summary after session is completed', async () => {
      const patient = { id: 'patient-1', role: 'PATIENT' };

      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1', patientId: 'patient-1', doctorId: 'doctor-1',
        status: VideoSessionStatus.COMPLETED,
        durationSeconds: 600,
        recordingConsentGiven: true,
        recordingUrl: 'https://s3.example.com/recordings/vs-1.mp4',
        notes: 'S: Hair loss\nO: Thinning\nA: Androgenic alopecia\nP: Finasteride 1mg',
        doctor: { doctorProfile: { fullName: 'Dr. Sharma' } },
      });

      const summary = await resolver.videoSessionSummary(patient, 'vs-1');
      expect(summary.doctorName).toBe('Dr. Sharma');
      expect(summary.durationSeconds).toBe(600);
      expect(summary.status).toBe(VideoSessionStatus.COMPLETED);
      expect(summary.recordingAvailable).toBe(true);
      expect(summary.notes).toContain('Finasteride');
    });
  });

  describe('Full lifecycle: Lazy room creation', () => {
    it('Creates room on first join when roomId is null', async () => {
      const patient = { id: 'patient-1', role: 'PATIENT' };

      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1', patientId: 'patient-1', doctorId: 'doctor-1',
        recordingConsentGiven: true, roomId: null, reconnectRoomId: null,
      });
      mockHmsService.createRoom.mockResolvedValue({ roomId: 'new-room' });
      mockHmsService.generateToken.mockResolvedValue('new-token');

      const result = await resolver.joinVideoSession(patient, 'vs-1');
      expect(mockHmsService.createRoom).toHaveBeenCalledWith('vs-1');
      expect(result.roomId).toBe('new-room');
      expect(result.token).toBe('new-token');
    });
  });
});
