import { Test, TestingModule } from '@nestjs/testing';
import { ReturnsService } from './returns.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { PharmacyAssignmentService } from './pharmacy-assignment.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Spec: Phase 15 Chunk 9 — Returns + Damaged Medication + Payment Validation

describe('ReturnsService', () => {
  let service: ReturnsService;
  let prisma: any;
  let notificationService: any;
  let assignmentService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReturnsService,
        {
          provide: PrismaService,
          useValue: {
            pharmacyOrder: {
              findUnique: jest.fn(),
              update: jest.fn(),
              create: jest.fn(),
            },
            prescription: {
              findUnique: jest.fn(),
            },
            subscription: {
              findFirst: jest.fn(),
            },
            labOrder: {
              findUnique: jest.fn(),
            },
            user: {
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: NotificationService,
          useValue: {
            sendNotification: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: PharmacyAssignmentService,
          useValue: {
            assignPharmacy: jest.fn().mockResolvedValue({ assigned: true, pharmacyOrderId: 'po-replacement' }),
          },
        },
      ],
    }).compile();

    service = module.get<ReturnsService>(ReturnsService);
    prisma = module.get(PrismaService);
    notificationService = module.get(NotificationService);
    assignmentService = module.get(PharmacyAssignmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========================================
  // Report Damaged Order
  // ========================================

  describe('reportDamagedOrder', () => {
    it('should create damage report with photo URLs and notify admin', async () => {
      prisma.pharmacyOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        patientId: 'patient-1',
        status: 'DELIVERED',
        prescriptionId: 'rx-1',
      });
      prisma.pharmacyOrder.update.mockResolvedValue({
        id: 'po-1',
        status: 'DAMAGE_REPORTED',
        damageReportPhotos: ['https://s3.example.com/photo1.jpg'],
        damageReportDescription: 'Package arrived crushed',
      });
      prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });

      const result = await service.reportDamagedOrder(
        'po-1',
        'patient-1',
        ['https://s3.example.com/photo1.jpg'],
        'Package arrived crushed',
      );

      expect(result.status).toBe('DAMAGE_REPORTED');
      expect(prisma.pharmacyOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'po-1' },
          data: expect.objectContaining({
            status: 'DAMAGE_REPORTED',
            damageReportPhotos: ['https://s3.example.com/photo1.jpg'],
            damageReportDescription: 'Package arrived crushed',
          }),
        }),
      );
      // Admin should be notified
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientRole: 'ADMIN',
          eventType: 'DAMAGE_REPORT_SUBMITTED',
        }),
      );
    });

    it('should throw if order not found', async () => {
      prisma.pharmacyOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.reportDamagedOrder('po-999', 'patient-1', [], 'Damaged'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if patient does not own the order', async () => {
      prisma.pharmacyOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        patientId: 'other-patient',
        status: 'DELIVERED',
      });

      await expect(
        service.reportDamagedOrder('po-1', 'patient-1', [], 'Damaged'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================
  // Approve Damage Report
  // ========================================

  describe('approveDamageReport', () => {
    it('should approve damage report and trigger free replacement order', async () => {
      prisma.pharmacyOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        patientId: 'patient-1',
        prescriptionId: 'rx-1',
        status: 'DAMAGE_REPORTED',
      });
      prisma.pharmacyOrder.update.mockResolvedValue({
        id: 'po-1',
        status: 'DAMAGE_APPROVED',
        damageApprovedById: 'admin-1',
      });

      const result = await service.approveDamageReport('po-1', 'admin-1');

      expect(result.status).toBe('DAMAGE_APPROVED');
      // Should trigger replacement via assignment service
      expect(assignmentService.assignPharmacy).toHaveBeenCalledWith('rx-1');
    });

    it('should throw if order is not in DAMAGE_REPORTED status', async () => {
      prisma.pharmacyOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        status: 'DELIVERED',
      });

      await expect(
        service.approveDamageReport('po-1', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================
  // Process Return
  // ========================================

  describe('processReturn', () => {
    it('should accept return for sealed medication within 48 hours', async () => {
      const deliveredAt = new Date();
      deliveredAt.setHours(deliveredAt.getHours() - 24); // 24 hours ago

      prisma.pharmacyOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        patientId: 'patient-1',
        status: 'DELIVERED',
        deliveredAt,
        isOpened: false,
      });
      prisma.pharmacyOrder.update.mockResolvedValue({
        id: 'po-1',
        status: 'RETURN_ACCEPTED',
      });

      const result = await service.processReturn('po-1', 'patient-1', 'Changed my mind');

      expect(result.status).toBe('RETURN_ACCEPTED');
    });

    it('should reject return for opened medication', async () => {
      const deliveredAt = new Date();
      deliveredAt.setHours(deliveredAt.getHours() - 12);

      prisma.pharmacyOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        patientId: 'patient-1',
        status: 'DELIVERED',
        deliveredAt,
        isOpened: true,
      });

      await expect(
        service.processReturn('po-1', 'patient-1', 'Changed my mind'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject return after 48 hours', async () => {
      const deliveredAt = new Date();
      deliveredAt.setHours(deliveredAt.getHours() - 72); // 72 hours ago

      prisma.pharmacyOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        patientId: 'patient-1',
        status: 'DELIVERED',
        deliveredAt,
        isOpened: false,
      });

      await expect(
        service.processReturn('po-1', 'patient-1', 'Changed my mind'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if patient does not own the order', async () => {
      prisma.pharmacyOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        patientId: 'other-patient',
        status: 'DELIVERED',
        deliveredAt: new Date(),
      });

      await expect(
        service.processReturn('po-1', 'patient-1', 'Changed my mind'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================
  // Cold Chain Breach
  // ========================================

  describe('handleColdChainBreach', () => {
    it('should auto-create replacement order for cold chain breach', async () => {
      prisma.pharmacyOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        patientId: 'patient-1',
        prescriptionId: 'rx-1',
        requiresColdChain: true,
        status: 'DELIVERED',
      });
      prisma.pharmacyOrder.update.mockResolvedValue({
        id: 'po-1',
        status: 'COLD_CHAIN_BREACH',
      });
      prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });

      await service.handleColdChainBreach('po-1');

      // Should mark order as cold chain breach
      expect(prisma.pharmacyOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'COLD_CHAIN_BREACH' }),
        }),
      );
      // Should trigger automatic replacement
      expect(assignmentService.assignPharmacy).toHaveBeenCalledWith('rx-1');
    });

    it('should throw if order does not require cold chain', async () => {
      prisma.pharmacyOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        requiresColdChain: false,
        status: 'DELIVERED',
      });

      await expect(service.handleColdChainBreach('po-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================
  // Payment Validation Before Order
  // ========================================

  describe('validatePaymentBeforeOrder', () => {
    it('should pass if patient has active subscription for vertical', async () => {
      prisma.prescription.findUnique.mockResolvedValue({
        id: 'rx-1',
        consultation: { vertical: 'HAIR_LOSS' },
      });
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
        currentPeriodEnd: new Date(Date.now() + 86400000),
      });

      const result = await service.validatePaymentBeforeOrder('patient-1', 'consult-1');

      expect(result).toEqual({ valid: true });
    });

    it('should fail if no active subscription', async () => {
      prisma.prescription.findUnique.mockResolvedValue({
        id: 'rx-1',
        consultation: { vertical: 'HAIR_LOSS' },
      });
      prisma.subscription.findFirst.mockResolvedValue(null);

      const result = await service.validatePaymentBeforeOrder('patient-1', 'consult-1');

      expect(result).toEqual({ valid: false, reason: 'NO_ACTIVE_SUBSCRIPTION' });
    });

    it('should fail if subscription is expired', async () => {
      prisma.prescription.findUnique.mockResolvedValue({
        id: 'rx-1',
        consultation: { vertical: 'HAIR_LOSS' },
      });
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        status: 'EXPIRED',
        currentPeriodEnd: new Date(Date.now() - 86400000),
      });

      const result = await service.validatePaymentBeforeOrder('patient-1', 'consult-1');

      expect(result).toEqual({ valid: false, reason: 'SUBSCRIPTION_EXPIRED' });
    });
  });

  // ========================================
  // Blood Work Payment
  // ========================================

  describe('handlePaymentForBloodWork', () => {
    it('should proceed if lab order included in subscription tier', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lab-1',
        patientId: 'patient-1',
        vertical: 'WEIGHT_MANAGEMENT',
      });
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
        plan: { includesBloodWork: true },
      });

      const result = await service.handlePaymentForBloodWork('patient-1', 'lab-1');

      expect(result).toEqual({ requiresPayment: false, reason: 'INCLUDED_IN_PLAN' });
    });

    it('should require payment if blood work not included in plan', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lab-1',
        patientId: 'patient-1',
        vertical: 'HAIR_LOSS',
      });
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
        plan: { includesBloodWork: false },
      });

      const result = await service.handlePaymentForBloodWork('patient-1', 'lab-1');

      expect(result).toEqual({ requiresPayment: true, reason: 'NOT_INCLUDED_IN_PLAN' });
    });

    it('should require payment if no active subscription', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lab-1',
        patientId: 'patient-1',
        vertical: 'HAIR_LOSS',
      });
      prisma.subscription.findFirst.mockResolvedValue(null);

      const result = await service.handlePaymentForBloodWork('patient-1', 'lab-1');

      expect(result).toEqual({ requiresPayment: true, reason: 'NO_ACTIVE_SUBSCRIPTION' });
    });
  });
});
