import { Test, TestingModule } from '@nestjs/testing';
import { LabOrderCreationService } from './lab-order-creation.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Spec: Phase 16 Chunk 3 — Lab Order Creation + Fasting Detection + Protocol Auto-Triggering

describe('LabOrderCreationService', () => {
  let service: LabOrderCreationService;
  let prisma: any;
  let notificationService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabOrderCreationService,
        {
          provide: PrismaService,
          useValue: {
            labOrder: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            partnerLab: {
              findMany: jest.fn(),
            },
            subscription: {
              findFirst: jest.fn(),
            },
            consultation: {
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

    service = module.get<LabOrderCreationService>(LabOrderCreationService);
    prisma = module.get(PrismaService);
    notificationService = module.get(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========================================
  // createLabOrder
  // ========================================

  describe('createLabOrder', () => {
    it('should create lab order with requiresFasting=true for fasting tests', async () => {
      prisma.partnerLab.findMany.mockResolvedValue([
        { id: 'lab-1', testsAvailable: ['CBC', 'fasting_glucose', 'TSH'], status: 'ACTIVE' },
      ]);
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
        plan: { includesBloodWork: true },
      });
      prisma.labOrder.findFirst.mockResolvedValue(null); // no previous order
      prisma.labOrder.create.mockResolvedValue({
        id: 'lo-1',
        testPanel: ['CBC', 'fasting_glucose', 'TSH'],
        requiresFasting: true,
        status: 'ORDERED',
      });

      const result = await service.createLabOrder(
        'consult-1', 'doctor-1', 'patient-1',
        ['CBC', 'fasting_glucose', 'TSH'],
        { collectionAddress: '123 Main St', collectionCity: 'Hyderabad', collectionPincode: '500033', labCost: 150000 },
      );

      expect(result.requiresFasting).toBe(true);
      expect(result.status).toBe('ORDERED');
    });

    it('should create lab order with requiresFasting=false for non-fasting tests', async () => {
      prisma.partnerLab.findMany.mockResolvedValue([
        { id: 'lab-1', testsAvailable: ['CBC', 'TSH', 'amylase'], status: 'ACTIVE' },
      ]);
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
        plan: { includesBloodWork: true },
      });
      prisma.labOrder.findFirst.mockResolvedValue(null);
      prisma.labOrder.create.mockResolvedValue({
        id: 'lo-2',
        testPanel: ['CBC', 'TSH', 'amylase'],
        requiresFasting: false,
        status: 'ORDERED',
      });

      const result = await service.createLabOrder(
        'consult-1', 'doctor-1', 'patient-1',
        ['CBC', 'TSH', 'amylase'],
        { collectionAddress: '123 Main St', collectionCity: 'Hyderabad', collectionPincode: '500033', labCost: 120000 },
      );

      expect(result.requiresFasting).toBe(false);
    });

    it('should warn if test not available at any active lab', async () => {
      prisma.partnerLab.findMany.mockResolvedValue([
        { id: 'lab-1', testsAvailable: ['CBC', 'TSH'], status: 'ACTIVE' },
      ]);
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
        plan: { includesBloodWork: true },
      });
      prisma.labOrder.findFirst.mockResolvedValue(null);
      prisma.labOrder.create.mockResolvedValue({
        id: 'lo-3',
        testPanel: ['CBC', 'TSH', 'rare_test'],
        status: 'ORDERED',
        requiresFasting: false,
      });
      prisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);

      const result = await service.createLabOrder(
        'consult-1', 'doctor-1', 'patient-1',
        ['CBC', 'TSH', 'rare_test'],
        { collectionAddress: '123 Main St', collectionCity: 'Hyderabad', collectionPincode: '500033', labCost: 100000 },
      );

      // Should still create but send admin alert about unavailable test
      expect(result).toBeDefined();
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'LAB_TEST_UNAVAILABLE',
        }),
      );
    });

    it('should set status to PAYMENT_PENDING when blood work not included in subscription', async () => {
      prisma.partnerLab.findMany.mockResolvedValue([
        { id: 'lab-1', testsAvailable: ['CBC', 'TSH'], status: 'ACTIVE' },
      ]);
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
        plan: { includesBloodWork: false },
      });
      prisma.labOrder.findFirst.mockResolvedValue(null);
      prisma.labOrder.create.mockResolvedValue({
        id: 'lo-4',
        testPanel: ['CBC', 'TSH'],
        status: 'PAYMENT_PENDING',
        requiresFasting: false,
      });

      const result = await service.createLabOrder(
        'consult-1', 'doctor-1', 'patient-1',
        ['CBC', 'TSH'],
        { collectionAddress: '123 Main St', collectionCity: 'Hyderabad', collectionPincode: '500033', labCost: 100000 },
      );

      expect(result.status).toBe('PAYMENT_PENDING');
    });

    it('should link to previous lab order for trend tracking', async () => {
      prisma.partnerLab.findMany.mockResolvedValue([
        { id: 'lab-1', testsAvailable: ['CBC', 'TSH'], status: 'ACTIVE' },
      ]);
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
        plan: { includesBloodWork: true },
      });
      prisma.labOrder.findFirst.mockResolvedValue({
        id: 'lo-prev',
        consultationId: 'consult-0',
      });
      prisma.labOrder.create.mockResolvedValue({
        id: 'lo-5',
        previousLabOrderId: 'lo-prev',
        testPanel: ['CBC', 'TSH'],
        status: 'ORDERED',
        requiresFasting: false,
      });

      const result = await service.createLabOrder(
        'consult-1', 'doctor-1', 'patient-1',
        ['CBC', 'TSH'],
        { collectionAddress: '123 Main St', collectionCity: 'Hyderabad', collectionPincode: '500033', labCost: 100000 },
      );

      expect(result.previousLabOrderId).toBe('lo-prev');
    });
  });

  // ========================================
  // autoTriggerProtocolBloodWork
  // ========================================

  describe('autoTriggerProtocolBloodWork', () => {
    it('should auto-trigger GLP-1 protocol tests for WEIGHT_MANAGEMENT', async () => {
      prisma.consultation.findUnique.mockResolvedValue({
        id: 'consult-1',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        vertical: 'WEIGHT_MANAGEMENT',
        patient: {
          patientProfile: {
            addressLine1: '123 Main St',
            city: 'Hyderabad',
            pincode: '500033',
          },
        },
      });
      prisma.partnerLab.findMany.mockResolvedValue([
        {
          id: 'lab-1',
          name: 'Apollo Lab',
          testsAvailable: ['amylase', 'lipase', 'metabolic_panel', 'HbA1c', 'fasting_glucose', 'lipid_panel', 'CBC', 'TSH'],
          status: 'ACTIVE',
        },
      ]);
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
        plan: { includesBloodWork: true },
      });
      prisma.labOrder.findFirst.mockResolvedValue(null);
      prisma.labOrder.create.mockResolvedValue({
        id: 'lo-protocol',
        testPanel: ['amylase', 'lipase', 'metabolic_panel', 'HbA1c', 'fasting_glucose', 'lipid_panel', 'CBC', 'TSH'],
        isProtocolRequired: true,
        requiresFasting: true,
        status: 'ORDERED',
      });

      const result = await service.autoTriggerProtocolBloodWork('consult-1', 'WEIGHT_MANAGEMENT');

      expect(result.isProtocolRequired).toBe(true);
      expect(result.requiresFasting).toBe(true);
      expect(result.testPanel).toContain('amylase');
      expect(result.testPanel).toContain('lipase');
    });

    it('should auto-trigger PCOS protocol tests', async () => {
      prisma.consultation.findUnique.mockResolvedValue({
        id: 'consult-2',
        patientId: 'patient-2',
        doctorId: 'doctor-1',
        vertical: 'PCOS',
        patient: {
          patientProfile: {
            addressLine1: '456 Oak Ave',
            city: 'Bangalore',
            pincode: '560001',
          },
        },
      });
      prisma.partnerLab.findMany.mockResolvedValue([
        {
          id: 'lab-2',
          testsAvailable: ['FSH', 'LH', 'DHEA_S', 'testosterone', 'TSH', 'fasting_glucose', 'insulin', 'lipid_panel'],
          status: 'ACTIVE',
        },
      ]);
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-2',
        status: 'ACTIVE',
        plan: { includesBloodWork: true },
      });
      prisma.labOrder.findFirst.mockResolvedValue(null);
      prisma.labOrder.create.mockResolvedValue({
        id: 'lo-pcos',
        testPanel: ['FSH', 'LH', 'DHEA_S', 'testosterone', 'TSH', 'fasting_glucose', 'insulin', 'lipid_panel'],
        isProtocolRequired: true,
        status: 'ORDERED',
      });

      const result = await service.autoTriggerProtocolBloodWork('consult-2', 'PCOS');

      expect(result.isProtocolRequired).toBe(true);
      expect(result.testPanel).toContain('FSH');
      expect(result.testPanel).toContain('LH');
    });

    it('should alert admin when protocol tests unavailable at partner labs', async () => {
      prisma.consultation.findUnique.mockResolvedValue({
        id: 'consult-3',
        patientId: 'patient-3',
        doctorId: 'doctor-1',
        vertical: 'WEIGHT_MANAGEMENT',
        patient: {
          patientProfile: {
            addressLine1: '789 Pine',
            city: 'Hyderabad',
            pincode: '500033',
          },
        },
      });
      prisma.partnerLab.findMany.mockResolvedValue([
        { id: 'lab-1', name: 'Small Lab', testsAvailable: ['CBC', 'TSH'], status: 'ACTIVE' },
      ]);
      prisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
        plan: { includesBloodWork: true },
      });
      prisma.labOrder.findFirst.mockResolvedValue(null);
      prisma.labOrder.create.mockResolvedValue({
        id: 'lo-partial',
        testPanel: ['amylase', 'lipase', 'metabolic_panel', 'HbA1c', 'fasting_glucose', 'lipid_panel', 'CBC', 'TSH'],
        isProtocolRequired: true,
        status: 'ORDERED',
      });

      await service.autoTriggerProtocolBloodWork('consult-3', 'WEIGHT_MANAGEMENT');

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PROTOCOL_TESTS_UNAVAILABLE',
        }),
      );
    });

    it('should not auto-trigger for verticals without protocol (e.g., SEXUAL_HEALTH)', async () => {
      prisma.consultation.findUnique.mockResolvedValue({
        id: 'consult-4',
        patientId: 'patient-4',
        doctorId: 'doctor-1',
        vertical: 'SEXUAL_HEALTH',
      });

      const result = await service.autoTriggerProtocolBloodWork('consult-4', 'SEXUAL_HEALTH');

      expect(result).toBeNull();
      expect(prisma.labOrder.create).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // autoTriggerFollowUpBloodWork
  // ========================================

  describe('autoTriggerFollowUpBloodWork', () => {
    it('should trigger follow-up when last order is >3 months ago', async () => {
      const fourMonthsAgo = new Date();
      fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

      prisma.labOrder.findFirst.mockResolvedValue({
        id: 'lo-old',
        createdAt: fourMonthsAgo,
        consultationId: 'consult-old',
        testPanel: ['CBC', 'TSH'],
      });
      prisma.consultation.findUnique.mockResolvedValue({
        id: 'consult-old',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        vertical: 'WEIGHT_MANAGEMENT',
        patient: {
          patientProfile: {
            addressLine1: '123 Main',
            city: 'Hyderabad',
            pincode: '500033',
          },
        },
      });
      prisma.partnerLab.findMany.mockResolvedValue([
        { id: 'lab-1', testsAvailable: ['CBC', 'TSH', 'HbA1c', 'fasting_glucose', 'lipid_panel', 'amylase', 'lipase', 'metabolic_panel'], status: 'ACTIVE' },
      ]);
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
        plan: { includesBloodWork: true },
      });
      prisma.labOrder.create.mockResolvedValue({
        id: 'lo-followup',
        isFollowUp: true,
        previousLabOrderId: 'lo-old',
        status: 'ORDERED',
      });

      const result = await service.autoTriggerFollowUpBloodWork('patient-1', 'WEIGHT_MANAGEMENT');

      expect(result).toBeDefined();
      expect(result!.isFollowUp).toBe(true);
    });

    it('should not trigger follow-up if last order is <3 months ago', async () => {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      prisma.labOrder.findFirst.mockResolvedValue({
        id: 'lo-recent',
        createdAt: oneMonthAgo,
        consultationId: 'consult-recent',
        testPanel: ['CBC', 'TSH'],
      });

      const result = await service.autoTriggerFollowUpBloodWork('patient-1', 'WEIGHT_MANAGEMENT');

      expect(result).toBeNull();
      expect(prisma.labOrder.create).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // Patient Upload
  // ========================================

  describe('handlePatientUpload', () => {
    it('should store PDF and set patientUploadedResults to true', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
      });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        patientUploadedResults: true,
        patientUploadedFileUrl: 'https://r2.example.com/results.pdf',
        status: 'RESULTS_UPLOADED',
      });

      const result = await service.handlePatientUpload(
        'lo-1', 'patient-1', 'https://r2.example.com/results.pdf',
      );

      expect(result.patientUploadedResults).toBe(true);
      expect(result.status).toBe('RESULTS_UPLOADED');
    });

    it('should throw if order not found', async () => {
      prisma.labOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.handlePatientUpload('lo-999', 'patient-1', 'url'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if patient does not own the order', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        patientId: 'other-patient',
      });

      await expect(
        service.handlePatientUpload('lo-1', 'patient-1', 'url'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================
  // Doctor Review Uploaded Results
  // ========================================

  describe('doctorReviewUploadedResults', () => {
    it('should accept uploaded results and skip phlebotomist flow', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        patientUploadedResults: true,
        patientId: 'patient-1',
      });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        uploadedResultsAccepted: true,
        uploadedResultsReviewedById: 'doctor-1',
        status: 'DOCTOR_REVIEWED',
      });

      const result = await service.doctorReviewUploadedResults('lo-1', 'doctor-1', true);

      expect(result.uploadedResultsAccepted).toBe(true);
      expect(result.status).toBe('DOCTOR_REVIEWED');
    });

    it('should reject uploaded results and notify patient', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        patientUploadedResults: true,
        patientId: 'patient-1',
      });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        uploadedResultsAccepted: false,
        status: 'ORDERED', // back to ordered for rebooking
      });

      const result = await service.doctorReviewUploadedResults(
        'lo-1', 'doctor-1', false, 'Results too old',
      );

      expect(result.uploadedResultsAccepted).toBe(false);
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'LAB_UPLOAD_REJECTED',
        }),
      );
    });

    it('should throw if order not found', async () => {
      prisma.labOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.doctorReviewUploadedResults('lo-999', 'doctor-1', true),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
