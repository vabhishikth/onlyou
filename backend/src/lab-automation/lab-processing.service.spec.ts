import { Test, TestingModule } from '@nestjs/testing';
import { LabProcessingService } from './lab-processing.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Spec: Phase 16 Chunk 6 — Lab Processing + Result Upload + Critical Value Alerts

describe('LabProcessingService', () => {
  let service: LabProcessingService;
  let prisma: any;
  let notificationService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabProcessingService,
        {
          provide: PrismaService,
          useValue: {
            labOrder: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            labResult: {
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
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

    service = module.get<LabProcessingService>(LabProcessingService);
    prisma = module.get(PrismaService);
    notificationService = module.get(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========================================
  // startProcessing
  // ========================================

  describe('startProcessing', () => {
    it('should transition SAMPLE_RECEIVED → PROCESSING', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'SAMPLE_RECEIVED',
      });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        status: 'PROCESSING',
        processingStartedAt: expect.any(Date),
      });

      const result = await service.startProcessing('lo-1', 'labtech-1');

      expect(result.status).toBe('PROCESSING');
    });

    it('should throw if not SAMPLE_RECEIVED status', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'DELIVERED_TO_LAB',
      });

      await expect(
        service.startProcessing('lo-1', 'labtech-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================
  // uploadResult
  // ========================================

  describe('uploadResult', () => {
    it('should create a normal result with correct status', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'PROCESSING',
        patientId: 'patient-1',
        previousLabOrderId: null,
      });
      prisma.labResult.findFirst.mockResolvedValue(null); // no previous result
      prisma.labResult.create.mockResolvedValue({
        id: 'lr-1',
        testCode: 'TSH',
        value: 2.5,
        status: 'NORMAL',
        isCritical: false,
        changeDirection: 'NEW',
      });

      const result = await service.uploadResult('lo-1', 'labtech-1', {
        testCode: 'TSH',
        testName: 'Thyroid Stimulating Hormone',
        value: 2.5,
        unit: 'mIU/L',
        referenceRangeMin: 0.4,
        referenceRangeMax: 4.0,
      });

      expect(result.status).toBe('NORMAL');
      expect(result.isCritical).toBe(false);
    });

    it('should detect CRITICAL_HIGH and alert doctor immediately', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'PROCESSING',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        previousLabOrderId: null,
      });
      prisma.labResult.findFirst.mockResolvedValue(null);
      prisma.labResult.create.mockResolvedValue({
        id: 'lr-2',
        testCode: 'TSH',
        value: 15.0,
        status: 'CRITICAL_HIGH',
        isCritical: true,
        changeDirection: 'NEW',
      });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        criticalValues: true,
      });

      const result = await service.uploadResult('lo-1', 'labtech-1', {
        testCode: 'TSH',
        testName: 'Thyroid Stimulating Hormone',
        value: 15.0,
        unit: 'mIU/L',
        referenceRangeMin: 0.4,
        referenceRangeMax: 4.0,
      });

      expect(result.isCritical).toBe(true);
      expect(result.status).toBe('CRITICAL_HIGH');
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'doctor-1',
          eventType: 'LAB_CRITICAL_VALUES',
        }),
      );
    });

    it('should detect CRITICAL_LOW value', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'PROCESSING',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        previousLabOrderId: null,
      });
      prisma.labResult.findFirst.mockResolvedValue(null);
      prisma.labResult.create.mockResolvedValue({
        id: 'lr-3',
        testCode: 'fasting_glucose',
        value: 40,
        status: 'CRITICAL_LOW',
        isCritical: true,
        changeDirection: 'NEW',
      });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        criticalValues: true,
      });

      const result = await service.uploadResult('lo-1', 'labtech-1', {
        testCode: 'fasting_glucose',
        testName: 'Fasting Glucose',
        value: 40,
        unit: 'mg/dL',
        referenceRangeMin: 70,
        referenceRangeMax: 100,
      });

      expect(result.isCritical).toBe(true);
      expect(result.status).toBe('CRITICAL_LOW');
    });

    it('should detect LOW status (below reference, above critical)', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'PROCESSING',
        patientId: 'patient-1',
        previousLabOrderId: null,
      });
      prisma.labResult.findFirst.mockResolvedValue(null);
      prisma.labResult.create.mockResolvedValue({
        id: 'lr-4',
        testCode: 'fasting_glucose',
        value: 60,
        status: 'LOW',
        isCritical: false,
        changeDirection: 'NEW',
      });

      const result = await service.uploadResult('lo-1', 'labtech-1', {
        testCode: 'fasting_glucose',
        testName: 'Fasting Glucose',
        value: 60,
        unit: 'mg/dL',
        referenceRangeMin: 70,
        referenceRangeMax: 100,
      });

      expect(result.status).toBe('LOW');
      expect(result.isCritical).toBe(false);
    });

    it('should calculate trend from previous lab order results', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-2',
        status: 'PROCESSING',
        patientId: 'patient-1',
        previousLabOrderId: 'lo-1',
      });
      // Previous result for same test
      prisma.labResult.findFirst.mockResolvedValue({
        id: 'lr-prev',
        testCode: 'TSH',
        value: 3.0,
        createdAt: new Date('2025-12-01'),
      });
      prisma.labResult.create.mockResolvedValue({
        id: 'lr-5',
        testCode: 'TSH',
        value: 2.0,
        status: 'NORMAL',
        isCritical: false,
        previousValue: 3.0,
        changeDirection: 'DECREASED',
        changePercentage: -33.33,
      });

      const result = await service.uploadResult('lo-2', 'labtech-1', {
        testCode: 'TSH',
        testName: 'Thyroid Stimulating Hormone',
        value: 2.0,
        unit: 'mIU/L',
        referenceRangeMin: 0.4,
        referenceRangeMax: 4.0,
      });

      expect(result.previousValue).toBe(3.0);
      expect(result.changeDirection).toBe('DECREASED');
    });

    it('should throw if order not in PROCESSING status', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'SAMPLE_RECEIVED',
      });

      await expect(
        service.uploadResult('lo-1', 'labtech-1', {
          testCode: 'TSH',
          testName: 'TSH',
          value: 2.5,
          unit: 'mIU/L',
          referenceRangeMin: 0.4,
          referenceRangeMax: 4.0,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if order not found', async () => {
      prisma.labOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadResult('lo-999', 'labtech-1', {
          testCode: 'TSH',
          testName: 'TSH',
          value: 2.5,
          unit: 'mIU/L',
          referenceRangeMin: 0.4,
          referenceRangeMax: 4.0,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // markResultsReady
  // ========================================

  describe('markResultsReady', () => {
    it('should transition PROCESSING → RESULTS_READY and notify doctor', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'PROCESSING',
        doctorId: 'doctor-1',
        patientId: 'patient-1',
        criticalValues: false,
      });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        status: 'RESULTS_READY',
        resultsUploadedAt: expect.any(Date),
        resultsUploadedByLabTechId: 'labtech-1',
      });

      const result = await service.markResultsReady('lo-1', 'labtech-1');

      expect(result.status).toBe('RESULTS_READY');
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'doctor-1',
          eventType: 'LAB_RESULTS_READY',
        }),
      );
    });

    it('should also accept from RESULTS_PARTIAL status', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'RESULTS_PARTIAL',
        doctorId: 'doctor-1',
        patientId: 'patient-1',
        criticalValues: false,
      });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        status: 'RESULTS_READY',
      });

      const result = await service.markResultsReady('lo-1', 'labtech-1');

      expect(result.status).toBe('RESULTS_READY');
    });

    it('should include urgent flag in doctor notification when critical values exist', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'PROCESSING',
        doctorId: 'doctor-1',
        patientId: 'patient-1',
        criticalValues: true,
      });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        status: 'RESULTS_READY',
      });

      await service.markResultsReady('lo-1', 'labtech-1');

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('URGENT'),
        }),
      );
    });
  });

  // ========================================
  // reportSampleIssue
  // ========================================

  describe('reportSampleIssue', () => {
    it('should transition to SAMPLE_ISSUE and link phlebotomist', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'SAMPLE_RECEIVED',
        labPhlebotomistId: 'phleb-1',
        patientId: 'patient-1',
      });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        status: 'SAMPLE_ISSUE',
        sampleIssueType: 'hemolyzed',
        sampleIssueReportedByLabTechId: 'labtech-1',
        sampleIssueLinkedPhlebotomistId: 'phleb-1',
      });
      prisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);

      const result = await service.reportSampleIssue(
        'lo-1', 'labtech-1', 'hemolyzed',
      );

      expect(result.status).toBe('SAMPLE_ISSUE');
      expect(result.sampleIssueType).toBe('hemolyzed');
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'LAB_SAMPLE_ISSUE',
        }),
      );
    });

    it('should also accept from PROCESSING status', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'PROCESSING',
        labPhlebotomistId: 'phleb-1',
      });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        status: 'SAMPLE_ISSUE',
        sampleIssueType: 'insufficient',
      });
      prisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);

      const result = await service.reportSampleIssue(
        'lo-1', 'labtech-1', 'insufficient',
      );

      expect(result.status).toBe('SAMPLE_ISSUE');
    });

    it('should throw if invalid status for sample issue', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'ORDERED',
      });

      await expect(
        service.reportSampleIssue('lo-1', 'labtech-1', 'hemolyzed'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================
  // acknowledgeCriticalValue
  // ========================================

  describe('acknowledgeCriticalValue', () => {
    it('should record doctor acknowledgment of critical value', async () => {
      prisma.labResult.findMany.mockResolvedValue([
        {
          id: 'lr-1',
          testCode: 'TSH',
          value: 15.0,
          isCritical: true,
          criticalAcknowledgedAt: null,
        },
      ]);
      prisma.labResult.findFirst.mockResolvedValue({
        id: 'lr-1',
        labOrderId: 'lo-1',
        testCode: 'TSH',
        isCritical: true,
      });
      // We'll mock create to track the update via our method
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        criticalValues: true,
      });

      const result = await service.acknowledgeCriticalValue(
        'lo-1', 'lr-1', 'doctor-1', 'Patient contacted, urgent follow-up scheduled',
      );

      expect(result).toBeDefined();
    });

    it('should throw if result is not critical', async () => {
      prisma.labResult.findFirst.mockResolvedValue({
        id: 'lr-1',
        labOrderId: 'lo-1',
        testCode: 'TSH',
        isCritical: false,
      });

      await expect(
        service.acknowledgeCriticalValue('lo-1', 'lr-1', 'doctor-1', 'notes'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if result not found', async () => {
      prisma.labResult.findFirst.mockResolvedValue(null);

      await expect(
        service.acknowledgeCriticalValue('lo-1', 'lr-999', 'doctor-1', 'notes'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // doctorReviewResults
  // ========================================

  describe('doctorReviewResults', () => {
    it('should transition RESULTS_READY → DOCTOR_REVIEWED and notify patient', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'RESULTS_READY',
        patientId: 'patient-1',
      });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        status: 'DOCTOR_REVIEWED',
        doctorReviewedAt: expect.any(Date),
        doctorReviewNotes: 'All values look good. Continue current treatment.',
      });

      const result = await service.doctorReviewResults(
        'lo-1', 'doctor-1', 'All values look good. Continue current treatment.',
      );

      expect(result.status).toBe('DOCTOR_REVIEWED');
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'patient-1',
          eventType: 'LAB_DOCTOR_REVIEWED',
        }),
      );
    });

    it('should throw if not RESULTS_READY status', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'PROCESSING',
      });

      await expect(
        service.doctorReviewResults('lo-1', 'doctor-1', 'notes'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
