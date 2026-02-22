import { Test, TestingModule } from '@nestjs/testing';
import { PhlebotomistOnboardingService } from './phlebotomist-onboarding.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Spec: Phase 16 Chunk 1 — Phlebotomist Onboarding

describe('PhlebotomistOnboardingService', () => {
  let service: PhlebotomistOnboardingService;
  let prisma: any;
  let notificationService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhlebotomistOnboardingService,
        {
          provide: PrismaService,
          useValue: {
            labPhlebotomist: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
            partnerLab: {
              findUnique: jest.fn(),
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

    service = module.get<PhlebotomistOnboardingService>(PhlebotomistOnboardingService);
    prisma = module.get(PrismaService);
    notificationService = module.get(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========================================
  // Register Phlebotomist
  // ========================================

  describe('registerPhlebotomist', () => {
    const validInput = {
      name: 'Suresh Patel',
      phone: '+919876543215',
      email: 'suresh@onlyou.life',
      city: 'Hyderabad',
      assignedLabId: 'lab-1',
      serviceableAreas: ['500033', '500034'],
    };

    it('should register phlebotomist with PENDING_VERIFICATION status', async () => {
      prisma.partnerLab.findUnique.mockResolvedValue({
        id: 'lab-1',
        status: 'ACTIVE',
      });
      prisma.labPhlebotomist.create.mockResolvedValue({
        id: 'phleb-1',
        ...validInput,
        status: 'PHLEB_PENDING_VERIFICATION',
        onboardedById: 'admin-1',
      });

      const result = await service.registerPhlebotomist('admin-1', validInput);

      expect(result.status).toBe('PHLEB_PENDING_VERIFICATION');
      expect(result.onboardedById).toBe('admin-1');
    });

    it('should reject if assigned lab is not ACTIVE', async () => {
      prisma.partnerLab.findUnique.mockResolvedValue({
        id: 'lab-1',
        status: 'SUSPENDED',
      });

      await expect(
        service.registerPhlebotomist('admin-1', validInput),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if assigned lab not found', async () => {
      prisma.partnerLab.findUnique.mockResolvedValue(null);

      await expect(
        service.registerPhlebotomist('admin-1', validInput),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject with missing name', async () => {
      prisma.partnerLab.findUnique.mockResolvedValue({ id: 'lab-1', status: 'ACTIVE' });

      await expect(
        service.registerPhlebotomist('admin-1', { ...validInput, name: '' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================
  // Upload Documents
  // ========================================

  describe('uploadPhlebotomistDocuments', () => {
    it('should upload certification and training documents', async () => {
      prisma.labPhlebotomist.findUnique.mockResolvedValue({
        id: 'phleb-1',
        status: 'PHLEB_PENDING_VERIFICATION',
      });
      prisma.labPhlebotomist.update.mockResolvedValue({
        id: 'phleb-1',
        certificationDocumentUrl: 'https://r2.example.com/cert.pdf',
      });

      const result = await service.uploadPhlebotomistDocuments('phleb-1', 'admin-1', {
        certificationDocumentUrl: 'https://r2.example.com/cert.pdf',
        certificationNumber: 'PHLEB-2024-001',
        certificationExpiry: new Date('2027-12-31'),
      });

      expect(result.certificationDocumentUrl).toBe('https://r2.example.com/cert.pdf');
    });

    it('should throw if phlebotomist not found', async () => {
      prisma.labPhlebotomist.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadPhlebotomistDocuments('phleb-999', 'admin-1', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // Training Flow
  // ========================================

  describe('startTraining', () => {
    it('should set status to TRAINING', async () => {
      prisma.labPhlebotomist.findUnique.mockResolvedValue({
        id: 'phleb-1',
        status: 'PHLEB_PENDING_VERIFICATION',
      });
      prisma.labPhlebotomist.update.mockResolvedValue({
        id: 'phleb-1',
        status: 'PHLEB_TRAINING',
      });

      const result = await service.startTraining('phleb-1', 'admin-1');

      expect(result.status).toBe('PHLEB_TRAINING');
    });

    it('should throw if phlebotomist not found', async () => {
      prisma.labPhlebotomist.findUnique.mockResolvedValue(null);

      await expect(
        service.startTraining('phleb-999', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('completeTraining', () => {
    it('should set trainingCompletedAt but NOT auto-activate', async () => {
      const trainingDate = new Date('2026-02-15');
      prisma.labPhlebotomist.findUnique.mockResolvedValue({
        id: 'phleb-1',
        status: 'PHLEB_TRAINING',
      });
      prisma.labPhlebotomist.update.mockResolvedValue({
        id: 'phleb-1',
        status: 'PHLEB_TRAINING', // Still training, NOT active
        trainingCompletedAt: trainingDate,
      });

      const result = await service.completeTraining('phleb-1', 'admin-1', trainingDate);

      // Should NOT be ACTIVE — still needs equipment + background check
      expect(result.status).toBe('PHLEB_TRAINING');
      expect(result.trainingCompletedAt).toEqual(trainingDate);
    });
  });

  // ========================================
  // Equipment Verification
  // ========================================

  describe('verifyEquipment', () => {
    it('should set equipment checklist and verification timestamp', async () => {
      const checklist = {
        coolerBox: true,
        tubeKit: true,
        barcodeScanner: true,
        gloves: true,
        sharpsContainer: true,
      };
      prisma.labPhlebotomist.findUnique.mockResolvedValue({
        id: 'phleb-1',
        status: 'PHLEB_TRAINING',
      });
      prisma.labPhlebotomist.update.mockResolvedValue({
        id: 'phleb-1',
        equipmentChecklist: checklist,
        equipmentVerifiedAt: expect.any(Date),
        equipmentVerifiedById: 'admin-1',
      });

      const result = await service.verifyEquipment('phleb-1', 'admin-1', checklist);

      expect(result.equipmentChecklist).toEqual(checklist);
      expect(result.equipmentVerifiedById).toBe('admin-1');
    });

    it('should throw if phlebotomist not found', async () => {
      prisma.labPhlebotomist.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyEquipment('phleb-999', 'admin-1', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // Background Verification
  // ========================================

  describe('updateBackgroundVerification', () => {
    it('should update background verification status', async () => {
      prisma.labPhlebotomist.findUnique.mockResolvedValue({
        id: 'phleb-1',
        backgroundVerificationStatus: 'BG_PENDING',
      });
      prisma.labPhlebotomist.update.mockResolvedValue({
        id: 'phleb-1',
        backgroundVerificationStatus: 'BG_VERIFIED',
        backgroundVerificationCompletedAt: expect.any(Date),
      });

      const result = await service.updateBackgroundVerification('phleb-1', 'admin-1', 'BG_VERIFIED');

      expect(result.backgroundVerificationStatus).toBe('BG_VERIFIED');
    });

    it('should throw if phlebotomist not found', async () => {
      prisma.labPhlebotomist.findUnique.mockResolvedValue(null);

      await expect(
        service.updateBackgroundVerification('phleb-999', 'admin-1', 'BG_VERIFIED'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // Activate Phlebotomist
  // ========================================

  describe('activatePhlebotomist', () => {
    const fullyReadyPhlebotomist = {
      id: 'phleb-1',
      name: 'Suresh Patel',
      status: 'PHLEB_TRAINING',
      trainingCompletedAt: new Date('2026-01-15'),
      equipmentVerifiedAt: new Date('2026-01-20'),
      backgroundVerificationStatus: 'BG_VERIFIED',
      assignedLabId: 'lab-1',
      serviceableAreas: ['500033', '500034'],
    };

    it('should activate when ALL checks pass', async () => {
      prisma.labPhlebotomist.findUnique.mockResolvedValue(fullyReadyPhlebotomist);
      prisma.partnerLab.findUnique.mockResolvedValue({ id: 'lab-1', status: 'ACTIVE' });
      prisma.labPhlebotomist.update.mockResolvedValue({
        ...fullyReadyPhlebotomist,
        status: 'PHLEB_ACTIVE',
        activatedById: 'admin-1',
        activatedAt: expect.any(Date),
      });

      const result = await service.activatePhlebotomist('phleb-1', 'admin-1');

      expect(result.status).toBe('PHLEB_ACTIVE');
      expect(result.activatedById).toBe('admin-1');
    });

    it('should reject if training not completed', async () => {
      prisma.labPhlebotomist.findUnique.mockResolvedValue({
        ...fullyReadyPhlebotomist,
        trainingCompletedAt: null,
      });
      prisma.partnerLab.findUnique.mockResolvedValue({ id: 'lab-1', status: 'ACTIVE' });

      await expect(
        service.activatePhlebotomist('phleb-1', 'admin-1'),
      ).rejects.toThrow('training not completed');
    });

    it('should reject if equipment not verified', async () => {
      prisma.labPhlebotomist.findUnique.mockResolvedValue({
        ...fullyReadyPhlebotomist,
        equipmentVerifiedAt: null,
      });
      prisma.partnerLab.findUnique.mockResolvedValue({ id: 'lab-1', status: 'ACTIVE' });

      await expect(
        service.activatePhlebotomist('phleb-1', 'admin-1'),
      ).rejects.toThrow('equipment not verified');
    });

    it('should reject if background check pending', async () => {
      prisma.labPhlebotomist.findUnique.mockResolvedValue({
        ...fullyReadyPhlebotomist,
        backgroundVerificationStatus: 'BG_PENDING',
      });
      prisma.partnerLab.findUnique.mockResolvedValue({ id: 'lab-1', status: 'ACTIVE' });

      await expect(
        service.activatePhlebotomist('phleb-1', 'admin-1'),
      ).rejects.toThrow('background check pending');
    });

    it('should reject if background check FAILED', async () => {
      prisma.labPhlebotomist.findUnique.mockResolvedValue({
        ...fullyReadyPhlebotomist,
        backgroundVerificationStatus: 'BG_FAILED',
      });
      prisma.partnerLab.findUnique.mockResolvedValue({ id: 'lab-1', status: 'ACTIVE' });

      await expect(
        service.activatePhlebotomist('phleb-1', 'admin-1'),
      ).rejects.toThrow('background check failed');
    });

    it('should reject if assigned lab is not ACTIVE', async () => {
      prisma.labPhlebotomist.findUnique.mockResolvedValue(fullyReadyPhlebotomist);
      prisma.partnerLab.findUnique.mockResolvedValue({ id: 'lab-1', status: 'SUSPENDED' });

      await expect(
        service.activatePhlebotomist('phleb-1', 'admin-1'),
      ).rejects.toThrow('assigned lab not active');
    });

    it('should reject if no serviceable areas defined', async () => {
      prisma.labPhlebotomist.findUnique.mockResolvedValue({
        ...fullyReadyPhlebotomist,
        serviceableAreas: [],
      });
      prisma.partnerLab.findUnique.mockResolvedValue({ id: 'lab-1', status: 'ACTIVE' });

      await expect(
        service.activatePhlebotomist('phleb-1', 'admin-1'),
      ).rejects.toThrow('no service areas defined');
    });

    it('should throw if phlebotomist not found', async () => {
      prisma.labPhlebotomist.findUnique.mockResolvedValue(null);

      await expect(
        service.activatePhlebotomist('phleb-999', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // Suspend Phlebotomist
  // ========================================

  describe('suspendPhlebotomist', () => {
    it('should suspend phlebotomist with reason', async () => {
      prisma.labPhlebotomist.findUnique.mockResolvedValue({
        id: 'phleb-1',
        name: 'Suresh Patel',
        status: 'PHLEB_ACTIVE',
      });
      prisma.labPhlebotomist.update.mockResolvedValue({
        id: 'phleb-1',
        status: 'PHLEB_SUSPENDED',
        suspensionReason: 'High sample failure rate',
      });

      const result = await service.suspendPhlebotomist('phleb-1', 'admin-1', 'High sample failure rate');

      expect(result.status).toBe('PHLEB_SUSPENDED');
    });

    it('should throw if not found', async () => {
      prisma.labPhlebotomist.findUnique.mockResolvedValue(null);

      await expect(
        service.suspendPhlebotomist('phleb-999', 'admin-1', 'reason'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // Update Serviceable Areas
  // ========================================

  describe('updateServiceableAreas', () => {
    it('should update coverage pincodes', async () => {
      prisma.labPhlebotomist.findUnique.mockResolvedValue({
        id: 'phleb-1',
        serviceableAreas: ['500033'],
      });
      prisma.labPhlebotomist.update.mockResolvedValue({
        id: 'phleb-1',
        serviceableAreas: ['500033', '500034', '500035'],
      });

      const result = await service.updateServiceableAreas('phleb-1', 'admin-1', ['500033', '500034', '500035']);

      expect(result.serviceableAreas).toEqual(['500033', '500034', '500035']);
    });

    it('should throw if not found', async () => {
      prisma.labPhlebotomist.findUnique.mockResolvedValue(null);

      await expect(
        service.updateServiceableAreas('phleb-999', 'admin-1', []),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // Credential Expiry Check
  // ========================================

  describe('checkExpiringCredentials', () => {
    it('should auto-suspend phlebotomist with expired certification', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 5);

      prisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);
      prisma.labPhlebotomist.findMany.mockResolvedValue([
        {
          id: 'phleb-1',
          name: 'Suresh',
          certificationExpiry: expiredDate,
          status: 'PHLEB_ACTIVE',
        },
      ]);
      prisma.labPhlebotomist.update.mockResolvedValue({
        id: 'phleb-1',
        status: 'PHLEB_SUSPENDED',
      });

      await service.checkExpiringCredentials();

      expect(prisma.labPhlebotomist.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'phleb-1' },
          data: expect.objectContaining({
            status: 'PHLEB_SUSPENDED',
          }),
        }),
      );
    });

    it('should alert for certification expiring within 30 days (not suspend)', async () => {
      const expiringDate = new Date();
      expiringDate.setDate(expiringDate.getDate() + 20);

      prisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);
      prisma.labPhlebotomist.findMany.mockResolvedValue([
        {
          id: 'phleb-1',
          name: 'Suresh',
          certificationExpiry: expiringDate,
          status: 'PHLEB_ACTIVE',
        },
      ]);

      await service.checkExpiringCredentials();

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PHLEBOTOMIST_CERTIFICATION_EXPIRING',
        }),
      );
      // Should NOT suspend
      expect(prisma.labPhlebotomist.update).not.toHaveBeenCalled();
    });
  });
});
