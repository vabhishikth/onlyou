import { Test, TestingModule } from '@nestjs/testing';
import { PharmacyAssignmentService } from './pharmacy-assignment.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { NotFoundException } from '@nestjs/common';

// Spec: Phase 15 Chunk 3 — Pharmacy Assignment Engine

describe('PharmacyAssignmentService', () => {
  let service: PharmacyAssignmentService;
  let prisma: any;
  let notificationService: any;

  const mockPrescription = {
    id: 'rx-1',
    consultationId: 'consult-1',
    patientId: 'patient-1',
    medications: [
      { name: 'Finasteride 1mg', genericName: 'finasteride', quantity: 30 },
      { name: 'Minoxidil 5%', genericName: 'minoxidil', quantity: 1 },
    ],
    consultation: {
      id: 'consult-1',
      patientId: 'patient-1',
      vertical: 'HAIR_LOSS',
      patient: {
        patientProfile: {
          city: 'Mumbai',
          pincode: '400001',
          address: '123 Main St',
        },
      },
    },
  };

  const makePharmacy = (overrides: any = {}) => ({
    id: overrides.id || 'pharm-1',
    name: overrides.name || 'MedPlus Pharmacy',
    city: overrides.city || 'Mumbai',
    pincode: overrides.pincode || '400001',
    status: overrides.status || 'ACTIVE',
    hasColdChainCapability: overrides.hasColdChainCapability ?? false,
    coldChainVerified: overrides.coldChainVerified ?? false,
    dailyOrderLimit: overrides.dailyOrderLimit ?? 50,
    currentQueueSize: overrides.currentQueueSize ?? 5,
    operatingHoursStart: overrides.operatingHoursStart || '09:00',
    operatingHoursEnd: overrides.operatingHoursEnd || '21:00',
    drugLicenseExpiry: overrides.drugLicenseExpiry || new Date('2027-12-31'),
    staff: overrides.staff || [
      { id: 'staff-1', role: 'PHARMACIST', canAcceptOrders: true, isActive: true, userId: 'user-staff-1' },
    ],
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PharmacyAssignmentService,
        {
          provide: PrismaService,
          useValue: {
            prescription: {
              findUnique: jest.fn(),
            },
            pharmacy: {
              findMany: jest.fn(),
              update: jest.fn(),
            },
            pharmacyOrder: {
              create: jest.fn(),
              findFirst: jest.fn(),
            },
            pharmacyStaff: {
              findMany: jest.fn(),
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
      ],
    }).compile();

    service = module.get<PharmacyAssignmentService>(PharmacyAssignmentService);
    prisma = module.get(PrismaService);
    notificationService = module.get(NotificationService);
  });

  // ========================================
  // determineColdChainRequirement
  // ========================================

  describe('determineColdChainRequirement', () => {
    it('should return false for standard medications (finasteride, minoxidil)', () => {
      const result = service.determineColdChainRequirement([
        { name: 'Finasteride 1mg', genericName: 'finasteride' },
        { name: 'Minoxidil 5%', genericName: 'minoxidil' },
      ]);
      expect(result).toBe(false);
    });

    it('should return true for semaglutide (cold chain)', () => {
      const result = service.determineColdChainRequirement([
        { name: 'Ozempic (Semaglutide)', genericName: 'semaglutide' },
      ]);
      expect(result).toBe(true);
    });

    it('should return true if any medication requires cold chain', () => {
      const result = service.determineColdChainRequirement([
        { name: 'Finasteride 1mg', genericName: 'finasteride' },
        { name: 'Insulin Glargine', genericName: 'insulin' },
      ]);
      expect(result).toBe(true);
    });

    it('should return false for empty list', () => {
      const result = service.determineColdChainRequirement([]);
      expect(result).toBe(false);
    });
  });

  // ========================================
  // assignPharmacy
  // ========================================

  describe('assignPharmacy', () => {
    it('should assign standard meds to any eligible ACTIVE pharmacy', async () => {
      const pharmacy = makePharmacy();
      prisma.prescription.findUnique.mockResolvedValue(mockPrescription);
      prisma.pharmacy.findMany.mockResolvedValue([pharmacy]);
      prisma.pharmacyOrder.create.mockResolvedValue({
        id: 'po-1',
        prescriptionId: 'rx-1',
        pharmacyId: 'pharm-1',
        status: 'ASSIGNED',
      });
      prisma.pharmacy.update.mockResolvedValue({ ...pharmacy, currentQueueSize: 6 });

      const result = await service.assignPharmacy('rx-1');

      expect(result.assigned).toBe(true);
      expect(result.pharmacyId).toBe('pharm-1');
      expect(result.pharmacyOrderId).toBeDefined();
    });

    it('should select pharmacy with lowest queue size when multiple eligible', async () => {
      const pharmacy1 = makePharmacy({ id: 'pharm-1', currentQueueSize: 20 });
      const pharmacy2 = makePharmacy({ id: 'pharm-2', name: 'Apollo Pharmacy', currentQueueSize: 3 });
      const pharmacy3 = makePharmacy({ id: 'pharm-3', name: 'Wellness Pharmacy', currentQueueSize: 10 });

      prisma.prescription.findUnique.mockResolvedValue(mockPrescription);
      prisma.pharmacy.findMany.mockResolvedValue([pharmacy1, pharmacy2, pharmacy3]);
      prisma.pharmacyOrder.create.mockResolvedValue({
        id: 'po-1',
        prescriptionId: 'rx-1',
        pharmacyId: 'pharm-2',
        status: 'ASSIGNED',
      });
      prisma.pharmacy.update.mockResolvedValue({ ...pharmacy2, currentQueueSize: 4 });

      const result = await service.assignPharmacy('rx-1');

      expect(result.assigned).toBe(true);
      expect(result.pharmacyId).toBe('pharm-2'); // lowest queue
    });

    it('should prefer same-pincode pharmacy as tie-breaker', async () => {
      const pharmacy1 = makePharmacy({ id: 'pharm-1', pincode: '400050', currentQueueSize: 5 });
      const pharmacy2 = makePharmacy({ id: 'pharm-2', pincode: '400001', currentQueueSize: 5 }); // same pincode as patient

      prisma.prescription.findUnique.mockResolvedValue(mockPrescription);
      prisma.pharmacy.findMany.mockResolvedValue([pharmacy1, pharmacy2]);
      prisma.pharmacyOrder.create.mockResolvedValue({
        id: 'po-1',
        prescriptionId: 'rx-1',
        pharmacyId: 'pharm-2',
        status: 'ASSIGNED',
      });
      prisma.pharmacy.update.mockResolvedValue({ ...pharmacy2, currentQueueSize: 6 });

      const result = await service.assignPharmacy('rx-1');

      expect(result.assigned).toBe(true);
      expect(result.pharmacyId).toBe('pharm-2'); // same pincode preferred
    });

    it('should only assign cold chain meds to coldChainVerified pharmacy', async () => {
      const coldChainPrescription = {
        ...mockPrescription,
        medications: [
          { name: 'Ozempic', genericName: 'semaglutide', quantity: 1 },
        ],
      };

      const regularPharmacy = makePharmacy({ id: 'pharm-1', hasColdChainCapability: true, coldChainVerified: false });
      const verifiedColdChainPharmacy = makePharmacy({
        id: 'pharm-2',
        name: 'Cold Chain Pharmacy',
        hasColdChainCapability: true,
        coldChainVerified: true,
      });

      prisma.prescription.findUnique.mockResolvedValue(coldChainPrescription);
      prisma.pharmacy.findMany.mockResolvedValue([regularPharmacy, verifiedColdChainPharmacy]);
      prisma.pharmacyOrder.create.mockResolvedValue({
        id: 'po-1',
        prescriptionId: 'rx-1',
        pharmacyId: 'pharm-2',
        status: 'ASSIGNED',
      });
      prisma.pharmacy.update.mockResolvedValue({ ...verifiedColdChainPharmacy, currentQueueSize: 6 });

      const result = await service.assignPharmacy('rx-1');

      expect(result.assigned).toBe(true);
      expect(result.pharmacyId).toBe('pharm-2'); // only verified cold chain pharmacy
    });

    it('should skip pharmacy with capability but NOT verified for cold chain', async () => {
      const coldChainPrescription = {
        ...mockPrescription,
        medications: [
          { name: 'Ozempic', genericName: 'semaglutide', quantity: 1 },
        ],
      };

      // Only has capability but NOT verified
      const unverifiedPharmacy = makePharmacy({
        id: 'pharm-1',
        hasColdChainCapability: true,
        coldChainVerified: false,
      });

      prisma.prescription.findUnique.mockResolvedValue(coldChainPrescription);
      prisma.pharmacy.findMany.mockResolvedValue([unverifiedPharmacy]);
      prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });

      const result = await service.assignPharmacy('rx-1');

      expect(result.assigned).toBe(false);
      expect(result.reason).toBe('no_eligible_pharmacy');
    });

    it('should skip pharmacies at capacity (currentQueueSize >= dailyOrderLimit)', async () => {
      const atCapacity = makePharmacy({ id: 'pharm-1', dailyOrderLimit: 10, currentQueueSize: 10 });
      const hasSpace = makePharmacy({ id: 'pharm-2', name: 'Free Pharmacy', dailyOrderLimit: 50, currentQueueSize: 5 });

      prisma.prescription.findUnique.mockResolvedValue(mockPrescription);
      prisma.pharmacy.findMany.mockResolvedValue([atCapacity, hasSpace]);
      prisma.pharmacyOrder.create.mockResolvedValue({
        id: 'po-1',
        prescriptionId: 'rx-1',
        pharmacyId: 'pharm-2',
        status: 'ASSIGNED',
      });
      prisma.pharmacy.update.mockResolvedValue({ ...hasSpace, currentQueueSize: 6 });

      const result = await service.assignPharmacy('rx-1');

      expect(result.assigned).toBe(true);
      expect(result.pharmacyId).toBe('pharm-2'); // atCapacity skipped
    });

    it('should skip SUSPENDED pharmacies', async () => {
      const suspended = makePharmacy({ id: 'pharm-1', status: 'SUSPENDED' });
      const active = makePharmacy({ id: 'pharm-2', name: 'Active Pharmacy' });

      prisma.prescription.findUnique.mockResolvedValue(mockPrescription);
      // Only ACTIVE pharmacies should be returned by the query
      prisma.pharmacy.findMany.mockResolvedValue([active]);
      prisma.pharmacyOrder.create.mockResolvedValue({
        id: 'po-1',
        pharmacyId: 'pharm-2',
        status: 'ASSIGNED',
      });
      prisma.pharmacy.update.mockResolvedValue({ ...active, currentQueueSize: 6 });

      const result = await service.assignPharmacy('rx-1');

      expect(result.assigned).toBe(true);
      expect(result.pharmacyId).toBe('pharm-2');
    });

    it('should skip pharmacies with expired drug license', async () => {
      const expired = makePharmacy({
        id: 'pharm-1',
        drugLicenseExpiry: new Date('2025-01-01'), // expired
      });
      const valid = makePharmacy({ id: 'pharm-2', name: 'Valid License Pharmacy' });

      prisma.prescription.findUnique.mockResolvedValue(mockPrescription);
      prisma.pharmacy.findMany.mockResolvedValue([expired, valid]);
      prisma.pharmacyOrder.create.mockResolvedValue({
        id: 'po-1',
        pharmacyId: 'pharm-2',
        status: 'ASSIGNED',
      });
      prisma.pharmacy.update.mockResolvedValue({ ...valid, currentQueueSize: 6 });

      const result = await service.assignPharmacy('rx-1');

      expect(result.assigned).toBe(true);
      expect(result.pharmacyId).toBe('pharm-2'); // expired license skipped
    });

    it('should return no_eligible_pharmacy when none eligible and notify admin', async () => {
      prisma.prescription.findUnique.mockResolvedValue(mockPrescription);
      prisma.pharmacy.findMany.mockResolvedValue([]); // no eligible
      prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });

      const result = await service.assignPharmacy('rx-1');

      expect(result.assigned).toBe(false);
      expect(result.reason).toBe('no_eligible_pharmacy');
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'NO_ELIGIBLE_PHARMACY',
        }),
      );
    });

    it('should create PharmacyOrder with ASSIGNED status', async () => {
      const pharmacy = makePharmacy();
      prisma.prescription.findUnique.mockResolvedValue(mockPrescription);
      prisma.pharmacy.findMany.mockResolvedValue([pharmacy]);
      prisma.pharmacyOrder.create.mockResolvedValue({
        id: 'po-1',
        prescriptionId: 'rx-1',
        pharmacyId: 'pharm-1',
        status: 'ASSIGNED',
      });
      prisma.pharmacy.update.mockResolvedValue({ ...pharmacy, currentQueueSize: 6 });

      await service.assignPharmacy('rx-1');

      expect(prisma.pharmacyOrder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          prescriptionId: 'rx-1',
          pharmacyId: 'pharm-1',
          patientId: 'patient-1',
          consultationId: 'consult-1',
          status: 'ASSIGNED',
          assignedAt: expect.any(Date),
          requiresColdChain: false,
          deliveryCity: 'Mumbai',
          deliveryPincode: '400001',
          deliveryAddress: '123 Main St',
        }),
      });
    });

    it('should increment pharmacy currentQueueSize on assignment', async () => {
      const pharmacy = makePharmacy({ currentQueueSize: 5 });
      prisma.prescription.findUnique.mockResolvedValue(mockPrescription);
      prisma.pharmacy.findMany.mockResolvedValue([pharmacy]);
      prisma.pharmacyOrder.create.mockResolvedValue({
        id: 'po-1',
        pharmacyId: 'pharm-1',
        status: 'ASSIGNED',
      });
      prisma.pharmacy.update.mockResolvedValue({ ...pharmacy, currentQueueSize: 6 });

      await service.assignPharmacy('rx-1');

      expect(prisma.pharmacy.update).toHaveBeenCalledWith({
        where: { id: 'pharm-1' },
        data: { currentQueueSize: { increment: 1 } },
      });
    });

    it('should notify pharmacy staff with canAcceptOrders on assignment', async () => {
      const pharmacy = makePharmacy({
        staff: [
          { id: 'staff-1', role: 'PHARMACIST', canAcceptOrders: true, isActive: true, userId: 'user-staff-1' },
          { id: 'staff-2', role: 'DISPENSER', canAcceptOrders: false, isActive: true, userId: 'user-staff-2' },
        ],
      });

      prisma.prescription.findUnique.mockResolvedValue(mockPrescription);
      prisma.pharmacy.findMany.mockResolvedValue([pharmacy]);
      prisma.pharmacyOrder.create.mockResolvedValue({
        id: 'po-1',
        pharmacyId: 'pharm-1',
        status: 'ASSIGNED',
      });
      prisma.pharmacy.update.mockResolvedValue({ ...pharmacy, currentQueueSize: 6 });

      await service.assignPharmacy('rx-1');

      // Only staff with canAcceptOrders should be notified
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'user-staff-1',
          eventType: 'PHARMACY_ORDER_ASSIGNED',
        }),
      );
      // DISPENSER without canAcceptOrders should NOT be notified
      const allCalls = notificationService.sendNotification.mock.calls;
      const recipientIds = allCalls.map((call: any[]) => call[0].recipientId);
      expect(recipientIds).not.toContain('user-staff-2');
    });

    it('should throw NotFoundException for invalid prescription ID', async () => {
      prisma.prescription.findUnique.mockResolvedValue(null);

      await expect(service.assignPharmacy('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should set requiresColdChain=true on order for cold chain meds', async () => {
      const coldPrescription = {
        ...mockPrescription,
        medications: [
          { name: 'Ozempic', genericName: 'semaglutide', quantity: 1 },
        ],
      };
      const coldPharmacy = makePharmacy({ hasColdChainCapability: true, coldChainVerified: true });

      prisma.prescription.findUnique.mockResolvedValue(coldPrescription);
      prisma.pharmacy.findMany.mockResolvedValue([coldPharmacy]);
      prisma.pharmacyOrder.create.mockResolvedValue({
        id: 'po-1',
        pharmacyId: 'pharm-1',
        status: 'ASSIGNED',
      });
      prisma.pharmacy.update.mockResolvedValue({ ...coldPharmacy, currentQueueSize: 6 });

      await service.assignPharmacy('rx-1');

      expect(prisma.pharmacyOrder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          requiresColdChain: true,
        }),
      });
    });
  });

  // ========================================
  // reassignPharmacy
  // ========================================

  describe('reassignPharmacy', () => {
    it('should reassign and exclude previous pharmacy', async () => {
      const existingOrder = {
        id: 'po-1',
        prescriptionId: 'rx-1',
        pharmacyId: 'pharm-1',
        patientId: 'patient-1',
        consultationId: 'consult-1',
        status: 'PHARMACY_REJECTED',
        requiresColdChain: false,
        deliveryCity: 'Mumbai',
        deliveryPincode: '400001',
        deliveryAddress: '123 Main St',
        prescription: mockPrescription,
      };

      const newPharmacy = makePharmacy({ id: 'pharm-2', name: 'Alternative Pharmacy' });

      prisma.pharmacyOrder.findFirst.mockResolvedValue(existingOrder);
      prisma.pharmacy.findMany.mockResolvedValue([newPharmacy]);
      prisma.pharmacyOrder.create.mockResolvedValue({
        id: 'po-2',
        prescriptionId: 'rx-1',
        pharmacyId: 'pharm-2',
        status: 'ASSIGNED',
      });
      prisma.pharmacy.update.mockImplementation(async (args: any) => {
        if (args.where.id === 'pharm-1') return { ...makePharmacy({ id: 'pharm-1' }), currentQueueSize: 4 };
        return { ...newPharmacy, currentQueueSize: 6 };
      });

      const result = await service.reassignPharmacy('po-1', 'Pharmacy rejected order');

      expect(result.assigned).toBe(true);
      expect(result.pharmacyId).toBe('pharm-2');
    });

    it('should decrement old pharmacy queue on reassignment', async () => {
      const existingOrder = {
        id: 'po-1',
        prescriptionId: 'rx-1',
        pharmacyId: 'pharm-1',
        patientId: 'patient-1',
        consultationId: 'consult-1',
        status: 'PHARMACY_REJECTED',
        requiresColdChain: false,
        deliveryCity: 'Mumbai',
        deliveryPincode: '400001',
        deliveryAddress: '123 Main St',
        prescription: mockPrescription,
      };
      const newPharmacy = makePharmacy({ id: 'pharm-2', name: 'Alt Pharmacy' });

      prisma.pharmacyOrder.findFirst.mockResolvedValue(existingOrder);
      prisma.pharmacy.findMany.mockResolvedValue([newPharmacy]);
      prisma.pharmacyOrder.create.mockResolvedValue({ id: 'po-2', pharmacyId: 'pharm-2', status: 'ASSIGNED' });
      prisma.pharmacy.update.mockResolvedValue({});

      await service.reassignPharmacy('po-1', 'Rejected');

      // Should decrement old pharmacy queue
      expect(prisma.pharmacy.update).toHaveBeenCalledWith({
        where: { id: 'pharm-1' },
        data: { currentQueueSize: { decrement: 1 } },
      });
    });

    it('should notify admin when no alternative pharmacy found', async () => {
      const existingOrder = {
        id: 'po-1',
        prescriptionId: 'rx-1',
        pharmacyId: 'pharm-1',
        patientId: 'patient-1',
        consultationId: 'consult-1',
        status: 'PHARMACY_REJECTED',
        requiresColdChain: false,
        deliveryCity: 'Mumbai',
        deliveryPincode: '400001',
        deliveryAddress: '123 Main St',
        prescription: mockPrescription,
      };

      prisma.pharmacyOrder.findFirst.mockResolvedValue(existingOrder);
      prisma.pharmacy.findMany.mockResolvedValue([]); // no alternatives
      prisma.pharmacy.update.mockResolvedValue({});
      prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });

      const result = await service.reassignPharmacy('po-1', 'Rejected');

      expect(result.assigned).toBe(false);
      expect(result.reason).toBe('no_eligible_pharmacy');
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'REASSIGNMENT_FAILED',
        }),
      );
    });

    it('should throw NotFoundException for invalid pharmacy order ID', async () => {
      prisma.pharmacyOrder.findFirst.mockResolvedValue(null);

      await expect(service.reassignPharmacy('nonexistent', 'reason')).rejects.toThrow(NotFoundException);
    });
  });
});
