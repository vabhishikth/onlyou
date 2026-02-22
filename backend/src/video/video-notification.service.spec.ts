/**
 * VideoNotificationService Tests
 * Phase 13: Dedicated video consultation notification methods
 * Spec: Phase 13 plan — Chunk 6
 *
 * TDD: Write tests FIRST, then implement to make them pass.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { VideoNotificationService } from './video-notification.service';
import { NotificationService } from '../notification/notification.service';
import { PrismaService } from '../prisma/prisma.service';

const mockNotificationService = {
  sendNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
};

const mockPrisma = {
  videoSession: {
    findUnique: jest.fn(),
  },
  bookedSlot: {
    findUnique: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
};

describe('VideoNotificationService', () => {
  let service: VideoNotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoNotificationService,
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<VideoNotificationService>(VideoNotificationService);
    jest.clearAllMocks();
  });

  describe('notifySlotBooked', () => {
    it('should send booking notification to both patient and doctor', async () => {
      mockPrisma.bookedSlot.findUnique.mockResolvedValue({
        id: 'bs-1',
        doctorId: 'doctor-1',
        patientId: 'patient-1',
        slotDate: new Date('2026-03-01'),
        startTime: new Date('2026-03-01T10:00:00'),
        doctor: { name: 'Dr. Test' },
        patient: { name: 'Patient Test' },
      });

      await service.notifySlotBooked('bs-1');

      // Should send to both patient and doctor
      expect(mockNotificationService.sendNotification).toHaveBeenCalledTimes(2);

      const calls = mockNotificationService.sendNotification.mock.calls;
      const recipientIds = calls.map((c: any) => c[0].recipientId);
      expect(recipientIds).toContain('patient-1');
      expect(recipientIds).toContain('doctor-1');
    });
  });

  describe('notify24HourReminder', () => {
    it('should send 24-hour reminder to patient', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        doctorId: 'doctor-1',
        patientId: 'patient-1',
        scheduledStartTime: new Date('2026-03-02T10:00:00'),
      });

      await service.notify24HourReminder('vs-1');

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'patient-1',
          eventType: 'VIDEO_24HR_REMINDER',
        }),
      );
    });
  });

  describe('notify1HourReminder', () => {
    it('should send 1-hour reminder to both patient and doctor', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        doctorId: 'doctor-1',
        patientId: 'patient-1',
        scheduledStartTime: new Date('2026-03-01T10:00:00'),
      });

      await service.notify1HourReminder('vs-1');

      expect(mockNotificationService.sendNotification).toHaveBeenCalledTimes(2);
    });
  });

  describe('notifyRoomReady', () => {
    it('should send "Join" notification when room is ready', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        doctorId: 'doctor-1',
        patientId: 'patient-1',
        roomId: 'room-1',
      });

      await service.notifyRoomReady('vs-1');

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'patient-1',
          eventType: 'VIDEO_ROOM_READY',
          title: expect.stringContaining('Join'),
        }),
      );
    });
  });

  describe('notifyVideoCompleted', () => {
    it('should notify doctor after video completion', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        doctorId: 'doctor-1',
        patientId: 'patient-1',
      });

      await service.notifyVideoCompleted('vs-1');

      const doctorCall = mockNotificationService.sendNotification.mock.calls.find(
        (c: any) => c[0].recipientId === 'doctor-1',
      );
      expect(doctorCall).toBeDefined();
      expect(doctorCall[0].eventType).toBe('VIDEO_COMPLETED');
    });

    it('should notify patient after video completion', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        doctorId: 'doctor-1',
        patientId: 'patient-1',
      });

      await service.notifyVideoCompleted('vs-1');

      const patientCall = mockNotificationService.sendNotification.mock.calls.find(
        (c: any) => c[0].recipientId === 'patient-1',
      );
      expect(patientCall).toBeDefined();
    });
  });

  describe('notifyDoctorNoShowAdmin', () => {
    it('should send admin alert for doctor no-show', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        doctorId: 'doctor-1',
        patientId: 'patient-1',
      });
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);

      await service.notifyDoctorNoShowAdmin('vs-1', 3);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'admin-1',
          eventType: 'VIDEO_DOCTOR_NO_SHOW',
        }),
      );
    });
  });

  describe('notifyPatientApology', () => {
    it('should send apology to patient for doctor no-show', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        doctorId: 'doctor-1',
        patientId: 'patient-1',
      });

      await service.notifyPatientApology('vs-1');

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'patient-1',
          eventType: 'VIDEO_DOCTOR_NO_SHOW_APOLOGY',
        }),
      );
    });
  });

  describe('notifyCancellation', () => {
    it('should send cancellation notification', async () => {
      mockPrisma.bookedSlot.findUnique.mockResolvedValue({
        id: 'bs-1',
        doctorId: 'doctor-1',
        patientId: 'patient-1',
      });

      await service.notifyCancellation('bs-1');

      expect(mockNotificationService.sendNotification).toHaveBeenCalled();
    });
  });

  describe('notifyReschedule', () => {
    it('should send reschedule notification with new time', async () => {
      mockPrisma.bookedSlot.findUnique.mockResolvedValue({
        id: 'bs-1',
        doctorId: 'doctor-1',
        patientId: 'patient-1',
      });
      const newDate = new Date('2026-03-15');

      await service.notifyReschedule('bs-1', newDate);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'patient-1',
          eventType: 'VIDEO_RESCHEDULED',
        }),
      );
    });
  });

  describe('notifyRejoin', () => {
    it('should send rejoin notification with new room details', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        doctorId: 'doctor-1',
        patientId: 'patient-1',
      });

      await service.notifyRejoin('vs-1', 'reconnect-room-1');

      expect(mockNotificationService.sendNotification).toHaveBeenCalledTimes(2);
      const calls = mockNotificationService.sendNotification.mock.calls;
      expect(calls[0][0].eventType).toBe('VIDEO_REJOIN');
    });
  });
});
