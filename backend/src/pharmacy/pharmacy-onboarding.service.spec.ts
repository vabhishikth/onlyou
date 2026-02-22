import { Test, TestingModule } from '@nestjs/testing';
import { PharmacyOnboardingService } from './pharmacy-onboarding.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

// Spec: Phase 15 — Pharmacy Onboarding + Management

describe('PharmacyOnboardingService', () => {
  let service: PharmacyOnboardingService;
  let prisma: any;
  let notificationService: any;

  const adminId = 'admin-1';

  const validPharmacyInput = {
    name: 'MedPlus Pharmacy',
    city: 'Visakhapatnam',
    address: '47-10-18, Dwaraka Nagar, Visakhapatnam',
    pincode: '530016',
    contactPhone: '+919876543210',
    contactEmail: 'medplus@example.com',
    drugLicenseNumber: 'AP/21B/2024/001234',
    drugLicenseExpiry: new Date('2026-12-31'),
    gstNumber: '37AABCT1234F1ZH',
    pharmacyRegistrationNumber: 'AP/PH/2024/5678',
    ownerName: 'Rajesh Patel',
    ownerPhone: '+919876543211',
    ownerEmail: 'rajesh@example.com',
    hasColdChainCapability: false,
    servicesAvailable: ['standard'],
    dailyOrderLimit: 50,
    operatingHoursStart: '09:00',
    operatingHoursEnd: '21:00',
  };

  const mockPharmacy = {
    id: 'pharm-1',
    ...validPharmacyInput,
    status: 'PENDING_VERIFICATION',
    coldChainVerified: false,
    coldChainVerifiedAt: null,
    coldChainVerifiedBy: null,
    currentQueueSize: 0,
    agreementSignedAt: null,
    agreementDocumentUrl: null,
    drugLicenseDocumentUrl: null,
    gstDocumentUrl: null,
    onboardedById: adminId,
    activatedById: null,
    activatedAt: null,
    suspensionReason: null,
    suspendedById: null,
    suspendedAt: null,
    deactivationReason: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const validStaffInput = {
    name: 'Suresh Kumar',
    phone: '+919876543212',
    email: 'suresh@example.com',
    role: 'PHARMACIST' as const,
    pharmacistRegistrationNumber: 'AP/RPH/2024/1234',
    pharmacistRegistrationExpiry: new Date('2027-06-30'),
  };

  const mockPharmacyStaff = {
    id: 'staff-1',
    pharmacyId: 'pharm-1',
    userId: 'user-staff-1',
    name: validStaffInput.name,
    phone: validStaffInput.phone,
    email: validStaffInput.email,
    role: 'PHARMACIST',
    pharmacistRegistrationNumber: 'AP/RPH/2024/1234',
    pharmacistRegistrationExpiry: new Date('2027-06-30'),
    pharmacistRegistrationDocumentUrl: null,
    isActive: true,
    canAcceptOrders: false,
    canDispense: false,
    canManageInventory: false,
    lastLoginAt: null,
    invitedById: adminId,
    invitedAt: new Date(),
    activatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PharmacyOnboardingService,
        {
          provide: PrismaService,
          useValue: {
            pharmacy: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
            pharmacyStaff: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
            pharmacyOrder: {
              count: jest.fn(),
            },
            user: {
              findFirst: jest.fn(),
              create: jest.fn(),
              findMany: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            sendNotification: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<PharmacyOnboardingService>(PharmacyOnboardingService);
    prisma = module.get(PrismaService);
    notificationService = module.get(NotificationService);
  });

  // ========================================
  // registerPharmacy
  // ========================================

  describe('registerPharmacy', () => {
    it('should register a pharmacy with valid data', async () => {
      prisma.pharmacy.findFirst.mockResolvedValue(null); // no duplicate
      prisma.pharmacy.create.mockResolvedValue(mockPharmacy);

      const result = await service.registerPharmacy(adminId, validPharmacyInput);

      expect(result).toEqual(mockPharmacy);
      expect(result.status).toBe('PENDING_VERIFICATION');
      expect(result.onboardedById).toBe(adminId);
    });

    it('should reject registration with missing required fields', async () => {
      await expect(
        service.registerPharmacy(adminId, { ...validPharmacyInput, name: '' }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.registerPharmacy(adminId, { ...validPharmacyInput, drugLicenseNumber: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate drug license number', async () => {
      prisma.pharmacy.findFirst.mockResolvedValue({ id: 'existing', drugLicenseNumber: validPharmacyInput.drugLicenseNumber });

      await expect(
        service.registerPharmacy(adminId, validPharmacyInput),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid phone format', async () => {
      prisma.pharmacy.findFirst.mockResolvedValue(null);

      await expect(
        service.registerPharmacy(adminId, { ...validPharmacyInput, contactPhone: '12345' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================
  // uploadPharmacyDocuments
  // ========================================

  describe('uploadPharmacyDocuments', () => {
    it('should update document URLs and set status to DOCUMENTS_SUBMITTED', async () => {
      prisma.pharmacy.findUnique.mockResolvedValue(mockPharmacy);
      prisma.pharmacy.update.mockResolvedValue({
        ...mockPharmacy,
        status: 'DOCUMENTS_SUBMITTED',
        drugLicenseDocumentUrl: 'https://s3.example.com/license.pdf',
      });

      const result = await service.uploadPharmacyDocuments('pharm-1', adminId, {
        drugLicenseDocumentUrl: 'https://s3.example.com/license.pdf',
      });

      expect(result.status).toBe('DOCUMENTS_SUBMITTED');
      expect(result.drugLicenseDocumentUrl).toBe('https://s3.example.com/license.pdf');
    });

    it('should throw NotFoundException for non-existent pharmacy', async () => {
      prisma.pharmacy.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadPharmacyDocuments('non-existent', adminId, {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // reviewPharmacy
  // ========================================

  describe('reviewPharmacy', () => {
    it('should approve pharmacy and set status to ACTIVE', async () => {
      prisma.pharmacy.findUnique.mockResolvedValue({ ...mockPharmacy, status: 'DOCUMENTS_SUBMITTED' });
      prisma.pharmacy.update.mockResolvedValue({
        ...mockPharmacy,
        status: 'ACTIVE',
        activatedById: adminId,
        activatedAt: expect.any(Date),
      });

      const result = await service.reviewPharmacy('pharm-1', adminId, true, 'All documents verified');

      expect(prisma.pharmacy.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ACTIVE',
            activatedById: adminId,
          }),
        }),
      );
    });

    it('should reject with notes and set status to UNDER_REVIEW', async () => {
      prisma.pharmacy.findUnique.mockResolvedValue({ ...mockPharmacy, status: 'DOCUMENTS_SUBMITTED' });
      prisma.pharmacy.update.mockResolvedValue({
        ...mockPharmacy,
        status: 'UNDER_REVIEW',
        notes: 'Drug license scan is blurry',
      });

      const result = await service.reviewPharmacy('pharm-1', adminId, false, 'Drug license scan is blurry');

      expect(prisma.pharmacy.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'UNDER_REVIEW',
            notes: 'Drug license scan is blurry',
          }),
        }),
      );
    });

    it('should keep coldChainVerified false even if pharmacy claims cold chain', async () => {
      const pharmacyWithColdChain = {
        ...mockPharmacy,
        status: 'DOCUMENTS_SUBMITTED',
        hasColdChainCapability: true,
      };
      prisma.pharmacy.findUnique.mockResolvedValue(pharmacyWithColdChain);
      prisma.pharmacy.update.mockResolvedValue({
        ...pharmacyWithColdChain,
        status: 'ACTIVE',
        coldChainVerified: false,
      });

      const result = await service.reviewPharmacy('pharm-1', adminId, true);

      // coldChainVerified stays false — admin must explicitly verify separately
      expect(prisma.pharmacy.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            coldChainVerified: true,
          }),
        }),
      );
    });
  });

  // ========================================
  // suspendPharmacy
  // ========================================

  describe('suspendPharmacy', () => {
    it('should suspend an active pharmacy', async () => {
      prisma.pharmacy.findUnique.mockResolvedValue({ ...mockPharmacy, status: 'ACTIVE' });
      prisma.pharmacy.update.mockResolvedValue({
        ...mockPharmacy,
        status: 'SUSPENDED',
        suspensionReason: 'Quality issues',
        suspendedById: adminId,
        suspendedAt: expect.any(Date),
      });

      const result = await service.suspendPharmacy('pharm-1', adminId, 'Quality issues');

      expect(prisma.pharmacy.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'SUSPENDED',
            suspensionReason: 'Quality issues',
            suspendedById: adminId,
          }),
        }),
      );
    });

    it('should throw NotFoundException for non-existent pharmacy', async () => {
      prisma.pharmacy.findUnique.mockResolvedValue(null);

      await expect(
        service.suspendPharmacy('non-existent', adminId, 'reason'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // reactivatePharmacy
  // ========================================

  describe('reactivatePharmacy', () => {
    it('should reactivate a suspended pharmacy', async () => {
      prisma.pharmacy.findUnique.mockResolvedValue({ ...mockPharmacy, status: 'SUSPENDED' });
      prisma.pharmacy.update.mockResolvedValue({
        ...mockPharmacy,
        status: 'ACTIVE',
        suspensionReason: null,
        suspendedById: null,
        suspendedAt: null,
      });

      const result = await service.reactivatePharmacy('pharm-1', adminId);

      expect(prisma.pharmacy.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('should throw if pharmacy is not suspended', async () => {
      prisma.pharmacy.findUnique.mockResolvedValue({ ...mockPharmacy, status: 'ACTIVE' });

      await expect(
        service.reactivatePharmacy('pharm-1', adminId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================
  // deactivatePharmacy
  // ========================================

  describe('deactivatePharmacy', () => {
    it('should deactivate pharmacy with no active orders', async () => {
      prisma.pharmacy.findUnique.mockResolvedValue({ ...mockPharmacy, status: 'ACTIVE' });
      prisma.pharmacyOrder.count.mockResolvedValue(0);
      prisma.pharmacy.update.mockResolvedValue({
        ...mockPharmacy,
        status: 'DEACTIVATED',
        deactivationReason: 'Partnership ended',
      });

      const result = await service.deactivatePharmacy('pharm-1', adminId, 'Partnership ended');

      expect(prisma.pharmacy.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'DEACTIVATED',
            deactivationReason: 'Partnership ended',
          }),
        }),
      );
    });

    it('should block deactivation if active orders exist', async () => {
      prisma.pharmacy.findUnique.mockResolvedValue({ ...mockPharmacy, status: 'ACTIVE' });
      prisma.pharmacyOrder.count.mockResolvedValue(3);

      await expect(
        service.deactivatePharmacy('pharm-1', adminId, 'Partnership ended'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================
  // invitePharmacyStaff
  // ========================================

  describe('invitePharmacyStaff', () => {
    it('should invite staff to an active pharmacy', async () => {
      prisma.pharmacy.findUnique.mockResolvedValue({ ...mockPharmacy, status: 'ACTIVE' });
      prisma.user.findFirst.mockResolvedValue(null); // no duplicate phone
      prisma.$transaction.mockResolvedValue(mockPharmacyStaff);

      const result = await service.invitePharmacyStaff('pharm-1', adminId, validStaffInput);

      expect(result).toEqual(mockPharmacyStaff);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should reject staff invite for non-ACTIVE pharmacy', async () => {
      prisma.pharmacy.findUnique.mockResolvedValue({ ...mockPharmacy, status: 'PENDING_VERIFICATION' });

      await expect(
        service.invitePharmacyStaff('pharm-1', adminId, validStaffInput),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject PHARMACIST invite without registration number', async () => {
      prisma.pharmacy.findUnique.mockResolvedValue({ ...mockPharmacy, status: 'ACTIVE' });

      await expect(
        service.invitePharmacyStaff('pharm-1', adminId, {
          ...validStaffInput,
          role: 'PHARMACIST',
          pharmacistRegistrationNumber: undefined as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow DISPENSER invite without registration number', async () => {
      prisma.pharmacy.findUnique.mockResolvedValue({ ...mockPharmacy, status: 'ACTIVE' });
      prisma.user.findFirst.mockResolvedValue(null);
      const dispenserStaff = { ...mockPharmacyStaff, role: 'DISPENSER', pharmacistRegistrationNumber: null };
      prisma.$transaction.mockResolvedValue(dispenserStaff);

      const result = await service.invitePharmacyStaff('pharm-1', adminId, {
        ...validStaffInput,
        role: 'DISPENSER' as const,
        pharmacistRegistrationNumber: undefined as any,
        pharmacistRegistrationExpiry: undefined as any,
      });

      expect(result.role).toBe('DISPENSER');
    });

    it('should reject staff invite if phone already exists', async () => {
      prisma.pharmacy.findUnique.mockResolvedValue({ ...mockPharmacy, status: 'ACTIVE' });
      prisma.user.findFirst.mockResolvedValue({ id: 'existing', phone: validStaffInput.phone });

      await expect(
        service.invitePharmacyStaff('pharm-1', adminId, validStaffInput),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================
  // updatePharmacyStaffPermissions
  // ========================================

  describe('updatePharmacyStaffPermissions', () => {
    it('should update staff permissions', async () => {
      prisma.pharmacyStaff.findUnique.mockResolvedValue(mockPharmacyStaff);
      prisma.pharmacyStaff.update.mockResolvedValue({
        ...mockPharmacyStaff,
        canAcceptOrders: true,
        canDispense: true,
      });

      const result = await service.updatePharmacyStaffPermissions('staff-1', adminId, {
        canAcceptOrders: true,
        canDispense: true,
      });

      expect(result.canAcceptOrders).toBe(true);
    });

    it('should reject canAcceptOrders for non-PHARMACIST role', async () => {
      prisma.pharmacyStaff.findUnique.mockResolvedValue({
        ...mockPharmacyStaff,
        role: 'DISPENSER',
      });

      await expect(
        service.updatePharmacyStaffPermissions('staff-1', adminId, {
          canAcceptOrders: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent staff', async () => {
      prisma.pharmacyStaff.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePharmacyStaffPermissions('non-existent', adminId, {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // deactivatePharmacyStaff
  // ========================================

  describe('deactivatePharmacyStaff', () => {
    it('should deactivate staff member', async () => {
      prisma.pharmacyStaff.findUnique.mockResolvedValue(mockPharmacyStaff);
      prisma.pharmacyStaff.update.mockResolvedValue({ ...mockPharmacyStaff, isActive: false });

      const result = await service.deactivatePharmacyStaff('staff-1', adminId);

      expect(prisma.pharmacyStaff.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: false }),
        }),
      );
    });

    it('should throw NotFoundException for non-existent staff', async () => {
      prisma.pharmacyStaff.findUnique.mockResolvedValue(null);

      await expect(
        service.deactivatePharmacyStaff('non-existent', adminId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // checkExpiringCredentials
  // ========================================

  describe('checkExpiringCredentials', () => {
    it('should send alert for pharmacy with license expiring in 20 days', async () => {
      const expiringDate = new Date();
      expiringDate.setDate(expiringDate.getDate() + 20);

      prisma.pharmacy.findMany.mockResolvedValue([
        { ...mockPharmacy, status: 'ACTIVE', drugLicenseExpiry: expiringDate },
      ]);
      prisma.pharmacyStaff.findMany.mockResolvedValue([]); // no expiring staff
      prisma.user.findMany.mockResolvedValue([{ id: adminId, role: UserRole.ADMIN }]);

      await service.checkExpiringCredentials();

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PHARMACY_LICENSE_EXPIRING',
        }),
      );
    });

    it('should auto-suspend pharmacy with expired license', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 5);

      prisma.pharmacy.findMany.mockResolvedValue([
        { ...mockPharmacy, id: 'pharm-expired', status: 'ACTIVE', drugLicenseExpiry: expiredDate },
      ]);
      prisma.pharmacyStaff.findMany.mockResolvedValue([]);
      prisma.pharmacy.update.mockResolvedValue({});
      prisma.user.findMany.mockResolvedValue([{ id: adminId, role: UserRole.ADMIN }]);

      await service.checkExpiringCredentials();

      expect(prisma.pharmacy.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pharm-expired' },
          data: expect.objectContaining({
            status: 'SUSPENDED',
            suspensionReason: expect.stringContaining('expired'),
          }),
        }),
      );
    });

    it('should deactivate staff with expired pharmacist registration', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 5);

      prisma.pharmacy.findMany.mockResolvedValue([]); // no expiring pharmacies
      prisma.pharmacyStaff.findMany.mockResolvedValue([
        { ...mockPharmacyStaff, pharmacistRegistrationExpiry: expiredDate },
      ]);
      prisma.pharmacyStaff.update.mockResolvedValue({});
      prisma.user.findMany.mockResolvedValue([{ id: adminId, role: UserRole.ADMIN }]);

      await service.checkExpiringCredentials();

      expect(prisma.pharmacyStaff.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: false }),
        }),
      );
    });
  });

  // ========================================
  // listPharmacies
  // ========================================

  describe('listPharmacies', () => {
    it('should list pharmacies with filters', async () => {
      prisma.pharmacy.findMany.mockResolvedValue([mockPharmacy]);

      const result = await service.listPharmacies({ city: 'Visakhapatnam', status: 'ACTIVE' });

      expect(prisma.pharmacy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            city: 'Visakhapatnam',
            status: 'ACTIVE',
          }),
        }),
      );
      expect(result).toHaveLength(1);
    });

    it('should list all pharmacies without filters', async () => {
      prisma.pharmacy.findMany.mockResolvedValue([mockPharmacy]);

      const result = await service.listPharmacies();

      expect(result).toHaveLength(1);
    });
  });

  // ========================================
  // getPharmacyById
  // ========================================

  describe('getPharmacyById', () => {
    it('should return pharmacy with staff', async () => {
      prisma.pharmacy.findUnique.mockResolvedValue({
        ...mockPharmacy,
        staff: [mockPharmacyStaff],
      });

      const result = await service.getPharmacyById('pharm-1');

      expect(result.id).toBe('pharm-1');
      expect(prisma.pharmacy.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({ staff: true }),
        }),
      );
    });

    it('should throw NotFoundException for non-existent pharmacy', async () => {
      prisma.pharmacy.findUnique.mockResolvedValue(null);

      await expect(service.getPharmacyById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
