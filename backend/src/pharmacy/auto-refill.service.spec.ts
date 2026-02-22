import { Test, TestingModule } from '@nestjs/testing';
import { AutoRefillService } from './auto-refill.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { PharmacyAssignmentService } from './pharmacy-assignment.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Spec: Phase 15 Chunk 7 — Auto-Refill for Subscriptions

describe('AutoRefillService', () => {
  let service: AutoRefillService;
  let prisma: any;
  let notificationService: any;
  let assignmentService: any;

  const daysFromNow = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  };

  const daysAgo = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoRefillService,
        {
          provide: PrismaService,
          useValue: {
            autoRefillConfig: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            prescription: {
              findUnique: jest.fn(),
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
            assignPharmacy: jest.fn().mockResolvedValue({ assigned: true, pharmacyOrderId: 'po-refill-1' }),
          },
        },
      ],
    }).compile();

    service = module.get<AutoRefillService>(AutoRefillService);
    prisma = module.get(PrismaService);
    notificationService = module.get(NotificationService);
    assignmentService = module.get(PharmacyAssignmentService);
  });

  // ========================================
  // processUpcomingRefills (cron job)
  // ========================================

  describe('processUpcomingRefills', () => {
    it('should create auto-refill order for valid prescription', async () => {
      const config = {
        id: 'arc-1',
        patientId: 'patient-1',
        prescriptionId: 'rx-1',
        intervalDays: 30,
        nextRefillDate: daysFromNow(3), // 3 days from now (within 5-day window)
        isActive: true,
        totalRefillsCreated: 2,
      };

      const prescription = {
        id: 'rx-1',
        validUntil: daysFromNow(60), // valid
        consultationId: 'consult-1',
      };

      prisma.autoRefillConfig.findMany.mockResolvedValue([config]);
      prisma.prescription.findUnique.mockResolvedValue(prescription);
      prisma.autoRefillConfig.update.mockResolvedValue({
        ...config,
        totalRefillsCreated: 3,
        lastPharmacyOrderId: 'po-refill-1',
        nextRefillDate: daysFromNow(33),
      });

      await service.processUpcomingRefills();

      expect(assignmentService.assignPharmacy).toHaveBeenCalledWith('rx-1');
      expect(prisma.autoRefillConfig.update).toHaveBeenCalledWith({
        where: { id: 'arc-1' },
        data: expect.objectContaining({
          totalRefillsCreated: 3,
          lastPharmacyOrderId: 'po-refill-1',
          nextRefillDate: expect.any(Date),
        }),
      });
    });

    it('should NOT create order if prescription expired', async () => {
      const config = {
        id: 'arc-1',
        patientId: 'patient-1',
        prescriptionId: 'rx-1',
        intervalDays: 30,
        nextRefillDate: daysFromNow(3),
        isActive: true,
        totalRefillsCreated: 2,
      };

      const prescription = {
        id: 'rx-1',
        validUntil: daysAgo(5), // expired
        consultationId: 'consult-1',
      };

      prisma.autoRefillConfig.findMany.mockResolvedValue([config]);
      prisma.prescription.findUnique.mockResolvedValue(prescription);

      await service.processUpcomingRefills();

      expect(assignmentService.assignPharmacy).not.toHaveBeenCalled();
      // Should notify patient and doctor about expired prescription
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PRESCRIPTION_EXPIRED_FOR_REFILL',
        }),
      );
    });

    it('should skip inactive configs', async () => {
      // findMany should only return active configs, so empty result means nothing to process
      prisma.autoRefillConfig.findMany.mockResolvedValue([]);

      await service.processUpcomingRefills();

      expect(assignmentService.assignPharmacy).not.toHaveBeenCalled();
    });

    it('should send different notification for auto-refill vs manual order', async () => {
      const config = {
        id: 'arc-1',
        patientId: 'patient-1',
        prescriptionId: 'rx-1',
        intervalDays: 30,
        nextRefillDate: daysFromNow(3),
        isActive: true,
        totalRefillsCreated: 0,
      };

      const prescription = {
        id: 'rx-1',
        validUntil: daysFromNow(60),
        consultationId: 'consult-1',
      };

      prisma.autoRefillConfig.findMany.mockResolvedValue([config]);
      prisma.prescription.findUnique.mockResolvedValue(prescription);
      prisma.autoRefillConfig.update.mockResolvedValue({ ...config, totalRefillsCreated: 1 });

      await service.processUpcomingRefills();

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'patient-1',
          eventType: 'AUTO_REFILL_CREATED',
        }),
      );
    });

    it('should handle per-item errors gracefully', async () => {
      const config1 = {
        id: 'arc-1',
        patientId: 'patient-1',
        prescriptionId: 'rx-1',
        intervalDays: 30,
        nextRefillDate: daysFromNow(3),
        isActive: true,
        totalRefillsCreated: 0,
      };
      const config2 = {
        id: 'arc-2',
        patientId: 'patient-2',
        prescriptionId: 'rx-2',
        intervalDays: 30,
        nextRefillDate: daysFromNow(2),
        isActive: true,
        totalRefillsCreated: 0,
      };

      // First config's prescription not found (error), second succeeds
      prisma.autoRefillConfig.findMany.mockResolvedValue([config1, config2]);
      prisma.prescription.findUnique
        .mockResolvedValueOnce(null) // rx-1 not found
        .mockResolvedValueOnce({
          id: 'rx-2',
          validUntil: daysFromNow(60),
          consultationId: 'consult-2',
        });
      prisma.autoRefillConfig.update.mockResolvedValue({ ...config2, totalRefillsCreated: 1 });

      // Should not throw even though first item failed
      await expect(service.processUpcomingRefills()).resolves.not.toThrow();
      // Second config should still be processed
      expect(assignmentService.assignPharmacy).toHaveBeenCalledWith('rx-2');
    });
  });

  // ========================================
  // createRefillSubscription
  // ========================================

  describe('createRefillSubscription', () => {
    it('should create a new refill subscription', async () => {
      const prescription = {
        id: 'rx-1',
        validUntil: daysFromNow(60),
        consultationId: 'consult-1',
      };
      prisma.prescription.findUnique.mockResolvedValue(prescription);
      prisma.autoRefillConfig.create.mockResolvedValue({
        id: 'arc-1',
        patientId: 'patient-1',
        prescriptionId: 'rx-1',
        intervalDays: 30,
        nextRefillDate: daysFromNow(30),
        isActive: true,
      });

      const result = await service.createRefillSubscription('patient-1', 'rx-1', 30);

      expect(result.isActive).toBe(true);
      expect(prisma.autoRefillConfig.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          patientId: 'patient-1',
          prescriptionId: 'rx-1',
          intervalDays: 30,
          isActive: true,
          nextRefillDate: expect.any(Date),
        }),
      });
    });

    it('should throw if prescription not found', async () => {
      prisma.prescription.findUnique.mockResolvedValue(null);

      await expect(
        service.createRefillSubscription('patient-1', 'nonexistent', 30),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if prescription already expired', async () => {
      prisma.prescription.findUnique.mockResolvedValue({
        id: 'rx-1',
        validUntil: daysAgo(5),
      });

      await expect(
        service.createRefillSubscription('patient-1', 'rx-1', 30),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================
  // cancelRefillSubscription
  // ========================================

  describe('cancelRefillSubscription', () => {
    it('should cancel active subscription', async () => {
      const config = {
        id: 'arc-1',
        patientId: 'patient-1',
        isActive: true,
      };
      prisma.autoRefillConfig.findUnique.mockResolvedValue(config);
      prisma.autoRefillConfig.update.mockResolvedValue({ ...config, isActive: false });

      const result = await service.cancelRefillSubscription('arc-1', 'patient-1');

      expect(result.isActive).toBe(false);
    });

    it('should throw if not the patient who owns the subscription', async () => {
      const config = {
        id: 'arc-1',
        patientId: 'patient-1',
        isActive: true,
      };
      prisma.autoRefillConfig.findUnique.mockResolvedValue(config);

      await expect(
        service.cancelRefillSubscription('arc-1', 'other-patient'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if subscription not found', async () => {
      prisma.autoRefillConfig.findUnique.mockResolvedValue(null);

      await expect(
        service.cancelRefillSubscription('nonexistent', 'patient-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
