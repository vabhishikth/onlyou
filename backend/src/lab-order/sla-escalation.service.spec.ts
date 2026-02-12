import { Test, TestingModule } from '@nestjs/testing';
import { SlaEscalationService, SlaThresholds, SlaBreachType } from './sla-escalation.service';
import { PrismaService } from '../prisma/prisma.service';
import { LabOrderStatus } from './lab-order.service';

// Spec: master spec Section 7.4 (SLA Escalation)

describe('SlaEscalationService', () => {
  let service: SlaEscalationService;
  let mockPrismaService: any;

  const mockLabOrder = {
    id: 'lab-order-1',
    patientId: 'patient-1',
    consultationId: 'consultation-1',
    doctorId: 'doctor-1',
    testPanel: ['TSH', 'CBC'],
    status: LabOrderStatus.ORDERED,
    orderedAt: new Date(),
    collectionAddress: '123 Main St',
    collectionCity: 'Mumbai',
    collectionPincode: '400001',
    labCost: 99900,
  };

  beforeEach(async () => {
    mockPrismaService = {
      labOrder: {
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlaEscalationService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SlaEscalationService>(SlaEscalationService);
  });

  describe('Service Setup', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ============================================
  // GET OVERDUE ORDERS — PATIENT BOOKING
  // Spec: Section 7.4 — Patient doesn't book slot
  // ============================================
  describe('getOverduePatientBookings', () => {
    it('should return orders where patient hasn\'t booked for 3+ days', async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 4);

      const overdueOrder = {
        ...mockLabOrder,
        orderedAt: threeDaysAgo,
        status: LabOrderStatus.ORDERED,
      };
      mockPrismaService.labOrder.findMany.mockResolvedValue([overdueOrder]);

      const result = await service.getOverduePatientBookings();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('lab-order-1');
    });

    it('should include breach level (3d reminder, 7d second, 14d expired)', async () => {
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const orders = [
        { ...mockLabOrder, id: 'order-1', orderedAt: fourDaysAgo },
        { ...mockLabOrder, id: 'order-2', orderedAt: eightDaysAgo },
        { ...mockLabOrder, id: 'order-3', orderedAt: fifteenDaysAgo },
      ];
      mockPrismaService.labOrder.findMany.mockResolvedValue(orders);

      const result = await service.getOverduePatientBookings();

      const order1 = result.find(o => o.id === 'order-1');
      const order2 = result.find(o => o.id === 'order-2');
      const order3 = result.find(o => o.id === 'order-3');

      expect(order1.breachLevel).toBe('FIRST_REMINDER');
      expect(order2.breachLevel).toBe('SECOND_REMINDER');
      expect(order3.breachLevel).toBe('EXPIRED');
    });

    it('should not return orders less than 3 days old', async () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      mockPrismaService.labOrder.findMany.mockResolvedValue([]);

      const result = await service.getOverduePatientBookings();

      expect(result).toHaveLength(0);
      expect(mockPrismaService.labOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: LabOrderStatus.ORDERED,
          }),
        })
      );
    });
  });

  // ============================================
  // GET OVERDUE ORDERS — PHLEBOTOMIST ASSIGNMENT
  // Spec: Section 7.4 — Coordinator doesn't assign phlebotomist
  // ============================================
  describe('getOverduePhlebotomistAssignments', () => {
    it('should return SLOT_BOOKED orders without phlebotomist for 2+ hours', async () => {
      const threeHoursAgo = new Date();
      threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);

      const overdueOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.SLOT_BOOKED,
        slotBookedAt: threeHoursAgo,
        phlebotomistId: null,
      };
      mockPrismaService.labOrder.findMany.mockResolvedValue([overdueOrder]);

      const result = await service.getOverduePhlebotomistAssignments();

      expect(result).toHaveLength(1);
      expect(result[0].breachType).toBe(SlaBreachType.PHLEBOTOMIST_ASSIGNMENT);
    });

    it('should not return orders with assigned phlebotomist', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([]);

      const result = await service.getOverduePhlebotomistAssignments();

      expect(result).toHaveLength(0);
      expect(mockPrismaService.labOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: LabOrderStatus.SLOT_BOOKED,
            phlebotomistId: null,
          }),
        })
      );
    });

    it('should calculate hours overdue', async () => {
      const fiveHoursAgo = new Date();
      fiveHoursAgo.setHours(fiveHoursAgo.getHours() - 5);

      const overdueOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.SLOT_BOOKED,
        slotBookedAt: fiveHoursAgo,
        phlebotomistId: null,
      };
      mockPrismaService.labOrder.findMany.mockResolvedValue([overdueOrder]);

      const result = await service.getOverduePhlebotomistAssignments();

      expect(result[0].hoursOverdue).toBeGreaterThanOrEqual(3); // 5 - 2 hour threshold
    });
  });

  // ============================================
  // GET OVERDUE ORDERS — LAB RECEIPT
  // Spec: Section 7.4 — Lab doesn't mark received
  // ============================================
  describe('getOverdueLabReceipts', () => {
    it('should return DELIVERED_TO_LAB orders not received for 4+ hours', async () => {
      const fiveHoursAgo = new Date();
      fiveHoursAgo.setHours(fiveHoursAgo.getHours() - 5);

      const overdueOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.DELIVERED_TO_LAB,
        deliveredToLabAt: fiveHoursAgo,
      };
      mockPrismaService.labOrder.findMany.mockResolvedValue([overdueOrder]);

      const result = await service.getOverdueLabReceipts();

      expect(result).toHaveLength(1);
      expect(result[0].breachType).toBe(SlaBreachType.LAB_RECEIPT);
    });

    it('should not return orders less than 4 hours since delivery', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([]);

      const result = await service.getOverdueLabReceipts();

      expect(result).toHaveLength(0);
    });
  });

  // ============================================
  // GET OVERDUE ORDERS — LAB RESULTS
  // Spec: Section 7.4 — Lab doesn't upload results
  // ============================================
  describe('getOverdueLabResults', () => {
    it('should return SAMPLE_RECEIVED or PROCESSING orders overdue for 48+ hours', async () => {
      const fiftyHoursAgo = new Date();
      fiftyHoursAgo.setHours(fiftyHoursAgo.getHours() - 50);

      const overdueOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.SAMPLE_RECEIVED,
        sampleReceivedAt: fiftyHoursAgo,
      };
      mockPrismaService.labOrder.findMany.mockResolvedValue([overdueOrder]);

      const result = await service.getOverdueLabResults();

      expect(result).toHaveLength(1);
      expect(result[0].breachType).toBe(SlaBreachType.LAB_RESULTS);
    });

    it('should include escalation level (48h warning, 72h critical)', async () => {
      const fiftyHoursAgo = new Date();
      fiftyHoursAgo.setHours(fiftyHoursAgo.getHours() - 50);

      const eightyHoursAgo = new Date();
      eightyHoursAgo.setHours(eightyHoursAgo.getHours() - 80);

      const orders = [
        { ...mockLabOrder, id: 'order-1', status: LabOrderStatus.SAMPLE_RECEIVED, sampleReceivedAt: fiftyHoursAgo },
        { ...mockLabOrder, id: 'order-2', status: LabOrderStatus.PROCESSING, processingStartedAt: eightyHoursAgo, sampleReceivedAt: eightyHoursAgo },
      ];
      mockPrismaService.labOrder.findMany.mockResolvedValue(orders);

      const result = await service.getOverdueLabResults();

      const order1 = result.find(o => o.id === 'order-1');
      const order2 = result.find(o => o.id === 'order-2');

      expect(order1.escalationLevel).toBe('WARNING');
      expect(order2.escalationLevel).toBe('CRITICAL');
    });

    it('should also include PROCESSING orders', async () => {
      const sixtyHoursAgo = new Date();
      sixtyHoursAgo.setHours(sixtyHoursAgo.getHours() - 60);

      const overdueOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.PROCESSING,
        processingStartedAt: sixtyHoursAgo,
        sampleReceivedAt: sixtyHoursAgo,
      };
      mockPrismaService.labOrder.findMany.mockResolvedValue([overdueOrder]);

      const result = await service.getOverdueLabResults();

      expect(result).toHaveLength(1);
    });
  });

  // ============================================
  // GET OVERDUE ORDERS — DOCTOR REVIEW
  // Spec: Section 7.4 — Doctor doesn't review results
  // ============================================
  describe('getOverdueDoctorReviews', () => {
    it('should return RESULTS_READY orders not reviewed for 24+ hours', async () => {
      const twentySixHoursAgo = new Date();
      twentySixHoursAgo.setHours(twentySixHoursAgo.getHours() - 26);

      const overdueOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.RESULTS_READY,
        resultsUploadedAt: twentySixHoursAgo,
      };
      mockPrismaService.labOrder.findMany.mockResolvedValue([overdueOrder]);

      const result = await service.getOverdueDoctorReviews();

      expect(result).toHaveLength(1);
      expect(result[0].breachType).toBe(SlaBreachType.DOCTOR_REVIEW);
    });

    it('should include escalation level (24h reminder, 48h reassign)', async () => {
      const twentySixHoursAgo = new Date();
      twentySixHoursAgo.setHours(twentySixHoursAgo.getHours() - 26);

      const fiftyHoursAgo = new Date();
      fiftyHoursAgo.setHours(fiftyHoursAgo.getHours() - 50);

      const orders = [
        { ...mockLabOrder, id: 'order-1', status: LabOrderStatus.RESULTS_READY, resultsUploadedAt: twentySixHoursAgo },
        { ...mockLabOrder, id: 'order-2', status: LabOrderStatus.RESULTS_READY, resultsUploadedAt: fiftyHoursAgo },
      ];
      mockPrismaService.labOrder.findMany.mockResolvedValue(orders);

      const result = await service.getOverdueDoctorReviews();

      const order1 = result.find(o => o.id === 'order-1');
      const order2 = result.find(o => o.id === 'order-2');

      expect(order1.escalationLevel).toBe('REMINDER');
      expect(order2.escalationLevel).toBe('REASSIGN');
    });

    it('should also include RESULTS_UPLOADED orders (patient self-upload)', async () => {
      const thirtyHoursAgo = new Date();
      thirtyHoursAgo.setHours(thirtyHoursAgo.getHours() - 30);

      const overdueOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.RESULTS_UPLOADED,
        resultsUploadedAt: thirtyHoursAgo,
        patientUploadedResults: true,
      };
      mockPrismaService.labOrder.findMany.mockResolvedValue([overdueOrder]);

      const result = await service.getOverdueDoctorReviews();

      expect(result).toHaveLength(1);
    });
  });

  // ============================================
  // GET ALL BREACHES
  // ============================================
  describe('getAllBreaches', () => {
    it('should return all breach types combined', async () => {
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

      const threeHoursAgo = new Date();
      threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);

      // Mock different breach types
      mockPrismaService.labOrder.findMany
        .mockResolvedValueOnce([{ ...mockLabOrder, id: 'booking-breach', orderedAt: fourDaysAgo }])
        .mockResolvedValueOnce([{ ...mockLabOrder, id: 'assignment-breach', slotBookedAt: threeHoursAgo, status: LabOrderStatus.SLOT_BOOKED, phlebotomistId: null }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getAllBreaches();

      expect(result.bookingBreaches).toHaveLength(1);
      expect(result.assignmentBreaches).toHaveLength(1);
      expect(result.receiptBreaches).toHaveLength(0);
      expect(result.resultsBreaches).toHaveLength(0);
      expect(result.reviewBreaches).toHaveLength(0);
    });

    it('should return total breach count', async () => {
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

      mockPrismaService.labOrder.findMany
        .mockResolvedValueOnce([
          { ...mockLabOrder, id: 'breach-1', orderedAt: fourDaysAgo },
          { ...mockLabOrder, id: 'breach-2', orderedAt: fourDaysAgo },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getAllBreaches();

      expect(result.totalBreaches).toBe(2);
    });
  });

  // ============================================
  // EXPIRE STALE ORDERS
  // ============================================
  describe('expireStaleOrders', () => {
    it('should expire ORDERED orders older than 14 days', async () => {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const staleOrder = { ...mockLabOrder, orderedAt: fifteenDaysAgo };
      mockPrismaService.labOrder.findMany.mockResolvedValue([staleOrder]);
      mockPrismaService.labOrder.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.expireStaleOrders();

      expect(result.expiredCount).toBe(1);
      expect(mockPrismaService.labOrder.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['lab-order-1'] },
        },
        data: {
          status: LabOrderStatus.EXPIRED,
          expiredAt: expect.any(Date),
        },
      });
    });

    it('should only expire ORDERED status orders', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([]);

      const result = await service.expireStaleOrders();

      expect(mockPrismaService.labOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: LabOrderStatus.ORDERED,
          }),
        })
      );
    });

    it('should return list of expired order IDs', async () => {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const staleOrders = [
        { ...mockLabOrder, id: 'stale-1', orderedAt: fifteenDaysAgo },
        { ...mockLabOrder, id: 'stale-2', orderedAt: fifteenDaysAgo },
      ];
      mockPrismaService.labOrder.findMany.mockResolvedValue(staleOrders);
      mockPrismaService.labOrder.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.expireStaleOrders();

      expect(result.expiredOrderIds).toEqual(['stale-1', 'stale-2']);
    });
  });

  // ============================================
  // GET BREACH SUMMARY FOR DASHBOARD
  // ============================================
  describe('getBreachSummary', () => {
    it('should return summary counts for dashboard', async () => {
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

      mockPrismaService.labOrder.findMany
        .mockResolvedValueOnce([{ ...mockLabOrder, orderedAt: fourDaysAgo }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getBreachSummary();

      expect(result).toEqual({
        bookingBreachCount: 1,
        assignmentBreachCount: 0,
        receiptBreachCount: 0,
        resultsBreachCount: 0,
        reviewBreachCount: 0,
        totalBreachCount: 1,
        criticalBreachCount: expect.any(Number),
      });
    });

    it('should identify critical breaches (72h results, 48h review, 14d booking)', async () => {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const eightyHoursAgo = new Date();
      eightyHoursAgo.setHours(eightyHoursAgo.getHours() - 80);

      mockPrismaService.labOrder.findMany
        .mockResolvedValueOnce([{ ...mockLabOrder, id: 'expired', orderedAt: fifteenDaysAgo }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ ...mockLabOrder, id: 'critical-results', status: LabOrderStatus.PROCESSING, sampleReceivedAt: eightyHoursAgo, processingStartedAt: eightyHoursAgo }])
        .mockResolvedValueOnce([]);

      const result = await service.getBreachSummary();

      expect(result.criticalBreachCount).toBe(2);
    });
  });

  // ============================================
  // CONFIGURABLE THRESHOLDS
  // ============================================
  describe('getThresholds', () => {
    it('should return current SLA thresholds', () => {
      const thresholds = service.getThresholds();

      expect(thresholds).toEqual({
        patientBookingFirstReminder: 3 * 24, // 3 days in hours
        patientBookingSecondReminder: 7 * 24, // 7 days in hours
        patientBookingExpiry: 14 * 24, // 14 days in hours
        phlebotomistAssignment: 2, // 2 hours
        labReceipt: 4, // 4 hours
        labResultsWarning: 48, // 48 hours
        labResultsCritical: 72, // 72 hours
        doctorReviewReminder: 24, // 24 hours
        doctorReviewReassign: 48, // 48 hours
      });
    });
  });

  // ============================================
  // GET BREACHES FOR SPECIFIC LAB ORDER
  // ============================================
  describe('checkOrderSlaStatus', () => {
    it('should return SLA status for a specific order', async () => {
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

      const order = { ...mockLabOrder, orderedAt: fourDaysAgo };
      mockPrismaService.labOrder.findMany.mockResolvedValue([order]);

      const result = await service.checkOrderSlaStatus('lab-order-1');

      expect(result.isBreached).toBe(true);
      expect(result.breachType).toBe(SlaBreachType.PATIENT_BOOKING);
      expect(result.hoursOverdue).toBeGreaterThan(0);
    });

    it('should return no breach for order within SLA', async () => {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      mockPrismaService.labOrder.findMany.mockResolvedValue([]);

      const result = await service.checkOrderSlaStatus('lab-order-1');

      expect(result.isBreached).toBe(false);
    });
  });

  // ============================================
  // MARK ESCALATED
  // ============================================
  describe('markEscalated', () => {
    it('should mark order as escalated with timestamp', async () => {
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...mockLabOrder,
        slaEscalatedAt: new Date(),
        slaEscalationReason: 'Lab results overdue 72+ hours',
      });

      const result = await service.markEscalated({
        labOrderId: 'lab-order-1',
        reason: 'Lab results overdue 72+ hours',
      });

      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith({
        where: { id: 'lab-order-1' },
        data: {
          slaEscalatedAt: expect.any(Date),
          slaEscalationReason: 'Lab results overdue 72+ hours',
        },
      });
    });

    it('should record coordinator who escalated', async () => {
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...mockLabOrder,
        slaEscalatedAt: new Date(),
        slaEscalatedBy: 'coordinator-1',
      });

      await service.markEscalated({
        labOrderId: 'lab-order-1',
        reason: 'Lab not responding',
        coordinatorId: 'coordinator-1',
      });

      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith({
        where: { id: 'lab-order-1' },
        data: expect.objectContaining({
          slaEscalatedBy: 'coordinator-1',
        }),
      });
    });
  });

  // ============================================
  // GET ORDERS REQUIRING NOTIFICATION
  // ============================================
  describe('getOrdersRequiringNotification', () => {
    it('should return orders that need patient reminder', async () => {
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

      const order = {
        ...mockLabOrder,
        orderedAt: fourDaysAgo,
        lastReminderSentAt: null,
      };
      mockPrismaService.labOrder.findMany.mockResolvedValue([order]);

      const result = await service.getOrdersRequiringNotification('PATIENT_BOOKING_REMINDER');

      expect(result).toHaveLength(1);
    });

    it('should not return orders already notified today', async () => {
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      mockPrismaService.labOrder.findMany.mockResolvedValue([]);

      const result = await service.getOrdersRequiringNotification('PATIENT_BOOKING_REMINDER');

      expect(mockPrismaService.labOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { lastReminderSentAt: null },
              expect.any(Object),
            ]),
          }),
        })
      );
    });
  });

  // ============================================
  // MARK REMINDER SENT
  // ============================================
  describe('markReminderSent', () => {
    it('should update lastReminderSentAt timestamp', async () => {
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...mockLabOrder,
        lastReminderSentAt: new Date(),
      });

      await service.markReminderSent({
        labOrderId: 'lab-order-1',
        reminderType: 'PATIENT_BOOKING_REMINDER',
      });

      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith({
        where: { id: 'lab-order-1' },
        data: {
          lastReminderSentAt: expect.any(Date),
          lastReminderType: 'PATIENT_BOOKING_REMINDER',
        },
      });
    });
  });
});
