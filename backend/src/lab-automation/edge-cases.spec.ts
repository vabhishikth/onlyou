import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { LabOrderCreationService } from './lab-order-creation.service';
import { SlotAssignmentService } from './slot-assignment.service';
import { CollectionTrackingService } from './collection-tracking.service';
import { LabProcessingService } from './lab-processing.service';
import { BiomarkerDashboardService } from './biomarker-dashboard.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  isValidLabOrderTransition,
  requiresFasting,
  isCriticalValue,
  determineResultStatus,
  FASTING_REQUIRED_TESTS,
  GLP1_PROTOCOL_TESTS,
  PCOS_PROTOCOL_TESTS,
  LAB_SLA_HOURS,
} from './constants';

// Spec: Phase 16 Chunk 9 — Edge Cases Hardening

describe('Lab Automation Edge Cases', () => {
  // ========================================
  // Status Transition Validation
  // ========================================

  describe('Status transition validation', () => {
    it('should allow ORDERED → PAYMENT_PENDING', () => {
      expect(isValidLabOrderTransition('ORDERED', 'PAYMENT_PENDING')).toBe(true);
    });

    it('should allow ORDERED → SLOT_BOOKED (blood work included)', () => {
      expect(isValidLabOrderTransition('ORDERED', 'SLOT_BOOKED')).toBe(true);
    });

    it('should not allow ORDERED → SAMPLE_COLLECTED (skip steps)', () => {
      expect(isValidLabOrderTransition('ORDERED', 'SAMPLE_COLLECTED')).toBe(false);
    });

    it('should not allow CANCELLED → any status', () => {
      expect(isValidLabOrderTransition('CANCELLED', 'ORDERED')).toBe(false);
      expect(isValidLabOrderTransition('CANCELLED', 'SLOT_BOOKED')).toBe(false);
    });

    it('should not allow CLOSED → any status', () => {
      expect(isValidLabOrderTransition('CLOSED', 'ORDERED')).toBe(false);
    });

    it('should allow COLLECTION_FAILED → SLOT_BOOKED (rebooking)', () => {
      expect(isValidLabOrderTransition('COLLECTION_FAILED', 'SLOT_BOOKED')).toBe(true);
    });

    it('should allow COLLECTION_FAILED → CANCELLED', () => {
      expect(isValidLabOrderTransition('COLLECTION_FAILED', 'CANCELLED')).toBe(true);
    });

    it('should allow SAMPLE_ISSUE → ORDERED (free recollection)', () => {
      expect(isValidLabOrderTransition('SAMPLE_ISSUE', 'ORDERED')).toBe(true);
    });

    it('should allow RESULTS_UPLOADED → DOCTOR_REVIEWED (patient upload)', () => {
      expect(isValidLabOrderTransition('RESULTS_UPLOADED', 'DOCTOR_REVIEWED')).toBe(true);
    });

    it('should return false for unknown status', () => {
      expect(isValidLabOrderTransition('UNKNOWN_STATUS', 'ORDERED')).toBe(false);
    });
  });

  // ========================================
  // Fasting Detection Edge Cases
  // ========================================

  describe('Fasting detection edge cases', () => {
    it('should detect fasting for mixed panel with one fasting test', () => {
      expect(requiresFasting(['CBC', 'TSH', 'fasting_glucose'])).toBe(true);
    });

    it('should not detect fasting for all non-fasting tests', () => {
      expect(requiresFasting(['CBC', 'TSH', 'amylase', 'lipase'])).toBe(false);
    });

    it('should detect fasting for lipid panel', () => {
      expect(requiresFasting(['lipid_panel'])).toBe(true);
    });

    it('should detect fasting for HbA1c', () => {
      expect(requiresFasting(['HbA1c'])).toBe(true);
    });

    it('should detect fasting for insulin', () => {
      expect(requiresFasting(['insulin'])).toBe(true);
    });

    it('should return false for empty test array', () => {
      expect(requiresFasting([])).toBe(false);
    });
  });

  // ========================================
  // Critical Value Detection Edge Cases
  // ========================================

  describe('Critical value detection edge cases', () => {
    it('should flag TSH=0.05 as critical low', () => {
      expect(isCriticalValue('TSH', 0.05)).toBe(true);
    });

    it('should flag TSH=12 as critical high', () => {
      expect(isCriticalValue('TSH', 12)).toBe(true);
    });

    it('should not flag TSH=2.5 (normal range)', () => {
      expect(isCriticalValue('TSH', 2.5)).toBe(false);
    });

    it('should flag glucose=45 as critical low', () => {
      expect(isCriticalValue('fasting_glucose', 45)).toBe(true);
    });

    it('should flag glucose=350 as critical high', () => {
      expect(isCriticalValue('fasting_glucose', 350)).toBe(true);
    });

    it('should not flag unknown test code as critical', () => {
      expect(isCriticalValue('unknown_test', 999999)).toBe(false);
    });

    it('should handle boundary value exactly at critical threshold', () => {
      // TSH critical high is 10, so exactly 10 should not be critical (>10 is)
      expect(isCriticalValue('TSH', 10)).toBe(false);
    });
  });

  // ========================================
  // Result Status Determination
  // ========================================

  describe('Result status determination', () => {
    it('should return NORMAL for value within reference range', () => {
      expect(determineResultStatus('TSH', 2.5, 0.4, 4.0)).toBe('NORMAL');
    });

    it('should return LOW for value below reference but above critical', () => {
      expect(determineResultStatus('fasting_glucose', 60, 70, 100)).toBe('LOW');
    });

    it('should return HIGH for value above reference but below critical', () => {
      expect(determineResultStatus('fasting_glucose', 120, 70, 100)).toBe('HIGH');
    });

    it('should return CRITICAL_LOW for value below critical threshold', () => {
      expect(determineResultStatus('fasting_glucose', 40, 70, 100)).toBe('CRITICAL_LOW');
    });

    it('should return CRITICAL_HIGH for value above critical threshold', () => {
      expect(determineResultStatus('TSH', 15, 0.4, 4.0)).toBe('CRITICAL_HIGH');
    });

    it('should fall back to reference range for unknown test codes', () => {
      // Unknown test — no critical thresholds, just check reference
      expect(determineResultStatus('unknown', 50, 60, 100)).toBe('LOW');
      expect(determineResultStatus('unknown', 110, 60, 100)).toBe('HIGH');
      expect(determineResultStatus('unknown', 80, 60, 100)).toBe('NORMAL');
    });
  });

  // ========================================
  // Protocol Test Coverage
  // ========================================

  describe('Protocol test coverage', () => {
    it('GLP-1 protocol should include all required tests', () => {
      expect(GLP1_PROTOCOL_TESTS).toContain('amylase');
      expect(GLP1_PROTOCOL_TESTS).toContain('lipase');
      expect(GLP1_PROTOCOL_TESTS).toContain('metabolic_panel');
      expect(GLP1_PROTOCOL_TESTS).toContain('HbA1c');
      expect(GLP1_PROTOCOL_TESTS).toContain('fasting_glucose');
      expect(GLP1_PROTOCOL_TESTS).toContain('lipid_panel');
      expect(GLP1_PROTOCOL_TESTS).toContain('CBC');
      expect(GLP1_PROTOCOL_TESTS).toContain('TSH');
      expect(GLP1_PROTOCOL_TESTS).toHaveLength(8);
    });

    it('PCOS protocol should include all required tests', () => {
      expect(PCOS_PROTOCOL_TESTS).toContain('FSH');
      expect(PCOS_PROTOCOL_TESTS).toContain('LH');
      expect(PCOS_PROTOCOL_TESTS).toContain('DHEA_S');
      expect(PCOS_PROTOCOL_TESTS).toContain('testosterone');
      expect(PCOS_PROTOCOL_TESTS).toContain('TSH');
      expect(PCOS_PROTOCOL_TESTS).toContain('fasting_glucose');
      expect(PCOS_PROTOCOL_TESTS).toContain('insulin');
      expect(PCOS_PROTOCOL_TESTS).toContain('lipid_panel');
      expect(PCOS_PROTOCOL_TESTS).toHaveLength(8);
    });

    it('GLP-1 protocol requires fasting (includes fasting_glucose)', () => {
      expect(requiresFasting([...GLP1_PROTOCOL_TESTS])).toBe(true);
    });

    it('PCOS protocol requires fasting (includes fasting_glucose + insulin)', () => {
      expect(requiresFasting([...PCOS_PROTOCOL_TESTS])).toBe(true);
    });
  });

  // ========================================
  // SLA Configuration
  // ========================================

  describe('SLA configuration', () => {
    it('should have correct SLA hours', () => {
      expect(LAB_SLA_HOURS.RESULTS_STANDARD).toBe(48);
      expect(LAB_SLA_HOURS.RESULTS_ESCALATION).toBe(72);
      expect(LAB_SLA_HOURS.CRITICAL_ACKNOWLEDGMENT).toBe(1);
      expect(LAB_SLA_HOURS.COLLECTION_BOOKING).toBe(24);
      expect(LAB_SLA_HOURS.FOLLOW_UP_MONTHS).toBe(3);
    });
  });

  // ========================================
  // Service Integration Edge Cases
  // ========================================

  describe('Collection tracking edge cases', () => {
    let collectionService: CollectionTrackingService;
    let prisma: any;
    let notificationService: any;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CollectionTrackingService,
          {
            provide: PrismaService,
            useValue: {
              labOrder: {
                findUnique: jest.fn(),
                update: jest.fn(),
              },
              labPhlebotomist: {
                findUnique: jest.fn(),
                update: jest.fn(),
              },
              phlebotomistDailyRoster: {
                findUnique: jest.fn(),
                update: jest.fn(),
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

      collectionService = module.get<CollectionTrackingService>(CollectionTrackingService);
      prisma = module.get(PrismaService);
      notificationService = module.get(NotificationService);
    });

    it('should throw if marking sample collected with no order found', async () => {
      prisma.labOrder.findUnique.mockResolvedValue(null);

      await expect(
        collectionService.markSampleCollected('lo-999', 'phleb-1', 3),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if marking en route from wrong status', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'SAMPLE_COLLECTED', // wrong
        labPhlebotomistId: 'phleb-1',
      });

      await expect(
        collectionService.markEnRoute('lo-1', 'phleb-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle fasting verification on non-fasting order gracefully', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'PHLEBOTOMIST_EN_ROUTE',
        labPhlebotomistId: 'phleb-1',
        requiresFasting: false,
      });

      const result = await collectionService.verifyFastingStatus('lo-1', 'phleb-1', true);
      expect(result).toBeNull(); // No-op for non-fasting orders
    });
  });

  describe('Lab processing edge cases', () => {
    let processingService: LabProcessingService;
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

      processingService = module.get<LabProcessingService>(LabProcessingService);
      prisma = module.get(PrismaService);
      notificationService = module.get(NotificationService);
    });

    it('should handle upload result with no previous lab order', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'PROCESSING',
        patientId: 'patient-1',
        previousLabOrderId: null,
      });
      prisma.labResult.findFirst.mockResolvedValue(null);
      prisma.labResult.create.mockResolvedValue({
        id: 'lr-1',
        testCode: 'CBC',
        value: 5.2,
        status: 'NORMAL',
        isCritical: false,
        changeDirection: 'NEW',
      });

      const result = await processingService.uploadResult('lo-1', 'labtech-1', {
        testCode: 'CBC',
        testName: 'Complete Blood Count',
        value: 5.2,
        unit: '10^6/uL',
        referenceRangeMin: 4.5,
        referenceRangeMax: 5.5,
      });

      expect(result.changeDirection).toBe('NEW');
    });

    it('should handle sample issue from PROCESSING status', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'PROCESSING',
        labPhlebotomistId: 'phleb-1',
      });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        status: 'SAMPLE_ISSUE',
        sampleIssueType: 'clotted',
      });
      prisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);

      const result = await processingService.reportSampleIssue('lo-1', 'labtech-1', 'clotted');
      expect(result.status).toBe('SAMPLE_ISSUE');
    });

    it('should handle doctorReviewResults from non RESULTS_READY status', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'PROCESSING', // wrong status
      });

      await expect(
        processingService.doctorReviewResults('lo-1', 'doctor-1', 'notes'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Biomarker dashboard edge cases', () => {
    let dashboardService: BiomarkerDashboardService;
    let prisma: any;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BiomarkerDashboardService,
          {
            provide: PrismaService,
            useValue: {
              labOrder: {
                findMany: jest.fn(),
                findUnique: jest.fn(),
              },
              labResult: {
                findMany: jest.fn(),
              },
            },
          },
        ],
      }).compile();

      dashboardService = module.get<BiomarkerDashboardService>(BiomarkerDashboardService);
      prisma = module.get(PrismaService);
    });

    it('should return empty history for patient with no results', async () => {
      prisma.labOrder.findMany.mockResolvedValue([
        { id: 'lo-1', status: 'DOCTOR_REVIEWED' },
      ]);
      prisma.labResult.findMany.mockResolvedValue([]);

      const result = await dashboardService.getPatientBiomarkerHistory('patient-1');
      expect(result).toHaveLength(0);
    });

    it('should handle getLatestResults with no completed orders', async () => {
      prisma.labOrder.findMany.mockResolvedValue([]);

      const result = await dashboardService.getLatestResults('patient-1');
      expect(result).toHaveLength(0);
    });
  });
});
