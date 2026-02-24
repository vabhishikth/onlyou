/**
 * VideoResolver Tests
 * Phase 13: GraphQL API endpoints for video consultation
 * Spec: Phase 13 plan — Chunk 7
 *
 * TDD: Write tests FIRST, then implement to make them pass.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { VideoResolver } from './video.resolver';
import { AvailabilityService } from './availability.service';
import { SlotBookingService, CONNECTIVITY_WARNING } from './slot-booking.service';
import { HmsService } from './hms.service';
import { VideoSchedulerService } from './video-scheduler.service';
import { PrismaService } from '../prisma/prisma.service';
import { VideoSessionStatus, BookedSlotStatus } from '@prisma/client';

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
  },
};

describe('VideoResolver', () => {
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
      ],
    }).compile();

    resolver = module.get<VideoResolver>(VideoResolver);
    jest.clearAllMocks();
  });

  // ============================================================
  // Patient endpoints
  // ============================================================

  describe('Patient: getAvailableSlots', () => {
    it('should return slots + connectivityWarning', async () => {
      mockAvailabilityService.getAvailableDoctorSlots.mockResolvedValue({
        doctorId: 'doctor-1',
        slots: [
          { date: '2026-03-01', startTime: '10:00', endTime: '10:15' },
        ],
      });

      const result = await resolver.getAvailableSlots('consult-1');

      expect(result.slots).toHaveLength(1);
      expect(result.connectivityWarning).toBe(CONNECTIVITY_WARNING);
    });
  });

  describe('Patient: bookVideoSlot', () => {
    it('should book and return connectivity warning', async () => {
      const bookingResponse = {
        bookedSlot: { id: 'bs-1' },
        videoSession: { id: 'vs-1' },
        connectivityWarning: CONNECTIVITY_WARNING,
      };
      mockSlotBookingService.bookSlot.mockResolvedValue(bookingResponse);

      const user = { id: 'patient-1', role: 'PATIENT' };
      const result = await resolver.bookVideoSlot(
        user,
        'consult-1',
        '2026-03-01',
        '10:00',
      );

      expect(result.bookedSlot).toBeDefined();
      expect(result.connectivityWarning).toBe(CONNECTIVITY_WARNING);
    });
  });

  describe('Patient: cancelVideoBooking', () => {
    it('should cancel booking', async () => {
      mockSlotBookingService.cancelBooking.mockResolvedValue({
        id: 'bs-1',
        status: BookedSlotStatus.CANCELLED,
      });

      const user = { id: 'patient-1', role: 'PATIENT' };
      const result = await resolver.cancelVideoBooking(user, 'bs-1', 'Changed my mind');

      expect(result.status).toBe(BookedSlotStatus.CANCELLED);
    });
  });

  describe('Patient: rescheduleVideoBooking', () => {
    it('should reschedule booking', async () => {
      mockSlotBookingService.rescheduleBooking.mockResolvedValue({
        bookedSlot: { id: 'bs-2' },
        videoSession: { id: 'vs-2' },
        connectivityWarning: CONNECTIVITY_WARNING,
      });

      const user = { id: 'patient-1', role: 'PATIENT' };
      const result = await resolver.rescheduleVideoBooking(
        user,
        'bs-1',
        '2026-03-15',
        '14:00',
      );

      expect(result.bookedSlot).toBeDefined();
    });
  });

  describe('Patient: getMyUpcomingVideoSessions', () => {
    it('should return only own sessions', async () => {
      mockSlotBookingService.getUpcomingBookings.mockResolvedValue([
        { id: 'bs-1', patientId: 'patient-1' },
      ]);

      const user = { id: 'patient-1', role: 'PATIENT' };
      const result = await resolver.getMyUpcomingVideoSessions(user);

      expect(result).toHaveLength(1);
      expect(mockSlotBookingService.getUpcomingBookings).toHaveBeenCalledWith(
        'patient-1',
        'PATIENT',
      );
    });
  });

  describe('Patient: joinVideoSession', () => {
    it('should fail if consent not given', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        recordingConsentGiven: false,
        roomId: 'room-1',
      });

      const user = { id: 'patient-1', role: 'PATIENT' };

      await expect(
        resolver.joinVideoSession(user, 'vs-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return reconnect room when reconnectRoomId exists', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        recordingConsentGiven: true,
        roomId: 'room-1',
        reconnectRoomId: 'reconnect-room-1',
      });
      mockHmsService.generateToken.mockResolvedValue('mock-token');

      const user = { id: 'patient-1', role: 'PATIENT' };
      const result = await resolver.joinVideoSession(user, 'vs-1');

      expect(result.roomId).toBe('reconnect-room-1');
      expect(result.token).toBe('mock-token');
    });

    it('should return original room when no reconnectRoomId', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        recordingConsentGiven: true,
        roomId: 'room-1',
        reconnectRoomId: null,
      });
      mockHmsService.generateToken.mockResolvedValue('mock-token');

      const user = { id: 'patient-1', role: 'PATIENT' };
      const result = await resolver.joinVideoSession(user, 'vs-1');

      expect(result.roomId).toBe('room-1');
    });

    it('should not allow patient to access another patients session', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        patientId: 'patient-2', // Different patient
        doctorId: 'doctor-1',
        recordingConsentGiven: true,
        roomId: 'room-1',
      });

      const user = { id: 'patient-1', role: 'PATIENT' };

      await expect(
        resolver.joinVideoSession(user, 'vs-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Patient: giveRecordingConsent', () => {
    it('should set consent flag', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        patientId: 'patient-1',
      });
      mockPrisma.videoSession.update.mockResolvedValue({
        id: 'vs-1',
        recordingConsentGiven: true,
      });

      const user = { id: 'patient-1', role: 'PATIENT' };
      const result = await resolver.giveRecordingConsent(user, 'vs-1');

      expect(result.recordingConsentGiven).toBe(true);
    });
  });

  // ============================================================
  // Doctor endpoints
  // ============================================================

  // ============================================================
  // videoSession query
  // ============================================================

  describe('Patient: getVideoSession', () => {
    it('should return session for the patient', async () => {
      const mockSession = {
        id: 'vs-1',
        consultationId: 'consult-1',
        doctorId: 'doctor-1',
        patientId: 'patient-1',
        status: VideoSessionStatus.SCHEDULED,
        scheduledStartTime: new Date(),
        scheduledEndTime: new Date(),
        recordingConsentGiven: false,
        roomId: 'room-1',
      };
      mockPrisma.videoSession.findUnique.mockResolvedValue(mockSession);

      const user = { id: 'patient-1', role: 'PATIENT' };
      const result = await resolver.getVideoSession(user, 'vs-1');

      expect(result.id).toBe('vs-1');
      expect(result.consultationId).toBe('consult-1');
      expect(mockPrisma.videoSession.findUnique).toHaveBeenCalledWith({
        where: { id: 'vs-1' },
      });
    });

    it('should return session for the doctor', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        status: VideoSessionStatus.SCHEDULED,
      });

      const user = { id: 'doctor-1', role: 'DOCTOR' };
      const result = await resolver.getVideoSession(user, 'vs-1');

      expect(result.id).toBe('vs-1');
    });

    it('should throw NotFoundException if session does not exist', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue(null);

      const user = { id: 'patient-1', role: 'PATIENT' };

      await expect(
        resolver.getVideoSession(user, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not patient or doctor on session', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        patientId: 'patient-2',
        doctorId: 'doctor-2',
      });

      const user = { id: 'patient-1', role: 'PATIENT' };

      await expect(
        resolver.getVideoSession(user, 'vs-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================
  // doctorVideoSessions query
  // ============================================================

  describe('Doctor: getDoctorVideoSessions', () => {
    it('should return sessions with patient names', async () => {
      mockPrisma.videoSession.findMany.mockResolvedValue([
        {
          id: 'vs-1',
          consultationId: 'consult-1',
          patientId: 'patient-1',
          status: VideoSessionStatus.SCHEDULED,
          scheduledStartTime: new Date('2026-03-01T10:00:00Z'),
          scheduledEndTime: new Date('2026-03-01T10:15:00Z'),
          recordingConsentGiven: false,
          patient: {
            patientProfile: { fullName: 'Rahul Sharma' },
          },
        },
        {
          id: 'vs-2',
          consultationId: 'consult-2',
          patientId: 'patient-2',
          status: VideoSessionStatus.IN_PROGRESS,
          scheduledStartTime: new Date('2026-03-01T10:15:00Z'),
          scheduledEndTime: new Date('2026-03-01T10:30:00Z'),
          recordingConsentGiven: true,
          patient: {
            patientProfile: { fullName: 'Priya Patel' },
          },
        },
      ]);

      const user = { id: 'doctor-1', role: 'DOCTOR' };
      const result = await resolver.getDoctorVideoSessions(user);

      expect(result).toHaveLength(2);
      expect(result[0].patientName).toBe('Rahul Sharma');
      expect(result[1].patientName).toBe('Priya Patel');
      expect(result[0].status).toBe(VideoSessionStatus.SCHEDULED);
      expect(result[1].recordingConsentGiven).toBe(true);
      expect(mockPrisma.videoSession.findMany).toHaveBeenCalledWith({
        where: {
          doctorId: 'doctor-1',
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        },
        include: {
          patient: { include: { patientProfile: true } },
        },
        orderBy: { scheduledStartTime: 'asc' },
      });
    });

    it('should default patient name when profile is missing', async () => {
      mockPrisma.videoSession.findMany.mockResolvedValue([
        {
          id: 'vs-1',
          consultationId: 'consult-1',
          patientId: 'patient-1',
          status: VideoSessionStatus.SCHEDULED,
          scheduledStartTime: new Date(),
          scheduledEndTime: new Date(),
          recordingConsentGiven: false,
          patient: { patientProfile: null },
        },
      ]);

      const user = { id: 'doctor-1', role: 'DOCTOR' };
      const result = await resolver.getDoctorVideoSessions(user);

      expect(result[0].patientName).toBe('Patient');
    });

    it('should reject non-doctor role', async () => {
      const user = { id: 'patient-1', role: 'PATIENT' };

      await expect(
        resolver.getDoctorVideoSessions(user),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return empty array when no sessions exist', async () => {
      mockPrisma.videoSession.findMany.mockResolvedValue([]);

      const user = { id: 'doctor-1', role: 'DOCTOR' };
      const result = await resolver.getDoctorVideoSessions(user);

      expect(result).toHaveLength(0);
    });
  });

  describe('Doctor: setMyAvailability', () => {
    it('should set slots', async () => {
      const slots = [{ dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '12:00' }];
      mockAvailabilityService.setRecurringAvailability.mockResolvedValue([
        { id: 'slot-1', dayOfWeek: 'MONDAY' },
      ]);

      const user = { id: 'doctor-1', role: 'DOCTOR' };
      const result = await resolver.setMyAvailability(user, slots);

      expect(result).toHaveLength(1);
    });

    it('should reject non-doctor role', async () => {
      const user = { id: 'patient-1', role: 'PATIENT' };

      await expect(
        resolver.setMyAvailability(user, []),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Doctor: getMyAvailability', () => {
    it('should return own slots', async () => {
      mockAvailabilityService.getAvailability.mockResolvedValue([
        { id: 'slot-1', dayOfWeek: 'MONDAY' },
      ]);

      const user = { id: 'doctor-1', role: 'DOCTOR' };
      const result = await resolver.getMyAvailability(user);

      expect(result).toHaveLength(1);
    });
  });

  describe('Doctor: markNoShow', () => {
    it('should fail if called before 5-min grace period', async () => {
      const now = new Date();
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        doctorId: 'doctor-1',
        scheduledStartTime: new Date(now.getTime() + 10 * 60 * 1000), // Future
        status: VideoSessionStatus.SCHEDULED,
      });

      const user = { id: 'doctor-1', role: 'DOCTOR' };

      await expect(
        resolver.markNoShow(user, 'vs-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should succeed after grace period', async () => {
      const now = new Date();
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        doctorId: 'doctor-1',
        scheduledStartTime: new Date(now.getTime() - 6 * 60 * 1000), // 6 min ago
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
  });

  describe('Doctor: completeVideoSession', () => {
    it('should accept PHONE_FALLBACK callType', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        doctorId: 'doctor-1',
        status: VideoSessionStatus.IN_PROGRESS,
        consultationId: 'consult-1',
      });
      mockPrisma.videoSession.update.mockResolvedValue({
        id: 'vs-1',
        status: VideoSessionStatus.COMPLETED,
        callType: 'PHONE_FALLBACK',
        notes: 'Patient reviewed',
      });
      mockSchedulerService.onVideoCompleted.mockResolvedValue(undefined);

      const user = { id: 'doctor-1', role: 'DOCTOR' };
      const result = await resolver.completeVideoSession(
        user,
        'vs-1',
        'Patient reviewed',
        'PHONE_FALLBACK',
      );

      expect(result.status).toBe(VideoSessionStatus.COMPLETED);
    });

    it('should accept AUDIO_ONLY callType', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        doctorId: 'doctor-1',
        status: VideoSessionStatus.IN_PROGRESS,
        consultationId: 'consult-1',
      });
      mockPrisma.videoSession.update.mockResolvedValue({
        id: 'vs-1',
        status: VideoSessionStatus.COMPLETED,
        callType: 'AUDIO_ONLY',
      });
      mockSchedulerService.onVideoCompleted.mockResolvedValue(undefined);

      const user = { id: 'doctor-1', role: 'DOCTOR' };
      const result = await resolver.completeVideoSession(
        user,
        'vs-1',
        'Notes',
        'AUDIO_ONLY',
      );

      expect(result.status).toBe(VideoSessionStatus.COMPLETED);
    });
  });

  describe('Doctor: markAwaitingLabs', () => {
    it('should transition consultation to AWAITING_LABS', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        doctorId: 'doctor-1',
        consultationId: 'consult-1',
        status: VideoSessionStatus.COMPLETED,
      });
      mockSchedulerService.onAwaitingLabs.mockResolvedValue(undefined);

      const user = { id: 'doctor-1', role: 'DOCTOR' };
      await resolver.markAwaitingLabs(user, 'vs-1', 'Need CBC');

      expect(mockSchedulerService.onAwaitingLabs).toHaveBeenCalledWith('consult-1', 'Need CBC');
    });
  });

  // ============================================================
  // Webhook
  // ============================================================

  describe('Webhook: hmsWebhook', () => {
    it('should reject invalid signature', async () => {
      mockHmsService.handleWebhook.mockRejectedValue(
        new BadRequestException('Invalid webhook signature'),
      );

      await expect(
        resolver.hmsWebhook({ event: 'test', data: {} }, 'invalid-sig'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
