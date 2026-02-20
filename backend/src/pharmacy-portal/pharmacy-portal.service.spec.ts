// Spec: master spec Section 8.1 — Pharmacy Portal
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PharmacyPortalService,
  PharmacyOrderStatus,
} from './pharmacy-portal.service';

describe('PharmacyPortalService', () => {
  let service: PharmacyPortalService;
  let prisma: PrismaService;

  // ── Mock Data ──────────────────────────────────────────────────────────────

  const mockPharmacy = {
    id: 'pharmacy-1',
    name: 'HealthPlus Pharmacy',
    address: '123 MG Road, Bengaluru',
    city: 'Bengaluru',
    isActive: true,
  };

  const mockMedications = [
    { name: 'Finasteride', dosage: '1mg daily', quantity: 30 },
    { name: 'Minoxidil', dosage: '5% topical', quantity: 1 },
  ];

  const mockOrder = {
    id: 'order-abcdef12-3456-7890-abcd-ef1234567890',
    pharmacyPartnerId: 'pharmacy-1',
    status: PharmacyOrderStatus.SENT_TO_PHARMACY,
    createdAt: new Date('2026-02-20T10:00:00Z'),
    deliveryCity: 'Bengaluru',
    deliveryPersonName: null,
    deliveryPersonPhone: null,
    pharmacyPreparingAt: null,
    pharmacyReadyAt: null,
    pharmacyIssueAt: null,
    pharmacyIssueReason: null,
    patient: {
      patientProfile: {
        city: 'Bengaluru',
      },
    },
    prescription: {
      pdfUrl: 'https://s3.amazonaws.com/onlyou-uploads/rx/rx-001.pdf',
      medications: mockMedications,
    },
  };

  const mockOrderPreparing = {
    ...mockOrder,
    id: 'order-preparing-1234-5678-9012-345678901234',
    status: PharmacyOrderStatus.PHARMACY_PREPARING,
    pharmacyPreparingAt: new Date('2026-02-20T10:30:00Z'),
  };

  const mockOrderReady = {
    ...mockOrder,
    id: 'order-readyfor-pick-up12-345678901234',
    status: PharmacyOrderStatus.PHARMACY_READY,
    pharmacyPreparingAt: new Date('2026-02-20T10:30:00Z'),
    pharmacyReadyAt: new Date('2026-02-20T11:00:00Z'),
  };

  const mockOrderPickupArranged = {
    ...mockOrder,
    id: 'order-pickupar-rang-ed12-345678901234',
    status: PharmacyOrderStatus.PICKUP_ARRANGED,
    pharmacyPreparingAt: new Date('2026-02-20T10:30:00Z'),
    pharmacyReadyAt: new Date('2026-02-20T11:00:00Z'),
    deliveryPersonName: 'Ravi Kumar',
    deliveryPersonPhone: '+919876543210',
  };

  // ── Mock PrismaService ─────────────────────────────────────────────────────

  const mockPrisma = {
    partnerPharmacy: {
      findUnique: jest.fn(),
    },
    order: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  // ── Module Setup ───────────────────────────────────────────────────────────

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PharmacyPortalService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PharmacyPortalService>(PharmacyPortalService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getPharmacyInfo
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getPharmacyInfo', () => {
    it('should return pharmacy info when pharmacy exists', async () => {
      mockPrisma.partnerPharmacy.findUnique.mockResolvedValue(mockPharmacy);

      const result = await service.getPharmacyInfo('pharmacy-1');

      expect(result).toEqual({
        id: 'pharmacy-1',
        name: 'HealthPlus Pharmacy',
        address: '123 MG Road, Bengaluru',
        city: 'Bengaluru',
        isActive: true,
      });
      expect(mockPrisma.partnerPharmacy.findUnique).toHaveBeenCalledWith({
        where: { id: 'pharmacy-1' },
      });
    });

    it('should throw NotFoundException when pharmacy does not exist', async () => {
      mockPrisma.partnerPharmacy.findUnique.mockResolvedValue(null);

      await expect(service.getPharmacyInfo('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getPharmacyInfo('nonexistent')).rejects.toThrow(
        'Pharmacy not found',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getTodaySummary
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getTodaySummary', () => {
    it('should return correct counts for each status category', async () => {
      mockPrisma.order.count
        .mockResolvedValueOnce(3) // newOrders (SENT_TO_PHARMACY)
        .mockResolvedValueOnce(2) // preparing (PHARMACY_PREPARING)
        .mockResolvedValueOnce(5); // ready (PHARMACY_READY + PICKUP_ARRANGED)

      const result = await service.getTodaySummary('pharmacy-1');

      expect(result).toEqual({
        newOrders: 3,
        preparing: 2,
        ready: 5,
      });

      // Verify the correct filters were passed
      expect(mockPrisma.order.count).toHaveBeenCalledTimes(3);

      expect(mockPrisma.order.count).toHaveBeenNthCalledWith(1, {
        where: {
          pharmacyPartnerId: 'pharmacy-1',
          status: PharmacyOrderStatus.SENT_TO_PHARMACY,
        },
      });

      expect(mockPrisma.order.count).toHaveBeenNthCalledWith(2, {
        where: {
          pharmacyPartnerId: 'pharmacy-1',
          status: PharmacyOrderStatus.PHARMACY_PREPARING,
        },
      });

      expect(mockPrisma.order.count).toHaveBeenNthCalledWith(3, {
        where: {
          pharmacyPartnerId: 'pharmacy-1',
          status: {
            in: [
              PharmacyOrderStatus.PHARMACY_READY,
              PharmacyOrderStatus.PICKUP_ARRANGED,
            ],
          },
        },
      });
    });

    it('should return zeros when there are no orders', async () => {
      mockPrisma.order.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getTodaySummary('pharmacy-1');

      expect(result).toEqual({ newOrders: 0, preparing: 0, ready: 0 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getNewOrders
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getNewOrders', () => {
    it('should return SENT_TO_PHARMACY orders mapped to summaries', async () => {
      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);

      const result = await service.getNewOrders('pharmacy-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: mockOrder.id,
        orderId: mockOrder.id.slice(-8).toUpperCase(),
        patientArea: 'Bengaluru',
        medications: mockMedications,
        prescriptionUrl:
          'https://s3.amazonaws.com/onlyou-uploads/rx/rx-001.pdf',
        status: PharmacyOrderStatus.SENT_TO_PHARMACY,
        createdAt: mockOrder.createdAt,
        deliveryPersonName: null,
        deliveryPersonPhone: null,
      });

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        where: {
          pharmacyPartnerId: 'pharmacy-1',
          status: PharmacyOrderStatus.SENT_TO_PHARMACY,
        },
        include: {
          patient: {
            select: {
              patientProfile: {
                select: { city: true },
              },
            },
          },
          prescription: {
            select: { pdfUrl: true, medications: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should return empty array when no new orders exist', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      const result = await service.getNewOrders('pharmacy-1');

      expect(result).toEqual([]);
    });

    it('should return multiple orders sorted oldest first', async () => {
      const orderOld = {
        ...mockOrder,
        id: 'order-old00000-0000-0000-000000000001',
        createdAt: new Date('2026-02-20T08:00:00Z'),
      };
      const orderNew = {
        ...mockOrder,
        id: 'order-new00000-0000-0000-000000000002',
        createdAt: new Date('2026-02-20T12:00:00Z'),
      };
      mockPrisma.order.findMany.mockResolvedValue([orderOld, orderNew]);

      const result = await service.getNewOrders('pharmacy-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(orderOld.id);
      expect(result[1].id).toBe(orderNew.id);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getPreparingOrders
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getPreparingOrders', () => {
    it('should return PHARMACY_PREPARING orders mapped to summaries', async () => {
      mockPrisma.order.findMany.mockResolvedValue([mockOrderPreparing]);

      const result = await service.getPreparingOrders('pharmacy-1');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(PharmacyOrderStatus.PHARMACY_PREPARING);
      expect(result[0].patientArea).toBe('Bengaluru');
      expect(result[0].medications).toEqual(mockMedications);
    });

    it('should order by pharmacyPreparingAt ascending', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      await service.getPreparingOrders('pharmacy-1');

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { pharmacyPreparingAt: 'asc' },
        }),
      );
    });

    it('should return empty array when no preparing orders exist', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      const result = await service.getPreparingOrders('pharmacy-1');

      expect(result).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getReadyOrders
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getReadyOrders', () => {
    it('should return PHARMACY_READY and PICKUP_ARRANGED orders', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        mockOrderReady,
        mockOrderPickupArranged,
      ]);

      const result = await service.getReadyOrders('pharmacy-1');

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe(PharmacyOrderStatus.PHARMACY_READY);
      expect(result[1].status).toBe(PharmacyOrderStatus.PICKUP_ARRANGED);
    });

    it('should include delivery person info for PICKUP_ARRANGED orders', async () => {
      mockPrisma.order.findMany.mockResolvedValue([mockOrderPickupArranged]);

      const result = await service.getReadyOrders('pharmacy-1');

      expect(result[0].deliveryPersonName).toBe('Ravi Kumar');
      expect(result[0].deliveryPersonPhone).toBe('+919876543210');
    });

    it('should filter by both PHARMACY_READY and PICKUP_ARRANGED statuses', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      await service.getReadyOrders('pharmacy-1');

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            pharmacyPartnerId: 'pharmacy-1',
            status: {
              in: [
                PharmacyOrderStatus.PHARMACY_READY,
                PharmacyOrderStatus.PICKUP_ARRANGED,
              ],
            },
          },
          orderBy: { pharmacyReadyAt: 'asc' },
        }),
      );
    });

    it('should return empty array when no ready orders exist', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      const result = await service.getReadyOrders('pharmacy-1');

      expect(result).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // startPreparing
  // ═══════════════════════════════════════════════════════════════════════════

  describe('startPreparing', () => {
    it('should transition order from SENT_TO_PHARMACY to PHARMACY_PREPARING', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      const updatedOrder = {
        ...mockOrder,
        status: PharmacyOrderStatus.PHARMACY_PREPARING,
        pharmacyPreparingAt: new Date(),
      };
      mockPrisma.order.update.mockResolvedValue(updatedOrder);

      const result = await service.startPreparing('pharmacy-1', mockOrder.id);

      expect(result.status).toBe(PharmacyOrderStatus.PHARMACY_PREPARING);
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: mockOrder.id },
        data: {
          status: PharmacyOrderStatus.PHARMACY_PREPARING,
          pharmacyPreparingAt: expect.any(Date),
        },
        include: {
          patient: { select: { patientProfile: { select: { city: true } } } },
          prescription: { select: { pdfUrl: true, medications: true } },
        },
      });
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.startPreparing('pharmacy-1', 'nonexistent-order'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.startPreparing('pharmacy-1', 'nonexistent-order'),
      ).rejects.toThrow('Order not found');
    });

    it('should throw ForbiddenException when order belongs to different pharmacy', async () => {
      const otherPharmacyOrder = {
        ...mockOrder,
        pharmacyPartnerId: 'pharmacy-other',
      };
      mockPrisma.order.findUnique.mockResolvedValue(otherPharmacyOrder);

      await expect(
        service.startPreparing('pharmacy-1', otherPharmacyOrder.id),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.startPreparing('pharmacy-1', otherPharmacyOrder.id),
      ).rejects.toThrow('You do not have access to this order');
    });

    it('should throw BadRequestException when order is not in SENT_TO_PHARMACY status', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrderPreparing);

      await expect(
        service.startPreparing('pharmacy-1', mockOrderPreparing.id),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.startPreparing('pharmacy-1', mockOrderPreparing.id),
      ).rejects.toThrow(
        `Cannot start preparing: order is in ${PharmacyOrderStatus.PHARMACY_PREPARING} status`,
      );
    });

    it('should throw BadRequestException when order is in PHARMACY_READY status', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrderReady);

      await expect(
        service.startPreparing('pharmacy-1', mockOrderReady.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when order is in PHARMACY_ISSUE status', async () => {
      const issueOrder = {
        ...mockOrder,
        status: PharmacyOrderStatus.PHARMACY_ISSUE,
      };
      mockPrisma.order.findUnique.mockResolvedValue(issueOrder);

      await expect(
        service.startPreparing('pharmacy-1', issueOrder.id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // markReady
  // ═══════════════════════════════════════════════════════════════════════════

  describe('markReady', () => {
    it('should transition order from PHARMACY_PREPARING to PHARMACY_READY', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrderPreparing);
      const updatedOrder = {
        ...mockOrderPreparing,
        status: PharmacyOrderStatus.PHARMACY_READY,
        pharmacyReadyAt: new Date(),
      };
      mockPrisma.order.update.mockResolvedValue(updatedOrder);

      const result = await service.markReady(
        'pharmacy-1',
        mockOrderPreparing.id,
      );

      expect(result.status).toBe(PharmacyOrderStatus.PHARMACY_READY);
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: mockOrderPreparing.id },
        data: {
          status: PharmacyOrderStatus.PHARMACY_READY,
          pharmacyReadyAt: expect.any(Date),
        },
        include: {
          patient: { select: { patientProfile: { select: { city: true } } } },
          prescription: { select: { pdfUrl: true, medications: true } },
        },
      });
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.markReady('pharmacy-1', 'nonexistent-order'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.markReady('pharmacy-1', 'nonexistent-order'),
      ).rejects.toThrow('Order not found');
    });

    it('should throw ForbiddenException when order belongs to different pharmacy', async () => {
      const otherPharmacyOrder = {
        ...mockOrderPreparing,
        pharmacyPartnerId: 'pharmacy-other',
      };
      mockPrisma.order.findUnique.mockResolvedValue(otherPharmacyOrder);

      await expect(
        service.markReady('pharmacy-1', otherPharmacyOrder.id),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.markReady('pharmacy-1', otherPharmacyOrder.id),
      ).rejects.toThrow('You do not have access to this order');
    });

    it('should throw BadRequestException when order is in SENT_TO_PHARMACY status', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.markReady('pharmacy-1', mockOrder.id),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.markReady('pharmacy-1', mockOrder.id),
      ).rejects.toThrow(
        `Cannot mark as ready: order is in ${PharmacyOrderStatus.SENT_TO_PHARMACY} status`,
      );
    });

    it('should throw BadRequestException when order is already PHARMACY_READY', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrderReady);

      await expect(
        service.markReady('pharmacy-1', mockOrderReady.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when order is in PHARMACY_ISSUE status', async () => {
      const issueOrder = {
        ...mockOrder,
        status: PharmacyOrderStatus.PHARMACY_ISSUE,
      };
      mockPrisma.order.findUnique.mockResolvedValue(issueOrder);

      await expect(
        service.markReady('pharmacy-1', issueOrder.id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // reportStockIssue
  // ═══════════════════════════════════════════════════════════════════════════

  describe('reportStockIssue', () => {
    it('should transition SENT_TO_PHARMACY order to PHARMACY_ISSUE', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue({
        ...mockOrder,
        status: PharmacyOrderStatus.PHARMACY_ISSUE,
      });

      const result = await service.reportStockIssue(
        'pharmacy-1',
        mockOrder.id,
        ['Finasteride'],
      );

      expect(result).toEqual({
        success: true,
        message: 'Stock issue reported. Coordinator will reassign.',
      });
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: mockOrder.id },
        data: {
          status: PharmacyOrderStatus.PHARMACY_ISSUE,
          pharmacyIssueAt: expect.any(Date),
          pharmacyIssueReason: 'Stock unavailable: Finasteride',
        },
      });
    });

    it('should transition PHARMACY_PREPARING order to PHARMACY_ISSUE', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrderPreparing);
      mockPrisma.order.update.mockResolvedValue({
        ...mockOrderPreparing,
        status: PharmacyOrderStatus.PHARMACY_ISSUE,
      });

      const result = await service.reportStockIssue(
        'pharmacy-1',
        mockOrderPreparing.id,
        ['Minoxidil'],
      );

      expect(result.success).toBe(true);
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PharmacyOrderStatus.PHARMACY_ISSUE,
            pharmacyIssueReason: 'Stock unavailable: Minoxidil',
          }),
        }),
      );
    });

    it('should concatenate multiple missing medications in the issue reason', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue({
        ...mockOrder,
        status: PharmacyOrderStatus.PHARMACY_ISSUE,
      });

      await service.reportStockIssue('pharmacy-1', mockOrder.id, [
        'Finasteride',
        'Minoxidil',
        'Biotin',
      ]);

      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pharmacyIssueReason:
              'Stock unavailable: Finasteride, Minoxidil, Biotin',
          }),
        }),
      );
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.reportStockIssue('pharmacy-1', 'nonexistent', ['Finasteride']),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.reportStockIssue('pharmacy-1', 'nonexistent', ['Finasteride']),
      ).rejects.toThrow('Order not found');
    });

    it('should throw ForbiddenException when order belongs to different pharmacy', async () => {
      const otherPharmacyOrder = {
        ...mockOrder,
        pharmacyPartnerId: 'pharmacy-other',
      };
      mockPrisma.order.findUnique.mockResolvedValue(otherPharmacyOrder);

      await expect(
        service.reportStockIssue('pharmacy-1', otherPharmacyOrder.id, [
          'Finasteride',
        ]),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when order is in PHARMACY_READY status', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrderReady);

      await expect(
        service.reportStockIssue('pharmacy-1', mockOrderReady.id, [
          'Finasteride',
        ]),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.reportStockIssue('pharmacy-1', mockOrderReady.id, [
          'Finasteride',
        ]),
      ).rejects.toThrow(
        `Cannot report stock issue: order is in ${PharmacyOrderStatus.PHARMACY_READY} status`,
      );
    });

    it('should throw BadRequestException when order is in PICKUP_ARRANGED status', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrderPickupArranged);

      await expect(
        service.reportStockIssue('pharmacy-1', mockOrderPickupArranged.id, [
          'Finasteride',
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when order is in OUT_FOR_DELIVERY status', async () => {
      const deliveryOrder = {
        ...mockOrder,
        status: PharmacyOrderStatus.OUT_FOR_DELIVERY,
      };
      mockPrisma.order.findUnique.mockResolvedValue(deliveryOrder);

      await expect(
        service.reportStockIssue('pharmacy-1', deliveryOrder.id, [
          'Finasteride',
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when missingMedications is empty array', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.reportStockIssue('pharmacy-1', mockOrder.id, []),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.reportStockIssue('pharmacy-1', mockOrder.id, []),
      ).rejects.toThrow('Missing medications list is required');
    });

    it('should throw BadRequestException when missingMedications is null', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.reportStockIssue('pharmacy-1', mockOrder.id, null as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when missingMedications is undefined', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.reportStockIssue('pharmacy-1', mockOrder.id, undefined as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // mapToOrderSummary (tested indirectly via public methods)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('mapToOrderSummary (via getNewOrders)', () => {
    it('should generate orderId from last 8 chars uppercased', async () => {
      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);

      const result = await service.getNewOrders('pharmacy-1');

      expect(result[0].orderId).toBe(
        mockOrder.id.slice(-8).toUpperCase(),
      );
    });

    it('should use patient city as patientArea when available', async () => {
      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);

      const result = await service.getNewOrders('pharmacy-1');

      expect(result[0].patientArea).toBe('Bengaluru');
    });

    it('should fall back to deliveryCity when patientProfile city is missing', async () => {
      const orderNoProfile = {
        ...mockOrder,
        patient: { patientProfile: null },
        deliveryCity: 'Mumbai',
      };
      mockPrisma.order.findMany.mockResolvedValue([orderNoProfile]);

      const result = await service.getNewOrders('pharmacy-1');

      expect(result[0].patientArea).toBe('Mumbai');
    });

    it('should fall back to "Unknown area" when both city sources are missing', async () => {
      const orderNoCity = {
        ...mockOrder,
        patient: { patientProfile: null },
        deliveryCity: undefined,
      };
      mockPrisma.order.findMany.mockResolvedValue([orderNoCity]);

      const result = await service.getNewOrders('pharmacy-1');

      expect(result[0].patientArea).toBe('Unknown area');
    });

    it('should parse medications from prescription correctly', async () => {
      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);

      const result = await service.getNewOrders('pharmacy-1');

      expect(result[0].medications).toEqual([
        { name: 'Finasteride', dosage: '1mg daily', quantity: 30 },
        { name: 'Minoxidil', dosage: '5% topical', quantity: 1 },
      ]);
    });

    it('should handle alternative medication field names (medication, dose, qty)', async () => {
      const orderAltFields = {
        ...mockOrder,
        prescription: {
          pdfUrl: null,
          medications: [
            { medication: 'Finasteride', dose: '1mg', qty: 30 },
          ],
        },
      };
      mockPrisma.order.findMany.mockResolvedValue([orderAltFields]);

      const result = await service.getNewOrders('pharmacy-1');

      expect(result[0].medications).toEqual([
        { name: 'Finasteride', dosage: '1mg', quantity: 30 },
      ]);
    });

    it('should default medication name to "Unknown" when missing', async () => {
      const orderNoName = {
        ...mockOrder,
        prescription: {
          pdfUrl: null,
          medications: [{ dosage: '1mg', quantity: 10 }],
        },
      };
      mockPrisma.order.findMany.mockResolvedValue([orderNoName]);

      const result = await service.getNewOrders('pharmacy-1');

      expect(result[0].medications[0].name).toBe('Unknown');
    });

    it('should default medication dosage to empty string when missing', async () => {
      const orderNoDosage = {
        ...mockOrder,
        prescription: {
          pdfUrl: null,
          medications: [{ name: 'Finasteride', quantity: 10 }],
        },
      };
      mockPrisma.order.findMany.mockResolvedValue([orderNoDosage]);

      const result = await service.getNewOrders('pharmacy-1');

      expect(result[0].medications[0].dosage).toBe('');
    });

    it('should default medication quantity to 1 when missing', async () => {
      const orderNoQty = {
        ...mockOrder,
        prescription: {
          pdfUrl: null,
          medications: [{ name: 'Finasteride', dosage: '1mg' }],
        },
      };
      mockPrisma.order.findMany.mockResolvedValue([orderNoQty]);

      const result = await service.getNewOrders('pharmacy-1');

      expect(result[0].medications[0].quantity).toBe(1);
    });

    it('should return empty medications array when prescription has no medications', async () => {
      const orderNoMeds = {
        ...mockOrder,
        prescription: { pdfUrl: null, medications: null },
      };
      mockPrisma.order.findMany.mockResolvedValue([orderNoMeds]);

      const result = await service.getNewOrders('pharmacy-1');

      expect(result[0].medications).toEqual([]);
    });

    it('should return empty medications array when prescription is null', async () => {
      const orderNoPrescription = {
        ...mockOrder,
        prescription: null,
      };
      mockPrisma.order.findMany.mockResolvedValue([orderNoPrescription]);

      const result = await service.getNewOrders('pharmacy-1');

      expect(result[0].medications).toEqual([]);
      expect(result[0].prescriptionUrl).toBeNull();
    });

    it('should return prescriptionUrl from prescription pdfUrl', async () => {
      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);

      const result = await service.getNewOrders('pharmacy-1');

      expect(result[0].prescriptionUrl).toBe(
        'https://s3.amazonaws.com/onlyou-uploads/rx/rx-001.pdf',
      );
    });

    it('should return null prescriptionUrl when pdfUrl is missing', async () => {
      const orderNoPdf = {
        ...mockOrder,
        prescription: { pdfUrl: null, medications: [] },
      };
      mockPrisma.order.findMany.mockResolvedValue([orderNoPdf]);

      const result = await service.getNewOrders('pharmacy-1');

      expect(result[0].prescriptionUrl).toBeNull();
    });

    it('should handle non-array medications gracefully (empty result)', async () => {
      const orderStringMeds = {
        ...mockOrder,
        prescription: { pdfUrl: null, medications: 'not an array' },
      };
      mockPrisma.order.findMany.mockResolvedValue([orderStringMeds]);

      const result = await service.getNewOrders('pharmacy-1');

      expect(result[0].medications).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PharmacyOrderStatus enum
  // ═══════════════════════════════════════════════════════════════════════════

  describe('PharmacyOrderStatus enum', () => {
    it('should have all expected status values', () => {
      expect(PharmacyOrderStatus.SENT_TO_PHARMACY).toBe('SENT_TO_PHARMACY');
      expect(PharmacyOrderStatus.PHARMACY_PREPARING).toBe(
        'PHARMACY_PREPARING',
      );
      expect(PharmacyOrderStatus.PHARMACY_READY).toBe('PHARMACY_READY');
      expect(PharmacyOrderStatus.PHARMACY_ISSUE).toBe('PHARMACY_ISSUE');
      expect(PharmacyOrderStatus.PICKUP_ARRANGED).toBe('PICKUP_ARRANGED');
      expect(PharmacyOrderStatus.OUT_FOR_DELIVERY).toBe('OUT_FOR_DELIVERY');
    });
  });
});
