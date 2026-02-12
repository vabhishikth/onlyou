import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PartnerService } from './partner.service';
import { PrismaService } from '../prisma/prisma.service';

// Spec: master spec Section 7.5, Section 13 (Partner Management)

describe('PartnerService', () => {
  let service: PartnerService;
  let mockPrismaService: any;

  const mockDiagnosticCentre = {
    id: 'lab-1',
    name: 'Test Diagnostic Centre',
    address: '123 Lab Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    phone: '+919999999999',
    email: 'lab@test.com',
    contactPerson: 'John Doe',
    portalLoginPhone: '+919999999999',
    testsOffered: ['TSH', 'CBC', 'Ferritin'],
    testPricing: { TSH: 30000, CBC: 25000 },
    panelPricing: { 'Hair Loss Basic': 99900 },
    avgTurnaroundHours: 48,
    rating: 4.5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPhlebotomist = {
    id: 'phleb-1',
    name: 'Jane Smith',
    phone: '+919888888888',
    email: 'jane@test.com',
    certification: 'PHL-2024-001',
    certificationDocUrl: 'https://s3.amazonaws.com/certs/jane.pdf',
    availableDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
    availableTimeStart: '08:00',
    availableTimeEnd: '18:00',
    maxDailyCollections: 10,
    currentCity: 'Mumbai',
    serviceableAreas: ['400001', '400002', '400003'],
    completedCollections: 50,
    failedCollections: 2,
    rating: 4.8,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPharmacy = {
    id: 'pharm-1',
    name: 'HealthFirst Pharmacy',
    address: '456 Pharmacy Lane',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400002',
    phone: '+919777777777',
    email: 'pharmacy@test.com',
    contactPerson: 'Bob Wilson',
    portalLoginPhone: '+919777777777',
    drugLicenseNumber: 'MH-DRUG-2024-001',
    gstNumber: 'GSTIN1234567890',
    serviceableAreas: ['400001', '400002', '400003', '400004'],
    avgPreparationMinutes: 30,
    rating: 4.7,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockPrismaService = {
      partnerDiagnosticCentre: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      phlebotomist: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      partnerPharmacy: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnerService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PartnerService>(PartnerService);
  });

  describe('Service Setup', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ============================================
  // DIAGNOSTIC CENTRE CRUD
  // Spec: Section 7.5 — PartnerDiagnosticCentre
  // ============================================
  describe('Diagnostic Centre CRUD', () => {
    describe('createDiagnosticCentre', () => {
      it('should create a new diagnostic centre', async () => {
        mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValue(null);
        mockPrismaService.partnerDiagnosticCentre.create.mockResolvedValue(mockDiagnosticCentre);

        const result = await service.createDiagnosticCentre({
          name: 'Test Diagnostic Centre',
          address: '123 Lab Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          phone: '+919999999999',
          testsOffered: ['TSH', 'CBC', 'Ferritin'],
        });

        expect(result.id).toBeDefined();
        expect(result.name).toBe('Test Diagnostic Centre');
        expect(mockPrismaService.partnerDiagnosticCentre.create).toHaveBeenCalled();
      });

      it('should throw error if portal phone already exists', async () => {
        mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValue(mockDiagnosticCentre);

        await expect(
          service.createDiagnosticCentre({
            name: 'Another Lab',
            address: '789 New Street',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
            phone: '+919999999999',
            portalLoginPhone: '+919999999999',
            testsOffered: ['TSH'],
          })
        ).rejects.toThrow(ConflictException);
      });
    });

    describe('getDiagnosticCentre', () => {
      it('should return diagnostic centre by id', async () => {
        mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValue(mockDiagnosticCentre);

        const result = await service.getDiagnosticCentre('lab-1');

        expect(result.id).toBe('lab-1');
        expect(result.name).toBe('Test Diagnostic Centre');
      });

      it('should throw error if not found', async () => {
        mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValue(null);

        await expect(service.getDiagnosticCentre('non-existent')).rejects.toThrow(
          NotFoundException
        );
      });
    });

    describe('listDiagnosticCentres', () => {
      it('should return all diagnostic centres', async () => {
        mockPrismaService.partnerDiagnosticCentre.findMany.mockResolvedValue([
          mockDiagnosticCentre,
        ]);

        const result = await service.listDiagnosticCentres({});

        expect(result).toHaveLength(1);
      });

      it('should filter by city', async () => {
        mockPrismaService.partnerDiagnosticCentre.findMany.mockResolvedValue([]);

        await service.listDiagnosticCentres({ city: 'Mumbai' });

        expect(mockPrismaService.partnerDiagnosticCentre.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ city: 'Mumbai' }),
          })
        );
      });

      it('should filter by isActive', async () => {
        mockPrismaService.partnerDiagnosticCentre.findMany.mockResolvedValue([]);

        await service.listDiagnosticCentres({ isActive: true });

        expect(mockPrismaService.partnerDiagnosticCentre.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ isActive: true }),
          })
        );
      });
    });

    describe('updateDiagnosticCentre', () => {
      it('should update diagnostic centre', async () => {
        mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValue(mockDiagnosticCentre);
        mockPrismaService.partnerDiagnosticCentre.update.mockResolvedValue({
          ...mockDiagnosticCentre,
          name: 'Updated Lab Name',
        });

        const result = await service.updateDiagnosticCentre('lab-1', {
          name: 'Updated Lab Name',
        });

        expect(result.name).toBe('Updated Lab Name');
      });

      it('should throw error if not found', async () => {
        mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValue(null);

        await expect(
          service.updateDiagnosticCentre('non-existent', { name: 'New Name' })
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('deactivateDiagnosticCentre', () => {
      it('should deactivate diagnostic centre', async () => {
        mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValue(mockDiagnosticCentre);
        mockPrismaService.partnerDiagnosticCentre.update.mockResolvedValue({
          ...mockDiagnosticCentre,
          isActive: false,
        });

        const result = await service.deactivateDiagnosticCentre('lab-1');

        expect(result.isActive).toBe(false);
        expect(mockPrismaService.partnerDiagnosticCentre.update).toHaveBeenCalledWith({
          where: { id: 'lab-1' },
          data: { isActive: false },
        });
      });
    });

    describe('activateDiagnosticCentre', () => {
      it('should activate diagnostic centre', async () => {
        const inactiveLab = { ...mockDiagnosticCentre, isActive: false };
        mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValue(inactiveLab);
        mockPrismaService.partnerDiagnosticCentre.update.mockResolvedValue({
          ...inactiveLab,
          isActive: true,
        });

        const result = await service.activateDiagnosticCentre('lab-1');

        expect(result.isActive).toBe(true);
      });
    });
  });

  // ============================================
  // PHLEBOTOMIST CRUD
  // Spec: Section 7.5 — Phlebotomist
  // ============================================
  describe('Phlebotomist CRUD', () => {
    describe('createPhlebotomist', () => {
      it('should create a new phlebotomist', async () => {
        mockPrismaService.phlebotomist.findUnique.mockResolvedValue(null);
        mockPrismaService.phlebotomist.create.mockResolvedValue(mockPhlebotomist);

        const result = await service.createPhlebotomist({
          name: 'Jane Smith',
          phone: '+919888888888',
          currentCity: 'Mumbai',
          serviceableAreas: ['400001', '400002', '400003'],
        });

        expect(result.id).toBeDefined();
        expect(result.name).toBe('Jane Smith');
      });

      it('should throw error if phone already exists', async () => {
        mockPrismaService.phlebotomist.findUnique.mockResolvedValue(mockPhlebotomist);

        await expect(
          service.createPhlebotomist({
            name: 'Another Person',
            phone: '+919888888888',
            currentCity: 'Mumbai',
            serviceableAreas: ['400001'],
          })
        ).rejects.toThrow(ConflictException);
      });
    });

    describe('getPhlebotomist', () => {
      it('should return phlebotomist by id', async () => {
        mockPrismaService.phlebotomist.findUnique.mockResolvedValue(mockPhlebotomist);

        const result = await service.getPhlebotomist('phleb-1');

        expect(result.id).toBe('phleb-1');
        expect(result.name).toBe('Jane Smith');
      });

      it('should throw error if not found', async () => {
        mockPrismaService.phlebotomist.findUnique.mockResolvedValue(null);

        await expect(service.getPhlebotomist('non-existent')).rejects.toThrow(
          NotFoundException
        );
      });
    });

    describe('listPhlebotomists', () => {
      it('should return all phlebotomists', async () => {
        mockPrismaService.phlebotomist.findMany.mockResolvedValue([mockPhlebotomist]);

        const result = await service.listPhlebotomists({});

        expect(result).toHaveLength(1);
      });

      it('should filter by city', async () => {
        mockPrismaService.phlebotomist.findMany.mockResolvedValue([]);

        await service.listPhlebotomists({ city: 'Mumbai' });

        expect(mockPrismaService.phlebotomist.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ currentCity: 'Mumbai' }),
          })
        );
      });

      it('should filter by serviceable area (pincode)', async () => {
        mockPrismaService.phlebotomist.findMany.mockResolvedValue([]);

        await service.listPhlebotomists({ pincode: '400001' });

        expect(mockPrismaService.phlebotomist.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              serviceableAreas: { has: '400001' },
            }),
          })
        );
      });

      it('should filter by availability day', async () => {
        mockPrismaService.phlebotomist.findMany.mockResolvedValue([]);

        await service.listPhlebotomists({ day: 'MONDAY' });

        expect(mockPrismaService.phlebotomist.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              availableDays: { has: 'MONDAY' },
            }),
          })
        );
      });
    });

    describe('updatePhlebotomist', () => {
      it('should update phlebotomist', async () => {
        mockPrismaService.phlebotomist.findUnique.mockResolvedValue(mockPhlebotomist);
        mockPrismaService.phlebotomist.update.mockResolvedValue({
          ...mockPhlebotomist,
          serviceableAreas: ['400001', '400002', '400003', '400004'],
        });

        const result = await service.updatePhlebotomist('phleb-1', {
          serviceableAreas: ['400001', '400002', '400003', '400004'],
        });

        expect(result.serviceableAreas).toContain('400004');
      });
    });

    describe('updatePhlebotomistStats', () => {
      it('should update completion stats', async () => {
        mockPrismaService.phlebotomist.findUnique.mockResolvedValue(mockPhlebotomist);
        mockPrismaService.phlebotomist.update.mockResolvedValue({
          ...mockPhlebotomist,
          completedCollections: 51,
        });

        const result = await service.updatePhlebotomistStats('phleb-1', {
          incrementCompleted: true,
        });

        expect(mockPrismaService.phlebotomist.update).toHaveBeenCalledWith({
          where: { id: 'phleb-1' },
          data: { completedCollections: { increment: 1 } },
        });
      });

      it('should update failure stats', async () => {
        mockPrismaService.phlebotomist.findUnique.mockResolvedValue(mockPhlebotomist);
        mockPrismaService.phlebotomist.update.mockResolvedValue({
          ...mockPhlebotomist,
          failedCollections: 3,
        });

        const result = await service.updatePhlebotomistStats('phleb-1', {
          incrementFailed: true,
        });

        expect(mockPrismaService.phlebotomist.update).toHaveBeenCalledWith({
          where: { id: 'phleb-1' },
          data: { failedCollections: { increment: 1 } },
        });
      });
    });

    describe('deactivatePhlebotomist', () => {
      it('should deactivate phlebotomist', async () => {
        mockPrismaService.phlebotomist.findUnique.mockResolvedValue(mockPhlebotomist);
        mockPrismaService.phlebotomist.update.mockResolvedValue({
          ...mockPhlebotomist,
          isActive: false,
        });

        const result = await service.deactivatePhlebotomist('phleb-1');

        expect(result.isActive).toBe(false);
      });
    });
  });

  // ============================================
  // PHARMACY CRUD
  // Spec: Section 7.5 — PartnerPharmacy (NEW)
  // ============================================
  describe('Pharmacy CRUD', () => {
    describe('createPharmacy', () => {
      it('should create a new pharmacy', async () => {
        mockPrismaService.partnerPharmacy.findUnique.mockResolvedValue(null);
        mockPrismaService.partnerPharmacy.create.mockResolvedValue(mockPharmacy);

        const result = await service.createPharmacy({
          name: 'HealthFirst Pharmacy',
          address: '456 Pharmacy Lane',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400002',
          phone: '+919777777777',
          drugLicenseNumber: 'MH-DRUG-2024-001',
          serviceableAreas: ['400001', '400002', '400003', '400004'],
        });

        expect(result.id).toBeDefined();
        expect(result.name).toBe('HealthFirst Pharmacy');
      });

      it('should throw error if drug license already exists', async () => {
        mockPrismaService.partnerPharmacy.findUnique.mockResolvedValue(mockPharmacy);

        await expect(
          service.createPharmacy({
            name: 'Another Pharmacy',
            address: '789 New Lane',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400003',
            phone: '+919666666666',
            drugLicenseNumber: 'MH-DRUG-2024-001',
            serviceableAreas: ['400003'],
          })
        ).rejects.toThrow(ConflictException);
      });
    });

    describe('getPharmacy', () => {
      it('should return pharmacy by id', async () => {
        mockPrismaService.partnerPharmacy.findUnique.mockResolvedValue(mockPharmacy);

        const result = await service.getPharmacy('pharm-1');

        expect(result.id).toBe('pharm-1');
        expect(result.name).toBe('HealthFirst Pharmacy');
      });

      it('should throw error if not found', async () => {
        mockPrismaService.partnerPharmacy.findUnique.mockResolvedValue(null);

        await expect(service.getPharmacy('non-existent')).rejects.toThrow(
          NotFoundException
        );
      });
    });

    describe('listPharmacies', () => {
      it('should return all pharmacies', async () => {
        mockPrismaService.partnerPharmacy.findMany.mockResolvedValue([mockPharmacy]);

        const result = await service.listPharmacies({});

        expect(result).toHaveLength(1);
      });

      it('should filter by city', async () => {
        mockPrismaService.partnerPharmacy.findMany.mockResolvedValue([]);

        await service.listPharmacies({ city: 'Mumbai' });

        expect(mockPrismaService.partnerPharmacy.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ city: 'Mumbai' }),
          })
        );
      });

      it('should filter by serviceable area (pincode)', async () => {
        mockPrismaService.partnerPharmacy.findMany.mockResolvedValue([]);

        await service.listPharmacies({ pincode: '400001' });

        expect(mockPrismaService.partnerPharmacy.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              serviceableAreas: { has: '400001' },
            }),
          })
        );
      });
    });

    describe('updatePharmacy', () => {
      it('should update pharmacy', async () => {
        mockPrismaService.partnerPharmacy.findUnique.mockResolvedValue(mockPharmacy);
        mockPrismaService.partnerPharmacy.update.mockResolvedValue({
          ...mockPharmacy,
          avgPreparationMinutes: 25,
        });

        const result = await service.updatePharmacy('pharm-1', {
          avgPreparationMinutes: 25,
        });

        expect(result.avgPreparationMinutes).toBe(25);
      });
    });

    describe('deactivatePharmacy', () => {
      it('should deactivate pharmacy', async () => {
        mockPrismaService.partnerPharmacy.findUnique.mockResolvedValue(mockPharmacy);
        mockPrismaService.partnerPharmacy.update.mockResolvedValue({
          ...mockPharmacy,
          isActive: false,
        });

        const result = await service.deactivatePharmacy('pharm-1');

        expect(result.isActive).toBe(false);
      });
    });
  });

  // ============================================
  // FIND NEAREST PARTNERS
  // ============================================
  describe('findNearestPartners', () => {
    it('should find diagnostic centres by pincode', async () => {
      mockPrismaService.partnerDiagnosticCentre.findMany.mockResolvedValue([
        mockDiagnosticCentre,
      ]);

      const result = await service.findNearestDiagnosticCentres('400001');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.partnerDiagnosticCentre.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });

    it('should find pharmacies by pincode', async () => {
      mockPrismaService.partnerPharmacy.findMany.mockResolvedValue([mockPharmacy]);

      const result = await service.findNearestPharmacies('400001');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.partnerPharmacy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            serviceableAreas: { has: '400001' },
          }),
        })
      );
    });

    it('should find phlebotomists by pincode', async () => {
      mockPrismaService.phlebotomist.findMany.mockResolvedValue([mockPhlebotomist]);

      const result = await service.findAvailablePhlebotomists('400001', 'MONDAY');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.phlebotomist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            serviceableAreas: { has: '400001' },
            availableDays: { has: 'MONDAY' },
          }),
        })
      );
    });
  });

  // ============================================
  // PORTAL AUTH (OTP for partners)
  // ============================================
  describe('Portal Authentication', () => {
    it('should find diagnostic centre by portal phone', async () => {
      mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValue(
        mockDiagnosticCentre
      );

      const result = await service.findDiagnosticCentreByPortalPhone('+919999999999');

      expect(result).toBeDefined();
      expect(result?.id).toBe('lab-1');
      expect(mockPrismaService.partnerDiagnosticCentre.findUnique).toHaveBeenCalledWith({
        where: { portalLoginPhone: '+919999999999' },
      });
    });

    it('should return null if portal phone not found', async () => {
      mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValue(null);

      const result = await service.findDiagnosticCentreByPortalPhone('+919111111111');

      expect(result).toBeNull();
    });

    it('should find pharmacy by portal phone', async () => {
      mockPrismaService.partnerPharmacy.findUnique.mockResolvedValue(mockPharmacy);

      const result = await service.findPharmacyByPortalPhone('+919777777777');

      expect(result).toBeDefined();
      expect(result?.id).toBe('pharm-1');
    });

    it('should find phlebotomist by phone', async () => {
      mockPrismaService.phlebotomist.findUnique.mockResolvedValue(mockPhlebotomist);

      const result = await service.findPhlebotomistByPhone('+919888888888');

      expect(result).toBeDefined();
      expect(result?.id).toBe('phleb-1');
    });
  });

  // ============================================
  // PARTNER STATS
  // ============================================
  describe('Partner Statistics', () => {
    it('should get diagnostic centre stats', async () => {
      mockPrismaService.partnerDiagnosticCentre.findMany.mockResolvedValue([
        mockDiagnosticCentre,
        { ...mockDiagnosticCentre, id: 'lab-2', isActive: false },
      ]);

      const result = await service.getDiagnosticCentreStats();

      expect(result.total).toBe(2);
      expect(result.active).toBe(1);
      expect(result.inactive).toBe(1);
    });

    it('should get phlebotomist stats', async () => {
      mockPrismaService.phlebotomist.findMany.mockResolvedValue([
        mockPhlebotomist,
        { ...mockPhlebotomist, id: 'phleb-2' },
      ]);

      const result = await service.getPhlebotomistStats();

      expect(result.total).toBe(2);
      expect(result.totalCompletedCollections).toBe(100);
    });

    it('should get pharmacy stats', async () => {
      mockPrismaService.partnerPharmacy.findMany.mockResolvedValue([mockPharmacy]);

      const result = await service.getPharmacyStats();

      expect(result.total).toBe(1);
      expect(result.active).toBe(1);
    });
  });

  // ============================================
  // PARTNER RATING
  // ============================================
  describe('Partner Rating', () => {
    it('should update diagnostic centre rating', async () => {
      mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValue(
        mockDiagnosticCentre
      );
      mockPrismaService.partnerDiagnosticCentre.update.mockResolvedValue({
        ...mockDiagnosticCentre,
        rating: 4.6,
      });

      const result = await service.updateDiagnosticCentreRating('lab-1', 4.6);

      expect(result.rating).toBe(4.6);
    });

    it('should validate rating is between 0 and 5', async () => {
      mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValue(
        mockDiagnosticCentre
      );

      await expect(
        service.updateDiagnosticCentreRating('lab-1', 6)
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.updateDiagnosticCentreRating('lab-1', -1)
      ).rejects.toThrow(BadRequestException);
    });

    it('should update phlebotomist rating', async () => {
      mockPrismaService.phlebotomist.findUnique.mockResolvedValue(mockPhlebotomist);
      mockPrismaService.phlebotomist.update.mockResolvedValue({
        ...mockPhlebotomist,
        rating: 4.9,
      });

      const result = await service.updatePhlebotomistRating('phleb-1', 4.9);

      expect(result.rating).toBe(4.9);
    });

    it('should update pharmacy rating', async () => {
      mockPrismaService.partnerPharmacy.findUnique.mockResolvedValue(mockPharmacy);
      mockPrismaService.partnerPharmacy.update.mockResolvedValue({
        ...mockPharmacy,
        rating: 4.8,
      });

      const result = await service.updatePharmacyRating('pharm-1', 4.8);

      expect(result.rating).toBe(4.8);
    });
  });
});
