// Spec: master spec Section 7.1 — Lab Portal
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { LabPortalService } from './lab-portal.service';
import { PrismaService } from '../prisma/prisma.service';
import { LabOrderStatus } from '../lab-order/lab-order.service';

// ── Mock Data ──────────────────────────────────────────────────────────────────

const mockLab = {
  id: 'lab-1',
  name: 'Test Lab',
  city: 'Mumbai',
  isActive: true,
};

const now = new Date();

const mockPatient = { name: 'Rahul Sharma' };
const mockPhlebotomist = { name: 'Ajay Kumar' };

const baseMockLabOrder = {
  id: 'order-abc12345',
  diagnosticCentreId: 'lab-1',
  status: LabOrderStatus.DELIVERED_TO_LAB,
  testPanel: ['TSH', 'CBC'],
  panelName: 'Thyroid Panel',
  tubeCount: 2,
  receivedTubeCount: null,
  tubeCountMismatch: false,
  deliveredToLabAt: now,
  sampleReceivedAt: null,
  processingStartedAt: null,
  resultsUploadedAt: null,
  sampleIssueAt: null,
  sampleIssueReason: null,
  resultFileUrl: null,
  abnormalFlags: null,
  criticalValues: false,
  patientId: 'patient-1',
  consultationId: 'consult-1',
  doctorId: 'doctor-1',
  collectionAddress: '123 Main St',
  collectionCity: 'Mumbai',
  collectionPincode: '400001',
  labCost: 50000,
  patientCharge: 60000,
  coveredBySubscription: false,
  isFreeRecollection: false,
  parentLabOrderId: null,
  createdAt: now,
  patient: mockPatient,
  phlebotomist: mockPhlebotomist,
};

// Helper to create order variants
const makeOrder = (overrides: Record<string, any> = {}) => ({
  ...baseMockLabOrder,
  ...overrides,
});

// ── Test Suite ──────────────────────────────────────────────────────────────────

