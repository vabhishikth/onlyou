import { Test, TestingModule } from '@nestjs/testing';
import { PatientActionsService } from './patient-actions.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

// Spec: master spec Section 4.4 (Patient Actions Per Status)

describe('PatientActionsService', () => {
  let service: PatientActionsService;
  let mockPrismaService: any;

  const baseLabOrder = {
    id: 'lab-1',
    patientId: 'user-1',
    consultationId: 'consult-1',
    doctorId: 'doctor-1',
    testPanel: ['TSH', 'CBC'],
    collectionAddress: '123 Main St',
    collectionCity: 'Mumbai',
    collectionPincode: '400001',
    labCost: 99900,
  };

  const baseOrder = {
    id: 'order-1',
    patientId: 'user-1',
    prescriptionId: 'prescription-1',
    consultationId: 'consult-1',
    deliveryAddress: '123 Main St',
    deliveryCity: 'Mumbai',
    deliveryPincode: '400001',
    medicationCost: 99900,
    deliveryCost: 5000,
    totalAmount: 104900,
  };

  beforeEach(async () => {
    mockPrismaService = {
      labOrder: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      labSlot: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientActionsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PatientActionsService>(PatientActionsService);
  });

  describe('getAvailableActions', () => {
    describe('Lab Order Actions (Spec: Section 4.4)', () => {
      it('should return book_slot and upload_results actions for ORDERED status', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...baseLabOrder,
          status: 'ORDERED',
        });

        const actions = await service.getAvailableActions('user-1', 'lab-1', 'lab');

        expect(actions).toContain('book_slot');
        expect(actions).toContain('upload_results');
      });

      it('should return reschedule and cancel actions for SLOT_BOOKED status', async () => {
        // Set slot to tomorrow at a time well in the future
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0); // Set to midnight of tomorrow

        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...baseLabOrder,
          status: 'SLOT_BOOKED',
          bookedDate: tomorrow,
          bookedTimeSlot: '10:00-12:00', // 10 AM tomorrow is well ahead
        });

        const actions = await service.getAvailableActions('user-1', 'lab-1', 'lab');

        expect(actions).toContain('reschedule');
        expect(actions).toContain('cancel');
      });

      it('should return reschedule and cancel actions for PHLEBOTOMIST_ASSIGNED with 4hr+ notice', async () => {
        // Set slot to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...baseLabOrder,
          status: 'PHLEBOTOMIST_ASSIGNED',
          bookedDate: tomorrow,
          bookedTimeSlot: '10:00-12:00',
        });

        const actions = await service.getAvailableActions('user-1', 'lab-1', 'lab');

        expect(actions).toContain('reschedule');
        expect(actions).toContain('cancel');
      });

      it('should block reschedule and cancel if less than 4 hours before slot', async () => {
        // Set slot to 2 hours from now
        const now = new Date();
        const slotTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
        const hours = slotTime.getHours().toString().padStart(2, '0');
        const slotTimeStr = `${hours}:00-${(parseInt(hours) + 2).toString().padStart(2, '0')}:00`;

        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...baseLabOrder,
          status: 'PHLEBOTOMIST_ASSIGNED',
          bookedDate: slotTime,
          bookedTimeSlot: slotTimeStr,
        });

        const actions = await service.getAvailableActions('user-1', 'lab-1', 'lab');

        expect(actions).not.toContain('reschedule');
        expect(actions).not.toContain('cancel');
        expect(actions).toContain('contact_support');
      });

      it('should return view-only (no actions) for SAMPLE_COLLECTED status', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...baseLabOrder,
          status: 'SAMPLE_COLLECTED',
        });

        const actions = await service.getAvailableActions('user-1', 'lab-1', 'lab');

        expect(actions).not.toContain('reschedule');
        expect(actions).not.toContain('cancel');
        expect(actions).not.toContain('book_slot');
        expect(actions).toContain('view_tracking');
      });

      it('should return view_pdf and download actions for RESULTS_READY status', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...baseLabOrder,
          status: 'RESULTS_READY',
          resultFileUrl: 'https://s3.example.com/results.pdf',
        });

        const actions = await service.getAvailableActions('user-1', 'lab-1', 'lab');

        expect(actions).toContain('view_pdf');
        expect(actions).toContain('download');
      });

      it('should return rebook action for COLLECTION_FAILED status', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...baseLabOrder,
          status: 'COLLECTION_FAILED',
        });

        const actions = await service.getAvailableActions('user-1', 'lab-1', 'lab');

        expect(actions).toContain('rebook');
      });

      it('should return view-only for DELIVERED_TO_LAB status', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...baseLabOrder,
          status: 'DELIVERED_TO_LAB',
        });

        const actions = await service.getAvailableActions('user-1', 'lab-1', 'lab');

        expect(actions).toContain('view_tracking');
        expect(actions).not.toContain('cancel');
      });

      it('should return view-only for PROCESSING status', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...baseLabOrder,
          status: 'PROCESSING',
        });

        const actions = await service.getAvailableActions('user-1', 'lab-1', 'lab');

        expect(actions).toContain('view_tracking');
        expect(actions).not.toContain('cancel');
      });
    });

    describe('Delivery Order Actions (Spec: Section 4.4)', () => {
      it('should return view_prescription and contact_support for PRESCRIPTION_CREATED to PHARMACY_READY', async () => {
        mockPrismaService.order.findUnique.mockResolvedValue({
          ...baseOrder,
          status: 'PHARMACY_PREPARING',
        });

        const actions = await service.getAvailableActions('user-1', 'order-1', 'delivery');

        expect(actions).toContain('view_prescription');
        expect(actions).toContain('contact_support');
      });

      it('should return call_delivery_person for OUT_FOR_DELIVERY status', async () => {
        mockPrismaService.order.findUnique.mockResolvedValue({
          ...baseOrder,
          status: 'OUT_FOR_DELIVERY',
          deliveryPersonName: 'Ravi K.',
          deliveryPersonPhone: '+919876543210',
        });

        const actions = await service.getAvailableActions('user-1', 'order-1', 'delivery');

        expect(actions).toContain('call_delivery_person');
        expect(actions).toContain('view_tracking');
      });

      it('should return enter_otp and rate_delivery for DELIVERED status', async () => {
        mockPrismaService.order.findUnique.mockResolvedValue({
          ...baseOrder,
          status: 'DELIVERED',
          deliveryOtp: '1234',
        });

        const actions = await service.getAvailableActions('user-1', 'order-1', 'delivery');

        expect(actions).toContain('enter_otp');
        expect(actions).toContain('rate_delivery');
      });

      it('should return contact_support for DELIVERY_FAILED status (system auto-reschedules)', async () => {
        mockPrismaService.order.findUnique.mockResolvedValue({
          ...baseOrder,
          status: 'DELIVERY_FAILED',
        });

        const actions = await service.getAvailableActions('user-1', 'order-1', 'delivery');

        expect(actions).toContain('contact_support');
        // System auto-reschedules, so no patient action needed
        expect(actions).toContain('view_tracking');
      });
    });
  });

  describe('bookSlot', () => {
    it('should book a slot for ORDERED lab order', async () => {
      const slotDate = new Date('2026-02-15');
      mockPrismaService.labOrder.findUnique.mockResolvedValue({
        ...baseLabOrder,
        status: 'ORDERED',
      });
      mockPrismaService.labSlot.findMany.mockResolvedValue([
        { id: 'slot-1', date: slotDate, startTime: '10:00', endTime: '12:00', currentBookings: 0, maxBookings: 5 },
      ]);
      mockPrismaService.labSlot.update.mockResolvedValue({});
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...baseLabOrder,
        status: 'SLOT_BOOKED',
        bookedDate: slotDate,
        bookedTimeSlot: '10:00-12:00',
      });

      const result = await service.bookSlot('user-1', 'lab-1', 'slot-1');

      expect(result.status).toBe('SLOT_BOOKED');
      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith({
        where: { id: 'lab-1' },
        data: expect.objectContaining({
          status: 'SLOT_BOOKED',
          slotBookedAt: expect.any(Date),
        }),
      });
    });

    it('should reject booking for non-ORDERED status', async () => {
      mockPrismaService.labOrder.findUnique.mockResolvedValue({
        ...baseLabOrder,
        status: 'SLOT_BOOKED',
      });

      await expect(service.bookSlot('user-1', 'lab-1', 'slot-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject booking for wrong patient', async () => {
      mockPrismaService.labOrder.findUnique.mockResolvedValue({
        ...baseLabOrder,
        patientId: 'other-user',
        status: 'ORDERED',
      });

      await expect(service.bookSlot('user-1', 'lab-1', 'slot-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('rescheduleLabOrder', () => {
    it('should reschedule a SLOT_BOOKED lab order', async () => {
      // Set slot to tomorrow (well in the future)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const newSlotDate = new Date('2026-02-16');

      mockPrismaService.labOrder.findUnique.mockResolvedValue({
        ...baseLabOrder,
        status: 'SLOT_BOOKED',
        bookedDate: tomorrow,
        bookedTimeSlot: '10:00-12:00',
      });
      mockPrismaService.labSlot.findMany.mockResolvedValue([
        { id: 'slot-2', date: newSlotDate, startTime: '14:00', endTime: '16:00', currentBookings: 0, maxBookings: 5 },
      ]);
      mockPrismaService.labSlot.update.mockResolvedValue({});
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...baseLabOrder,
        status: 'SLOT_BOOKED',
        bookedDate: newSlotDate,
        bookedTimeSlot: '14:00-16:00',
      });

      const result = await service.rescheduleLabOrder('user-1', 'lab-1', 'slot-2');

      expect(result.bookedTimeSlot).toBe('14:00-16:00');
    });

    it('should reject reschedule if less than 4 hours before slot', async () => {
      // Set slot to 2 hours from now
      const now = new Date();
      const slotTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const hours = slotTime.getHours().toString().padStart(2, '0');
      const slotTimeStr = `${hours}:00-${(parseInt(hours) + 2).toString().padStart(2, '0')}:00`;

      mockPrismaService.labOrder.findUnique.mockResolvedValue({
        ...baseLabOrder,
        status: 'SLOT_BOOKED',
        bookedDate: slotTime,
        bookedTimeSlot: slotTimeStr,
      });

      await expect(service.rescheduleLabOrder('user-1', 'lab-1', 'slot-2')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancelLabOrder', () => {
    it('should cancel a SLOT_BOOKED lab order', async () => {
      // Set slot to tomorrow (well in the future)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      mockPrismaService.labOrder.findUnique.mockResolvedValue({
        ...baseLabOrder,
        status: 'SLOT_BOOKED',
        bookedDate: tomorrow,
        bookedTimeSlot: '10:00-12:00',
      });
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...baseLabOrder,
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: 'Patient requested',
      });

      const result = await service.cancelLabOrder('user-1', 'lab-1', 'Changed my mind');

      expect(result.status).toBe('CANCELLED');
    });

    it('should reject cancel if less than 4 hours before slot', async () => {
      // Set slot to 2 hours from now
      const now = new Date();
      const slotTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const hours = slotTime.getHours().toString().padStart(2, '0');
      const slotTimeStr = `${hours}:00-${(parseInt(hours) + 2).toString().padStart(2, '0')}:00`;

      mockPrismaService.labOrder.findUnique.mockResolvedValue({
        ...baseLabOrder,
        status: 'PHLEBOTOMIST_ASSIGNED',
        bookedDate: slotTime,
        bookedTimeSlot: slotTimeStr,
      });

      await expect(service.cancelLabOrder('user-1', 'lab-1', 'reason')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject cancel for SAMPLE_COLLECTED or later statuses', async () => {
      mockPrismaService.labOrder.findUnique.mockResolvedValue({
        ...baseLabOrder,
        status: 'SAMPLE_COLLECTED',
      });

      await expect(service.cancelLabOrder('user-1', 'lab-1', 'reason')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('uploadOwnResults', () => {
    it('should upload results for ORDERED lab order', async () => {
      mockPrismaService.labOrder.findUnique.mockResolvedValue({
        ...baseLabOrder,
        status: 'ORDERED',
      });
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...baseLabOrder,
        status: 'RESULTS_UPLOADED',
        patientUploadedResults: true,
        patientUploadedFileUrl: 'https://s3.example.com/uploaded.pdf',
      });

      const result = await service.uploadOwnResults('user-1', 'lab-1', 'https://s3.example.com/uploaded.pdf');

      expect(result.status).toBe('RESULTS_UPLOADED');
      expect(result.patientUploadedResults).toBe(true);
    });

    it('should reject upload for non-ORDERED status', async () => {
      mockPrismaService.labOrder.findUnique.mockResolvedValue({
        ...baseLabOrder,
        status: 'SLOT_BOOKED',
      });

      await expect(
        service.uploadOwnResults('user-1', 'lab-1', 'https://s3.example.com/uploaded.pdf'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rebookLabOrder', () => {
    it('should rebook after COLLECTION_FAILED', async () => {
      const newSlotDate = new Date('2026-02-17');

      mockPrismaService.labOrder.findUnique.mockResolvedValue({
        ...baseLabOrder,
        status: 'COLLECTION_FAILED',
      });
      mockPrismaService.labSlot.findMany.mockResolvedValue([
        { id: 'slot-3', date: newSlotDate, startTime: '08:00', endTime: '10:00', currentBookings: 0, maxBookings: 5 },
      ]);
      mockPrismaService.labSlot.update.mockResolvedValue({});
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...baseLabOrder,
        status: 'SLOT_BOOKED',
        bookedDate: newSlotDate,
        bookedTimeSlot: '08:00-10:00',
      });

      const result = await service.rebookLabOrder('user-1', 'lab-1', 'slot-3');

      expect(result.status).toBe('SLOT_BOOKED');
    });

    it('should reject rebook for non-COLLECTION_FAILED status', async () => {
      mockPrismaService.labOrder.findUnique.mockResolvedValue({
        ...baseLabOrder,
        status: 'ORDERED',
      });

      await expect(service.rebookLabOrder('user-1', 'lab-1', 'slot-3')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('confirmDeliveryOTP', () => {
    it('should confirm delivery with valid OTP', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...baseOrder,
        status: 'DELIVERED',
        deliveryOtp: '1234',
      });
      mockPrismaService.order.update.mockResolvedValue({
        ...baseOrder,
        status: 'DELIVERED',
        deliveryOtp: '1234',
      });

      const result = await service.confirmDeliveryOTP('user-1', 'order-1', '1234');

      expect(result.verified).toBe(true);
    });

    it('should reject invalid OTP', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...baseOrder,
        status: 'DELIVERED',
        deliveryOtp: '1234',
      });

      await expect(service.confirmDeliveryOTP('user-1', 'order-1', '9999')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject OTP confirmation for non-DELIVERED status', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...baseOrder,
        status: 'OUT_FOR_DELIVERY',
        deliveryOtp: '1234',
      });

      await expect(service.confirmDeliveryOTP('user-1', 'order-1', '1234')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('rateDelivery', () => {
    it('should accept rating 1-5', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...baseOrder,
        status: 'DELIVERED',
      });
      mockPrismaService.order.update.mockResolvedValue({
        ...baseOrder,
        status: 'DELIVERED',
        deliveryRating: 5,
      });

      const result = await service.rateDelivery('user-1', 'order-1', 5);

      expect(result.deliveryRating).toBe(5);
    });

    it('should reject rating outside 1-5 range', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...baseOrder,
        status: 'DELIVERED',
      });

      await expect(service.rateDelivery('user-1', 'order-1', 6)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.rateDelivery('user-1', 'order-1', 0)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getDeliveryPersonDetails', () => {
    it('should return delivery person name and phone for OUT_FOR_DELIVERY', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...baseOrder,
        status: 'OUT_FOR_DELIVERY',
        deliveryPersonName: 'Ravi K.',
        deliveryPersonPhone: '+919876543210',
        estimatedDeliveryTime: '3:30 PM',
      });

      const result = await service.getDeliveryPersonDetails('user-1', 'order-1');

      expect(result.name).toBe('Ravi K.');
      expect(result.phone).toBe('+919876543210');
      expect(result.eta).toBe('3:30 PM');
    });

    it('should return null for non-OUT_FOR_DELIVERY statuses', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...baseOrder,
        status: 'PHARMACY_PREPARING',
      });

      const result = await service.getDeliveryPersonDetails('user-1', 'order-1');

      expect(result).toBeNull();
    });
  });

  describe('Actions cutoff validation', () => {
    it('should calculate cutoff time correctly (4 hours before slot)', async () => {
      const slotTime = new Date('2026-02-15T10:00:00');
      const threeHoursBefore = new Date('2026-02-15T07:00:00');

      mockPrismaService.labOrder.findUnique.mockResolvedValue({
        ...baseLabOrder,
        status: 'PHLEBOTOMIST_ASSIGNED',
        bookedDate: slotTime,
        bookedTimeSlot: '10:00-12:00',
      });

      // Mock current time to be 3 hours before slot
      jest.spyOn(Date, 'now').mockReturnValue(threeHoursBefore.getTime());

      const actions = await service.getAvailableActions('user-1', 'lab-1', 'lab');

      // Should not have reschedule/cancel since less than 4 hours
      expect(actions).not.toContain('reschedule');
      expect(actions).not.toContain('cancel');
      expect(actions).toContain('contact_support');

      jest.restoreAllMocks();
    });

    it('should allow actions when more than 4 hours before slot', async () => {
      const slotTime = new Date('2026-02-15T10:00:00');
      const fiveHoursBefore = new Date('2026-02-15T05:00:00');

      mockPrismaService.labOrder.findUnique.mockResolvedValue({
        ...baseLabOrder,
        status: 'PHLEBOTOMIST_ASSIGNED',
        bookedDate: slotTime,
        bookedTimeSlot: '10:00-12:00',
      });

      // Mock current time to be 5 hours before slot
      jest.spyOn(Date, 'now').mockReturnValue(fiveHoursBefore.getTime());

      const actions = await service.getAvailableActions('user-1', 'lab-1', 'lab');

      expect(actions).toContain('reschedule');
      expect(actions).toContain('cancel');

      jest.restoreAllMocks();
    });
  });
});
