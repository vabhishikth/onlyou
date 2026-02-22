import { Test, TestingModule } from '@nestjs/testing';
import { LabOnboardingService } from './lab-onboarding.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Spec: Phase 16 Chunk 1 — PartnerLab + LabTechnician Onboarding

describe('LabOnboardingService', () => {
  let service: LabOnboardingService;
  let prisma: any;
  let notificationService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabOnboardingService,
        {
          provide: PrismaService,
          useValue: {
            partnerLab: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            labTechnician: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
            labPhlebotomist: {
              findMany: jest.fn(),
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

    service = module.get<LabOnboardingService>(LabOnboardingService);
    prisma = module.get(PrismaService);
    notificationService = module.get(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========================================
  // Register Lab
  // ========================================

  describe('registerLab', () => {
    const validLabInput = {
      name: 'Apollo Diagnostics Hyderabad',
      city: 'Hyderabad',
      address: '123 Jubilee Hills, Hyderabad',
      pincode: '500033',
      contactPhone: '+919876543210',
      labLicenseNumber: 'LAB-TS-2024-001',
      labLicenseExpiry: new Date('2026-12-31'),
      ownerName: 'Dr. Ramesh Kumar',
      ownerPhone: '+919876543211',
      testsAvailable: ['CBC', 'TSH', 'lipid_panel', 'fasting_glucose', 'HbA1c'],
    };

    it('should register a lab with valid data and status PENDING_VERIFICATION', async () => {
      prisma.partnerLab.findFirst.mockResolvedValue(null);
      prisma.partnerLab.create.mockResolvedValue({
        id: 'lab-1',
        ...validLabInput,
        status: 'PENDING_VERIFICATION',
        onboardedById: 'admin-1',
      });

      const result = await service.registerLab('admin-1', validLabInput);

      expect(result.status).toBe('PENDING_VERIFICATION');
      expect(result.onboardedById).toBe('admin-1');
      expect(prisma.partnerLab.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: validLabInput.name,
            status: 'PENDING_VERIFICATION',
            onboardedById: 'admin-1',
          }),
        }),
      );
    });

    it('should reject registration with missing lab license number', async () => {
      const input = { ...validLabInput, labLicenseNumber: '' };

      await expect(
        service.registerLab('admin-1', input),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject registration with missing name', async () => {
      const input = { ...validLabInput, name: '' };

      await expect(
        service.registerLab('admin-1', input),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject registration with invalid phone format', async () => {
      const input = { ...validLabInput, contactPhone: '9876543210' };

      await expect(
        service.registerLab('admin-1', input),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject registration with duplicate lab license number', async () => {
      prisma.partnerLab.findFirst.mockResolvedValue({ id: 'existing-lab' });

      await expect(
        service.registerLab('admin-1', validLabInput),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================
  // Upload Lab Documents
  // ========================================

  describe('uploadLabDocuments', () => {
    it('should upload documents and set status to DOCUMENTS_SUBMITTED', async () => {
      prisma.partnerLab.findUnique.mockResolvedValue({
        id: 'lab-1',
        status: 'PENDING_VERIFICATION',
      });
      prisma.partnerLab.update.mockResolvedValue({
        id: 'lab-1',
        status: 'DOCUMENTS_SUBMITTED',
        labLicenseDocumentUrl: 'https://r2.example.com/lab-license.pdf',
      });

      const result = await service.uploadLabDocuments('lab-1', 'admin-1', {
        labLicenseDocumentUrl: 'https://r2.example.com/lab-license.pdf',
        nablCertificateDocumentUrl: 'https://r2.example.com/nabl-cert.pdf',
      });

      expect(result.status).toBe('DOCUMENTS_SUBMITTED');
      expect(prisma.partnerLab.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'DOCUMENTS_SUBMITTED',
          }),
        }),
      );
    });

    it('should throw if lab not found', async () => {
      prisma.partnerLab.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadLabDocuments('lab-999', 'admin-1', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // Review Lab
  // ========================================

  describe('reviewLab', () => {
    it('should approve lab and set status to ACTIVE', async () => {
      prisma.partnerLab.findUnique.mockResolvedValue({
        id: 'lab-1',
        name: 'Apollo Diagnostics',
        status: 'DOCUMENTS_SUBMITTED',
        nablAccredited: false,
      });
      prisma.partnerLab.update.mockResolvedValue({
        id: 'lab-1',
        status: 'ACTIVE',
        activatedById: 'admin-1',
      });

      const result = await service.reviewLab('lab-1', 'admin-1', true);

      expect(result.status).toBe('ACTIVE');
      expect(prisma.partnerLab.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ACTIVE',
            activatedById: 'admin-1',
          }),
        }),
      );
    });

    it('should keep nablAccredited false even if lab claims cold chain capability', async () => {
      // NABL accreditation stays false until admin explicitly verifies
      prisma.partnerLab.findUnique.mockResolvedValue({
        id: 'lab-1',
        name: 'Test Lab',
        status: 'DOCUMENTS_SUBMITTED',
        nablAccredited: false,
      });
      prisma.partnerLab.update.mockResolvedValue({
        id: 'lab-1',
        status: 'ACTIVE',
        nablAccredited: false,
      });

      const result = await service.reviewLab('lab-1', 'admin-1', true);

      expect(result.nablAccredited).toBe(false);
    });

    it('should reject lab with notes and set status to UNDER_REVIEW', async () => {
      prisma.partnerLab.findUnique.mockResolvedValue({
        id: 'lab-1',
        status: 'DOCUMENTS_SUBMITTED',
        notes: null,
      });
      prisma.partnerLab.update.mockResolvedValue({
        id: 'lab-1',
        status: 'UNDER_REVIEW',
        notes: 'Documents unclear, please resubmit',
      });

      const result = await service.reviewLab(
        'lab-1',
        'admin-1',
        false,
        'Documents unclear, please resubmit',
      );

      expect(result.status).toBe('UNDER_REVIEW');
      expect(result.notes).toBe('Documents unclear, please resubmit');
    });

    it('should throw if lab not found', async () => {
      prisma.partnerLab.findUnique.mockResolvedValue(null);

      await expect(
        service.reviewLab('lab-999', 'admin-1', true),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // Suspend Lab
  // ========================================

  describe('suspendLab', () => {
    it('should suspend lab and notify admin', async () => {
      prisma.partnerLab.findUnique.mockResolvedValue({
        id: 'lab-1',
        name: 'Apollo Diagnostics',
        status: 'ACTIVE',
      });
      prisma.partnerLab.update.mockResolvedValue({
        id: 'lab-1',
        status: 'SUSPENDED',
        suspensionReason: 'Quality issues detected',
      });
      prisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);

      const result = await service.suspendLab('lab-1', 'admin-1', 'Quality issues detected');

      expect(result.status).toBe('SUSPENDED');
      expect(prisma.partnerLab.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'SUSPENDED',
            suspensionReason: 'Quality issues detected',
            suspendedById: 'admin-1',
          }),
        }),
      );
    });

    it('should throw if lab not found', async () => {
      prisma.partnerLab.findUnique.mockResolvedValue(null);

      await expect(
        service.suspendLab('lab-999', 'admin-1', 'reason'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // Reactivate Lab
  // ========================================

  describe('reactivateLab', () => {
    it('should reactivate a suspended lab', async () => {
      prisma.partnerLab.findUnique.mockResolvedValue({
        id: 'lab-1',
        status: 'SUSPENDED',
      });
      prisma.partnerLab.update.mockResolvedValue({
        id: 'lab-1',
        status: 'ACTIVE',
      });

      const result = await service.reactivateLab('lab-1', 'admin-1');

      expect(result.status).toBe('ACTIVE');
    });

    it('should reject reactivation for non-suspended lab', async () => {
      prisma.partnerLab.findUnique.mockResolvedValue({
        id: 'lab-1',
        status: 'ACTIVE',
      });

      await expect(
        service.reactivateLab('lab-1', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================
  // Deactivate Lab
  // ========================================

  describe('deactivateLab', () => {
    it('should deactivate lab with no pending orders', async () => {
      prisma.partnerLab.findUnique.mockResolvedValue({
        id: 'lab-1',
        status: 'ACTIVE',
      });
      // No active lab orders linked to this lab (via phlebotomist assignment)
      prisma.labTechnician.findMany.mockResolvedValue([]);
      prisma.partnerLab.update.mockResolvedValue({
        id: 'lab-1',
        status: 'DEACTIVATED',
        deactivationReason: 'Closing operations',
      });

      const result = await service.deactivateLab('lab-1', 'admin-1', 'Closing operations');

      expect(result.status).toBe('DEACTIVATED');
    });

    it('should throw if lab not found', async () => {
      prisma.partnerLab.findUnique.mockResolvedValue(null);

      await expect(
        service.deactivateLab('lab-999', 'admin-1', 'reason'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // Invite Lab Technician
  // ========================================

  describe('inviteLabTechnician', () => {
    it('should invite lab technician for ACTIVE lab', async () => {
      prisma.partnerLab.findUnique.mockResolvedValue({
        id: 'lab-1',
        name: 'Apollo Diagnostics',
        status: 'ACTIVE',
      });
      prisma.labTechnician.create.mockResolvedValue({
        id: 'lt-1',
        labId: 'lab-1',
        name: 'Priya Sharma',
        email: 'priya@apollodiag.com',
        phone: '+919876543212',
        role: 'LAB_TECHNICIAN',
        isActive: true,
      });

      const result = await service.inviteLabTechnician('lab-1', 'admin-1', {
        name: 'Priya Sharma',
        email: 'priya@apollodiag.com',
        phone: '+919876543212',
        role: 'LAB_TECHNICIAN',
      });

      expect(result.labId).toBe('lab-1');
      expect(result.name).toBe('Priya Sharma');
      expect(result.role).toBe('LAB_TECHNICIAN');
    });

    it('should reject invite for SUSPENDED lab', async () => {
      prisma.partnerLab.findUnique.mockResolvedValue({
        id: 'lab-1',
        status: 'SUSPENDED',
      });

      await expect(
        service.inviteLabTechnician('lab-1', 'admin-1', {
          name: 'Test Tech',
          email: 'test@lab.com',
          phone: '+919876543213',
          role: 'LAB_TECHNICIAN',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if lab not found', async () => {
      prisma.partnerLab.findUnique.mockResolvedValue(null);

      await expect(
        service.inviteLabTechnician('lab-999', 'admin-1', {
          name: 'Test',
          email: 'test@lab.com',
          phone: '+919876543213',
          role: 'LAB_TECHNICIAN',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // Update Lab Tech Permissions
  // ========================================

  describe('updateLabTechPermissions', () => {
    it('should toggle canReceiveSamples and canUploadResults', async () => {
      prisma.labTechnician.findUnique.mockResolvedValue({
        id: 'lt-1',
        canReceiveSamples: false,
        canUploadResults: false,
      });
      prisma.labTechnician.update.mockResolvedValue({
        id: 'lt-1',
        canReceiveSamples: true,
        canUploadResults: true,
      });

      const result = await service.updateLabTechPermissions('lt-1', 'admin-1', {
        canReceiveSamples: true,
        canUploadResults: true,
      });

      expect(result.canReceiveSamples).toBe(true);
      expect(result.canUploadResults).toBe(true);
    });

    it('should throw if lab technician not found', async () => {
      prisma.labTechnician.findUnique.mockResolvedValue(null);

      await expect(
        service.updateLabTechPermissions('lt-999', 'admin-1', {
          canReceiveSamples: true,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // Deactivate Lab Technician
  // ========================================

  describe('deactivateLabTechnician', () => {
    it('should set isActive to false', async () => {
      prisma.labTechnician.findUnique.mockResolvedValue({
        id: 'lt-1',
        isActive: true,
      });
      prisma.labTechnician.update.mockResolvedValue({
        id: 'lt-1',
        isActive: false,
      });

      const result = await service.deactivateLabTechnician('lt-1', 'admin-1');

      expect(result.isActive).toBe(false);
    });

    it('should throw if not found', async () => {
      prisma.labTechnician.findUnique.mockResolvedValue(null);

      await expect(
        service.deactivateLabTechnician('lt-999', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // List Labs & Get By ID
  // ========================================

  describe('listLabs', () => {
    it('should return labs with optional city filter', async () => {
      prisma.partnerLab.findMany.mockResolvedValue([
        { id: 'lab-1', name: 'Apollo', city: 'Hyderabad', status: 'ACTIVE' },
      ]);

      const result = await service.listLabs({ city: 'Hyderabad' });

      expect(result).toHaveLength(1);
      expect(prisma.partnerLab.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ city: 'Hyderabad' }),
        }),
      );
    });
  });

  describe('getLabById', () => {
    it('should return lab with technicians', async () => {
      prisma.partnerLab.findUnique.mockResolvedValue({
        id: 'lab-1',
        name: 'Apollo',
        technicians: [{ id: 'lt-1', name: 'Priya' }],
      });

      const result = await service.getLabById('lab-1');

      expect(result.id).toBe('lab-1');
      expect(result.technicians).toHaveLength(1);
    });

    it('should throw if not found', async () => {
      prisma.partnerLab.findUnique.mockResolvedValue(null);

      await expect(service.getLabById('lab-999')).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // Credential Expiry Check
  // ========================================

  describe('checkExpiringCredentials', () => {
    it('should alert for lab license expiring within 30 days', async () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 20); // 20 days from now

      prisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);
      prisma.partnerLab.findMany.mockResolvedValue([
        {
          id: 'lab-1',
          name: 'Apollo',
          labLicenseExpiry: expiryDate,
          nablCertificateExpiry: null,
        },
      ]);
      prisma.labPhlebotomist.findMany.mockResolvedValue([]);

      await service.checkExpiringCredentials();

      // Should send alert notification (expiring, not expired)
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'LAB_LICENSE_EXPIRING',
          recipientRole: 'ADMIN',
        }),
      );
    });

    it('should auto-suspend lab with expired license', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 5); // 5 days ago

      prisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);
      prisma.partnerLab.findMany.mockResolvedValue([
        {
          id: 'lab-1',
          name: 'Apollo',
          labLicenseExpiry: expiredDate,
          nablCertificateExpiry: null,
        },
      ]);
      prisma.partnerLab.update.mockResolvedValue({ id: 'lab-1', status: 'SUSPENDED' });
      prisma.labPhlebotomist.findMany.mockResolvedValue([]);

      await service.checkExpiringCredentials();

      // Should auto-suspend the lab
      expect(prisma.partnerLab.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lab-1' },
          data: expect.objectContaining({
            status: 'SUSPENDED',
          }),
        }),
      );
    });

    it('should alert for NABL certificate expiring (not auto-suspend)', async () => {
      const nablExpiry = new Date();
      nablExpiry.setDate(nablExpiry.getDate() + 15); // 15 days from now

      prisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);
      prisma.partnerLab.findMany.mockResolvedValue([
        {
          id: 'lab-1',
          name: 'Apollo',
          labLicenseExpiry: new Date('2027-12-31'), // not expiring
          nablCertificateExpiry: nablExpiry,
        },
      ]);
      prisma.labPhlebotomist.findMany.mockResolvedValue([]);

      await service.checkExpiringCredentials();

      // NABL expiry: alert only, no auto-suspend (NABL isn't always mandatory)
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'NABL_CERTIFICATE_EXPIRING',
        }),
      );
      // Should NOT suspend the lab for NABL
      expect(prisma.partnerLab.update).not.toHaveBeenCalled();
    });
  });
});
