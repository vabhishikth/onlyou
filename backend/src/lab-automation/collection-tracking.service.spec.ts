import { Test, TestingModule } from '@nestjs/testing';
import { CollectionTrackingService } from './collection-tracking.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Spec: Phase 16 Chunk 5 — Collection Day Logistics + Sample Tracking

describe('CollectionTrackingService', () => {
  let service: CollectionTrackingService;
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

    service = module.get<CollectionTrackingService>(CollectionTrackingService);
    prisma = module.get(PrismaService);
    notificationService = module.get(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========================================
  // markEnRoute
  // ========================================

  describe('markEnRoute', () => {
    it('should transition to PHLEBOTOMIST_EN_ROUTE and notify patient', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'PHLEBOTOMIST_ASSIGNED',
        labPhlebotomistId: 'phleb-1',
        patientId: 'patient-1',
      });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        status: 'PHLEBOTOMIST_EN_ROUTE',
        phlebotomistEnRouteAt: expect.any(Date),
      });

      const result = await service.markEnRoute('lo-1', 'phleb-1');

      expect(result.status).toBe('PHLEBOTOMIST_EN_ROUTE');
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'patient-1',
          eventType: 'PHLEBOTOMIST_EN_ROUTE',
        }),
      );
    });

    it('should throw if phlebotomist is not assigned to this order', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'PHLEBOTOMIST_ASSIGNED',
        labPhlebotomistId: 'phleb-other',
      });

      await expect(
        service.markEnRoute('lo-1', 'phleb-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if order not in PHLEBOTOMIST_ASSIGNED status', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'ORDERED',
        labPhlebotomistId: 'phleb-1',
      });

      await expect(
        service.markEnRoute('lo-1', 'phleb-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================
  // verifyFastingStatus
  // ========================================

  describe('verifyFastingStatus', () => {
    it('should mark patientNotFasting=true and alert doctor when patient broke fast', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'PHLEBOTOMIST_EN_ROUTE',
        labPhlebotomistId: 'phleb-1',
        requiresFasting: true,
        doctorId: 'doctor-1',
        patientId: 'patient-1',
      });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        patientNotFasting: true,
      });

      const result = await service.verifyFastingStatus('lo-1', 'phleb-1', false);

      expect(result.patientNotFasting).toBe(true);
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'doctor-1',
          eventType: 'PATIENT_NOT_FASTING',
        }),
      );
    });

    it('should not flag if patient fasted properly', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'PHLEBOTOMIST_EN_ROUTE',
        labPhlebotomistId: 'phleb-1',
        requiresFasting: true,
      });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        patientNotFasting: false,
      });

      const result = await service.verifyFastingStatus('lo-1', 'phleb-1', true);

      expect(result.patientNotFasting).toBe(false);
      expect(notificationService.sendNotification).not.toHaveBeenCalled();
    });

    it('should skip fasting check if order does not require fasting', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'PHLEBOTOMIST_EN_ROUTE',
        labPhlebotomistId: 'phleb-1',
        requiresFasting: false,
      });

      const result = await service.verifyFastingStatus('lo-1', 'phleb-1', true);

      expect(result).toBeNull();
      expect(prisma.labOrder.update).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // markSampleCollected
  // ========================================

  describe('markSampleCollected', () => {
    it('should transition to SAMPLE_COLLECTED and update tube count', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'PHLEBOTOMIST_EN_ROUTE',
        labPhlebotomistId: 'phleb-1',
        patientId: 'patient-1',
        testPanel: ['CBC', 'TSH'],
      });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        status: 'SAMPLE_COLLECTED',
        tubeCount: 3,
        sampleCollectedAt: expect.any(Date),
        collectionCompletedByPhlebotomistId: 'phleb-1',
      });
      prisma.phlebotomistDailyRoster.findUnique.mockResolvedValue({
        phlebotomistId: 'phleb-1',
        completedCollections: 2,
      });
      prisma.phlebotomistDailyRoster.update.mockResolvedValue({
        completedCollections: 3,
      });

      const result = await service.markSampleCollected('lo-1', 'phleb-1', 3);

      expect(result.status).toBe('SAMPLE_COLLECTED');
      expect(result.tubeCount).toBe(3);
    });

    it('should throw if phlebotomist not assigned to this order', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'PHLEBOTOMIST_EN_ROUTE',
        labPhlebotomistId: 'phleb-other',
      });

      await expect(
        service.markSampleCollected('lo-1', 'phleb-1', 3),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if tube count is zero or negative', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'PHLEBOTOMIST_EN_ROUTE',
        labPhlebotomistId: 'phleb-1',
      });

      await expect(
        service.markSampleCollected('lo-1', 'phleb-1', 0),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================
  // markCollectionFailed
  // ========================================

  describe('markCollectionFailed', () => {
    it('should transition to COLLECTION_FAILED and increment attempts', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'PHLEBOTOMIST_EN_ROUTE',
        labPhlebotomistId: 'phleb-1',
        patientId: 'patient-1',
        collectionAttempts: 0,
        bookedDate: new Date('2026-03-01'),
      });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        status: 'COLLECTION_FAILED',
        collectionAttempts: 1,
        collectionFailedAt: expect.any(Date),
      });
      prisma.phlebotomistDailyRoster.findUnique.mockResolvedValue({
        phlebotomistId: 'phleb-1',
        failedCollections: 0,
      });
      prisma.phlebotomistDailyRoster.update.mockResolvedValue({
        failedCollections: 1,
      });

      const result = await service.markCollectionFailed(
        'lo-1', 'phleb-1', 'Patient not home',
      );

      expect(result.status).toBe('COLLECTION_FAILED');
      expect(result.collectionAttempts).toBe(1);
    });

    it('should alert admin after 2 failed attempts', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'PHLEBOTOMIST_EN_ROUTE',
        labPhlebotomistId: 'phleb-1',
        patientId: 'patient-1',
        collectionAttempts: 1, // this will be 2nd attempt
        bookedDate: new Date('2026-03-01'),
      });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        status: 'COLLECTION_FAILED',
        collectionAttempts: 2,
      });
      prisma.phlebotomistDailyRoster.findUnique.mockResolvedValue({
        phlebotomistId: 'phleb-1',
        failedCollections: 1,
      });
      prisma.phlebotomistDailyRoster.update.mockResolvedValue({});
      prisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);

      await service.markCollectionFailed('lo-1', 'phleb-1', 'Patient refused');

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'COLLECTION_FAILED_MULTIPLE',
        }),
      );
    });

    it('should notify patient of failed collection', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'PHLEBOTOMIST_EN_ROUTE',
        labPhlebotomistId: 'phleb-1',
        patientId: 'patient-1',
        collectionAttempts: 0,
        bookedDate: new Date('2026-03-01'),
      });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        status: 'COLLECTION_FAILED',
        collectionAttempts: 1,
      });
      prisma.phlebotomistDailyRoster.findUnique.mockResolvedValue({
        failedCollections: 0,
      });
      prisma.phlebotomistDailyRoster.update.mockResolvedValue({});

      await service.markCollectionFailed('lo-1', 'phleb-1', 'Vein too small');

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'patient-1',
          eventType: 'LAB_COLLECTION_FAILED',
        }),
      );
    });
  });

  // ========================================
  // markSampleInTransit
  // ========================================

  describe('markSampleInTransit', () => {
    it('should transition from SAMPLE_COLLECTED to SAMPLE_IN_TRANSIT', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'SAMPLE_COLLECTED',
        labPhlebotomistId: 'phleb-1',
      });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        status: 'SAMPLE_IN_TRANSIT',
        sampleInTransitAt: expect.any(Date),
      });

      const result = await service.markSampleInTransit('lo-1', 'phleb-1');

      expect(result.status).toBe('SAMPLE_IN_TRANSIT');
    });

    it('should throw if not SAMPLE_COLLECTED status', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'PHLEBOTOMIST_EN_ROUTE',
        labPhlebotomistId: 'phleb-1',
      });

      await expect(
        service.markSampleInTransit('lo-1', 'phleb-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================
  // markDeliveredToLab
  // ========================================

  describe('markDeliveredToLab', () => {
    it('should transition to DELIVERED_TO_LAB', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'SAMPLE_IN_TRANSIT',
        labPhlebotomistId: 'phleb-1',
        tubeCount: 3,
      });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        status: 'DELIVERED_TO_LAB',
        deliveredToLabAt: expect.any(Date),
      });

      const result = await service.markDeliveredToLab('lo-1', 'phleb-1', 3);

      expect(result.status).toBe('DELIVERED_TO_LAB');
    });

    it('should also accept direct transition from SAMPLE_COLLECTED', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'SAMPLE_COLLECTED',
        labPhlebotomistId: 'phleb-1',
        tubeCount: 2,
      });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        status: 'DELIVERED_TO_LAB',
      });

      const result = await service.markDeliveredToLab('lo-1', 'phleb-1', 2);

      expect(result.status).toBe('DELIVERED_TO_LAB');
    });

    it('should flag tube count mismatch', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'SAMPLE_IN_TRANSIT',
        labPhlebotomistId: 'phleb-1',
        tubeCount: 3,
      });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        status: 'DELIVERED_TO_LAB',
        tubeCountMismatch: true,
        receivedTubeCount: 2,
      });
      prisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);

      const result = await service.markDeliveredToLab('lo-1', 'phleb-1', 2);

      expect(result.tubeCountMismatch).toBe(true);
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'TUBE_COUNT_MISMATCH',
        }),
      );
    });
  });

  // ========================================
  // markSampleReceived
  // ========================================

  describe('markSampleReceived', () => {
    it('should transition to SAMPLE_RECEIVED by lab technician', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'DELIVERED_TO_LAB',
      });
      prisma.labOrder.update.mockResolvedValue({
        id: 'lo-1',
        status: 'SAMPLE_RECEIVED',
        sampleReceivedAt: expect.any(Date),
        sampleReceivedByLabTechId: 'labtech-1',
      });

      const result = await service.markSampleReceived('lo-1', 'labtech-1', 3);

      expect(result.status).toBe('SAMPLE_RECEIVED');
      expect(result.sampleReceivedByLabTechId).toBe('labtech-1');
    });

    it('should throw if not DELIVERED_TO_LAB status', async () => {
      prisma.labOrder.findUnique.mockResolvedValue({
        id: 'lo-1',
        status: 'SAMPLE_COLLECTED',
      });

      await expect(
        service.markSampleReceived('lo-1', 'labtech-1', 3),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
