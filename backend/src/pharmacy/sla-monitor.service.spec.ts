import { Test, TestingModule } from '@nestjs/testing';
import { SlaMonitorService } from './sla-monitor.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

// Spec: Phase 15 Chunk 6 — SLA Timers + Breach Monitoring

describe('SlaMonitorService', () => {
  let service: SlaMonitorService;
  let prisma: any;
  let notificationService: any;

  const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000);

  const makeOrder = (overrides: any = {}) => ({
    id: overrides.id || 'po-1',
    pharmacyId: overrides.pharmacyId || 'pharm-1',
    patientId: overrides.patientId || 'patient-1',
    status: overrides.status || 'ASSIGNED',
    requiresColdChain: overrides.requiresColdChain ?? false,
    assignedAt: overrides.assignedAt || hoursAgo(1),
    acceptedAt: overrides.acceptedAt || null,
    readyForPickupAt: overrides.readyForPickupAt || null,
    dispatchedAt: overrides.dispatchedAt || null,
    createdAt: overrides.createdAt || hoursAgo(2),
    slaBreaches: overrides.slaBreaches || null,
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlaMonitorService,
        {
          provide: PrismaService,
          useValue: {
            pharmacyOrder: {
              findMany: jest.fn(),
              update: jest.fn(),
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

    service = module.get<SlaMonitorService>(SlaMonitorService);
    prisma = module.get(PrismaService);
    notificationService = module.get(NotificationService);
  });

  // ========================================
  // checkSlaBreaches (cron job)
  // ========================================

  describe('checkSlaBreaches', () => {
    it('should detect acceptance SLA breach (ASSIGNED > 4h)', async () => {
      const order = makeOrder({ status: 'ASSIGNED', assignedAt: hoursAgo(5) });
      prisma.pharmacyOrder.findMany.mockResolvedValue([order]);
      prisma.pharmacyOrder.update.mockResolvedValue(order);
      prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });

      await service.checkSlaBreaches();

      expect(prisma.pharmacyOrder.update).toHaveBeenCalledWith({
        where: { id: 'po-1' },
        data: expect.objectContaining({
          slaBreaches: expect.stringContaining('ACCEPTANCE'),
        }),
      });
    });

    it('should detect preparation SLA breach (PHARMACY_ACCEPTED > 4h)', async () => {
      const order = makeOrder({
        status: 'PHARMACY_ACCEPTED',
        acceptedAt: hoursAgo(5),
      });
      prisma.pharmacyOrder.findMany.mockResolvedValue([order]);
      prisma.pharmacyOrder.update.mockResolvedValue(order);
      prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });

      await service.checkSlaBreaches();

      expect(prisma.pharmacyOrder.update).toHaveBeenCalledWith({
        where: { id: 'po-1' },
        data: expect.objectContaining({
          slaBreaches: expect.stringContaining('PREPARATION'),
        }),
      });
    });

    it('should detect delivery SLA breach (OUT_FOR_DELIVERY > 6h)', async () => {
      const order = makeOrder({
        status: 'OUT_FOR_DELIVERY',
        dispatchedAt: hoursAgo(7),
      });
      prisma.pharmacyOrder.findMany.mockResolvedValue([order]);
      prisma.pharmacyOrder.update.mockResolvedValue(order);
      prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });

      await service.checkSlaBreaches();

      expect(prisma.pharmacyOrder.update).toHaveBeenCalledWith({
        where: { id: 'po-1' },
        data: expect.objectContaining({
          slaBreaches: expect.stringContaining('DELIVERY'),
        }),
      });
    });

    it('should detect cold chain delivery breach (OUT_FOR_DELIVERY > 2h, cold chain)', async () => {
      const order = makeOrder({
        status: 'OUT_FOR_DELIVERY',
        dispatchedAt: hoursAgo(3),
        requiresColdChain: true,
      });
      prisma.pharmacyOrder.findMany.mockResolvedValue([order]);
      prisma.pharmacyOrder.update.mockResolvedValue(order);
      prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });

      await service.checkSlaBreaches();

      expect(prisma.pharmacyOrder.update).toHaveBeenCalledWith({
        where: { id: 'po-1' },
        data: expect.objectContaining({
          slaBreaches: expect.stringContaining('COLD_CHAIN'),
        }),
      });
    });

    it('should NOT flag when within SLA window', async () => {
      // Assigned 1h ago (within 4h SLA)
      const order = makeOrder({ status: 'ASSIGNED', assignedAt: hoursAgo(1) });
      prisma.pharmacyOrder.findMany.mockResolvedValue([order]);

      await service.checkSlaBreaches();

      expect(prisma.pharmacyOrder.update).not.toHaveBeenCalled();
    });

    it('should send admin notification on breach', async () => {
      const order = makeOrder({ status: 'ASSIGNED', assignedAt: hoursAgo(5) });
      prisma.pharmacyOrder.findMany.mockResolvedValue([order]);
      prisma.pharmacyOrder.update.mockResolvedValue(order);
      prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });

      await service.checkSlaBreaches();

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SLA_BREACH',
        }),
      );
    });

    it('should handle multiple orders and only flag breached ones', async () => {
      const breached = makeOrder({ id: 'po-1', status: 'ASSIGNED', assignedAt: hoursAgo(5) });
      const onTime = makeOrder({ id: 'po-2', status: 'ASSIGNED', assignedAt: hoursAgo(1) });

      prisma.pharmacyOrder.findMany.mockResolvedValue([breached, onTime]);
      prisma.pharmacyOrder.update.mockResolvedValue(breached);
      prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });

      await service.checkSlaBreaches();

      // Only breached order should be updated
      expect(prisma.pharmacyOrder.update).toHaveBeenCalledTimes(1);
      expect(prisma.pharmacyOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'po-1' } }),
      );
    });
  });

  // ========================================
  // getSlaStatus
  // ========================================

  describe('getSlaStatus', () => {
    it('should return time remaining and no breaches for on-time order', async () => {
      const order = makeOrder({ status: 'ASSIGNED', assignedAt: hoursAgo(1), slaBreaches: null });
      prisma.pharmacyOrder.findMany.mockResolvedValue([order]);

      const result = await service.getSlaStatus('po-1');

      expect(result.breaches).toEqual([]);
      expect(result.acceptanceTimeRemaining).toBeGreaterThan(0);
    });

    it('should return breaches for breached order', async () => {
      const order = makeOrder({
        status: 'ASSIGNED',
        assignedAt: hoursAgo(5),
        slaBreaches: JSON.stringify([{ type: 'ACCEPTANCE', detectedAt: new Date().toISOString() }]),
      });
      prisma.pharmacyOrder.findMany.mockResolvedValue([order]);

      const result = await service.getSlaStatus('po-1');

      expect(result.breaches.length).toBeGreaterThan(0);
      expect(result.breaches[0].type).toBe('ACCEPTANCE');
    });
  });

  // ========================================
  // getPharmacyPerformanceReport
  // ========================================

  describe('getPharmacyPerformanceReport', () => {
    it('should calculate average times and rejection rate', async () => {
      const orders = [
        makeOrder({
          id: 'po-1',
          status: 'DELIVERED',
          assignedAt: hoursAgo(10),
          acceptedAt: hoursAgo(9),
          readyForPickupAt: hoursAgo(7),
          dispatchedAt: hoursAgo(6),
        }),
        makeOrder({
          id: 'po-2',
          status: 'DELIVERED',
          assignedAt: hoursAgo(8),
          acceptedAt: hoursAgo(7),
          readyForPickupAt: hoursAgo(5),
          dispatchedAt: hoursAgo(4),
        }),
      ];

      prisma.pharmacyOrder.findMany.mockResolvedValue(orders);

      const report = await service.getPharmacyPerformanceReport('pharm-1', {
        start: hoursAgo(24),
        end: new Date(),
      });

      expect(report.totalOrders).toBe(2);
      expect(report.avgAcceptanceHours).toBeGreaterThan(0);
      expect(report.avgPreparationHours).toBeGreaterThan(0);
      expect(report.rejectionRate).toBe(0);
    });

    it('should return zeroes for pharmacy with no orders', async () => {
      prisma.pharmacyOrder.findMany.mockResolvedValue([]);

      const report = await service.getPharmacyPerformanceReport('pharm-1', {
        start: hoursAgo(24),
        end: new Date(),
      });

      expect(report.totalOrders).toBe(0);
      expect(report.avgAcceptanceHours).toBe(0);
      expect(report.avgPreparationHours).toBe(0);
      expect(report.rejectionRate).toBe(0);
      expect(report.breachCount).toBe(0);
    });

    it('should calculate correct rejection rate', async () => {
      const orders = [
        makeOrder({ id: 'po-1', status: 'DELIVERED' }),
        makeOrder({ id: 'po-2', status: 'PHARMACY_REJECTED' }),
        makeOrder({ id: 'po-3', status: 'DELIVERED' }),
        makeOrder({ id: 'po-4', status: 'PHARMACY_REJECTED' }),
      ];

      prisma.pharmacyOrder.findMany.mockResolvedValue(orders);

      const report = await service.getPharmacyPerformanceReport('pharm-1', {
        start: hoursAgo(24),
        end: new Date(),
      });

      expect(report.totalOrders).toBe(4);
      expect(report.rejectionRate).toBeCloseTo(0.5, 2); // 2/4 = 50%
    });

    it('should count SLA breaches', async () => {
      const orders = [
        makeOrder({
          id: 'po-1',
          status: 'DELIVERED',
          slaBreaches: JSON.stringify([{ type: 'ACCEPTANCE' }]),
        }),
        makeOrder({
          id: 'po-2',
          status: 'DELIVERED',
          slaBreaches: JSON.stringify([{ type: 'PREPARATION' }, { type: 'DELIVERY' }]),
        }),
        makeOrder({ id: 'po-3', status: 'DELIVERED', slaBreaches: null }),
      ];

      prisma.pharmacyOrder.findMany.mockResolvedValue(orders);

      const report = await service.getPharmacyPerformanceReport('pharm-1', {
        start: hoursAgo(24),
        end: new Date(),
      });

      expect(report.breachCount).toBe(3); // 1 + 2 + 0
    });
  });
});
