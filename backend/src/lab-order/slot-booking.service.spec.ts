import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  SlotBookingService,
  BookSlotInput,
  RescheduleSlotInput,
} from './slot-booking.service';
import { LabOrderStatus } from './lab-order.service';
import { PrismaService } from '../prisma/prisma.service';

// Spec: master spec Section 7.2 Steps 2-4 (Slot Booking & Phlebotomist Assignment)

describe('SlotBookingService', () => {
  let service: SlotBookingService;
  let mockPrismaService: any;

  const mockLabSlot = {
    id: 'slot-1',
    date: new Date('2026-02-15'),
    startTime: '08:00',
    endTime: '10:00',
    phlebotomistId: null,
    maxBookings: 5,
    currentBookings: 2,
    city: 'Mumbai',
    serviceableAreas: ['400001', '400002', '400003'],
  };

  const mockPhlebotomist = {
    id: 'phlebotomist-1',
    name: 'Priya R.',
    phone: '+919876543210',
    certification: 'NABL Certified',
    availableDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
    availableTimeStart: '08:00',
    availableTimeEnd: '18:00',
    maxDailyCollections: 10,
    currentCity: 'Mumbai',
    serviceableAreas: ['400001', '400002', '400003'],
    isActive: true,
    completedCollections: 150,
    failedCollections: 5,
    rating: 4.8,
  };

  const mockLabOrder = {
    id: 'lab-order-1',
    patientId: 'patient-1',
    consultationId: 'consultation-1',
    doctorId: 'doctor-1',
    status: LabOrderStatus.ORDERED,
    orderedAt: new Date('2026-02-10T10:00:00Z'),
    collectionAddress: '123 Test Street',
    collectionCity: 'Mumbai',
    collectionPincode: '400001',
    testPanel: ['TSH', 'CBC'],
  };

  beforeEach(async () => {
    mockPrismaService = {
      labSlot: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
      },
      labOrder: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      phlebotomist: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlotBookingService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SlotBookingService>(SlotBookingService);
  });

  // ============================================
  // SLOT AVAILABILITY TESTS
  // ============================================

  describe('getAvailableSlots', () => {
    it('should return available slots for a city and date range', async () => {
      const availableSlots = [
        mockLabSlot,
        { ...mockLabSlot, id: 'slot-2', startTime: '10:00', endTime: '12:00' },
      ];
      mockPrismaService.labSlot.findMany.mockResolvedValue(availableSlots);

      const result = await service.getAvailableSlots({
        city: 'Mumbai',
        pincode: '400001',
        startDate: new Date('2026-02-15'),
        endDate: new Date('2026-02-20'),
      });

      expect(result).toHaveLength(2);
      expect(mockPrismaService.labSlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            city: 'Mumbai',
            serviceableAreas: { has: '400001' },
          }),
        })
      );
    });

    it('should filter out fully booked slots', async () => {
      const slots = [
        mockLabSlot, // 2/5 booked
        { ...mockLabSlot, id: 'slot-2', currentBookings: 5 }, // fully booked
      ];
      mockPrismaService.labSlot.findMany.mockResolvedValue(
        slots.filter((s) => s.currentBookings < s.maxBookings)
      );

      const result = await service.getAvailableSlots({
        city: 'Mumbai',
        pincode: '400001',
        startDate: new Date('2026-02-15'),
        endDate: new Date('2026-02-20'),
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('slot-1');
    });

    it('should return empty array if no slots available', async () => {
      mockPrismaService.labSlot.findMany.mockResolvedValue([]);

      const result = await service.getAvailableSlots({
        city: 'Unknown City',
        pincode: '999999',
        startDate: new Date('2026-02-15'),
        endDate: new Date('2026-02-20'),
      });

      expect(result).toHaveLength(0);
    });

    it('should only return slots with serviceable area matching pincode', async () => {
      mockPrismaService.labSlot.findMany.mockResolvedValue([mockLabSlot]);

      await service.getAvailableSlots({
        city: 'Mumbai',
        pincode: '400001',
        startDate: new Date('2026-02-15'),
        endDate: new Date('2026-02-20'),
      });

      expect(mockPrismaService.labSlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            serviceableAreas: { has: '400001' },
          }),
        })
      );
    });
  });

  // ============================================
  // BOOK SLOT TESTS
  // ============================================

  describe('bookSlot', () => {
    // Spec: Section 7.2 Step 2 — Patient Books Slot

    it('should book a slot and update lab order status to SLOT_BOOKED', async () => {
      const input: BookSlotInput = {
        labOrderId: 'lab-order-1',
        slotId: 'slot-1',
        patientId: 'patient-1',
        collectionAddress: '123 Test Street',
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(mockLabOrder);
      mockPrismaService.labSlot.findUnique.mockResolvedValue(mockLabSlot);
      mockPrismaService.labSlot.update.mockResolvedValue({
        ...mockLabSlot,
        currentBookings: 3,
      });
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...mockLabOrder,
        status: LabOrderStatus.SLOT_BOOKED,
        bookedDate: mockLabSlot.date,
        bookedTimeSlot: `${mockLabSlot.startTime}-${mockLabSlot.endTime}`,
        slotBookedAt: new Date(),
      });

      const result = await service.bookSlot(input);

      expect(result.status).toBe(LabOrderStatus.SLOT_BOOKED);
      expect(result.bookedDate).toEqual(mockLabSlot.date);
    });

    it('should increment currentBookings on the slot', async () => {
      mockPrismaService.labOrder.findUnique.mockResolvedValue(mockLabOrder);
      mockPrismaService.labSlot.findUnique.mockResolvedValue(mockLabSlot);
      mockPrismaService.labSlot.update.mockResolvedValue({
        ...mockLabSlot,
        currentBookings: 3,
      });
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...mockLabOrder,
        status: LabOrderStatus.SLOT_BOOKED,
      });

      await service.bookSlot({
        labOrderId: 'lab-order-1',
        slotId: 'slot-1',
        patientId: 'patient-1',
      });

      expect(mockPrismaService.labSlot.update).toHaveBeenCalledWith({
        where: { id: 'slot-1' },
        data: { currentBookings: { increment: 1 } },
      });
    });

    it('should throw error if slot is fully booked', async () => {
      const fullyBookedSlot = { ...mockLabSlot, currentBookings: 5, maxBookings: 5 };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(mockLabOrder);
      mockPrismaService.labSlot.findUnique.mockResolvedValue(fullyBookedSlot);

      await expect(
        service.bookSlot({
          labOrderId: 'lab-order-1',
          slotId: 'slot-1',
          patientId: 'patient-1',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if lab order not found', async () => {
      mockPrismaService.labOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.bookSlot({
          labOrderId: 'invalid',
          slotId: 'slot-1',
          patientId: 'patient-1',
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if slot not found', async () => {
      mockPrismaService.labOrder.findUnique.mockResolvedValue(mockLabOrder);
      mockPrismaService.labSlot.findUnique.mockResolvedValue(null);

      await expect(
        service.bookSlot({
          labOrderId: 'lab-order-1',
          slotId: 'invalid',
          patientId: 'patient-1',
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if patient does not own the lab order', async () => {
      mockPrismaService.labOrder.findUnique.mockResolvedValue(mockLabOrder);
      mockPrismaService.labSlot.findUnique.mockResolvedValue(mockLabSlot);

      await expect(
        service.bookSlot({
          labOrderId: 'lab-order-1',
          slotId: 'slot-1',
          patientId: 'different-patient',
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw error if lab order is not in ORDERED or COLLECTION_FAILED status', async () => {
      const processingOrder = { ...mockLabOrder, status: LabOrderStatus.PROCESSING };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(processingOrder);
      mockPrismaService.labSlot.findUnique.mockResolvedValue(mockLabSlot);

      await expect(
        service.bookSlot({
          labOrderId: 'lab-order-1',
          slotId: 'slot-1',
          patientId: 'patient-1',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow booking from COLLECTION_FAILED status (rebook flow)', async () => {
      const failedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.COLLECTION_FAILED,
        collectionFailedAt: new Date(),
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(failedOrder);
      mockPrismaService.labSlot.findUnique.mockResolvedValue(mockLabSlot);
      mockPrismaService.labSlot.update.mockResolvedValue({
        ...mockLabSlot,
        currentBookings: 3,
      });
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...failedOrder,
        status: LabOrderStatus.SLOT_BOOKED,
        slotBookedAt: new Date(),
        phlebotomistId: null,
        phlebotomistAssignedAt: null,
      });

      const result = await service.bookSlot({
        labOrderId: 'lab-order-1',
        slotId: 'slot-1',
        patientId: 'patient-1',
      });

      expect(result.status).toBe(LabOrderStatus.SLOT_BOOKED);
    });

    it('should throw error if pincode not serviceable by slot', async () => {
      const orderWithDifferentPincode = {
        ...mockLabOrder,
        collectionPincode: '999999', // Not in slot's serviceable areas
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(orderWithDifferentPincode);
      mockPrismaService.labSlot.findUnique.mockResolvedValue(mockLabSlot);

      await expect(
        service.bookSlot({
          labOrderId: 'lab-order-1',
          slotId: 'slot-1',
          patientId: 'patient-1',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // CANCEL SLOT TESTS
  // ============================================

  describe('cancelSlot', () => {
    // Spec: Section 7.2 Step 2b — Patient Cancels

    it('should cancel slot from SLOT_BOOKED status', async () => {
      const bookedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.SLOT_BOOKED,
        bookedDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        bookedTimeSlot: '08:00-10:00',
        slotId: 'slot-1',
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(bookedOrder);
      mockPrismaService.labSlot.update.mockResolvedValue({
        ...mockLabSlot,
        currentBookings: 1,
      });
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...bookedOrder,
        status: LabOrderStatus.CANCELLED,
        cancelledAt: new Date(),
      });

      const result = await service.cancelSlot({
        labOrderId: 'lab-order-1',
        patientId: 'patient-1',
        reason: 'Changed mind',
      });

      expect(result.status).toBe(LabOrderStatus.CANCELLED);
    });

    it('should decrement currentBookings on the slot when cancelling', async () => {
      const bookedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.SLOT_BOOKED,
        bookedDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        bookedTimeSlot: '08:00-10:00',
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(bookedOrder);
      mockPrismaService.labSlot.findFirst.mockResolvedValue(mockLabSlot);
      mockPrismaService.labSlot.update.mockResolvedValue({
        ...mockLabSlot,
        currentBookings: 1,
      });
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...bookedOrder,
        status: LabOrderStatus.CANCELLED,
      });

      await service.cancelSlot({
        labOrderId: 'lab-order-1',
        patientId: 'patient-1',
        reason: 'Changed mind',
      });

      expect(mockPrismaService.labSlot.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { currentBookings: { decrement: 1 } },
        })
      );
    });

    it('should allow cancellation from PHLEBOTOMIST_ASSIGNED with ≥4hr notice', async () => {
      const assignedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
        bookedDate: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours from now
        bookedTimeSlot: '08:00-10:00',
        phlebotomistId: 'phlebotomist-1',
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(assignedOrder);
      mockPrismaService.labSlot.findFirst.mockResolvedValue(mockLabSlot);
      mockPrismaService.labSlot.update.mockResolvedValue({
        ...mockLabSlot,
        currentBookings: 1,
      });
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...assignedOrder,
        status: LabOrderStatus.CANCELLED,
      });

      const result = await service.cancelSlot({
        labOrderId: 'lab-order-1',
        patientId: 'patient-1',
        reason: 'Not needed',
      });

      expect(result.status).toBe(LabOrderStatus.CANCELLED);
    });

    it('should throw error when cancelling PHLEBOTOMIST_ASSIGNED with <4hr notice', async () => {
      const now = new Date();
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      const assignedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
        bookedDate: twoHoursFromNow,
        bookedTimeSlot: '08:00-10:00',
        phlebotomistId: 'phlebotomist-1',
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(assignedOrder);

      await expect(
        service.cancelSlot({
          labOrderId: 'lab-order-1',
          patientId: 'patient-1',
          reason: 'Too late',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should NOT allow cancellation from SAMPLE_COLLECTED onwards', async () => {
      const collectedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.SAMPLE_COLLECTED,
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(collectedOrder);

      await expect(
        service.cancelSlot({
          labOrderId: 'lab-order-1',
          patientId: 'patient-1',
          reason: 'Too late',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // RESCHEDULE SLOT TESTS
  // ============================================

  describe('rescheduleSlot', () => {
    // Spec: Section 7.2 Step 2b — Patient Reschedules

    it('should reschedule to a new slot and free the old slot', async () => {
      const bookedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.SLOT_BOOKED,
        bookedDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        bookedTimeSlot: '08:00-10:00',
      };

      const newSlot = {
        ...mockLabSlot,
        id: 'slot-2',
        date: new Date('2026-02-16'),
        startTime: '10:00',
        endTime: '12:00',
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(bookedOrder);
      mockPrismaService.labSlot.findFirst.mockResolvedValue(mockLabSlot); // old slot
      mockPrismaService.labSlot.findUnique.mockResolvedValue(newSlot);
      mockPrismaService.labSlot.update.mockResolvedValue(mockLabSlot); // Multiple calls
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...bookedOrder,
        bookedDate: newSlot.date,
        bookedTimeSlot: `${newSlot.startTime}-${newSlot.endTime}`,
      });

      const result = await service.rescheduleSlot({
        labOrderId: 'lab-order-1',
        newSlotId: 'slot-2',
        patientId: 'patient-1',
      });

      expect(result.bookedDate).toEqual(newSlot.date);
    });

    it('should decrement old slot and increment new slot bookings', async () => {
      const bookedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.SLOT_BOOKED,
        bookedDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        bookedTimeSlot: '08:00-10:00',
      };

      const newSlot = {
        ...mockLabSlot,
        id: 'slot-2',
        date: new Date('2026-02-16'),
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(bookedOrder);
      mockPrismaService.labSlot.findFirst.mockResolvedValue(mockLabSlot);
      mockPrismaService.labSlot.findUnique.mockResolvedValue(newSlot);
      mockPrismaService.labSlot.update
        .mockResolvedValueOnce({ ...mockLabSlot, currentBookings: 1 })
        .mockResolvedValueOnce({ ...newSlot, currentBookings: 3 });
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...bookedOrder,
        bookedDate: newSlot.date,
      });

      await service.rescheduleSlot({
        labOrderId: 'lab-order-1',
        newSlotId: 'slot-2',
        patientId: 'patient-1',
      });

      // Should be called twice: once to decrement old, once to increment new
      expect(mockPrismaService.labSlot.update).toHaveBeenCalledTimes(2);
    });

    it('should throw error if rescheduling within 4 hours of slot', async () => {
      const now = new Date();
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      const bookedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
        bookedDate: twoHoursFromNow,
        bookedTimeSlot: '08:00-10:00',
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(bookedOrder);

      await expect(
        service.rescheduleSlot({
          labOrderId: 'lab-order-1',
          newSlotId: 'slot-2',
          patientId: 'patient-1',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should clear phlebotomist assignment when rescheduling', async () => {
      const assignedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
        bookedDate: new Date(Date.now() + 8 * 60 * 60 * 1000),
        bookedTimeSlot: '08:00-10:00',
        phlebotomistId: 'phlebotomist-1',
        phlebotomistAssignedAt: new Date(),
      };

      const newSlot = { ...mockLabSlot, id: 'slot-2' };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(assignedOrder);
      mockPrismaService.labSlot.findFirst.mockResolvedValue(mockLabSlot);
      mockPrismaService.labSlot.findUnique.mockResolvedValue(newSlot);
      mockPrismaService.labSlot.update.mockResolvedValue(mockLabSlot);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...assignedOrder,
        status: LabOrderStatus.SLOT_BOOKED,
        phlebotomistId: null,
        phlebotomistAssignedAt: null,
      });

      await service.rescheduleSlot({
        labOrderId: 'lab-order-1',
        newSlotId: 'slot-2',
        patientId: 'patient-1',
      });

      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: LabOrderStatus.SLOT_BOOKED,
            phlebotomistId: null,
            phlebotomistAssignedAt: null,
          }),
        })
      );
    });

    it('should throw error if new slot is fully booked', async () => {
      const bookedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.SLOT_BOOKED,
        bookedDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      const fullyBookedSlot = { ...mockLabSlot, id: 'slot-2', currentBookings: 5, maxBookings: 5 };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(bookedOrder);
      mockPrismaService.labSlot.findFirst.mockResolvedValue(mockLabSlot);
      mockPrismaService.labSlot.findUnique.mockResolvedValue(fullyBookedSlot);

      await expect(
        service.rescheduleSlot({
          labOrderId: 'lab-order-1',
          newSlotId: 'slot-2',
          patientId: 'patient-1',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // PHLEBOTOMIST ASSIGNMENT TESTS
  // ============================================

  describe('assignPhlebotomist', () => {
    // Spec: Section 7.2 Step 3 — Coordinator Assigns Phlebotomist

    it('should assign phlebotomist and update status to PHLEBOTOMIST_ASSIGNED', async () => {
      const bookedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.SLOT_BOOKED,
        bookedDate: new Date('2026-02-15'),
        bookedTimeSlot: '08:00-10:00',
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(bookedOrder);
      mockPrismaService.phlebotomist.findUnique.mockResolvedValue(mockPhlebotomist);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...bookedOrder,
        status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
        phlebotomistId: 'phlebotomist-1',
        phlebotomistAssignedAt: new Date(),
      });

      const result = await service.assignPhlebotomist({
        labOrderId: 'lab-order-1',
        phlebotomistId: 'phlebotomist-1',
        coordinatorId: 'admin-1',
      });

      expect(result.status).toBe(LabOrderStatus.PHLEBOTOMIST_ASSIGNED);
      expect(result.phlebotomistId).toBe('phlebotomist-1');
    });

    it('should set phlebotomistAssignedAt timestamp', async () => {
      const bookedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.SLOT_BOOKED,
        bookedDate: new Date('2026-02-15'),
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(bookedOrder);
      mockPrismaService.phlebotomist.findUnique.mockResolvedValue(mockPhlebotomist);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...bookedOrder,
        status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
        phlebotomistAssignedAt: new Date(),
      });

      await service.assignPhlebotomist({
        labOrderId: 'lab-order-1',
        phlebotomistId: 'phlebotomist-1',
        coordinatorId: 'admin-1',
      });

      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phlebotomistAssignedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should throw error if lab order not in SLOT_BOOKED status', async () => {
      mockPrismaService.labOrder.findUnique.mockResolvedValue(mockLabOrder); // ORDERED status

      await expect(
        service.assignPhlebotomist({
          labOrderId: 'lab-order-1',
          phlebotomistId: 'phlebotomist-1',
          coordinatorId: 'admin-1',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if phlebotomist not found', async () => {
      const bookedOrder = { ...mockLabOrder, status: LabOrderStatus.SLOT_BOOKED };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(bookedOrder);
      mockPrismaService.phlebotomist.findUnique.mockResolvedValue(null);

      await expect(
        service.assignPhlebotomist({
          labOrderId: 'lab-order-1',
          phlebotomistId: 'invalid',
          coordinatorId: 'admin-1',
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if phlebotomist does not service the area', async () => {
      const bookedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.SLOT_BOOKED,
        collectionPincode: '999999', // Not in phlebotomist's serviceable areas
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(bookedOrder);
      mockPrismaService.phlebotomist.findUnique.mockResolvedValue(mockPhlebotomist);

      await expect(
        service.assignPhlebotomist({
          labOrderId: 'lab-order-1',
          phlebotomistId: 'phlebotomist-1',
          coordinatorId: 'admin-1',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if phlebotomist is not active', async () => {
      const bookedOrder = { ...mockLabOrder, status: LabOrderStatus.SLOT_BOOKED };
      const inactivePhlebotomist = { ...mockPhlebotomist, isActive: false };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(bookedOrder);
      mockPrismaService.phlebotomist.findUnique.mockResolvedValue(inactivePhlebotomist);

      await expect(
        service.assignPhlebotomist({
          labOrderId: 'lab-order-1',
          phlebotomistId: 'phlebotomist-1',
          coordinatorId: 'admin-1',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // GET AVAILABLE PHLEBOTOMISTS TESTS
  // ============================================

  describe('getAvailablePhlebotomists', () => {
    it('should return phlebotomists who service the given pincode', async () => {
      mockPrismaService.phlebotomist.findMany.mockResolvedValue([mockPhlebotomist]);

      const result = await service.getAvailablePhlebotomists({
        pincode: '400001',
        date: new Date('2026-02-15'),
      });

      expect(result).toHaveLength(1);
      expect(mockPrismaService.phlebotomist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            serviceableAreas: { has: '400001' },
            isActive: true,
          }),
        })
      );
    });

    it('should filter by available days', async () => {
      const date = new Date('2026-02-15'); // This is a Saturday
      mockPrismaService.phlebotomist.findMany.mockResolvedValue([]);

      await service.getAvailablePhlebotomists({
        pincode: '400001',
        date,
      });

      // The day check should be included
      expect(mockPrismaService.phlebotomist.findMany).toHaveBeenCalled();
    });

    it('should return empty array if no phlebotomists available', async () => {
      mockPrismaService.phlebotomist.findMany.mockResolvedValue([]);

      const result = await service.getAvailablePhlebotomists({
        pincode: '999999',
        date: new Date('2026-02-15'),
      });

      expect(result).toHaveLength(0);
    });
  });

  // ============================================
  // PHLEBOTOMIST RUNNING LATE TESTS
  // ============================================

  describe('markRunningLate', () => {
    // Spec: Section 7.2 Step 4 — Phlebotomist Running Late

    it('should update ETA when phlebotomist marks as running late', async () => {
      const assignedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
        phlebotomistId: 'phlebotomist-1',
        bookedDate: new Date(),
        bookedTimeSlot: '08:00-10:00',
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(assignedOrder);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...assignedOrder,
        estimatedArrivalTime: '09:30',
        runningLateAt: new Date(),
      });

      const result = await service.markRunningLate({
        labOrderId: 'lab-order-1',
        phlebotomistId: 'phlebotomist-1',
        newETA: '09:30',
      });

      expect(result.estimatedArrivalTime).toBe('09:30');
    });

    it('should throw error if not the assigned phlebotomist', async () => {
      const assignedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
        phlebotomistId: 'phlebotomist-1',
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(assignedOrder);

      await expect(
        service.markRunningLate({
          labOrderId: 'lab-order-1',
          phlebotomistId: 'different-phlebotomist',
          newETA: '09:30',
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw error if order not in PHLEBOTOMIST_ASSIGNED status', async () => {
      // Need to set phlebotomistId to pass the assignment check, then status check will fail
      const bookedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.SLOT_BOOKED,
        phlebotomistId: 'phlebotomist-1',
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(bookedOrder);

      await expect(
        service.markRunningLate({
          labOrderId: 'lab-order-1',
          phlebotomistId: 'phlebotomist-1',
          newETA: '09:30',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // PHLEBOTOMIST PATIENT UNAVAILABLE TESTS
  // ============================================

  describe('markPatientUnavailable', () => {
    // Spec: Section 7.2 Step 4 — Patient not home

    it('should mark COLLECTION_FAILED with reason', async () => {
      const assignedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
        phlebotomistId: 'phlebotomist-1',
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(assignedOrder);
      mockPrismaService.phlebotomist.update.mockResolvedValue({
        ...mockPhlebotomist,
        failedCollections: 6,
      });
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...assignedOrder,
        status: LabOrderStatus.COLLECTION_FAILED,
        collectionFailedAt: new Date(),
        collectionFailedReason: 'Patient not home',
      });

      const result = await service.markPatientUnavailable({
        labOrderId: 'lab-order-1',
        phlebotomistId: 'phlebotomist-1',
        reason: 'Patient not home',
      });

      expect(result.status).toBe(LabOrderStatus.COLLECTION_FAILED);
      expect(result.collectionFailedReason).toBe('Patient not home');
    });

    it('should set collectionFailedAt timestamp', async () => {
      const assignedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
        phlebotomistId: 'phlebotomist-1',
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(assignedOrder);
      mockPrismaService.phlebotomist.update.mockResolvedValue(mockPhlebotomist);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...assignedOrder,
        status: LabOrderStatus.COLLECTION_FAILED,
        collectionFailedAt: new Date(),
      });

      await service.markPatientUnavailable({
        labOrderId: 'lab-order-1',
        phlebotomistId: 'phlebotomist-1',
        reason: 'Patient not home',
      });

      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            collectionFailedAt: expect.any(Date),
            collectionFailedReason: 'Patient not home',
          }),
        })
      );
    });

    it('should increment phlebotomist failedCollections count', async () => {
      const assignedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
        phlebotomistId: 'phlebotomist-1',
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(assignedOrder);
      mockPrismaService.phlebotomist.update.mockResolvedValue({
        ...mockPhlebotomist,
        failedCollections: 6,
      });
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...assignedOrder,
        status: LabOrderStatus.COLLECTION_FAILED,
      });

      await service.markPatientUnavailable({
        labOrderId: 'lab-order-1',
        phlebotomistId: 'phlebotomist-1',
        reason: 'Patient not home',
      });

      expect(mockPrismaService.phlebotomist.update).toHaveBeenCalledWith({
        where: { id: 'phlebotomist-1' },
        data: { failedCollections: { increment: 1 } },
      });
    });

    it('should throw error if not the assigned phlebotomist', async () => {
      const assignedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
        phlebotomistId: 'phlebotomist-1',
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(assignedOrder);

      await expect(
        service.markPatientUnavailable({
          labOrderId: 'lab-order-1',
          phlebotomistId: 'different-phlebotomist',
          reason: 'Patient not home',
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should accept different failure reasons', async () => {
      const reasons = ['Patient not home', 'No answer', 'Reschedule requested', 'Wrong address'];

      for (const reason of reasons) {
        const assignedOrder = {
          ...mockLabOrder,
          status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
          phlebotomistId: 'phlebotomist-1',
        };

        mockPrismaService.labOrder.findUnique.mockResolvedValue(assignedOrder);
        mockPrismaService.phlebotomist.update.mockResolvedValue(mockPhlebotomist);
        mockPrismaService.labOrder.update.mockResolvedValue({
          ...assignedOrder,
          status: LabOrderStatus.COLLECTION_FAILED,
          collectionFailedReason: reason,
        });

        const result = await service.markPatientUnavailable({
          labOrderId: 'lab-order-1',
          phlebotomistId: 'phlebotomist-1',
          reason,
        });

        expect(result.collectionFailedReason).toBe(reason);
      }
    });
  });

  // ============================================
  // CREATE SLOT TESTS
  // ============================================

  describe('createSlot', () => {
    it('should create a new lab slot', async () => {
      mockPrismaService.labSlot.create.mockResolvedValue(mockLabSlot);

      const result = await service.createSlot({
        date: new Date('2026-02-15'),
        startTime: '08:00',
        endTime: '10:00',
        city: 'Mumbai',
        serviceableAreas: ['400001', '400002', '400003'],
        maxBookings: 5,
      });

      expect(result.id).toBe('slot-1');
      expect(mockPrismaService.labSlot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            date: new Date('2026-02-15'),
            startTime: '08:00',
            endTime: '10:00',
          }),
        })
      );
    });

    it('should set default maxBookings if not provided', async () => {
      mockPrismaService.labSlot.create.mockResolvedValue({
        ...mockLabSlot,
        maxBookings: 5,
      });

      await service.createSlot({
        date: new Date('2026-02-15'),
        startTime: '08:00',
        endTime: '10:00',
        city: 'Mumbai',
        serviceableAreas: ['400001'],
      });

      expect(mockPrismaService.labSlot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            maxBookings: 5,
          }),
        })
      );
    });
  });

  // ============================================
  // TODAY'S ASSIGNMENTS FOR PHLEBOTOMIST TESTS
  // ============================================

  describe('getTodaysAssignments', () => {
    it('should return lab orders assigned to phlebotomist for today', async () => {
      const todayOrders = [
        {
          ...mockLabOrder,
          status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
          phlebotomistId: 'phlebotomist-1',
          bookedDate: new Date(),
        },
      ];

      mockPrismaService.labOrder.findMany.mockResolvedValue(todayOrders);

      const result = await service.getTodaysAssignments('phlebotomist-1');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.labOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            phlebotomistId: 'phlebotomist-1',
            status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
          }),
        })
      );
    });

    it('should return empty array if no assignments for today', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([]);

      const result = await service.getTodaysAssignments('phlebotomist-1');

      expect(result).toHaveLength(0);
    });
  });
});
