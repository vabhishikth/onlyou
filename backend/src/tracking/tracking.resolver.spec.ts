import { Test, TestingModule } from '@nestjs/testing';
import { TrackingResolver } from './tracking.resolver';
import { TrackingService } from './tracking.service';
import { PatientActionsService } from './patient-actions.service';
import { PrismaService } from '../prisma/prisma.service';

// Spec: master spec Section 4 (Patient Tracking Screens)

describe('TrackingResolver', () => {
  let resolver: TrackingResolver;
  let mockTrackingService: any;
  let mockPatientActionsService: any;
  let mockPrismaService: any;

  const mockUser = { id: 'patient-1' };

  const mockLabOrder = {
    id: 'lab-1',
    patientId: 'patient-1',
    status: 'ORDERED',
    testPanel: ['TSH', 'CBC', 'Ferritin'],
    panelName: 'Hair Loss Basic Panel',
    bookedDate: null,
    bookedTimeSlot: null,
    collectionAddress: '123 Street, Mumbai',
    phlebotomistName: null,
    phlebotomistPhone: null,
    resultFileUrl: null,
    abnormalFlags: null,
    criticalValues: false,
    orderedAt: new Date('2026-02-20'),
    slotBookedAt: null,
    phlebotomistAssignedAt: null,
    sampleCollectedAt: null,
    collectionFailedAt: null,
    collectionFailedReason: null,
    deliveredToLabAt: null,
    sampleReceivedAt: null,
    processingStartedAt: null,
    resultsUploadedAt: null,
    doctorReviewedAt: null,
    doctorNote: null,
  };

  const mockDeliveryOrder = {
    id: 'order-1',
    patientId: 'patient-1',
    status: 'SENT_TO_PHARMACY',
    prescriptionId: 'prescription-1',
    deliveryPersonName: null,
    deliveryPersonPhone: null,
    estimatedDeliveryTime: null,
    deliveryOtp: null,
    prescriptionCreatedAt: new Date('2026-02-20'),
    sentToPharmacyAt: new Date('2026-02-20'),
    pharmacyPreparingAt: null,
    pharmacyReadyAt: null,
    pickupArrangedAt: null,
    outForDeliveryAt: null,
    deliveredAt: null,
    deliveryFailedAt: null,
    rescheduledAt: null,
  };

  beforeEach(async () => {
    mockTrackingService = {
      getActiveItems: jest.fn(),
      getCompletedItems: jest.fn(),
      getHomeBanner: jest.fn(),
      getLabOrderProgress: jest.fn(),
      getDeliveryOrderProgress: jest.fn(),
      getActivityItem: jest.fn(),
    };

    mockPatientActionsService = {
      getAvailableActions: jest.fn(),
      bookSlot: jest.fn(),
      rescheduleLabOrder: jest.fn(),
      cancelLabOrder: jest.fn(),
      uploadOwnResults: jest.fn(),
      rebookLabOrder: jest.fn(),
      confirmDeliveryOTP: jest.fn(),
      rateDelivery: jest.fn(),
      getDeliveryPersonDetails: jest.fn(),
    };

    mockPrismaService = {
      labOrder: {
        findMany: jest.fn(),
      },
      order: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingResolver,
        { provide: TrackingService, useValue: mockTrackingService },
        { provide: PatientActionsService, useValue: mockPatientActionsService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    resolver = module.get<TrackingResolver>(TrackingResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  // ============================================
  // QUERIES
  // ============================================

  describe('activeTracking (query)', () => {
    // Spec: Section 4.1 — Active Items (returns raw lab orders + delivery orders for mobile)
    it('should return lab orders and delivery orders for patient', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([mockLabOrder]);
      mockPrismaService.order.findMany.mockResolvedValue([mockDeliveryOrder]);

      const result = await resolver.activeTracking(mockUser);

      expect(result.labOrders).toHaveLength(1);
      expect(result.labOrders[0].id).toBe('lab-1');
      expect(result.labOrders[0].status).toBe('ORDERED');
      expect(result.deliveryOrders).toHaveLength(1);
      expect(result.deliveryOrders[0].id).toBe('order-1');
      expect(mockPrismaService.labOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ patientId: 'patient-1' }),
        }),
      );
    });

    it('should return empty arrays when no orders', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([]);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await resolver.activeTracking(mockUser);

      expect(result.labOrders).toHaveLength(0);
      expect(result.deliveryOrders).toHaveLength(0);
    });

    it('should exclude completed lab statuses (CLOSED, CANCELLED, EXPIRED)', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([]);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      await resolver.activeTracking(mockUser);

      expect(mockPrismaService.labOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { notIn: ['CLOSED', 'CANCELLED', 'EXPIRED'] },
          }),
        }),
      );
    });

    it('should exclude completed delivery statuses (CANCELLED, RETURNED)', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([]);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      await resolver.activeTracking(mockUser);

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { notIn: ['CANCELLED', 'RETURNED'] },
          }),
        }),
      );
    });
  });

  describe('labOrderProgress (query)', () => {
    // Spec: Section 4.2 — Blood Work Tracking — Patient View
    it('should return progress steps for lab order', async () => {
      mockTrackingService.getLabOrderProgress.mockResolvedValue({
        steps: [
          { label: 'Doctor ordered tests', status: 'completed', timestamp: new Date() },
          { label: 'Collection scheduled', status: 'current' },
          { label: 'Sample collection', status: 'upcoming' },
        ],
      });

      const result = await resolver.labOrderProgress(mockUser, 'lab-1');

      expect(result.steps).toHaveLength(3);
      expect(result.steps[0].status).toBe('completed');
      expect(result.steps[1].status).toBe('current');
      expect(mockTrackingService.getLabOrderProgress).toHaveBeenCalledWith('patient-1', 'lab-1');
    });

    it('should return empty steps when lab order not found', async () => {
      mockTrackingService.getLabOrderProgress.mockResolvedValue({ steps: [] });

      const result = await resolver.labOrderProgress(mockUser, 'non-existent');

      expect(result.steps).toHaveLength(0);
    });
  });

  describe('deliveryOrderProgress (query)', () => {
    // Spec: Section 4.3 — Medication Delivery Tracking — Patient View
    it('should return progress steps for delivery order', async () => {
      mockTrackingService.getDeliveryOrderProgress.mockResolvedValue({
        steps: [
          { label: 'Treatment plan ready', status: 'completed', timestamp: new Date() },
          { label: 'Sent to pharmacy', status: 'current' },
          { label: 'Medication being prepared', status: 'upcoming' },
        ],
      });

      const result = await resolver.deliveryOrderProgress(mockUser, 'order-1');

      expect(result.steps).toHaveLength(3);
      expect(result.steps[1].status).toBe('current');
      expect(mockTrackingService.getDeliveryOrderProgress).toHaveBeenCalledWith('patient-1', 'order-1');
    });

    it('should return empty steps when delivery order not found', async () => {
      mockTrackingService.getDeliveryOrderProgress.mockResolvedValue({ steps: [] });

      const result = await resolver.deliveryOrderProgress(mockUser, 'non-existent');

      expect(result.steps).toHaveLength(0);
    });
  });

  describe('trackingHomeBanner (query)', () => {
    // Spec: Section 3.3 — Active Tracking Banner
    it('should return banner when active items exist', async () => {
      mockTrackingService.getHomeBanner.mockResolvedValue({
        hasBanner: true,
        bannerText: '🔬 Blood test: doctor ordered blood tests',
        itemId: 'lab-1',
        itemType: 'lab',
      });

      const result = await resolver.trackingHomeBanner(mockUser);

      expect(result.hasBanner).toBe(true);
      expect(result.bannerText).toContain('Blood test');
      expect(result.itemId).toBe('lab-1');
      expect(mockTrackingService.getHomeBanner).toHaveBeenCalledWith('patient-1');
    });

    it('should return no banner when no active items', async () => {
      mockTrackingService.getHomeBanner.mockResolvedValue({
        hasBanner: false,
        bannerText: null,
      });

      const result = await resolver.trackingHomeBanner(mockUser);

      expect(result.hasBanner).toBe(false);
      expect(result.bannerText).toBeNull();
    });
  });

  describe('availableActions (query)', () => {
    // Spec: Section 4.4 — Patient Actions Per Status
    it('should return lab actions for ORDERED status', async () => {
      mockPatientActionsService.getAvailableActions.mockResolvedValue([
        'book_slot',
        'upload_results',
      ]);

      const result = await resolver.availableActions(mockUser, 'lab-1', 'lab');

      expect(result).toEqual(['book_slot', 'upload_results']);
      expect(mockPatientActionsService.getAvailableActions).toHaveBeenCalledWith(
        'patient-1',
        'lab-1',
        'lab',
      );
    });

    it('should return delivery actions', async () => {
      mockPatientActionsService.getAvailableActions.mockResolvedValue([
        'view_prescription',
        'contact_support',
        'view_tracking',
      ]);

      const result = await resolver.availableActions(mockUser, 'order-1', 'delivery');

      expect(result).toEqual(['view_prescription', 'contact_support', 'view_tracking']);
    });

    it('should propagate errors from service', async () => {
      mockPatientActionsService.getAvailableActions.mockRejectedValue(
        new Error('Not found'),
      );

      await expect(
        resolver.availableActions(mockUser, 'bad-id', 'lab'),
      ).rejects.toThrow('Not found');
    });
  });

  // ============================================
  // MUTATIONS
  // ============================================

  describe('bookLabSlot (mutation)', () => {
    it('should book slot successfully', async () => {
      const bookedOrder = {
        ...mockLabOrder,
        status: 'SLOT_BOOKED',
        bookedDate: new Date('2026-02-22'),
        bookedTimeSlot: '09:00-10:00',
        slotBookedAt: new Date(),
      };
      mockPatientActionsService.bookSlot.mockResolvedValue(bookedOrder);

      const result = await resolver.bookLabSlot(mockUser, {
        labOrderId: 'lab-1',
        slotId: 'slot-1',
        collectionAddress: '123 Street, Mumbai',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('booked');
      expect(mockPatientActionsService.bookSlot).toHaveBeenCalledWith(
        'patient-1',
        'lab-1',
        'slot-1',
      );
    });

    it('should handle booking errors', async () => {
      mockPatientActionsService.bookSlot.mockRejectedValue(
        new Error('Slot is fully booked'),
      );

      const result = await resolver.bookLabSlot(mockUser, {
        labOrderId: 'lab-1',
        slotId: 'slot-full',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('fully booked');
    });
  });

  describe('rescheduleLabSlot (mutation)', () => {
    it('should reschedule successfully', async () => {
      const rescheduledOrder = {
        ...mockLabOrder,
        status: 'SLOT_BOOKED',
        bookedDate: new Date('2026-02-23'),
        bookedTimeSlot: '10:00-11:00',
      };
      mockPatientActionsService.rescheduleLabOrder.mockResolvedValue(rescheduledOrder);

      const result = await resolver.rescheduleLabSlot(mockUser, {
        labOrderId: 'lab-1',
        newSlotId: 'slot-2',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('rescheduled');
      expect(mockPatientActionsService.rescheduleLabOrder).toHaveBeenCalledWith(
        'patient-1',
        'lab-1',
        'slot-2',
      );
    });

    it('should handle reschedule errors', async () => {
      mockPatientActionsService.rescheduleLabOrder.mockRejectedValue(
        new Error('Cannot reschedule within 4 hours'),
      );

      const result = await resolver.rescheduleLabSlot(mockUser, {
        labOrderId: 'lab-1',
        newSlotId: 'slot-2',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('4 hours');
    });
  });

  describe('cancelLabOrder (mutation)', () => {
    it('should cancel successfully', async () => {
      const cancelledOrder = {
        ...mockLabOrder,
        status: 'CANCELLED',
        cancelledAt: new Date(),
      };
      mockPatientActionsService.cancelLabOrder.mockResolvedValue(cancelledOrder);

      const result = await resolver.cancelLabOrder(mockUser, {
        labOrderId: 'lab-1',
        reason: 'Changed my mind',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('cancelled');
      expect(mockPatientActionsService.cancelLabOrder).toHaveBeenCalledWith(
        'patient-1',
        'lab-1',
        'Changed my mind',
      );
    });

    it('should handle cancel errors', async () => {
      mockPatientActionsService.cancelLabOrder.mockRejectedValue(
        new Error('Cannot cancel at this status'),
      );

      const result = await resolver.cancelLabOrder(mockUser, {
        labOrderId: 'lab-1',
        reason: 'Changed my mind',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Cannot cancel');
    });
  });

  describe('confirmDeliveryOTP (mutation)', () => {
    // Spec: Section 8.2 Step 6 — Patient shows OTP to delivery person
    it('should verify OTP successfully', async () => {
      mockPatientActionsService.confirmDeliveryOTP.mockResolvedValue({ verified: true });

      const result = await resolver.confirmDeliveryOTP(mockUser, {
        orderId: 'order-1',
        otp: '1234',
      });

      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);
      expect(mockPatientActionsService.confirmDeliveryOTP).toHaveBeenCalledWith(
        'patient-1',
        'order-1',
        '1234',
      );
    });

    it('should handle invalid OTP', async () => {
      mockPatientActionsService.confirmDeliveryOTP.mockRejectedValue(
        new Error('Invalid OTP'),
      );

      const result = await resolver.confirmDeliveryOTP(mockUser, {
        orderId: 'order-1',
        otp: '9999',
      });

      expect(result.success).toBe(false);
      expect(result.verified).toBe(false);
      expect(result.message).toContain('Invalid OTP');
    });
  });

  describe('rateDelivery (mutation)', () => {
    it('should rate delivery successfully', async () => {
      const ratedOrder = { id: 'order-1', deliveryRating: 5 };
      mockPatientActionsService.rateDelivery.mockResolvedValue(ratedOrder);

      const result = await resolver.rateDelivery(mockUser, {
        orderId: 'order-1',
        rating: 5,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('rated');
      expect(mockPatientActionsService.rateDelivery).toHaveBeenCalledWith(
        'patient-1',
        'order-1',
        5,
      );
    });

    it('should handle invalid rating', async () => {
      mockPatientActionsService.rateDelivery.mockRejectedValue(
        new Error('Rating must be between 1 and 5'),
      );

      const result = await resolver.rateDelivery(mockUser, {
        orderId: 'order-1',
        rating: 0,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('between 1 and 5');
    });
  });
});
