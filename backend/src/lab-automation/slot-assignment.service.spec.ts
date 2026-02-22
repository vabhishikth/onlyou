import { Test, TestingModule } from '@nestjs/testing';
import { SlotAssignmentService } from './slot-assignment.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Spec: Phase 16 Chunk 4 — Phlebotomist Slot Booking + Auto-Assignment

describe('SlotAssignmentService', () => {
  let service: SlotAssignmentService;
  let prisma: any;
  let notificationService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlotAssignmentService,
        {
          provide: PrismaService,
          useValue: {
            labOrder: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            labPhlebotomist: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
            phlebotomistDailyRoster: {
              findUnique: jest.fn(),
              upsert: jest.fn(),
              update: jest.fn(),
            },
            labSlot: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            user: {
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: NotificationService,
          useValue: {
            sendNotification: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<SlotAssignmentService>(SlotAssignmentService);
    prisma = module.get(PrismaService);
    notificationService = module.get(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========================================
  // autoAssignPhlebotomist
  // ========================================

  describe('autoAssignPhlebotomist', () => {
    it('should assign phlebotomist with lowest daily load', async () => {
      const bookedDate = new Date('2026-03-01');
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'SLOT_BOOKED',
        collectionPincode: '500033',
        collectionCity: 'Hyderabad',
        bookedDate,
        bookedTimeSlot: '8:00-10:00',
        patientId: 'patient-1',
      });

      prisma.labPhlebotomist.findMany.mockResolvedValue([
        {
          id: 'phleb-1',
          name: 'Ravi',
          status: 'PHLEB_ACTIVE',
          isActive: true,
          serviceableAreas: ['500033', '500034'],
          city: 'Hyderabad',
          maxDailyCapacity: 10,
          assignedLabId: 'lab-1',
        },
        {
          id: 'phleb-2',
          name: 'Suresh',
          status: 'PHLEB_ACTIVE',
          isActive: true,
          serviceableAreas: ['500033'],
          city: 'Hyderabad',
          maxDailyCapacity: 10,
          assignedLabId: 'lab-1',
        },
      ]);

      // phleb-1 has 5 bookings, phleb-2 has 2 → phleb-2 wins
      prisma.phlebotomistDailyRoster.findUnique
        .mockResolvedValueOnce({ totalBookings: 5 }) // phleb-1
        .mockResolvedValueOnce({ totalBookings: 2 }); // phleb-2

      prisma.phlebotomistDailyRoster.upsert.mockResolvedValue({
        phlebotomistId: 'phleb-2',
        totalBookings: 3,
      });

      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        status: 'PHLEBOTOMIST_ASSIGNED',
        labPhlebotomistId: 'phleb-2',
        phlebotomistAssignedAt: expect.any(Date),
      });

      const result = await service.autoAssignPhlebotomist('lo-1');

      expect(result.status).toBe('PHLEBOTOMIST_ASSIGNED');
      expect(result.labPhlebotomistId).toBe('phleb-2');
    });

    it('should skip phlebotomists at daily capacity', async () => {
      const bookedDate = new Date('2026-03-01');
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'SLOT_BOOKED',
        collectionPincode: '500033',
        collectionCity: 'Hyderabad',
        bookedDate,
        bookedTimeSlot: '8:00-10:00',
        patientId: 'patient-1',
      });

      prisma.labPhlebotomist.findMany.mockResolvedValue([
        {
          id: 'phleb-1',
          name: 'Ravi',
          status: 'PHLEB_ACTIVE',
          isActive: true,
          serviceableAreas: ['500033'],
          city: 'Hyderabad',
          maxDailyCapacity: 5,
          assignedLabId: 'lab-1',
        },
        {
          id: 'phleb-2',
          name: 'Suresh',
          status: 'PHLEB_ACTIVE',
          isActive: true,
          serviceableAreas: ['500033'],
          city: 'Hyderabad',
          maxDailyCapacity: 10,
          assignedLabId: 'lab-1',
        },
      ]);

      // phleb-1 at capacity (5/5), phleb-2 has room (3/10)
      prisma.phlebotomistDailyRoster.findUnique
        .mockResolvedValueOnce({ totalBookings: 5 }) // phleb-1 at capacity
        .mockResolvedValueOnce({ totalBookings: 3 }); // phleb-2 has room

      prisma.phlebotomistDailyRoster.upsert.mockResolvedValue({
        phlebotomistId: 'phleb-2',
        totalBookings: 4,
      });

      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        status: 'PHLEBOTOMIST_ASSIGNED',
        labPhlebotomistId: 'phleb-2',
      });

      const result = await service.autoAssignPhlebotomist('lo-1');

      expect(result.labPhlebotomistId).toBe('phleb-2');
    });

    it('should skip inactive phlebotomists', async () => {
      const bookedDate = new Date('2026-03-01');
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'SLOT_BOOKED',
        collectionPincode: '500033',
        collectionCity: 'Hyderabad',
        bookedDate,
        bookedTimeSlot: '8:00-10:00',
        patientId: 'patient-1',
      });

      // Only active phlebotomists returned by query
      prisma.labPhlebotomist.findMany.mockResolvedValue([
        {
          id: 'phleb-active',
          name: 'Active',
          status: 'PHLEB_ACTIVE',
          isActive: true,
          serviceableAreas: ['500033'],
          city: 'Hyderabad',
          maxDailyCapacity: 10,
          assignedLabId: 'lab-1',
        },
      ]);

      prisma.phlebotomistDailyRoster.findUnique.mockResolvedValue({ totalBookings: 1 });

      prisma.phlebotomistDailyRoster.upsert.mockResolvedValue({
        phlebotomistId: 'phleb-active',
        totalBookings: 2,
      });

      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        status: 'PHLEBOTOMIST_ASSIGNED',
        labPhlebotomistId: 'phleb-active',
      });

      const result = await service.autoAssignPhlebotomist('lo-1');

      expect(result.labPhlebotomistId).toBe('phleb-active');
    });

    it('should alert admin when no eligible phlebotomist found', async () => {
      const bookedDate = new Date('2026-03-01');
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'SLOT_BOOKED',
        collectionPincode: '500099', // no phlebotomist serves this pincode
        collectionCity: 'Hyderabad',
        bookedDate,
        bookedTimeSlot: '8:00-10:00',
        patientId: 'patient-1',
      });

      prisma.labPhlebotomist.findMany.mockResolvedValue([]);
      prisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);

      await expect(
        service.autoAssignPhlebotomist('lo-1'),
      ).rejects.toThrow(BadRequestException);

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'NO_PHLEBOTOMIST_AVAILABLE',
        }),
      );
    });

    it('should throw if lab order not in SLOT_BOOKED status', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'ORDERED', // wrong status
      });

      await expect(
        service.autoAssignPhlebotomist('lo-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if lab order not found', async () => {
      prisma.labOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.autoAssignPhlebotomist('lo-999'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should notify patient when phlebotomist is assigned', async () => {
      const bookedDate = new Date('2026-03-01');
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'SLOT_BOOKED',
        collectionPincode: '500033',
        collectionCity: 'Hyderabad',
        bookedDate,
        bookedTimeSlot: '8:00-10:00',
        patientId: 'patient-1',
      });

      prisma.labPhlebotomist.findMany.mockResolvedValue([
        {
          id: 'phleb-1',
          name: 'Ravi',
          status: 'PHLEB_ACTIVE',
          isActive: true,
          serviceableAreas: ['500033'],
          city: 'Hyderabad',
          maxDailyCapacity: 10,
          assignedLabId: 'lab-1',
        },
      ]);

      prisma.phlebotomistDailyRoster.findUnique.mockResolvedValue({ totalBookings: 2 });
      prisma.phlebotomistDailyRoster.upsert.mockResolvedValue({ totalBookings: 3 });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        status: 'PHLEBOTOMIST_ASSIGNED',
        labPhlebotomistId: 'phleb-1',
      });

      await service.autoAssignPhlebotomist('lo-1');

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'patient-1',
          eventType: 'PHLEBOTOMIST_ASSIGNED',
        }),
      );
    });
  });

  // ========================================
  // bookSlotForLabOrder
  // ========================================

  describe('bookSlotForLabOrder', () => {
    it('should book a slot and transition to SLOT_BOOKED', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'ORDERED',
        patientId: 'patient-1',
        collectionPincode: '500033',
      });

      prisma.labSlot.findUnique.mockResolvedValue({
        id: 'slot-1',
        date: new Date('2026-03-01'),
        startTime: '8:00',
        endTime: '10:00',
        serviceableAreas: ['500033', '500034'],
        currentBookings: 2,
        maxBookings: 5,
      });

      prisma.labSlot.update.mockResolvedValue({ id: 'slot-1', currentBookings: 3 });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        status: 'SLOT_BOOKED',
        bookedDate: new Date('2026-03-01'),
        bookedTimeSlot: '8:00-10:00',
      });

      const result = await service.bookSlotForLabOrder('lo-1', 'patient-1', 'slot-1');

      expect(result.status).toBe('SLOT_BOOKED');
      expect(prisma.labSlot.update).toHaveBeenCalled();
    });

    it('should allow booking after PAYMENT_COMPLETED', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'PAYMENT_COMPLETED',
        patientId: 'patient-1',
        collectionPincode: '500033',
      });

      prisma.labSlot.findUnique.mockResolvedValue({
        id: 'slot-1',
        date: new Date('2026-03-01'),
        startTime: '8:00',
        endTime: '10:00',
        serviceableAreas: ['500033'],
        currentBookings: 0,
        maxBookings: 5,
      });

      prisma.labSlot.update.mockResolvedValue({ id: 'slot-1', currentBookings: 1 });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        status: 'SLOT_BOOKED',
      });

      const result = await service.bookSlotForLabOrder('lo-1', 'patient-1', 'slot-1');

      expect(result.status).toBe('SLOT_BOOKED');
    });

    it('should reject booking if slot is full', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'ORDERED',
        patientId: 'patient-1',
        collectionPincode: '500033',
      });

      prisma.labSlot.findUnique.mockResolvedValue({
        id: 'slot-1',
        date: new Date('2026-03-01'),
        startTime: '8:00',
        endTime: '10:00',
        serviceableAreas: ['500033'],
        currentBookings: 5,
        maxBookings: 5,
      });

      await expect(
        service.bookSlotForLabOrder('lo-1', 'patient-1', 'slot-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject booking if patient does not own order', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'ORDERED',
        patientId: 'other-patient',
      });

      await expect(
        service.bookSlotForLabOrder('lo-1', 'patient-1', 'slot-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject booking if slot does not service pincode', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'ORDERED',
        patientId: 'patient-1',
        collectionPincode: '500099',
      });

      prisma.labSlot.findUnique.mockResolvedValue({
        id: 'slot-1',
        date: new Date('2026-03-01'),
        startTime: '8:00',
        endTime: '10:00',
        serviceableAreas: ['500033', '500034'], // does not include 500099
        currentBookings: 0,
        maxBookings: 5,
      });

      await expect(
        service.bookSlotForLabOrder('lo-1', 'patient-1', 'slot-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow rebooking after COLLECTION_FAILED', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'COLLECTION_FAILED',
        patientId: 'patient-1',
        collectionPincode: '500033',
      });

      prisma.labSlot.findUnique.mockResolvedValue({
        id: 'slot-2',
        date: new Date('2026-03-02'),
        startTime: '9:00',
        endTime: '11:00',
        serviceableAreas: ['500033'],
        currentBookings: 1,
        maxBookings: 5,
      });

      prisma.labSlot.update.mockResolvedValue({ id: 'slot-2', currentBookings: 2 });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        status: 'SLOT_BOOKED',
        labPhlebotomistId: null,
      });

      const result = await service.bookSlotForLabOrder('lo-1', 'patient-1', 'slot-2');

      expect(result.status).toBe('SLOT_BOOKED');
    });
  });

  // ========================================
  // getAvailableSlots
  // ========================================

  describe('getAvailableSlots', () => {
    it('should return slots that have capacity and service the pincode', async () => {
      prisma.labSlot.findMany.mockResolvedValue([
        { id: 'slot-1', currentBookings: 2, maxBookings: 5, startTime: '8:00', endTime: '10:00' },
        { id: 'slot-2', currentBookings: 5, maxBookings: 5, startTime: '10:00', endTime: '12:00' },
        { id: 'slot-3', currentBookings: 0, maxBookings: 5, startTime: '14:00', endTime: '16:00' },
      ]);

      const result = await service.getAvailableSlots(
        '500033', 'Hyderabad', new Date('2026-03-01'), new Date('2026-03-07'),
      );

      // slot-2 is full, should be filtered out
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('slot-1');
      expect(result[1].id).toBe('slot-3');
    });

    it('should return only morning slots when requiresFasting is true', async () => {
      prisma.labSlot.findMany.mockResolvedValue([
        { id: 'slot-morning', currentBookings: 0, maxBookings: 5, startTime: '7:00', endTime: '9:00' },
        { id: 'slot-mid', currentBookings: 0, maxBookings: 5, startTime: '9:00', endTime: '11:00' },
        { id: 'slot-afternoon', currentBookings: 0, maxBookings: 5, startTime: '14:00', endTime: '16:00' },
      ]);

      const result = await service.getAvailableSlots(
        '500033', 'Hyderabad', new Date('2026-03-01'), new Date('2026-03-07'), true,
      );

      // Only slots starting before 10:00 for fasting
      expect(result).toHaveLength(2);
      expect(result.find((s: any) => s.id === 'slot-afternoon')).toBeUndefined();
    });
  });

  // ========================================
  // getDailyRoster
  // ========================================

  describe('getDailyRoster', () => {
    it('should return roster with order details for a phlebotomist on a date', async () => {
      prisma.phlebotomistDailyRoster.findUnique.mockResolvedValue({
        phlebotomistId: 'phleb-1',
        date: new Date('2026-03-01'),
        totalBookings: 3,
        completedCollections: 1,
        failedCollections: 0,
        routeOrder: [
          { labOrderId: 'lo-1', address: '123 Main St', timeSlot: '8:00-9:00' },
          { labOrderId: 'lo-2', address: '456 Oak Ave', timeSlot: '9:00-10:00' },
        ],
      });

      const result = await service.getDailyRoster('phleb-1', new Date('2026-03-01'));

      expect(result).toBeDefined();
      expect(result.totalBookings).toBe(3);
      expect(result.routeOrder).toHaveLength(2);
    });

    it('should return null if no roster exists for the date', async () => {
      prisma.phlebotomistDailyRoster.findUnique.mockResolvedValue(null);

      const result = await service.getDailyRoster('phleb-1', new Date('2026-03-15'));

      expect(result).toBeNull();
    });
  });

  // ========================================
  // cancelSlotBooking
  // ========================================

  describe('cancelSlotBooking', () => {
    it('should cancel booking and decrement slot count', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'SLOT_BOOKED',
        patientId: 'patient-1',
        bookedDate: new Date('2026-03-01'),
        bookedTimeSlot: '8:00-10:00',
        collectionCity: 'Hyderabad',
        labPhlebotomistId: null,
      });

      prisma.labSlot.findMany.mockResolvedValue([
        { id: 'slot-1', currentBookings: 3, date: new Date('2026-03-01'), startTime: '8:00', endTime: '10:00' },
      ]);

      prisma.labSlot.update.mockResolvedValue({ id: 'slot-1', currentBookings: 2 });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        status: 'CANCELLED',
        cancelledAt: expect.any(Date),
      });

      const result = await service.cancelSlotBooking('lo-1', 'patient-1', 'Changed plans');

      expect(result.status).toBe('CANCELLED');
      expect(prisma.labSlot.update).toHaveBeenCalled();
    });

    it('should also decrement roster when phlebotomist was assigned', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'PHLEBOTOMIST_ASSIGNED',
        patientId: 'patient-1',
        bookedDate: new Date('2026-03-01'),
        bookedTimeSlot: '8:00-10:00',
        collectionCity: 'Hyderabad',
        labPhlebotomistId: 'phleb-1',
      });

      prisma.labSlot.findMany.mockResolvedValue([
        { id: 'slot-1', currentBookings: 3, date: new Date('2026-03-01'), startTime: '8:00', endTime: '10:00' },
      ]);

      prisma.labSlot.update.mockResolvedValue({ id: 'slot-1', currentBookings: 2 });
      prisma.phlebotomistDailyRoster.findUnique.mockResolvedValue({
        phlebotomistId: 'phleb-1',
        totalBookings: 4,
      });
      prisma.phlebotomistDailyRoster.update.mockResolvedValue({
        phlebotomistId: 'phleb-1',
        totalBookings: 3,
      });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        status: 'CANCELLED',
      });

      await service.cancelSlotBooking('lo-1', 'patient-1', 'Changed plans');

      expect(prisma.phlebotomistDailyRoster.update).toHaveBeenCalled();
    });

    it('should throw if patient does not own the order', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'SLOT_BOOKED',
        patientId: 'other-patient',
      });

      await expect(
        service.cancelSlotBooking('lo-1', 'patient-1', 'reason'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if order is not in cancellable status', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'SAMPLE_COLLECTED', // too late to cancel
        patientId: 'patient-1',
      });

      await expect(
        service.cancelSlotBooking('lo-1', 'patient-1', 'reason'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
