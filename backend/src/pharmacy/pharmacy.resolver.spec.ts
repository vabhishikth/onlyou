import { Test, TestingModule } from '@nestjs/testing';
import { PharmacyResolver } from './pharmacy.resolver';
import { PharmacyOnboardingService } from './pharmacy-onboarding.service';
import { PharmacyAssignmentService } from './pharmacy-assignment.service';
import { PharmacyFulfillmentService } from './pharmacy-fulfillment.service';
import { DeliveryService } from './delivery.service';
import { SlaMonitorService } from './sla-monitor.service';
import { AutoRefillService } from './auto-refill.service';
import { PrismaService } from '../prisma/prisma.service';

// Spec: Phase 15 Chunk 8 — GraphQL API Endpoints

describe('PharmacyResolver', () => {
  let resolver: PharmacyResolver;
  let onboardingService: any;
  let assignmentService: any;
  let fulfillmentService: any;
  let deliveryService: any;
  let slaService: any;
  let refillService: any;
  let prisma: any;

  const adminUser = { id: 'admin-1', role: 'ADMIN' };
  const pharmacyUser = { id: 'user-staff-1', role: 'PHARMACY' };
  const patientUser = { id: 'patient-1', role: 'PATIENT' };
  const doctorUser = { id: 'doctor-1', role: 'DOCTOR' };
  const deliveryUser = { id: 'delivery-1', role: 'DELIVERY' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PharmacyResolver,
        {
          provide: PharmacyOnboardingService,
          useValue: {
            registerPharmacy: jest.fn().mockResolvedValue({ id: 'pharm-1', name: 'Test Pharmacy' }),
            uploadPharmacyDocuments: jest.fn().mockResolvedValue({}),
            reviewPharmacy: jest.fn().mockResolvedValue({}),
            suspendPharmacy: jest.fn().mockResolvedValue({}),
            reactivatePharmacy: jest.fn().mockResolvedValue({}),
            deactivatePharmacy: jest.fn().mockResolvedValue({}),
            invitePharmacyStaff: jest.fn().mockResolvedValue({}),
            updatePharmacyStaffPermissions: jest.fn().mockResolvedValue({}),
            deactivatePharmacyStaff: jest.fn().mockResolvedValue({}),
            listPharmacies: jest.fn().mockResolvedValue([]),
            getPharmacyById: jest.fn().mockResolvedValue({ id: 'pharm-1' }),
          },
        },
        {
          provide: PharmacyAssignmentService,
          useValue: {
            assignPharmacy: jest.fn().mockResolvedValue({ assigned: true, pharmacyId: 'pharm-1' }),
            reassignPharmacy: jest.fn().mockResolvedValue({ assigned: true }),
          },
        },
        {
          provide: PharmacyFulfillmentService,
          useValue: {
            acceptOrder: jest.fn().mockResolvedValue({ id: 'po-1', status: 'PHARMACY_ACCEPTED' }),
            rejectOrder: jest.fn().mockResolvedValue(undefined),
            reportStockIssue: jest.fn().mockResolvedValue({}),
            proposeSubstitution: jest.fn().mockResolvedValue({}),
            approveSubstitution: jest.fn().mockResolvedValue({}),
            rejectSubstitution: jest.fn().mockResolvedValue({}),
            confirmDiscreetPackaging: jest.fn().mockResolvedValue({}),
            markReadyForPickup: jest.fn().mockResolvedValue({}),
            updateInventory: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: DeliveryService,
          useValue: {
            dispatchOrder: jest.fn().mockResolvedValue({}),
            updateDeliveryStatus: jest.fn().mockResolvedValue({}),
            confirmDelivery: jest.fn().mockResolvedValue({}),
            reportDeliveryFailure: jest.fn().mockResolvedValue({}),
            updateDeliveryAddress: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: SlaMonitorService,
          useValue: {
            getSlaStatus: jest.fn().mockResolvedValue({ breaches: [] }),
            getPharmacyPerformanceReport: jest.fn().mockResolvedValue({ totalOrders: 0 }),
          },
        },
        {
          provide: AutoRefillService,
          useValue: {
            createRefillSubscription: jest.fn().mockResolvedValue({ id: 'arc-1', isActive: true }),
            cancelRefillSubscription: jest.fn().mockResolvedValue({ id: 'arc-1', isActive: false }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            pharmacyStaff: {
              findFirst: jest.fn(),
            },
            pharmacyOrder: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
            autoRefillConfig: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    resolver = module.get<PharmacyResolver>(PharmacyResolver);
    onboardingService = module.get(PharmacyOnboardingService);
    assignmentService = module.get(PharmacyAssignmentService);
    fulfillmentService = module.get(PharmacyFulfillmentService);
    deliveryService = module.get(DeliveryService);
    slaService = module.get(SlaMonitorService);
    refillService = module.get(AutoRefillService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  // ========================================
  // Admin endpoints
  // ========================================

  describe('admin endpoints', () => {
    it('should register pharmacy', async () => {
      const result = await resolver.registerPharmacy(adminUser, {
        name: 'Test Pharmacy',
        city: 'Mumbai',
        address: '123 Main St',
        pincode: '400001',
        contactPhone: '+919876543210',
        drugLicenseNumber: 'DL-001',
        ownerName: 'Owner',
        ownerPhone: '+919876543211',
      });

      expect(onboardingService.registerPharmacy).toHaveBeenCalledWith('admin-1', expect.any(Object));
      expect(result).toBeDefined();
    });

    it('should trigger pharmacy assignment', async () => {
      await resolver.triggerAssignment(adminUser, 'rx-1');

      expect(assignmentService.assignPharmacy).toHaveBeenCalledWith('rx-1');
    });

    it('should dispatch order for delivery', async () => {
      await resolver.dispatchOrder(adminUser, 'po-1', 'Ramesh', '+919876543210');

      expect(deliveryService.dispatchOrder).toHaveBeenCalledWith('po-1', 'Ramesh', '+919876543210');
    });

    it('should get pharmacy performance report', async () => {
      await resolver.pharmacyPerformance(adminUser, 'pharm-1');

      expect(slaService.getPharmacyPerformanceReport).toHaveBeenCalled();
    });
  });

  // ========================================
  // Pharmacy staff endpoints
  // ========================================

  describe('pharmacy staff endpoints', () => {
    it('should accept order via staff context', async () => {
      prisma.pharmacyStaff.findFirst.mockResolvedValue({ id: 'staff-1', pharmacyId: 'pharm-1' });

      await resolver.acceptOrder(pharmacyUser, 'po-1');

      expect(fulfillmentService.acceptOrder).toHaveBeenCalledWith('po-1', 'staff-1');
    });

    it('should reject order via staff context', async () => {
      prisma.pharmacyStaff.findFirst.mockResolvedValue({ id: 'staff-1', pharmacyId: 'pharm-1' });

      await resolver.rejectOrder(pharmacyUser, 'po-1', 'Out of stock');

      expect(fulfillmentService.rejectOrder).toHaveBeenCalledWith('po-1', 'staff-1', 'Out of stock');
    });

    it('should list pharmacy orders for staff pharmacy only', async () => {
      prisma.pharmacyStaff.findFirst.mockResolvedValue({ id: 'staff-1', pharmacyId: 'pharm-1' });
      prisma.pharmacyOrder.findMany.mockResolvedValue([{ id: 'po-1' }]);

      const result = await resolver.myPharmacyOrders(pharmacyUser);

      expect(prisma.pharmacyOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { pharmacyId: 'pharm-1' },
        }),
      );
    });
  });

  // ========================================
  // Doctor endpoints
  // ========================================

  describe('doctor endpoints', () => {
    it('should approve substitution', async () => {
      await resolver.approveSubstitution(doctorUser, 'po-1');

      expect(fulfillmentService.approveSubstitution).toHaveBeenCalledWith('po-1', 'doctor-1');
    });

    it('should reject substitution', async () => {
      await resolver.rejectSubstitution(doctorUser, 'po-1', 'Not equivalent');

      expect(fulfillmentService.rejectSubstitution).toHaveBeenCalledWith('po-1', 'doctor-1', 'Not equivalent');
    });
  });

  // ========================================
  // Patient endpoints
  // ========================================

  describe('patient endpoints', () => {
    it('should get patient pharmacy order status', async () => {
      prisma.pharmacyOrder.findUnique.mockResolvedValue({ id: 'po-1', patientId: 'patient-1', status: 'PREPARING' });

      const result = await resolver.myPharmacyOrderStatus(patientUser, 'po-1');

      expect(result).toBeDefined();
    });

    it('should update delivery address', async () => {
      await resolver.updateDeliveryAddress(patientUser, 'po-1', '456 New St', '400002');

      expect(deliveryService.updateDeliveryAddress).toHaveBeenCalledWith('po-1', 'patient-1', '456 New St', '400002');
    });

    it('should create auto-refill subscription', async () => {
      await resolver.createAutoRefill(patientUser, 'rx-1', 30);

      expect(refillService.createRefillSubscription).toHaveBeenCalledWith('patient-1', 'rx-1', 30);
    });

    it('should cancel auto-refill subscription', async () => {
      await resolver.cancelAutoRefill(patientUser, 'arc-1');

      expect(refillService.cancelRefillSubscription).toHaveBeenCalledWith('arc-1', 'patient-1');
    });
  });

  // ========================================
  // Delivery person endpoints
  // ========================================

  describe('delivery person endpoints', () => {
    it('should confirm delivery with OTP', async () => {
      await resolver.confirmDelivery(deliveryUser, 'po-1', '1234');

      expect(deliveryService.confirmDelivery).toHaveBeenCalledWith('po-1', '1234');
    });

    it('should report delivery failure', async () => {
      await resolver.reportDeliveryFailure(deliveryUser, 'po-1', 'Customer not home');

      expect(deliveryService.reportDeliveryFailure).toHaveBeenCalledWith('po-1', 'Customer not home');
    });

    it('should get delivery order detail WITHOUT medication names', async () => {
      prisma.pharmacyOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        deliveryAddress: '123 Main St',
        deliveryPincode: '400001',
        deliveryCity: 'Mumbai',
        status: 'OUT_FOR_DELIVERY',
        isDiscreetPackagingConfirmed: true,
        patientId: 'patient-1',
      });

      const result = await resolver.deliveryOrderDetail(deliveryUser, 'po-1');

      // Should NOT include medication names (privacy)
      expect(result).not.toHaveProperty('medications');
      expect(result).toHaveProperty('deliveryAddress');
      expect(result).toHaveProperty('status');
    });
  });
});
