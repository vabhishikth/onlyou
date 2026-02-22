import { Test, TestingModule } from '@nestjs/testing';
import { PharmacyFulfillmentService } from './pharmacy-fulfillment.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { PharmacyAssignmentService } from './pharmacy-assignment.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

// Spec: Phase 15 Chunk 4 — Pharmacy Fulfillment Flows

describe('PharmacyFulfillmentService', () => {
  let service: PharmacyFulfillmentService;
  let prisma: any;
  let notificationService: any;
  let assignmentService: any;

  const mockStaff = {
    id: 'staff-1',
    pharmacyId: 'pharm-1',
    userId: 'user-staff-1',
    role: 'PHARMACIST',
    canAcceptOrders: true,
    canDispense: true,
    canManageInventory: true,
    isActive: true,
  };

  const makeOrder = (overrides: any = {}) => ({
    id: overrides.id || 'po-1',
    prescriptionId: overrides.prescriptionId || 'rx-1',
    pharmacyId: overrides.pharmacyId || 'pharm-1',
    patientId: overrides.patientId || 'patient-1',
    consultationId: overrides.consultationId || 'consult-1',
    status: overrides.status || 'ASSIGNED',
    isDiscreetPackagingConfirmed: overrides.isDiscreetPackagingConfirmed ?? false,
    requiresColdChain: overrides.requiresColdChain ?? false,
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PharmacyFulfillmentService,
        {
          provide: PrismaService,
          useValue: {
            pharmacyOrder: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            pharmacyStaff: {
              findUnique: jest.fn(),
            },
            pharmacyInventory: {
              upsert: jest.fn(),
            },
            user: {
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: NotificationService,
          useValue: {
            sendNotification: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: PharmacyAssignmentService,
          useValue: {
            reassignPharmacy: jest.fn().mockResolvedValue({ assigned: true, pharmacyId: 'pharm-2' }),
          },
        },
      ],
    }).compile();

    service = module.get<PharmacyFulfillmentService>(PharmacyFulfillmentService);
    prisma = module.get(PrismaService);
    notificationService = module.get(NotificationService);
    assignmentService = module.get(PharmacyAssignmentService);
  });

  // ========================================
  // acceptOrder
  // ========================================

  describe('acceptOrder', () => {
    it('should accept order when staff is PHARMACIST with canAcceptOrders', async () => {
      const order = makeOrder({ status: 'ASSIGNED' });
      prisma.pharmacyStaff.findUnique.mockResolvedValue(mockStaff);
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);
      prisma.pharmacyOrder.update.mockResolvedValue({ ...order, status: 'PHARMACY_ACCEPTED' });

      const result = await service.acceptOrder('po-1', 'staff-1');

      expect(result.status).toBe('PHARMACY_ACCEPTED');
      expect(prisma.pharmacyOrder.update).toHaveBeenCalledWith({
        where: { id: 'po-1' },
        data: expect.objectContaining({
          status: 'PHARMACY_ACCEPTED',
          acceptedAt: expect.any(Date),
          acceptedByStaffId: 'staff-1',
        }),
      });
    });

    it('should reject if staff is DISPENSER (not PHARMACIST)', async () => {
      const dispenserStaff = { ...mockStaff, role: 'DISPENSER', canAcceptOrders: false };
      prisma.pharmacyStaff.findUnique.mockResolvedValue(dispenserStaff);

      await expect(service.acceptOrder('po-1', 'staff-1')).rejects.toThrow(ForbiddenException);
    });

    it('should reject if staff canAcceptOrders is false', async () => {
      const noAcceptStaff = { ...mockStaff, canAcceptOrders: false };
      prisma.pharmacyStaff.findUnique.mockResolvedValue(noAcceptStaff);

      await expect(service.acceptOrder('po-1', 'staff-1')).rejects.toThrow(ForbiddenException);
    });

    it('should notify patient on acceptance', async () => {
      const order = makeOrder({ status: 'ASSIGNED' });
      prisma.pharmacyStaff.findUnique.mockResolvedValue(mockStaff);
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);
      prisma.pharmacyOrder.update.mockResolvedValue({ ...order, status: 'PHARMACY_ACCEPTED' });

      await service.acceptOrder('po-1', 'staff-1');

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'patient-1',
          eventType: 'PHARMACY_ORDER_ACCEPTED',
        }),
      );
    });

    it('should throw NotFoundException for invalid order', async () => {
      prisma.pharmacyStaff.findUnique.mockResolvedValue(mockStaff);
      prisma.pharmacyOrder.findUnique.mockResolvedValue(null);

      await expect(service.acceptOrder('nonexistent', 'staff-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // rejectOrder
  // ========================================

  describe('rejectOrder', () => {
    it('should reject order and trigger reassignment', async () => {
      const order = makeOrder({ status: 'ASSIGNED' });
      prisma.pharmacyStaff.findUnique.mockResolvedValue(mockStaff);
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);
      prisma.pharmacyOrder.update.mockResolvedValue({ ...order, status: 'PHARMACY_REJECTED' });

      await service.rejectOrder('po-1', 'staff-1', 'Out of stock');

      expect(prisma.pharmacyOrder.update).toHaveBeenCalledWith({
        where: { id: 'po-1' },
        data: expect.objectContaining({
          status: 'PHARMACY_REJECTED',
          rejectionReason: 'Out of stock',
          rejectedByStaffId: 'staff-1',
        }),
      });
      expect(assignmentService.reassignPharmacy).toHaveBeenCalledWith('po-1', 'Out of stock');
    });

    it('should notify doctor with specific reason on rejection', async () => {
      const order = makeOrder({ status: 'ASSIGNED' });
      prisma.pharmacyStaff.findUnique.mockResolvedValue(mockStaff);
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);
      prisma.pharmacyOrder.update.mockResolvedValue({ ...order, status: 'PHARMACY_REJECTED' });

      await service.rejectOrder('po-1', 'staff-1', 'Medication unavailable');

      // Doctor gets specific reason
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PHARMACY_ORDER_REJECTED_DOCTOR',
          data: expect.objectContaining({ reason: 'Medication unavailable' }),
        }),
      );
    });

    it('should notify patient with vague message on rejection', async () => {
      const order = makeOrder({ status: 'ASSIGNED' });
      prisma.pharmacyStaff.findUnique.mockResolvedValue(mockStaff);
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);
      prisma.pharmacyOrder.update.mockResolvedValue({ ...order, status: 'PHARMACY_REJECTED' });

      await service.rejectOrder('po-1', 'staff-1', 'Medication unavailable');

      // Patient gets vague message (no specifics)
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'patient-1',
          eventType: 'PHARMACY_ORDER_REJECTED_PATIENT',
          body: expect.stringContaining('being reassigned'),
        }),
      );
    });

    it('should reject if staff cannot accept orders', async () => {
      const dispenserStaff = { ...mockStaff, role: 'DISPENSER', canAcceptOrders: false };
      prisma.pharmacyStaff.findUnique.mockResolvedValue(dispenserStaff);

      await expect(service.rejectOrder('po-1', 'staff-1', 'reason')).rejects.toThrow(ForbiddenException);
    });
  });

  // ========================================
  // reportStockIssue
  // ========================================

  describe('reportStockIssue', () => {
    it('should report stock issue and update status', async () => {
      const order = makeOrder({ status: 'PHARMACY_ACCEPTED' });
      prisma.pharmacyStaff.findUnique.mockResolvedValue(mockStaff);
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);
      prisma.pharmacyOrder.update.mockResolvedValue({ ...order, status: 'STOCK_ISSUE' });

      const result = await service.reportStockIssue('po-1', 'staff-1', ['Finasteride 1mg']);

      expect(result.status).toBe('STOCK_ISSUE');
      expect(prisma.pharmacyOrder.update).toHaveBeenCalledWith({
        where: { id: 'po-1' },
        data: expect.objectContaining({
          status: 'STOCK_ISSUE',
          stockIssueDetails: expect.stringContaining('Finasteride 1mg'),
        }),
      });
    });

    it('should auto-update inventory for missing items', async () => {
      const order = makeOrder({ status: 'PHARMACY_ACCEPTED' });
      prisma.pharmacyStaff.findUnique.mockResolvedValue(mockStaff);
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);
      prisma.pharmacyOrder.update.mockResolvedValue({ ...order, status: 'STOCK_ISSUE' });
      prisma.pharmacyInventory.upsert.mockResolvedValue({});

      await service.reportStockIssue('po-1', 'staff-1', ['Finasteride 1mg']);

      expect(prisma.pharmacyInventory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            pharmacyId_medicationName: { pharmacyId: 'pharm-1', medicationName: 'Finasteride 1mg' },
          }),
          update: { isInStock: false, quantity: 0, lastUpdatedById: 'staff-1' },
        }),
      );
    });

    it('should send admin alert for stock issue', async () => {
      const order = makeOrder({ status: 'PHARMACY_ACCEPTED' });
      prisma.pharmacyStaff.findUnique.mockResolvedValue(mockStaff);
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);
      prisma.pharmacyOrder.update.mockResolvedValue({ ...order, status: 'STOCK_ISSUE' });
      prisma.pharmacyInventory.upsert.mockResolvedValue({});
      prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });

      await service.reportStockIssue('po-1', 'staff-1', ['Finasteride 1mg']);

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PHARMACY_STOCK_ISSUE',
        }),
      );
    });
  });

  // ========================================
  // proposeSubstitution
  // ========================================

  describe('proposeSubstitution', () => {
    it('should propose substitution and notify doctor (PHARMACIST only)', async () => {
      const order = makeOrder({ status: 'STOCK_ISSUE' });
      prisma.pharmacyStaff.findUnique.mockResolvedValue(mockStaff);
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);
      prisma.pharmacyOrder.update.mockResolvedValue({ ...order, status: 'AWAITING_SUBSTITUTION_APPROVAL' });

      const substitution = { original: 'Finasteride 1mg', proposed: 'Dutasteride 0.5mg', reason: 'Out of stock' };
      const result = await service.proposeSubstitution('po-1', 'staff-1', substitution);

      expect(result.status).toBe('AWAITING_SUBSTITUTION_APPROVAL');
      expect(prisma.pharmacyOrder.update).toHaveBeenCalledWith({
        where: { id: 'po-1' },
        data: expect.objectContaining({
          status: 'AWAITING_SUBSTITUTION_APPROVAL',
          substitutionDetails: JSON.stringify(substitution),
          substitutionProposedByStaffId: 'staff-1',
        }),
      });
    });

    it('should reject substitution from non-PHARMACIST', async () => {
      const dispenserStaff = { ...mockStaff, role: 'DISPENSER' };
      prisma.pharmacyStaff.findUnique.mockResolvedValue(dispenserStaff);

      await expect(
        service.proposeSubstitution('po-1', 'staff-1', { original: 'A', proposed: 'B', reason: 'test' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should notify doctor about pending substitution', async () => {
      const order = makeOrder({ status: 'STOCK_ISSUE', consultationId: 'consult-1' });
      prisma.pharmacyStaff.findUnique.mockResolvedValue(mockStaff);
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);
      prisma.pharmacyOrder.update.mockResolvedValue({ ...order, status: 'AWAITING_SUBSTITUTION_APPROVAL' });

      await service.proposeSubstitution('po-1', 'staff-1', { original: 'A', proposed: 'B', reason: 'Out of stock' });

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SUBSTITUTION_APPROVAL_NEEDED',
        }),
      );
    });
  });

  // ========================================
  // approveSubstitution / rejectSubstitution
  // ========================================

  describe('approveSubstitution', () => {
    it('should approve and move order to PREPARING', async () => {
      const order = makeOrder({ status: 'AWAITING_SUBSTITUTION_APPROVAL' });
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);
      prisma.pharmacyOrder.update.mockResolvedValue({ ...order, status: 'PREPARING' });

      const result = await service.approveSubstitution('po-1', 'doctor-1');

      expect(result.status).toBe('PREPARING');
      expect(prisma.pharmacyOrder.update).toHaveBeenCalledWith({
        where: { id: 'po-1' },
        data: expect.objectContaining({
          status: 'PREPARING',
          substitutionApprovedBy: 'doctor-1',
        }),
      });
    });
  });

  describe('rejectSubstitution', () => {
    it('should reject substitution and move order back to STOCK_ISSUE', async () => {
      const order = makeOrder({ status: 'AWAITING_SUBSTITUTION_APPROVAL' });
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);
      prisma.pharmacyOrder.update.mockResolvedValue({ ...order, status: 'STOCK_ISSUE' });
      prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });

      const result = await service.rejectSubstitution('po-1', 'doctor-1', 'Not equivalent');

      expect(result.status).toBe('STOCK_ISSUE');
    });

    it('should send admin alert on substitution rejection', async () => {
      const order = makeOrder({ status: 'AWAITING_SUBSTITUTION_APPROVAL' });
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);
      prisma.pharmacyOrder.update.mockResolvedValue({ ...order, status: 'STOCK_ISSUE' });
      prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });

      await service.rejectSubstitution('po-1', 'doctor-1', 'Not equivalent');

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SUBSTITUTION_REJECTED',
        }),
      );
    });
  });

  // ========================================
  // confirmDiscreetPackaging
  // ========================================

  describe('confirmDiscreetPackaging', () => {
    it('should set discreet packaging flag', async () => {
      const order = makeOrder({ status: 'PREPARING' });
      prisma.pharmacyStaff.findUnique.mockResolvedValue(mockStaff);
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);
      prisma.pharmacyOrder.update.mockResolvedValue({ ...order, isDiscreetPackagingConfirmed: true });

      const result = await service.confirmDiscreetPackaging('po-1', 'staff-1');

      expect(result.isDiscreetPackagingConfirmed).toBe(true);
      expect(prisma.pharmacyOrder.update).toHaveBeenCalledWith({
        where: { id: 'po-1' },
        data: {
          isDiscreetPackagingConfirmed: true,
          discreetPackagingConfirmedById: 'staff-1',
        },
      });
    });
  });

  // ========================================
  // markReadyForPickup
  // ========================================

  describe('markReadyForPickup', () => {
    it('should mark ready when discreet packaging confirmed and staff canDispense', async () => {
      const order = makeOrder({ status: 'PREPARING', isDiscreetPackagingConfirmed: true });
      prisma.pharmacyStaff.findUnique.mockResolvedValue({ ...mockStaff, canDispense: true });
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);
      prisma.pharmacyOrder.update.mockResolvedValue({
        ...order,
        status: 'READY_FOR_PICKUP',
        deliveryOtp: '1234',
      });

      const result = await service.markReadyForPickup('po-1', 'staff-1');

      expect(result.status).toBe('READY_FOR_PICKUP');
      expect(prisma.pharmacyOrder.update).toHaveBeenCalledWith({
        where: { id: 'po-1' },
        data: expect.objectContaining({
          status: 'READY_FOR_PICKUP',
          readyForPickupAt: expect.any(Date),
          deliveryOtp: expect.stringMatching(/^\d{4}$/),
        }),
      });
    });

    it('should fail WITHOUT discreet packaging confirmation', async () => {
      const order = makeOrder({ status: 'PREPARING', isDiscreetPackagingConfirmed: false });
      prisma.pharmacyStaff.findUnique.mockResolvedValue({ ...mockStaff, canDispense: true });
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);

      await expect(service.markReadyForPickup('po-1', 'staff-1')).rejects.toThrow(BadRequestException);
    });

    it('should fail without canDispense permission', async () => {
      const order = makeOrder({ status: 'PREPARING', isDiscreetPackagingConfirmed: true });
      prisma.pharmacyStaff.findUnique.mockResolvedValue({ ...mockStaff, canDispense: false });
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);

      await expect(service.markReadyForPickup('po-1', 'staff-1')).rejects.toThrow(ForbiddenException);
    });

    it('should generate a 4-digit OTP', async () => {
      const order = makeOrder({ status: 'PREPARING', isDiscreetPackagingConfirmed: true });
      prisma.pharmacyStaff.findUnique.mockResolvedValue({ ...mockStaff, canDispense: true });
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);
      prisma.pharmacyOrder.update.mockImplementation(async (args: any) => ({
        ...order,
        status: 'READY_FOR_PICKUP',
        deliveryOtp: args.data.deliveryOtp,
      }));

      await service.markReadyForPickup('po-1', 'staff-1');

      const updateCall = prisma.pharmacyOrder.update.mock.calls[0][0];
      const otp = updateCall.data.deliveryOtp;
      expect(otp).toMatch(/^\d{4}$/);
      expect(parseInt(otp)).toBeGreaterThanOrEqual(1000);
      expect(parseInt(otp)).toBeLessThanOrEqual(9999);
    });
  });

  // ========================================
  // updateInventory
  // ========================================

  describe('updateInventory', () => {
    it('should update inventory with canManageInventory permission', async () => {
      prisma.pharmacyStaff.findUnique.mockResolvedValue({ ...mockStaff, canManageInventory: true });
      prisma.pharmacyInventory.upsert.mockResolvedValue({});

      await service.updateInventory('pharm-1', 'staff-1', [
        { medicationName: 'Finasteride 1mg', isInStock: true, quantity: 100 },
      ]);

      expect(prisma.pharmacyInventory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { pharmacyId_medicationName: { pharmacyId: 'pharm-1', medicationName: 'Finasteride 1mg' } },
          update: expect.objectContaining({ isInStock: true, quantity: 100 }),
        }),
      );
    });

    it('should reject without canManageInventory permission', async () => {
      prisma.pharmacyStaff.findUnique.mockResolvedValue({ ...mockStaff, canManageInventory: false });

      await expect(
        service.updateInventory('pharm-1', 'staff-1', [{ medicationName: 'Test', isInStock: true, quantity: 10 }]),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should track which staff member updated inventory', async () => {
      prisma.pharmacyStaff.findUnique.mockResolvedValue({ ...mockStaff, canManageInventory: true });
      prisma.pharmacyInventory.upsert.mockResolvedValue({});

      await service.updateInventory('pharm-1', 'staff-1', [
        { medicationName: 'Minoxidil 5%', isInStock: false, quantity: 0 },
      ]);

      expect(prisma.pharmacyInventory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ lastUpdatedById: 'staff-1' }),
          create: expect.objectContaining({ lastUpdatedById: 'staff-1' }),
        }),
      );
    });
  });
});