describe('LabPortalService', () => {
  let service: LabPortalService;
  let prisma: {
    partnerDiagnosticCentre: {
      findUnique: jest.Mock;
    };
    labOrder: {
      count: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      partnerDiagnosticCentre: {
        findUnique: jest.fn(),
      },
      labOrder: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabPortalService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<LabPortalService>(LabPortalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── getLabInfo ─────────────────────────────────────────────────────────────

  describe('getLabInfo', () => {
    it('should return lab info when lab exists', async () => {
      prisma.partnerDiagnosticCentre.findUnique.mockResolvedValue(mockLab);

      const result = await service.getLabInfo('lab-1');

      expect(result).toEqual({
        id: 'lab-1',
        name: 'Test Lab',
        city: 'Mumbai',
        isActive: true,
      });
      expect(prisma.partnerDiagnosticCentre.findUnique).toHaveBeenCalledWith({
        where: { id: 'lab-1' },
      });
    });

    it('should throw NotFoundException when lab does not exist', async () => {
      prisma.partnerDiagnosticCentre.findUnique.mockResolvedValue(null);

      await expect(service.getLabInfo('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getLabInfo('nonexistent')).rejects.toThrow(
        'Lab not found',
      );
    });
  });

  // ── getTodaySummary ────────────────────────────────────────────────────────

  describe('getTodaySummary', () => {
    it('should return incoming, inProgress, and completed counts', async () => {
      prisma.labOrder.count
        .mockResolvedValueOnce(5) // incoming
        .mockResolvedValueOnce(3) // inProgress
        .mockResolvedValueOnce(7); // completed

      const result = await service.getTodaySummary('lab-1');

      expect(result).toEqual({
        incoming: 5,
        inProgress: 3,
        completed: 7,
      });
      expect(prisma.labOrder.count).toHaveBeenCalledTimes(3);
    });

    it('should query incoming with DELIVERED_TO_LAB status', async () => {
      prisma.labOrder.count.mockResolvedValue(0);

      await service.getTodaySummary('lab-1');

      const firstCall = prisma.labOrder.count.mock.calls[0][0];
      expect(firstCall.where.diagnosticCentreId).toBe('lab-1');
      expect(firstCall.where.status).toBe(LabOrderStatus.DELIVERED_TO_LAB);
    });

    it('should query inProgress with SAMPLE_RECEIVED and PROCESSING statuses', async () => {
      prisma.labOrder.count.mockResolvedValue(0);

      await service.getTodaySummary('lab-1');

      const secondCall = prisma.labOrder.count.mock.calls[1][0];
      expect(secondCall.where.diagnosticCentreId).toBe('lab-1');
      expect(secondCall.where.status).toEqual({
        in: [LabOrderStatus.SAMPLE_RECEIVED, LabOrderStatus.PROCESSING],
      });
    });

    it('should query completed with RESULTS_READY status and today date range', async () => {
      prisma.labOrder.count.mockResolvedValue(0);

      await service.getTodaySummary('lab-1');

      const thirdCall = prisma.labOrder.count.mock.calls[2][0];
      expect(thirdCall.where.diagnosticCentreId).toBe('lab-1');
      expect(thirdCall.where.status).toBe(LabOrderStatus.RESULTS_READY);
      expect(thirdCall.where.resultsUploadedAt).toBeDefined();
      expect(thirdCall.where.resultsUploadedAt.gte).toBeInstanceOf(Date);
      expect(thirdCall.where.resultsUploadedAt.lt).toBeInstanceOf(Date);
    });

    it('should return all zeros when lab has no orders', async () => {
      prisma.labOrder.count.mockResolvedValue(0);

      const result = await service.getTodaySummary('lab-1');

      expect(result).toEqual({ incoming: 0, inProgress: 0, completed: 0 });
    });
  });

  // ── getIncomingSamples ─────────────────────────────────────────────────────

  describe('getIncomingSamples', () => {
    it('should return DELIVERED_TO_LAB orders mapped to LabSampleSummary', async () => {
      const orders = [makeOrder()];
      prisma.labOrder.findMany.mockResolvedValue(orders);

      const result = await service.getIncomingSamples('lab-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'order-abc12345',
        sampleId: 'ABC12345', // last 8 chars of 'order-abc12345' uppercased
        panelName: 'Thyroid Panel',
        testsOrdered: ['TSH', 'CBC'],
        deliveredBy: 'Ajay Kumar',
        status: LabOrderStatus.DELIVERED_TO_LAB,
        patientInitials: 'RS',
      });
    });

    it('should query with DELIVERED_TO_LAB status and order by deliveredToLabAt asc', async () => {
      prisma.labOrder.findMany.mockResolvedValue([]);

      await service.getIncomingSamples('lab-1');

      expect(prisma.labOrder.findMany).toHaveBeenCalledWith({
        where: {
          diagnosticCentreId: 'lab-1',
          status: LabOrderStatus.DELIVERED_TO_LAB,
        },
        include: {
          patient: { select: { name: true } },
          phlebotomist: { select: { name: true } },
        },
        orderBy: { deliveredToLabAt: 'asc' },
      });
    });

    it('should return empty array when no incoming samples exist', async () => {
      prisma.labOrder.findMany.mockResolvedValue([]);

      const result = await service.getIncomingSamples('lab-1');

      expect(result).toEqual([]);
    });

    it('should generate patient initials from full name', async () => {
      const orders = [
        makeOrder({ patient: { name: 'Amit Rajesh Patel' } }),
      ];
      prisma.labOrder.findMany.mockResolvedValue(orders);

      const result = await service.getIncomingSamples('lab-1');

      expect(result[0].patientInitials).toBe('ARP');
    });

    it('should handle missing patient name', async () => {
      const orders = [makeOrder({ patient: null })];
      prisma.labOrder.findMany.mockResolvedValue(orders);

      const result = await service.getIncomingSamples('lab-1');

      expect(result[0].patientInitials).toBe('U'); // 'Unknown' -> 'U'
    });

    it('should handle missing phlebotomist', async () => {
      const orders = [makeOrder({ phlebotomist: null })];
      prisma.labOrder.findMany.mockResolvedValue(orders);

      const result = await service.getIncomingSamples('lab-1');

      expect(result[0].deliveredBy).toBeNull();
    });
  });

  // ── getInProgressSamples ───────────────────────────────────────────────────

  describe('getInProgressSamples', () => {
    it('should return SAMPLE_RECEIVED and PROCESSING orders', async () => {
      const orders = [
        makeOrder({ status: LabOrderStatus.SAMPLE_RECEIVED }),
        makeOrder({
          id: 'order-def67890',
          status: LabOrderStatus.PROCESSING,
        }),
      ];
      prisma.labOrder.findMany.mockResolvedValue(orders);

      const result = await service.getInProgressSamples('lab-1');

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe(LabOrderStatus.SAMPLE_RECEIVED);
      expect(result[1].status).toBe(LabOrderStatus.PROCESSING);
    });

    it('should query with correct statuses and order by sampleReceivedAt asc', async () => {
      prisma.labOrder.findMany.mockResolvedValue([]);

      await service.getInProgressSamples('lab-1');

      expect(prisma.labOrder.findMany).toHaveBeenCalledWith({
        where: {
          diagnosticCentreId: 'lab-1',
          status: {
            in: [LabOrderStatus.SAMPLE_RECEIVED, LabOrderStatus.PROCESSING],
          },
        },
        include: {
          patient: { select: { name: true } },
          phlebotomist: { select: { name: true } },
        },
        orderBy: { sampleReceivedAt: 'asc' },
      });
    });

    it('should return empty array when no in-progress samples exist', async () => {
      prisma.labOrder.findMany.mockResolvedValue([]);

      const result = await service.getInProgressSamples('lab-1');

      expect(result).toEqual([]);
    });
  });

  // ── getCompletedSamples ────────────────────────────────────────────────────

  describe('getCompletedSamples', () => {
    it('should return RESULTS_READY orders from today', async () => {
      const orders = [
        makeOrder({
          status: LabOrderStatus.RESULTS_READY,
          resultsUploadedAt: now,
        }),
      ];
      prisma.labOrder.findMany.mockResolvedValue(orders);

      const result = await service.getCompletedSamples('lab-1');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(LabOrderStatus.RESULTS_READY);
    });

    it('should query with today date range and order by resultsUploadedAt desc', async () => {
      prisma.labOrder.findMany.mockResolvedValue([]);

      await service.getCompletedSamples('lab-1');

      const call = prisma.labOrder.findMany.mock.calls[0][0];
      expect(call.where.diagnosticCentreId).toBe('lab-1');
      expect(call.where.status).toBe(LabOrderStatus.RESULTS_READY);
      expect(call.where.resultsUploadedAt.gte).toBeInstanceOf(Date);
      expect(call.where.resultsUploadedAt.lt).toBeInstanceOf(Date);
      expect(call.orderBy).toEqual({ resultsUploadedAt: 'desc' });
    });

    it('should return empty array when no completed samples today', async () => {
      prisma.labOrder.findMany.mockResolvedValue([]);

      const result = await service.getCompletedSamples('lab-1');

      expect(result).toEqual([]);
    });
  });

  // ── markSampleReceived ─────────────────────────────────────────────────────

  describe('markSampleReceived', () => {
    it('should transition DELIVERED_TO_LAB to SAMPLE_RECEIVED', async () => {
      const order = makeOrder({ status: LabOrderStatus.DELIVERED_TO_LAB });
      prisma.labOrder.findUnique.mockResolvedValue(order);

      const updatedOrder = makeOrder({
        status: LabOrderStatus.SAMPLE_RECEIVED,
        sampleReceivedAt: now,
        receivedTubeCount: 2,
        tubeCountMismatch: false,
      });
      prisma.labOrder.update.mockResolvedValue(updatedOrder);

      const result = await service.markSampleReceived('lab-1', 'order-abc12345', 2);

      expect(result.status).toBe(LabOrderStatus.SAMPLE_RECEIVED);
      expect(prisma.labOrder.update).toHaveBeenCalledWith({
        where: { id: 'order-abc12345' },
        data: expect.objectContaining({
          status: LabOrderStatus.SAMPLE_RECEIVED,
          sampleReceivedAt: expect.any(Date),
          receivedTubeCount: 2,
          tubeCountMismatch: false,
        }),
        include: {
          patient: { select: { name: true } },
          phlebotomist: { select: { name: true } },
        },
      });
    });

    it('should detect tube count mismatch when counts differ', async () => {
      const order = makeOrder({
        status: LabOrderStatus.DELIVERED_TO_LAB,
        tubeCount: 3,
      });
      prisma.labOrder.findUnique.mockResolvedValue(order);
      prisma.labOrder.update.mockResolvedValue(
        makeOrder({
          status: LabOrderStatus.SAMPLE_RECEIVED,
          tubeCountMismatch: true,
          receivedTubeCount: 2,
        }),
      );

      await service.markSampleReceived('lab-1', 'order-abc12345', 2);

      expect(prisma.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tubeCountMismatch: true,
          }),
        }),
      );
    });

    it('should not flag mismatch when tube counts match', async () => {
      const order = makeOrder({
        status: LabOrderStatus.DELIVERED_TO_LAB,
        tubeCount: 2,
      });
      prisma.labOrder.findUnique.mockResolvedValue(order);
      prisma.labOrder.update.mockResolvedValue(
        makeOrder({ status: LabOrderStatus.SAMPLE_RECEIVED }),
      );

      await service.markSampleReceived('lab-1', 'order-abc12345', 2);

      expect(prisma.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tubeCountMismatch: false,
          }),
        }),
      );
    });

    it('should not flag mismatch when original tubeCount is null', async () => {
      const order = makeOrder({
        status: LabOrderStatus.DELIVERED_TO_LAB,
        tubeCount: null,
      });
      prisma.labOrder.findUnique.mockResolvedValue(order);
      prisma.labOrder.update.mockResolvedValue(
        makeOrder({ status: LabOrderStatus.SAMPLE_RECEIVED }),
      );

      await service.markSampleReceived('lab-1', 'order-abc12345', 2);

      expect(prisma.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tubeCountMismatch: false,
          }),
        }),
      );
    });

    it('should throw BadRequestException when tube count is zero', async () => {
      const order = makeOrder({ status: LabOrderStatus.DELIVERED_TO_LAB });
      prisma.labOrder.findUnique.mockResolvedValue(order);

      await expect(
        service.markSampleReceived('lab-1', 'order-abc12345', 0),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.markSampleReceived('lab-1', 'order-abc12345', 0),
      ).rejects.toThrow('Tube count must be positive');
    });

    it('should throw BadRequestException when tube count is negative', async () => {
      const order = makeOrder({ status: LabOrderStatus.DELIVERED_TO_LAB });
      prisma.labOrder.findUnique.mockResolvedValue(order);

      await expect(
        service.markSampleReceived('lab-1', 'order-abc12345', -1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when order is not in DELIVERED_TO_LAB status', async () => {
      const order = makeOrder({ status: LabOrderStatus.PROCESSING });
      prisma.labOrder.findUnique.mockResolvedValue(order);

      await expect(
        service.markSampleReceived('lab-1', 'order-abc12345', 2),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.markSampleReceived('lab-1', 'order-abc12345', 2),
      ).rejects.toThrow('Cannot mark as received');
    });

    it('should throw BadRequestException when order is already SAMPLE_RECEIVED', async () => {
      const order = makeOrder({ status: LabOrderStatus.SAMPLE_RECEIVED });
      prisma.labOrder.findUnique.mockResolvedValue(order);

      await expect(
        service.markSampleReceived('lab-1', 'order-abc12345', 2),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      prisma.labOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.markSampleReceived('lab-1', 'nonexistent', 2),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when order belongs to different lab', async () => {
      const order = makeOrder({ diagnosticCentreId: 'lab-2' });
      prisma.labOrder.findUnique.mockResolvedValue(order);

      await expect(
        service.markSampleReceived('lab-1', 'order-abc12345', 2),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.markSampleReceived('lab-1', 'order-abc12345', 2),
      ).rejects.toThrow('You do not have access to this sample');
    });

    it('should return a mapped LabSampleSummary', async () => {
      const order = makeOrder({ status: LabOrderStatus.DELIVERED_TO_LAB });
      prisma.labOrder.findUnique.mockResolvedValue(order);
      prisma.labOrder.update.mockResolvedValue(
        makeOrder({ status: LabOrderStatus.SAMPLE_RECEIVED }),
      );

      const result = await service.markSampleReceived('lab-1', 'order-abc12345', 2);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('sampleId');
      expect(result).toHaveProperty('panelName');
      expect(result).toHaveProperty('testsOrdered');
      expect(result).toHaveProperty('deliveredBy');
      expect(result).toHaveProperty('deliveredAt');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('patientInitials');
      expect(result).toHaveProperty('createdAt');
    });
  });

  // ── reportSampleIssue ──────────────────────────────────────────────────────

  describe('reportSampleIssue', () => {
    it('should transition DELIVERED_TO_LAB to SAMPLE_ISSUE', async () => {
      const order = makeOrder({ status: LabOrderStatus.DELIVERED_TO_LAB });
      prisma.labOrder.findUnique.mockResolvedValue(order);
      prisma.labOrder.update.mockResolvedValue(
        makeOrder({ status: LabOrderStatus.SAMPLE_ISSUE }),
      );
      prisma.labOrder.create.mockResolvedValue({});

      const result = await service.reportSampleIssue(
        'lab-1',
        'order-abc12345',
        'Sample hemolyzed',
      );

      expect(result).toEqual({
        success: true,
        message: 'Issue reported. Free recollection has been scheduled.',
      });
      expect(prisma.labOrder.update).toHaveBeenCalledWith({
        where: { id: 'order-abc12345' },
        data: expect.objectContaining({
          status: LabOrderStatus.SAMPLE_ISSUE,
          sampleIssueAt: expect.any(Date),
          sampleIssueReason: 'Sample hemolyzed',
        }),
      });
    });

    it('should transition SAMPLE_RECEIVED to SAMPLE_ISSUE', async () => {
      const order = makeOrder({ status: LabOrderStatus.SAMPLE_RECEIVED });
      prisma.labOrder.findUnique.mockResolvedValue(order);
      prisma.labOrder.update.mockResolvedValue(
        makeOrder({ status: LabOrderStatus.SAMPLE_ISSUE }),
      );
      prisma.labOrder.create.mockResolvedValue({});

      const result = await service.reportSampleIssue(
        'lab-1',
        'order-abc12345',
        'Insufficient sample volume',
      );

      expect(result.success).toBe(true);
      expect(prisma.labOrder.update).toHaveBeenCalled();
    });

    it('should create a free recollection order', async () => {
      const order = makeOrder({ status: LabOrderStatus.DELIVERED_TO_LAB });
      prisma.labOrder.findUnique.mockResolvedValue(order);
      prisma.labOrder.update.mockResolvedValue({});
      prisma.labOrder.create.mockResolvedValue({});

      await service.reportSampleIssue(
        'lab-1',
        'order-abc12345',
        'Contaminated sample',
      );

      expect(prisma.labOrder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          parentLabOrderId: 'order-abc12345',
          isFreeRecollection: true,
          patientId: 'patient-1',
          consultationId: 'consult-1',
          doctorId: 'doctor-1',
          testPanel: ['TSH', 'CBC'],
          panelName: 'Thyroid Panel',
          collectionAddress: '123 Main St',
          collectionCity: 'Mumbai',
          collectionPincode: '400001',
          labCost: 50000,
          patientCharge: 0,
          coveredBySubscription: false,
          status: LabOrderStatus.ORDERED,
        }),
      });
    });

    it('should throw BadRequestException when reason is empty string', async () => {
      const order = makeOrder({ status: LabOrderStatus.DELIVERED_TO_LAB });
      prisma.labOrder.findUnique.mockResolvedValue(order);

      await expect(
        service.reportSampleIssue('lab-1', 'order-abc12345', ''),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.reportSampleIssue('lab-1', 'order-abc12345', ''),
      ).rejects.toThrow('Issue reason is required');
    });

    it('should throw BadRequestException when reason is whitespace only', async () => {
      const order = makeOrder({ status: LabOrderStatus.DELIVERED_TO_LAB });
      prisma.labOrder.findUnique.mockResolvedValue(order);

      await expect(
        service.reportSampleIssue('lab-1', 'order-abc12345', '   '),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when order is in PROCESSING status', async () => {
      const order = makeOrder({ status: LabOrderStatus.PROCESSING });
      prisma.labOrder.findUnique.mockResolvedValue(order);

      await expect(
        service.reportSampleIssue('lab-1', 'order-abc12345', 'Some issue'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.reportSampleIssue('lab-1', 'order-abc12345', 'Some issue'),
      ).rejects.toThrow('Cannot report issue');
    });

    it('should throw BadRequestException when order is in RESULTS_READY status', async () => {
      const order = makeOrder({ status: LabOrderStatus.RESULTS_READY });
      prisma.labOrder.findUnique.mockResolvedValue(order);

      await expect(
        service.reportSampleIssue('lab-1', 'order-abc12345', 'Some issue'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      prisma.labOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.reportSampleIssue('lab-1', 'nonexistent', 'Some issue'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when order belongs to different lab', async () => {
      const order = makeOrder({ diagnosticCentreId: 'lab-2' });
      prisma.labOrder.findUnique.mockResolvedValue(order);

      await expect(
        service.reportSampleIssue('lab-1', 'order-abc12345', 'Some issue'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── startProcessing ────────────────────────────────────────────────────────

  describe('startProcessing', () => {
    it('should transition SAMPLE_RECEIVED to PROCESSING', async () => {
      const order = makeOrder({ status: LabOrderStatus.SAMPLE_RECEIVED });
      prisma.labOrder.findUnique.mockResolvedValue(order);

      const updatedOrder = makeOrder({
        status: LabOrderStatus.PROCESSING,
        processingStartedAt: now,
      });
      prisma.labOrder.update.mockResolvedValue(updatedOrder);

      const result = await service.startProcessing('lab-1', 'order-abc12345');

      expect(result.status).toBe(LabOrderStatus.PROCESSING);
      expect(prisma.labOrder.update).toHaveBeenCalledWith({
        where: { id: 'order-abc12345' },
        data: expect.objectContaining({
          status: LabOrderStatus.PROCESSING,
          processingStartedAt: expect.any(Date),
        }),
        include: {
          patient: { select: { name: true } },
          phlebotomist: { select: { name: true } },
        },
      });
    });

    it('should throw BadRequestException when order is in DELIVERED_TO_LAB status', async () => {
      const order = makeOrder({ status: LabOrderStatus.DELIVERED_TO_LAB });
      prisma.labOrder.findUnique.mockResolvedValue(order);

      await expect(
        service.startProcessing('lab-1', 'order-abc12345'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.startProcessing('lab-1', 'order-abc12345'),
      ).rejects.toThrow('Cannot start processing');
    });

    it('should throw BadRequestException when order is already PROCESSING', async () => {
      const order = makeOrder({ status: LabOrderStatus.PROCESSING });
      prisma.labOrder.findUnique.mockResolvedValue(order);

      await expect(
        service.startProcessing('lab-1', 'order-abc12345'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when order is in RESULTS_READY status', async () => {
      const order = makeOrder({ status: LabOrderStatus.RESULTS_READY });
      prisma.labOrder.findUnique.mockResolvedValue(order);

      await expect(
        service.startProcessing('lab-1', 'order-abc12345'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      prisma.labOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.startProcessing('lab-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when order belongs to different lab', async () => {
      const order = makeOrder({ diagnosticCentreId: 'lab-2' });
      prisma.labOrder.findUnique.mockResolvedValue(order);

      await expect(
        service.startProcessing('lab-1', 'order-abc12345'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── uploadResults ──────────────────────────────────────────────────────────

  describe('uploadResults', () => {
    const resultUrl = 'https://s3.ap-south-1.amazonaws.com/onlyou-uploads/results/report.pdf';
    const normalFlags = { TSH: 'NORMAL', CBC: 'NORMAL' };
    const abnormalFlags = { TSH: 'ABNORMAL', CBC: 'NORMAL' };
    const criticalFlags = { TSH: 'CRITICAL', CBC: 'NORMAL' };

    it('should transition PROCESSING to RESULTS_READY', async () => {
      const order = makeOrder({ status: LabOrderStatus.PROCESSING });
      prisma.labOrder.findUnique.mockResolvedValue(order);

      const updatedOrder = makeOrder({
        status: LabOrderStatus.RESULTS_READY,
        resultFileUrl: resultUrl,
        abnormalFlags: normalFlags,
        criticalValues: false,
        resultsUploadedAt: now,
      });
      prisma.labOrder.update.mockResolvedValue(updatedOrder);

      const result = await service.uploadResults(
        'lab-1',
        'order-abc12345',
        resultUrl,
        normalFlags,
      );

      expect(result.status).toBe(LabOrderStatus.RESULTS_READY);
      expect(prisma.labOrder.update).toHaveBeenCalledWith({
        where: { id: 'order-abc12345' },
        data: expect.objectContaining({
          status: LabOrderStatus.RESULTS_READY,
          resultFileUrl: resultUrl,
          abnormalFlags: normalFlags,
          criticalValues: false,
          resultsUploadedAt: expect.any(Date),
        }),
        include: {
          patient: { select: { name: true } },
          phlebotomist: { select: { name: true } },
        },
      });
    });

    it('should detect critical values when flag contains CRITICAL', async () => {
      const order = makeOrder({ status: LabOrderStatus.PROCESSING });
      prisma.labOrder.findUnique.mockResolvedValue(order);
      prisma.labOrder.update.mockResolvedValue(
        makeOrder({
          status: LabOrderStatus.RESULTS_READY,
          criticalValues: true,
        }),
      );

      await service.uploadResults(
        'lab-1',
        'order-abc12345',
        resultUrl,
        criticalFlags,
      );

      expect(prisma.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            criticalValues: true,
          }),
        }),
      );
    });

    it('should not flag critical values when all flags are NORMAL', async () => {
      const order = makeOrder({ status: LabOrderStatus.PROCESSING });
      prisma.labOrder.findUnique.mockResolvedValue(order);
      prisma.labOrder.update.mockResolvedValue(
        makeOrder({ status: LabOrderStatus.RESULTS_READY }),
      );

      await service.uploadResults(
        'lab-1',
        'order-abc12345',
        resultUrl,
        normalFlags,
      );

      expect(prisma.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            criticalValues: false,
          }),
        }),
      );
    });

    it('should not flag critical values when flags are ABNORMAL (not CRITICAL)', async () => {
      const order = makeOrder({ status: LabOrderStatus.PROCESSING });
      prisma.labOrder.findUnique.mockResolvedValue(order);
      prisma.labOrder.update.mockResolvedValue(
        makeOrder({ status: LabOrderStatus.RESULTS_READY }),
      );

      await service.uploadResults(
        'lab-1',
        'order-abc12345',
        resultUrl,
        abnormalFlags,
      );

      expect(prisma.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            criticalValues: false,
          }),
        }),
      );
    });

    it('should throw BadRequestException when resultFileUrl is empty', async () => {
      const order = makeOrder({ status: LabOrderStatus.PROCESSING });
      prisma.labOrder.findUnique.mockResolvedValue(order);

      await expect(
        service.uploadResults('lab-1', 'order-abc12345', '', normalFlags),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.uploadResults('lab-1', 'order-abc12345', '', normalFlags),
      ).rejects.toThrow('Result file URL is required');
    });

    it('should throw BadRequestException when resultFileUrl is whitespace', async () => {
      const order = makeOrder({ status: LabOrderStatus.PROCESSING });
      prisma.labOrder.findUnique.mockResolvedValue(order);

      await expect(
        service.uploadResults('lab-1', 'order-abc12345', '   ', normalFlags),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when abnormalFlags is empty object', async () => {
      const order = makeOrder({ status: LabOrderStatus.PROCESSING });
      prisma.labOrder.findUnique.mockResolvedValue(order);

      await expect(
        service.uploadResults('lab-1', 'order-abc12345', resultUrl, {}),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.uploadResults('lab-1', 'order-abc12345', resultUrl, {}),
      ).rejects.toThrow(
        'Abnormal flags are required (mark each test as NORMAL, ABNORMAL, or CRITICAL)',
      );
    });

    it('should throw BadRequestException when abnormalFlags is null', async () => {
      const order = makeOrder({ status: LabOrderStatus.PROCESSING });
      prisma.labOrder.findUnique.mockResolvedValue(order);

      await expect(
        service.uploadResults(
          'lab-1',
          'order-abc12345',
          resultUrl,
          null as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when order is not in PROCESSING status', async () => {
      const order = makeOrder({ status: LabOrderStatus.SAMPLE_RECEIVED });
      prisma.labOrder.findUnique.mockResolvedValue(order);

      await expect(
        service.uploadResults(
          'lab-1',
          'order-abc12345',
          resultUrl,
          normalFlags,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.uploadResults(
          'lab-1',
          'order-abc12345',
          resultUrl,
          normalFlags,
        ),
      ).rejects.toThrow('Cannot upload results');
    });

    it('should throw BadRequestException when order is in DELIVERED_TO_LAB status', async () => {
      const order = makeOrder({ status: LabOrderStatus.DELIVERED_TO_LAB });
      prisma.labOrder.findUnique.mockResolvedValue(order);

      await expect(
        service.uploadResults(
          'lab-1',
          'order-abc12345',
          resultUrl,
          normalFlags,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      prisma.labOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadResults('lab-1', 'nonexistent', resultUrl, normalFlags),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when order belongs to different lab', async () => {
      const order = makeOrder({ diagnosticCentreId: 'lab-2' });
      prisma.labOrder.findUnique.mockResolvedValue(order);

      await expect(
        service.uploadResults(
          'lab-1',
          'order-abc12345',
          resultUrl,
          normalFlags,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── mapToSampleSummary (via public methods) ────────────────────────────────

  describe('mapToSampleSummary (integration via getIncomingSamples)', () => {
    it('should generate sampleId from last 8 chars of order id uppercased', async () => {
      const orders = [makeOrder({ id: 'order-abc12345' })];
      prisma.labOrder.findMany.mockResolvedValue(orders);

      const result = await service.getIncomingSamples('lab-1');

      // 'order-abc12345' -> last 8 chars = 'bc12345' wait, let's count:
      // o-r-d-e-r---a-b-c-1-2-3-4-5
      // last 8 = 'bc12345' no...
      // 'order-abc12345' has 15 chars, last 8 = 'abc12345' -> uppercased = 'ABC12345'
      expect(result[0].sampleId).toBe('ABC12345');
    });

    it('should handle testPanel as array', async () => {
      const orders = [makeOrder({ testPanel: ['TSH', 'CBC', 'Vitamin D'] })];
      prisma.labOrder.findMany.mockResolvedValue(orders);

      const result = await service.getIncomingSamples('lab-1');

      expect(result[0].testsOrdered).toEqual(['TSH', 'CBC', 'Vitamin D']);
    });

    it('should handle testPanel as object by extracting keys', async () => {
      const orders = [
        makeOrder({
          testPanel: { TSH: { range: '0.5-4.5' }, CBC: { range: 'varies' } },
        }),
      ];
      prisma.labOrder.findMany.mockResolvedValue(orders);

      const result = await service.getIncomingSamples('lab-1');

      expect(result[0].testsOrdered).toEqual(['TSH', 'CBC']);
    });

    it('should handle null testPanel', async () => {
      const orders = [makeOrder({ testPanel: null })];
      prisma.labOrder.findMany.mockResolvedValue(orders);

      const result = await service.getIncomingSamples('lab-1');

      expect(result[0].testsOrdered).toEqual([]);
    });

    it('should use default panel name when panelName is null', async () => {
      const orders = [makeOrder({ panelName: null })];
      prisma.labOrder.findMany.mockResolvedValue(orders);

      const result = await service.getIncomingSamples('lab-1');

      expect(result[0].panelName).toBe('Standard Panel');
    });

    it('should use tubeCount or receivedTubeCount', async () => {
      const orders = [
        makeOrder({ tubeCount: 3, receivedTubeCount: null }),
      ];
      prisma.labOrder.findMany.mockResolvedValue(orders);

      const result = await service.getIncomingSamples('lab-1');

      expect(result[0].tubeCount).toBe(3);
    });

    it('should use receivedTubeCount when tubeCount is null', async () => {
      const orders = [
        makeOrder({ tubeCount: null, receivedTubeCount: 2 }),
      ];
      prisma.labOrder.findMany.mockResolvedValue(orders);

      const result = await service.getIncomingSamples('lab-1');

      // tubeCount is null (falsy), so it falls through to receivedTubeCount
      expect(result[0].tubeCount).toBe(2);
    });

    it('should anonymize patient name to initials', async () => {
      const orders = [
        makeOrder({ patient: { name: 'Priya Kumari Gupta' } }),
      ];
      prisma.labOrder.findMany.mockResolvedValue(orders);

      const result = await service.getIncomingSamples('lab-1');

      expect(result[0].patientInitials).toBe('PKG');
    });

    it('should handle single name patient', async () => {
      const orders = [makeOrder({ patient: { name: 'Priya' } })];
      prisma.labOrder.findMany.mockResolvedValue(orders);

      const result = await service.getIncomingSamples('lab-1');

      expect(result[0].patientInitials).toBe('P');
    });

    it('should set deliveredAt from deliveredToLabAt', async () => {
      const deliveredDate = new Date('2026-02-20T10:30:00Z');
      const orders = [makeOrder({ deliveredToLabAt: deliveredDate })];
      prisma.labOrder.findMany.mockResolvedValue(orders);

      const result = await service.getIncomingSamples('lab-1');

      expect(result[0].deliveredAt).toEqual(deliveredDate);
    });
  });

  // ── getLabOrder (private, tested via public methods) ───────────────────────

  describe('getLabOrder permission checks (via markSampleReceived)', () => {
    it('should throw NotFoundException for non-existent order', async () => {
      prisma.labOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.markSampleReceived('lab-1', 'nonexistent', 2),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.markSampleReceived('lab-1', 'nonexistent', 2),
      ).rejects.toThrow('Lab order not found');
    });

    it('should throw ForbiddenException when diagnosticCentreId does not match labId', async () => {
      const order = makeOrder({ diagnosticCentreId: 'other-lab' });
      prisma.labOrder.findUnique.mockResolvedValue(order);

      await expect(
        service.markSampleReceived('lab-1', 'order-abc12345', 2),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.markSampleReceived('lab-1', 'order-abc12345', 2),
      ).rejects.toThrow('You do not have access to this sample');
    });

    it('should allow access when diagnosticCentreId matches labId', async () => {
      const order = makeOrder({
        diagnosticCentreId: 'lab-1',
        status: LabOrderStatus.DELIVERED_TO_LAB,
      });
      prisma.labOrder.findUnique.mockResolvedValue(order);
      prisma.labOrder.update.mockResolvedValue(
        makeOrder({ status: LabOrderStatus.SAMPLE_RECEIVED }),
      );

      // Should not throw
      await expect(
        service.markSampleReceived('lab-1', 'order-abc12345', 2),
      ).resolves.toBeDefined();
    });
  });
});
