import { Test, TestingModule } from '@nestjs/testing';
import { BiomarkerDashboardService } from './biomarker-dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

// Spec: Phase 16 Chunk 7 — Biomarker Dashboard Data Layer

describe('BiomarkerDashboardService', () => {
  let service: BiomarkerDashboardService;
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

    service = module.get<BiomarkerDashboardService>(BiomarkerDashboardService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========================================
  // getPatientBiomarkerHistory
  // ========================================

  describe('getPatientBiomarkerHistory', () => {
    it('should return all results grouped by test code with trend data', async () => {
      prisma.labOrder.findMany.mockResolvedValue([
        { id: 'lo-1', status: 'DOCTOR_REVIEWED', createdAt: new Date('2025-12-01') },
        { id: 'lo-2', status: 'DOCTOR_REVIEWED', createdAt: new Date('2026-03-01') },
      ]);
      prisma.labResult.findMany.mockResolvedValue([
        {
          id: 'lr-1',
          labOrderId: 'lo-1',
          testCode: 'TSH',
          testName: 'Thyroid Stimulating Hormone',
          value: 3.5,
          unit: 'mIU/L',
          status: 'NORMAL',
          isCritical: false,
          referenceRangeMin: 0.4,
          referenceRangeMax: 4.0,
          changeDirection: 'NEW',
          createdAt: new Date('2025-12-01'),
        },
        {
          id: 'lr-2',
          labOrderId: 'lo-2',
          testCode: 'TSH',
          testName: 'Thyroid Stimulating Hormone',
          value: 2.1,
          unit: 'mIU/L',
          status: 'NORMAL',
          isCritical: false,
          referenceRangeMin: 0.4,
          referenceRangeMax: 4.0,
          changeDirection: 'DECREASED',
          changePercentage: -40.0,
          previousValue: 3.5,
          createdAt: new Date('2026-03-01'),
        },
        {
          id: 'lr-3',
          labOrderId: 'lo-1',
          testCode: 'fasting_glucose',
          testName: 'Fasting Glucose',
          value: 95,
          unit: 'mg/dL',
          status: 'NORMAL',
          isCritical: false,
          referenceRangeMin: 70,
          referenceRangeMax: 100,
          changeDirection: 'NEW',
          createdAt: new Date('2025-12-01'),
        },
      ]);

      const result = await service.getPatientBiomarkerHistory('patient-1');

      expect(result).toHaveLength(2); // 2 test codes: TSH and fasting_glucose
      const tshGroup = result.find((g: any) => g.testCode === 'TSH');
      expect(tshGroup).toBeDefined();
      expect(tshGroup.results).toHaveLength(2);
      expect(tshGroup.latestValue).toBe(2.1);
      expect(tshGroup.latestStatus).toBe('NORMAL');
    });

    it('should return empty array if no lab orders exist', async () => {
      prisma.labOrder.findMany.mockResolvedValue([]);
      prisma.labResult.findMany.mockResolvedValue([]);

      const result = await service.getPatientBiomarkerHistory('patient-1');

      expect(result).toHaveLength(0);
    });
  });

  // ========================================
  // getTestTrend
  // ========================================

  describe('getTestTrend', () => {
    it('should return chronological values for a specific test code', async () => {
      prisma.labResult.findMany.mockResolvedValue([
        { id: 'lr-1', testCode: 'TSH', value: 3.5, createdAt: new Date('2025-09-01'), status: 'NORMAL' },
        { id: 'lr-2', testCode: 'TSH', value: 3.0, createdAt: new Date('2025-12-01'), status: 'NORMAL' },
        { id: 'lr-3', testCode: 'TSH', value: 2.1, createdAt: new Date('2026-03-01'), status: 'NORMAL' },
      ]);

      const result = await service.getTestTrend('patient-1', 'TSH');

      expect(result).toHaveLength(3);
      expect(result[0].value).toBe(3.5);
      expect(result[2].value).toBe(2.1);
    });

    it('should return empty array if no results for test code', async () => {
      prisma.labResult.findMany.mockResolvedValue([]);

      const result = await service.getTestTrend('patient-1', 'rare_test');

      expect(result).toHaveLength(0);
    });
  });

  // ========================================
  // getLatestResults
  // ========================================

  describe('getLatestResults', () => {
    it('should return latest result per test code', async () => {
      prisma.labOrder.findMany.mockResolvedValue([
        { id: 'lo-latest', status: 'DOCTOR_REVIEWED' },
      ]);
      prisma.labResult.findMany.mockResolvedValue([
        {
          id: 'lr-1',
          labOrderId: 'lo-latest',
          testCode: 'TSH',
          testName: 'Thyroid Stimulating Hormone',
          value: 2.1,
          unit: 'mIU/L',
          status: 'NORMAL',
          isCritical: false,
          referenceRangeMin: 0.4,
          referenceRangeMax: 4.0,
        },
        {
          id: 'lr-2',
          labOrderId: 'lo-latest',
          testCode: 'fasting_glucose',
          testName: 'Fasting Glucose',
          value: 92,
          unit: 'mg/dL',
          status: 'NORMAL',
          isCritical: false,
          referenceRangeMin: 70,
          referenceRangeMax: 100,
        },
      ]);

      const result = await service.getLatestResults('patient-1');

      expect(result).toHaveLength(2);
      expect(result.find((r: any) => r.testCode === 'TSH')).toBeDefined();
      expect(result.find((r: any) => r.testCode === 'fasting_glucose')).toBeDefined();
    });
  });

  // ========================================
  // getLabOrderSummary
  // ========================================

  describe('getLabOrderSummary', () => {
    it('should return lab order with all results for doctor view', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'RESULTS_READY',
        testPanel: ['TSH', 'CBC'],
        labResults: [
          { id: 'lr-1', testCode: 'TSH', value: 2.5, status: 'NORMAL', isCritical: false },
          { id: 'lr-2', testCode: 'CBC', value: 5.2, status: 'NORMAL', isCritical: false },
        ],
      });

      const result = await service.getLabOrderSummary('lo-1');

      expect(result).toBeDefined();
      expect(result.labResults).toHaveLength(2);
    });

    it('should throw if lab order not found', async () => {
      prisma.labOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.getLabOrderSummary('lo-999'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // getCriticalValuesSummary
  // ========================================

  describe('getCriticalValuesSummary', () => {
    it('should return only critical results for a patient', async () => {
      prisma.labResult.findMany.mockResolvedValue([
        {
          id: 'lr-crit-1',
          testCode: 'TSH',
          value: 15.0,
          status: 'CRITICAL_HIGH',
          isCritical: true,
          criticalAcknowledgedAt: null,
          createdAt: new Date('2026-02-15'),
        },
      ]);

      const result = await service.getCriticalValuesSummary('patient-1');

      expect(result).toHaveLength(1);
      expect(result[0].isCritical).toBe(true);
      expect(result[0].criticalAcknowledgedAt).toBeNull();
    });

    it('should return empty array if no critical values', async () => {
      prisma.labResult.findMany.mockResolvedValue([]);

      const result = await service.getCriticalValuesSummary('patient-1');

      expect(result).toHaveLength(0);
    });
  });
});
