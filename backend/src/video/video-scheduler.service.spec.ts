/**
 * VideoSchedulerService Tests
 * Phase 13: Cron-based video consultation automation
 * Spec: Phase 13 plan — Chunk 6
 *
 * TDD: Write tests FIRST, then implement to make them pass.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { VideoSchedulerService } from './video-scheduler.service';
import { VideoNotificationService } from './video-notification.service';
import { HmsService } from './hms.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConsultationStatus, VideoSessionStatus } from '@prisma/client';
import { Reflector } from '@nestjs/core';
import { SCHEDULE_CRON_OPTIONS } from '@nestjs/schedule';

const mockPrisma = {
  videoSession: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  consultation: {
    update: jest.fn(),
  },
};

const mockNotifications = {
  notify24HourReminder: jest.fn().mockResolvedValue(undefined),
  notify1HourReminder: jest.fn().mockResolvedValue(undefined),
  notifyRoomReady: jest.fn().mockResolvedValue(undefined),
  notifyDoctorNoShowAdmin: jest.fn().mockResolvedValue(undefined),
  notifyPatientApology: jest.fn().mockResolvedValue(undefined),
  notifyVideoCompleted: jest.fn().mockResolvedValue(undefined),
};

const mockHmsService = {
  createRoom: jest.fn().mockResolvedValue({ roomId: 'room-1' }),
};

describe('VideoSchedulerService', () => {
  let service: VideoSchedulerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoSchedulerService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: VideoNotificationService, useValue: mockNotifications },
        { provide: HmsService, useValue: mockHmsService },
      ],
    }).compile();

    service = module.get<VideoSchedulerService>(VideoSchedulerService);
    jest.clearAllMocks();
  });

  describe('send24HourReminders', () => {
    it('should send 24-hour reminder for tomorrow sessions', async () => {
      mockPrisma.videoSession.findMany.mockResolvedValue([
        { id: 'vs-1', status: VideoSessionStatus.SCHEDULED },
        { id: 'vs-2', status: VideoSessionStatus.SCHEDULED },
      ]);

      await service.send24HourReminders();

      expect(mockNotifications.notify24HourReminder).toHaveBeenCalledTimes(2);
      expect(mockNotifications.notify24HourReminder).toHaveBeenCalledWith('vs-1');
      expect(mockNotifications.notify24HourReminder).toHaveBeenCalledWith('vs-2');
    });
  });

  describe('send1HourReminders', () => {
    it('should send 1-hour reminder to both patient and doctor', async () => {
      mockPrisma.videoSession.findMany.mockResolvedValue([
        { id: 'vs-1', status: VideoSessionStatus.SCHEDULED },
      ]);

      await service.send1HourReminders();

      expect(mockNotifications.notify1HourReminder).toHaveBeenCalledWith('vs-1');
    });
  });

  describe('createRoomsForUpcomingSessions', () => {
    it('should create room 5 min before scheduled time', async () => {
      mockPrisma.videoSession.findMany.mockResolvedValue([
        { id: 'vs-1', roomId: null, status: VideoSessionStatus.SCHEDULED },
      ]);

      await service.createRoomsForUpcomingSessions();

      expect(mockHmsService.createRoom).toHaveBeenCalledWith('vs-1');
    });

    it('should send "Join" notification when room is ready', async () => {
      mockPrisma.videoSession.findMany.mockResolvedValue([
        { id: 'vs-1', roomId: null, status: VideoSessionStatus.SCHEDULED },
      ]);

      await service.createRoomsForUpcomingSessions();

      expect(mockNotifications.notifyRoomReady).toHaveBeenCalledWith('vs-1');
    });

    it('should not create room for cancelled sessions', async () => {
      mockPrisma.videoSession.findMany.mockResolvedValue([]);

      await service.createRoomsForUpcomingSessions();

      expect(mockHmsService.createRoom).not.toHaveBeenCalled();
    });
  });

  describe('checkDoctorNoShow', () => {
    it('should detect doctor no-show at 3 min and send admin alert', async () => {
      const now = new Date();
      const scheduledTime = new Date(now.getTime() - 3 * 60 * 1000); // 3 min ago

      mockPrisma.videoSession.findMany.mockResolvedValue([
        {
          id: 'vs-1',
          status: VideoSessionStatus.SCHEDULED,
          scheduledStartTime: scheduledTime,
          doctorId: 'doctor-1',
          patientId: 'patient-1',
        },
      ]);

      await service.checkDoctorNoShow();

      expect(mockNotifications.notifyDoctorNoShowAdmin).toHaveBeenCalledWith('vs-1', expect.any(Number));
    });

    it('should detect doctor no-show at 5 min and send patient apology', async () => {
      const now = new Date();
      const scheduledTime = new Date(now.getTime() - 5 * 60 * 1000); // 5 min ago

      mockPrisma.videoSession.findMany.mockResolvedValue([
        {
          id: 'vs-1',
          status: VideoSessionStatus.SCHEDULED,
          scheduledStartTime: scheduledTime,
          doctorId: 'doctor-1',
          patientId: 'patient-1',
        },
      ]);

      await service.checkDoctorNoShow();

      expect(mockNotifications.notifyPatientApology).toHaveBeenCalledWith('vs-1');
    });

    it('should mark VideoSession as NO_SHOW_DOCTOR after 5 min', async () => {
      const now = new Date();
      const scheduledTime = new Date(now.getTime() - 5 * 60 * 1000);

      mockPrisma.videoSession.findMany.mockResolvedValue([
        {
          id: 'vs-1',
          status: VideoSessionStatus.SCHEDULED,
          scheduledStartTime: scheduledTime,
          doctorId: 'doctor-1',
          patientId: 'patient-1',
        },
      ]);
      mockPrisma.videoSession.update.mockResolvedValue({});

      await service.checkDoctorNoShow();

      expect(mockPrisma.videoSession.update).toHaveBeenCalledWith({
        where: { id: 'vs-1' },
        data: expect.objectContaining({
          status: VideoSessionStatus.NO_SHOW_DOCTOR,
        }),
      });
    });
  });

  describe('onVideoCompleted', () => {
    it('should update consultation to VIDEO_COMPLETED', async () => {
      mockPrisma.videoSession.findMany.mockResolvedValue([]);
      const mockSession = {
        id: 'vs-1',
        consultationId: 'consult-1',
        doctorId: 'doctor-1',
        patientId: 'patient-1',
      };

      mockPrisma.consultation.update.mockResolvedValue({
        id: 'consult-1',
        status: ConsultationStatus.VIDEO_COMPLETED,
      });

      await service.onVideoCompleted('vs-1', mockSession);

      expect(mockPrisma.consultation.update).toHaveBeenCalledWith({
        where: { id: 'consult-1' },
        data: { status: ConsultationStatus.VIDEO_COMPLETED },
      });
    });

    it('should notify doctor after video completion', async () => {
      const mockSession = {
        id: 'vs-1',
        consultationId: 'consult-1',
        doctorId: 'doctor-1',
        patientId: 'patient-1',
      };
      mockPrisma.consultation.update.mockResolvedValue({});

      await service.onVideoCompleted('vs-1', mockSession);

      expect(mockNotifications.notifyVideoCompleted).toHaveBeenCalledWith('vs-1');
    });
  });

  describe('onAwaitingLabs', () => {
    it('should update consultation to AWAITING_LABS', async () => {
      mockPrisma.consultation.update.mockResolvedValue({
        id: 'consult-1',
        status: ConsultationStatus.AWAITING_LABS,
      });

      await service.onAwaitingLabs('consult-1', 'Need CBC and thyroid panel');

      expect(mockPrisma.consultation.update).toHaveBeenCalledWith({
        where: { id: 'consult-1' },
        data: { status: ConsultationStatus.AWAITING_LABS },
      });
    });
  });

  // Spec: Cron decorators must be applied to scheduler methods
  describe('@Cron decorators', () => {
    it('should have @Cron on send24HourReminders', () => {
      const metadata = Reflect.getMetadata(
        'SCHEDULE_CRON_OPTIONS',
        service.send24HourReminders,
      );
      expect(metadata).toBeDefined();
    });

    it('should have @Cron on send1HourReminders', () => {
      const metadata = Reflect.getMetadata(
        'SCHEDULE_CRON_OPTIONS',
        service.send1HourReminders,
      );
      expect(metadata).toBeDefined();
    });

    it('should have @Cron on createRoomsForUpcomingSessions', () => {
      const metadata = Reflect.getMetadata(
        'SCHEDULE_CRON_OPTIONS',
        service.createRoomsForUpcomingSessions,
      );
      expect(metadata).toBeDefined();
    });

    it('should have @Cron on checkDoctorNoShow', () => {
      const metadata = Reflect.getMetadata(
        'SCHEDULE_CRON_OPTIONS',
        service.checkDoctorNoShow,
      );
      expect(metadata).toBeDefined();
    });
  });
});
