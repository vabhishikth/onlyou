/**
 * SlotBookingService Tests
 * Phase 13: Slot booking, cancellation, rescheduling, no-show handling
 * Spec: Phase 13 plan — Chunk 3
 *
 * TDD: Write tests FIRST, then implement to make them pass.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SlotBookingService, CONNECTIVITY_WARNING } from './slot-booking.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConsultationStatus, VideoSessionStatus, BookedSlotStatus } from '@prisma/client';

// Mock PrismaService
const mockPrisma = {
  consultation: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  videoSession: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  bookedSlot: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  doctorAvailabilitySlot: {
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('SlotBookingService', () => {
  let service: SlotBookingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlotBookingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SlotBookingService>(SlotBookingService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  // ============================================================
  // bookSlot
  // ============================================================

  describe('bookSlot', () => {
    const consultationId = 'consult-1';
    const patientId = 'patient-1';
    const doctorId = 'doctor-1';

    const mockConsultation = {
      id: consultationId,
      patientId,
      doctorId,
      status: ConsultationStatus.DOCTOR_REVIEWING,
    };

    // Helper: date in the future
    const futureDate = new Date('2026-03-01');
    const futureStartTime = '10:00';

    it('should book a valid slot and create BookedSlot + VideoSession', async () => {
      const mockVideoSession = {
        id: 'vs-1',
        consultationId,
        doctorId,
        patientId,
        status: VideoSessionStatus.SCHEDULED,
        scheduledStartTime: new Date('2026-03-01T10:00:00'),
        scheduledEndTime: new Date('2026-03-01T10:15:00'),
      };

      const mockBookedSlot = {
        id: 'bs-1',
        videoSessionId: 'vs-1',
        doctorId,
        patientId,
        consultationId,
        slotDate: futureDate,
        startTime: new Date('2026-03-01T10:00:00'),
        endTime: new Date('2026-03-01T10:15:00'),
        status: BookedSlotStatus.BOOKED,
      };

      mockPrisma.consultation.findUnique.mockResolvedValue(mockConsultation);

      // Transaction mock: executes the callback
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          videoSession: {
            create: jest.fn().mockResolvedValue(mockVideoSession),
          },
          bookedSlot: {
            create: jest.fn().mockResolvedValue(mockBookedSlot),
          },
          consultation: {
            update: jest.fn().mockResolvedValue({
              ...mockConsultation,
              status: ConsultationStatus.VIDEO_SCHEDULED,
            }),
          },
        };
        return cb(tx);
      });

      const result = await service.bookSlot({
        consultationId,
        patientId,
        slotDate: futureDate,
        startTime: futureStartTime,
      });

      expect(result.bookedSlot).toBeDefined();
      expect(result.videoSession).toBeDefined();
      expect(result.connectivityWarning).toBeDefined();
    });

    it('should return connectivity warning message in response', async () => {
      mockPrisma.consultation.findUnique.mockResolvedValue(mockConsultation);

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          videoSession: { create: jest.fn().mockResolvedValue({ id: 'vs-1' }) },
          bookedSlot: { create: jest.fn().mockResolvedValue({ id: 'bs-1' }) },
          consultation: { update: jest.fn().mockResolvedValue({}) },
        };
        return cb(tx);
      });

      const result = await service.bookSlot({
        consultationId,
        patientId,
        slotDate: futureDate,
        startTime: futureStartTime,
      });

      expect(result.connectivityWarning).toBe(CONNECTIVITY_WARNING);
    });

    it('should transition consultation to VIDEO_SCHEDULED', async () => {
      mockPrisma.consultation.findUnique.mockResolvedValue(mockConsultation);

      let consultationUpdateArgs: any;
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          videoSession: { create: jest.fn().mockResolvedValue({ id: 'vs-1' }) },
          bookedSlot: { create: jest.fn().mockResolvedValue({ id: 'bs-1' }) },
          consultation: {
            update: jest.fn().mockImplementation((args: any) => {
              consultationUpdateArgs = args;
              return { ...mockConsultation, status: ConsultationStatus.VIDEO_SCHEDULED };
            }),
          },
        };
        return cb(tx);
      });

      await service.bookSlot({
        consultationId,
        patientId,
        slotDate: futureDate,
        startTime: futureStartTime,
      });

      expect(consultationUpdateArgs.data.status).toBe(ConsultationStatus.VIDEO_SCHEDULED);
    });

    it('should fail when double-booking same doctor+date+time (P2002)', async () => {
      mockPrisma.consultation.findUnique.mockResolvedValue(mockConsultation);

      // Simulate Prisma unique constraint violation
      const prismaError = new Error('Unique constraint failed');
      (prismaError as any).code = 'P2002';

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          videoSession: { create: jest.fn().mockResolvedValue({ id: 'vs-1' }) },
          bookedSlot: {
            create: jest.fn().mockRejectedValue(prismaError),
          },
          consultation: { update: jest.fn() },
        };
        return cb(tx);
      });

      await expect(
        service.bookSlot({
          consultationId,
          patientId,
          slotDate: futureDate,
          startTime: futureStartTime,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.bookSlot({
          consultationId,
          patientId,
          slotDate: futureDate,
          startTime: futureStartTime,
        }),
      ).rejects.toThrow('Slot no longer available');
    });

    it('should fail if consultation not in DOCTOR_REVIEWING status', async () => {
      mockPrisma.consultation.findUnique.mockResolvedValue({
        ...mockConsultation,
        status: ConsultationStatus.PENDING_ASSESSMENT,
      });

      await expect(
        service.bookSlot({
          consultationId,
          patientId,
          slotDate: futureDate,
          startTime: futureStartTime,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should fail if patient is not the consultation owner', async () => {
      mockPrisma.consultation.findUnique.mockResolvedValue({
        ...mockConsultation,
        patientId: 'different-patient',
      });

      await expect(
        service.bookSlot({
          consultationId,
          patientId,
          slotDate: futureDate,
          startTime: futureStartTime,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should fail if no doctor is assigned to the consultation', async () => {
      mockPrisma.consultation.findUnique.mockResolvedValue({
        ...mockConsultation,
        doctorId: null,
      });

      await expect(
        service.bookSlot({
          consultationId,
          patientId,
          slotDate: futureDate,
          startTime: futureStartTime,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should fail for slot in the past', async () => {
      mockPrisma.consultation.findUnique.mockResolvedValue(mockConsultation);

      const pastDate = new Date('2020-01-01');

      await expect(
        service.bookSlot({
          consultationId,
          patientId,
          slotDate: pastDate,
          startTime: '10:00',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should fail if consultation does not exist', async () => {
      mockPrisma.consultation.findUnique.mockResolvedValue(null);

      await expect(
        service.bookSlot({
          consultationId: 'nonexistent',
          patientId,
          slotDate: futureDate,
          startTime: futureStartTime,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // cancelBooking
  // ============================================================

  describe('cancelBooking', () => {
    const bookedSlotId = 'bs-1';
    const cancelledBy = 'patient-1';

    // Slot scheduled far in future (>2 hours from now)
    const farFutureSlot = {
      id: bookedSlotId,
      videoSessionId: 'vs-1',
      doctorId: 'doctor-1',
      patientId: 'patient-1',
      consultationId: 'consult-1',
      slotDate: new Date('2026-06-01'),
      startTime: new Date('2026-06-01T10:00:00'),
      endTime: new Date('2026-06-01T10:15:00'),
      status: BookedSlotStatus.BOOKED,
      videoSession: {
        id: 'vs-1',
        consultationId: 'consult-1',
      },
    };

    it('should cancel booking >2hrs before and update BookedSlot + VideoSession', async () => {
      mockPrisma.bookedSlot.findUnique.mockResolvedValue(farFutureSlot);

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          bookedSlot: {
            update: jest.fn().mockResolvedValue({
              ...farFutureSlot,
              status: BookedSlotStatus.CANCELLED,
            }),
          },
          videoSession: {
            update: jest.fn().mockResolvedValue({
              id: 'vs-1',
              status: VideoSessionStatus.CANCELLED,
            }),
          },
          consultation: {
            update: jest.fn().mockResolvedValue({
              id: 'consult-1',
              status: ConsultationStatus.DOCTOR_REVIEWING,
            }),
          },
        };
        return cb(tx);
      });

      const result = await service.cancelBooking(bookedSlotId, cancelledBy, 'Changed my mind');

      expect(result.status).toBe(BookedSlotStatus.CANCELLED);
    });

    it('should flag late cancellation <2hrs but still allow it', async () => {
      // Slot starting 1 hour from now
      const now = new Date();
      const nearSlot = {
        ...farFutureSlot,
        startTime: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour from now
      };
      mockPrisma.bookedSlot.findUnique.mockResolvedValue(nearSlot);

      let bookedSlotUpdateArgs: any;
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          bookedSlot: {
            update: jest.fn().mockImplementation((args: any) => {
              bookedSlotUpdateArgs = args;
              return { ...nearSlot, status: BookedSlotStatus.CANCELLED };
            }),
          },
          videoSession: {
            update: jest.fn().mockResolvedValue({ status: VideoSessionStatus.CANCELLED }),
          },
          consultation: {
            update: jest.fn().mockResolvedValue({ status: ConsultationStatus.DOCTOR_REVIEWING }),
          },
        };
        return cb(tx);
      });

      const result = await service.cancelBooking(bookedSlotId, cancelledBy, 'Emergency');

      // Should still cancel
      expect(result.status).toBe(BookedSlotStatus.CANCELLED);
    });

    it('should transition consultation back to DOCTOR_REVIEWING on cancel', async () => {
      mockPrisma.bookedSlot.findUnique.mockResolvedValue(farFutureSlot);

      let consultationUpdateArgs: any;
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          bookedSlot: {
            update: jest.fn().mockResolvedValue({
              ...farFutureSlot,
              status: BookedSlotStatus.CANCELLED,
            }),
          },
          videoSession: {
            update: jest.fn().mockResolvedValue({ status: VideoSessionStatus.CANCELLED }),
          },
          consultation: {
            update: jest.fn().mockImplementation((args: any) => {
              consultationUpdateArgs = args;
              return { status: ConsultationStatus.DOCTOR_REVIEWING };
            }),
          },
        };
        return cb(tx);
      });

      await service.cancelBooking(bookedSlotId, cancelledBy, 'Changed my mind');

      expect(consultationUpdateArgs.data.status).toBe(ConsultationStatus.DOCTOR_REVIEWING);
    });

    it('should throw if booked slot not found', async () => {
      mockPrisma.bookedSlot.findUnique.mockResolvedValue(null);

      await expect(
        service.cancelBooking('nonexistent', cancelledBy, 'reason'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if slot already cancelled', async () => {
      mockPrisma.bookedSlot.findUnique.mockResolvedValue({
        ...farFutureSlot,
        status: BookedSlotStatus.CANCELLED,
      });

      await expect(
        service.cancelBooking(bookedSlotId, cancelledBy, 'reason'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================
  // rescheduleBooking
  // ============================================================

  describe('rescheduleBooking', () => {
    const bookedSlotId = 'bs-1';
    const rescheduledBy = 'patient-1';
    const newSlotDate = new Date('2026-06-15');
    const newStartTime = '14:00';

    const existingSlot = {
      id: bookedSlotId,
      videoSessionId: 'vs-1',
      doctorId: 'doctor-1',
      patientId: 'patient-1',
      consultationId: 'consult-1',
      slotDate: new Date('2026-06-01'),
      startTime: new Date('2026-06-01T10:00:00'),
      endTime: new Date('2026-06-01T10:15:00'),
      status: BookedSlotStatus.BOOKED,
      videoSession: {
        id: 'vs-1',
        consultationId: 'consult-1',
        doctorId: 'doctor-1',
        patientId: 'patient-1',
      },
    };

    it('should reschedule: cancel old + book new atomically', async () => {
      mockPrisma.bookedSlot.findUnique.mockResolvedValue(existingSlot);

      const newVideoSession = {
        id: 'vs-2',
        consultationId: 'consult-1',
        status: VideoSessionStatus.SCHEDULED,
      };
      const newBookedSlot = {
        id: 'bs-2',
        videoSessionId: 'vs-2',
        doctorId: 'doctor-1',
        patientId: 'patient-1',
        consultationId: 'consult-1',
        slotDate: newSlotDate,
        status: BookedSlotStatus.BOOKED,
      };

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          bookedSlot: {
            update: jest.fn().mockResolvedValue({
              ...existingSlot,
              status: BookedSlotStatus.CANCELLED,
            }),
            create: jest.fn().mockResolvedValue(newBookedSlot),
          },
          videoSession: {
            update: jest.fn().mockResolvedValue({
              id: 'vs-1',
              status: VideoSessionStatus.CANCELLED,
            }),
            create: jest.fn().mockResolvedValue(newVideoSession),
          },
          consultation: {
            update: jest.fn().mockResolvedValue({
              status: ConsultationStatus.VIDEO_SCHEDULED,
            }),
          },
        };
        return cb(tx);
      });

      const result = await service.rescheduleBooking(
        bookedSlotId,
        newSlotDate,
        newStartTime,
        rescheduledBy,
      );

      expect(result.bookedSlot).toBeDefined();
      expect(result.videoSession).toBeDefined();
    });

    it('should fail reschedule if slot not found', async () => {
      mockPrisma.bookedSlot.findUnique.mockResolvedValue(null);

      await expect(
        service.rescheduleBooking('nonexistent', newSlotDate, newStartTime, rescheduledBy),
      ).rejects.toThrow(NotFoundException);
    });

    it('should fail reschedule if new slot not available (P2002)', async () => {
      mockPrisma.bookedSlot.findUnique.mockResolvedValue(existingSlot);

      const prismaError = new Error('Unique constraint failed');
      (prismaError as any).code = 'P2002';

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          bookedSlot: {
            update: jest.fn().mockResolvedValue({}),
            create: jest.fn().mockRejectedValue(prismaError),
          },
          videoSession: {
            update: jest.fn().mockResolvedValue({}),
            create: jest.fn().mockResolvedValue({ id: 'vs-2' }),
          },
          consultation: { update: jest.fn() },
        };
        return cb(tx);
      });

      await expect(
        service.rescheduleBooking(bookedSlotId, newSlotDate, newStartTime, rescheduledBy),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================
  // getUpcomingBookings
  // ============================================================

  describe('getUpcomingBookings', () => {
    it('should get upcoming bookings for patient (excludes past + cancelled)', async () => {
      const futureBooking = {
        id: 'bs-1',
        patientId: 'patient-1',
        startTime: new Date('2026-06-01T10:00:00'),
        status: BookedSlotStatus.BOOKED,
      };

      mockPrisma.bookedSlot.findMany.mockResolvedValue([futureBooking]);

      const result = await service.getUpcomingBookings('patient-1', 'PATIENT');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('bs-1');

      // Verify the query filters correctly
      const queryArgs = mockPrisma.bookedSlot.findMany.mock.calls[0][0];
      expect(queryArgs.where.patientId).toBe('patient-1');
      expect(queryArgs.where.status).toBe(BookedSlotStatus.BOOKED);
    });

    it('should get upcoming bookings for doctor', async () => {
      const doctorBooking = {
        id: 'bs-2',
        doctorId: 'doctor-1',
        startTime: new Date('2026-06-01T10:00:00'),
        status: BookedSlotStatus.BOOKED,
      };

      mockPrisma.bookedSlot.findMany.mockResolvedValue([doctorBooking]);

      const result = await service.getUpcomingBookings('doctor-1', 'DOCTOR');

      expect(result).toHaveLength(1);

      const queryArgs = mockPrisma.bookedSlot.findMany.mock.calls[0][0];
      expect(queryArgs.where.doctorId).toBe('doctor-1');
    });
  });

  // ============================================================
  // handleNoShow
  // ============================================================

  describe('handleNoShow', () => {
    const videoSessionId = 'vs-1';

    const mockSession = {
      id: videoSessionId,
      consultationId: 'consult-1',
      doctorId: 'doctor-1',
      patientId: 'patient-1',
      status: VideoSessionStatus.SCHEDULED,
      scheduledStartTime: new Date('2026-03-01T10:00:00'),
    };

    it('should mark patient no-show correctly', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue(mockSession);
      mockPrisma.videoSession.update.mockResolvedValue({
        ...mockSession,
        status: VideoSessionStatus.NO_SHOW_PATIENT,
        noShowMarkedBy: 'doctor-1',
      });
      mockPrisma.videoSession.count.mockResolvedValue(0); // First no-show

      const result = await service.handleNoShow(videoSessionId, 'PATIENT', 'doctor-1');

      expect(result.status).toBe(VideoSessionStatus.NO_SHOW_PATIENT);
      expect(result.noShowMarkedBy).toBe('doctor-1');
    });

    it('should mark doctor no-show correctly', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue(mockSession);
      mockPrisma.videoSession.update.mockResolvedValue({
        ...mockSession,
        status: VideoSessionStatus.NO_SHOW_DOCTOR,
        noShowMarkedBy: 'admin-1',
      });
      mockPrisma.videoSession.count.mockResolvedValue(0);

      const result = await service.handleNoShow(videoSessionId, 'DOCTOR', 'admin-1');

      expect(result.status).toBe(VideoSessionStatus.NO_SHOW_DOCTOR);
    });

    it('should return adminAlert=true when patient no-show count >= 2', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue(mockSession);
      mockPrisma.videoSession.update.mockResolvedValue({
        ...mockSession,
        status: VideoSessionStatus.NO_SHOW_PATIENT,
        noShowMarkedBy: 'doctor-1',
      });
      // Patient already has 2 previous no-shows
      mockPrisma.videoSession.count.mockResolvedValue(2);

      const result = await service.handleNoShow(videoSessionId, 'PATIENT', 'doctor-1');

      expect(result.adminAlert).toBe(true);
    });

    it('should throw if video session not found', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue(null);

      await expect(
        service.handleNoShow('nonexistent', 'PATIENT', 'doctor-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
