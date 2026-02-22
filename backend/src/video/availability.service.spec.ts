/**
 * Phase 13: Doctor Availability Service Tests
 * TDD — Write tests FIRST, then implement
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { PrismaService } from '../prisma/prisma.service';
import { DayOfWeek, ConsultationStatus } from '@prisma/client';

// Spec: Phase 13 — Doctor availability management

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let prisma: any;

  const mockDoctorUserId = 'user-doc-1';

  const makeSlot = (overrides: any = {}) => ({
    id: overrides.id || 'slot-1',
    doctorId: overrides.doctorId || mockDoctorUserId,
    dayOfWeek: overrides.dayOfWeek || DayOfWeek.MONDAY,
    startTime: overrides.startTime || '18:00',
    endTime: overrides.endTime || '20:00',
    slotDurationMinutes: overrides.slotDurationMinutes || 15,
    isActive: overrides.isActive ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        {
          provide: PrismaService,
          useValue: {
            doctorAvailabilitySlot: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              createMany: jest.fn(),
              update: jest.fn(),
              deleteMany: jest.fn(),
            },
            bookedSlot: {
              findMany: jest.fn(),
            },
            consultation: {
              findUnique: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
    prisma = module.get(PrismaService);
  });

  describe('setRecurringAvailability', () => {
    it('should set recurring availability and create records', async () => {
      const slots = [
        { dayOfWeek: DayOfWeek.MONDAY, startTime: '18:00', endTime: '20:00' },
      ];
      const createdSlots = [makeSlot()];

      prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));
      prisma.doctorAvailabilitySlot.deleteMany.mockResolvedValue({ count: 0 });
      prisma.doctorAvailabilitySlot.createMany.mockResolvedValue({ count: 1 });
      prisma.doctorAvailabilitySlot.findMany.mockResolvedValue(createdSlots);

      const result = await service.setRecurringAvailability(mockDoctorUserId, slots);

      expect(result).toHaveLength(1);
      expect(prisma.doctorAvailabilitySlot.deleteMany).toHaveBeenCalled();
      expect(prisma.doctorAvailabilitySlot.createMany).toHaveBeenCalled();
    });

    it('should overwrite existing availability for same day when called again', async () => {
      const slots = [
        { dayOfWeek: DayOfWeek.MONDAY, startTime: '19:00', endTime: '21:00' },
      ];

      prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));
      prisma.doctorAvailabilitySlot.deleteMany.mockResolvedValue({ count: 2 });
      prisma.doctorAvailabilitySlot.createMany.mockResolvedValue({ count: 1 });
      prisma.doctorAvailabilitySlot.findMany.mockResolvedValue([makeSlot({ startTime: '19:00', endTime: '21:00' })]);

      const result = await service.setRecurringAvailability(mockDoctorUserId, slots);

      expect(result).toHaveLength(1);
      expect(prisma.doctorAvailabilitySlot.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            doctorId: mockDoctorUserId,
            dayOfWeek: { in: [DayOfWeek.MONDAY] },
          }),
        }),
      );
    });

    it('should validate time format and reject invalid times', async () => {
      const slots = [
        { dayOfWeek: DayOfWeek.MONDAY, startTime: '25:00', endTime: '20:00' },
      ];

      await expect(
        service.setRecurringAvailability(mockDoctorUserId, slots),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate startTime < endTime', async () => {
      const slots = [
        { dayOfWeek: DayOfWeek.MONDAY, startTime: '20:00', endTime: '18:00' },
      ];

      await expect(
        service.setRecurringAvailability(mockDoctorUserId, slots),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject slots with duration < 15 minutes', async () => {
      const slots = [
        { dayOfWeek: DayOfWeek.MONDAY, startTime: '18:00', endTime: '18:10' },
      ];

      await expect(
        service.setRecurringAvailability(mockDoctorUserId, slots),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAvailability', () => {
    it('should get availability for a specific doctor', async () => {
      const slots = [makeSlot(), makeSlot({ id: 'slot-2', dayOfWeek: DayOfWeek.WEDNESDAY })];
      prisma.doctorAvailabilitySlot.findMany.mockResolvedValue(slots);

      const result = await service.getAvailability(mockDoctorUserId);

      expect(result).toHaveLength(2);
      expect(prisma.doctorAvailabilitySlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { doctorId: mockDoctorUserId, isActive: true },
        }),
      );
    });

    it('should return empty array when doctor has no availability set', async () => {
      prisma.doctorAvailabilitySlot.findMany.mockResolvedValue([]);

      const result = await service.getAvailability(mockDoctorUserId);

      expect(result).toHaveLength(0);
    });
  });

  describe('getAvailableSlots', () => {
    it('should generate 4 x 15-min windows from 09:00-10:00', async () => {
      const slot = makeSlot({ startTime: '09:00', endTime: '10:00' });
      prisma.doctorAvailabilitySlot.findMany.mockResolvedValue([slot]);
      prisma.bookedSlot.findMany.mockResolvedValue([]);

      // Monday 2026-02-23 is a Monday
      const fromDate = new Date('2026-02-23');
      const toDate = new Date('2026-02-23');

      const result = await service.getAvailableSlots(mockDoctorUserId, fromDate, toDate);

      const mondaySlots = result.filter((s: any) => s.date === '2026-02-23');
      expect(mondaySlots).toHaveLength(4);
      expect(mondaySlots[0].startTime).toBe('09:00');
      expect(mondaySlots[0].endTime).toBe('09:15');
      expect(mondaySlots[3].startTime).toBe('09:45');
      expect(mondaySlots[3].endTime).toBe('10:00');
    });

    it('should generate 2 x 15-min windows from 14:00-14:30', async () => {
      const slot = makeSlot({ startTime: '14:00', endTime: '14:30' });
      prisma.doctorAvailabilitySlot.findMany.mockResolvedValue([slot]);
      prisma.bookedSlot.findMany.mockResolvedValue([]);

      const fromDate = new Date('2026-02-23');
      const toDate = new Date('2026-02-23');

      const result = await service.getAvailableSlots(mockDoctorUserId, fromDate, toDate);

      expect(result).toHaveLength(2);
      expect(result[0].startTime).toBe('14:00');
      expect(result[1].startTime).toBe('14:15');
    });

    it('should return available slots excluding already-booked ones', async () => {
      const slot = makeSlot({ startTime: '09:00', endTime: '10:00' });
      prisma.doctorAvailabilitySlot.findMany.mockResolvedValue([slot]);

      // One slot booked at 09:15
      const bookedDate = new Date('2026-02-23');
      const bookedStart = new Date('2026-02-23T09:15:00');
      prisma.bookedSlot.findMany.mockResolvedValue([
        {
          id: 'booked-1',
          doctorId: mockDoctorUserId,
          slotDate: bookedDate,
          startTime: bookedStart,
          status: 'BOOKED',
        },
      ]);

      const fromDate = new Date('2026-02-23');
      const toDate = new Date('2026-02-23');

      const result = await service.getAvailableSlots(mockDoctorUserId, fromDate, toDate);

      // 4 windows minus 1 booked = 3
      expect(result).toHaveLength(3);
      expect(result.find((s: any) => s.startTime === '09:15')).toBeUndefined();
    });

    it('should return empty array when all slots for a day are booked', async () => {
      const slot = makeSlot({ startTime: '09:00', endTime: '09:30' });
      prisma.doctorAvailabilitySlot.findMany.mockResolvedValue([slot]);

      // Both 15-min slots booked
      const bookedDate = new Date('2026-02-23');
      prisma.bookedSlot.findMany.mockResolvedValue([
        { doctorId: mockDoctorUserId, slotDate: bookedDate, startTime: new Date('2026-02-23T09:00:00'), status: 'BOOKED' },
        { doctorId: mockDoctorUserId, slotDate: bookedDate, startTime: new Date('2026-02-23T09:15:00'), status: 'BOOKED' },
      ]);

      const fromDate = new Date('2026-02-23');
      const toDate = new Date('2026-02-23');

      const result = await service.getAvailableSlots(mockDoctorUserId, fromDate, toDate);

      expect(result).toHaveLength(0);
    });

    it('should return slots for multiple days in range', async () => {
      const mondaySlot = makeSlot({ dayOfWeek: DayOfWeek.MONDAY, startTime: '09:00', endTime: '09:30' });
      const wednesdaySlot = makeSlot({ id: 'slot-2', dayOfWeek: DayOfWeek.WEDNESDAY, startTime: '14:00', endTime: '14:30' });
      prisma.doctorAvailabilitySlot.findMany.mockResolvedValue([mondaySlot, wednesdaySlot]);
      prisma.bookedSlot.findMany.mockResolvedValue([]);

      // 2026-02-23 (Mon) to 2026-02-25 (Wed)
      const fromDate = new Date('2026-02-23');
      const toDate = new Date('2026-02-25');

      const result = await service.getAvailableSlots(mockDoctorUserId, fromDate, toDate);

      // Monday: 2 slots, Wednesday: 2 slots = 4 total
      expect(result).toHaveLength(4);
      const monSlots = result.filter((s: any) => s.date === '2026-02-23');
      const wedSlots = result.filter((s: any) => s.date === '2026-02-25');
      expect(monSlots).toHaveLength(2);
      expect(wedSlots).toHaveLength(2);
    });
  });

  describe('deactivateSlot', () => {
    it('should deactivate a slot', async () => {
      const slot = makeSlot();
      prisma.doctorAvailabilitySlot.findFirst.mockResolvedValue(slot);
      prisma.doctorAvailabilitySlot.update.mockResolvedValue({ ...slot, isActive: false });

      await service.deactivateSlot('slot-1', mockDoctorUserId);

      expect(prisma.doctorAvailabilitySlot.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'slot-1' },
          data: { isActive: false },
        }),
      );
    });

    it('should not return deactivated slots in getAvailableSlots', async () => {
      // Only active slots are returned
      prisma.doctorAvailabilitySlot.findMany.mockResolvedValue([]); // No active slots
      prisma.bookedSlot.findMany.mockResolvedValue([]);

      const result = await service.getAvailableSlots(
        mockDoctorUserId,
        new Date('2026-02-23'),
        new Date('2026-02-23'),
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('getAvailableDoctorSlots', () => {
    it('should get available slots for assigned doctor via consultationId', async () => {
      const consultation = {
        id: 'consult-1',
        doctorId: mockDoctorUserId,
        status: ConsultationStatus.DOCTOR_REVIEWING,
      };
      prisma.consultation.findUnique.mockResolvedValue(consultation);

      const slot = makeSlot({ startTime: '09:00', endTime: '09:30' });
      prisma.doctorAvailabilitySlot.findMany.mockResolvedValue([slot]);
      prisma.bookedSlot.findMany.mockResolvedValue([]);

      const result = await service.getAvailableDoctorSlots('consult-1');

      expect(result).toBeDefined();
      expect(result.doctorId).toBe(mockDoctorUserId);
      expect(result.slots.length).toBeGreaterThan(0);
    });

    it('should throw if consultation not found', async () => {
      prisma.consultation.findUnique.mockResolvedValue(null);

      await expect(
        service.getAvailableDoctorSlots('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if no doctor assigned to consultation', async () => {
      prisma.consultation.findUnique.mockResolvedValue({
        id: 'consult-1',
        doctorId: null,
        status: ConsultationStatus.AI_REVIEWED,
      });

      await expect(
        service.getAvailableDoctorSlots('consult-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
