import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryService } from './delivery.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Spec: Phase 15 Chunk 5 — Delivery Tracking + OTP Confirmation

describe('DeliveryService', () => {
  let service: DeliveryService;
  let prisma: any;
  let notificationService: any;

  const makeOrder = (overrides: any = {}) => ({
    id: overrides.id || 'po-1',
    prescriptionId: 'rx-1',
    pharmacyId: 'pharm-1',
    patientId: 'patient-1',
    consultationId: 'consult-1',
    status: overrides.status || 'READY_FOR_PICKUP',
    requiresColdChain: overrides.requiresColdChain ?? false,
    deliveryOtp: overrides.deliveryOtp || '1234',
    deliveryAttempts: overrides.deliveryAttempts ?? 0,
    deliveryAddress: overrides.deliveryAddress || '123 Main St, Mumbai',
    deliveryPincode: overrides.deliveryPincode || '400001',
    deliveryCity: overrides.deliveryCity || 'Mumbai',
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryService,
        {
          provide: PrismaService,
          useValue: {
            pharmacyOrder: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            deliveryTracking: {
              create: jest.fn(),
              update: jest.fn(),
              findFirst: jest.fn(),
            },
            pharmacy: {
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

    service = module.get<DeliveryService>(DeliveryService);
    prisma = module.get(PrismaService);
    notificationService = module.get(NotificationService);
  });

  // ========================================
  // dispatchOrder
  // ========================================

  describe('dispatchOrder', () => {
    it('should dispatch order and create delivery tracking', async () => {
      const order = makeOrder({ status: 'READY_FOR_PICKUP' });
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);
      prisma.pharmacyOrder.update.mockResolvedValue({ ...order, status: 'OUT_FOR_DELIVERY' });
      prisma.deliveryTracking.create.mockResolvedValue({
        id: 'dt-1',
        pharmacyOrderId: 'po-1',
        status: 'PICKED_UP',
        deliveryPersonName: 'Ramesh',
        deliveryPersonPhone: '+919876543210',
      });

      const result = await service.dispatchOrder('po-1', 'Ramesh', '+919876543210');

      expect(result.status).toBe('OUT_FOR_DELIVERY');
      expect(prisma.deliveryTracking.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          pharmacyOrderId: 'po-1',
          status: 'PICKED_UP',
          deliveryPersonName: 'Ramesh',
          deliveryPersonPhone: '+919876543210',
          attemptNumber: 1,
        }),
      });
    });

    it('should notify patient with OTP on dispatch', async () => {
      const order = makeOrder({ status: 'READY_FOR_PICKUP', deliveryOtp: '5678' });
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);
      prisma.pharmacyOrder.update.mockResolvedValue({ ...order, status: 'OUT_FOR_DELIVERY' });
      prisma.deliveryTracking.create.mockResolvedValue({ id: 'dt-1' });

      await service.dispatchOrder('po-1', 'Ramesh', '+919876543210');

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'patient-1',
          eventType: 'DELIVERY_OUT_FOR_DELIVERY',
        }),
      );
    });

    it('should set cold chain 2-hour constraint flag', async () => {
      const order = makeOrder({ status: 'READY_FOR_PICKUP', requiresColdChain: true });
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);
      prisma.pharmacyOrder.update.mockResolvedValue({ ...order, status: 'OUT_FOR_DELIVERY' });
      prisma.deliveryTracking.create.mockResolvedValue({ id: 'dt-1' });

      await service.dispatchOrder('po-1', 'Ramesh', '+919876543210');

      expect(prisma.deliveryTracking.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isColdChain: true,
        }),
      });
    });

    it('should throw NotFoundException for invalid order', async () => {
      prisma.pharmacyOrder.findUnique.mockResolvedValue(null);

      await expect(service.dispatchOrder('nonexistent', 'A', '+919876543210')).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // updateDeliveryStatus
  // ========================================

  describe('updateDeliveryStatus', () => {
    it('should update delivery tracking status', async () => {
      const order = makeOrder({ status: 'OUT_FOR_DELIVERY' });
      const tracking = { id: 'dt-1', pharmacyOrderId: 'po-1', status: 'PICKED_UP' };

      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);
      prisma.deliveryTracking.findFirst.mockResolvedValue(tracking);
      prisma.deliveryTracking.update.mockResolvedValue({ ...tracking, status: 'IN_TRANSIT' });

      const result = await service.updateDeliveryStatus('po-1', 'IN_TRANSIT', 'En route');

      expect(result.status).toBe('IN_TRANSIT');
    });

    it('should notify patient when status is ARRIVED', async () => {
      const order = makeOrder({ status: 'OUT_FOR_DELIVERY' });
      const tracking = { id: 'dt-1', pharmacyOrderId: 'po-1', status: 'IN_TRANSIT' };

      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);
      prisma.deliveryTracking.findFirst.mockResolvedValue(tracking);
      prisma.deliveryTracking.update.mockResolvedValue({ ...tracking, status: 'ARRIVED' });

      await service.updateDeliveryStatus('po-1', 'ARRIVED');

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'patient-1',
          eventType: 'DELIVERY_ARRIVED',
          body: expect.stringContaining('OTP'),
        }),
      );
    });
  });

  // ========================================
  // confirmDelivery
  // ========================================

  describe('confirmDelivery', () => {
    it('should confirm delivery with correct OTP', async () => {
      const order = makeOrder({ status: 'OUT_FOR_DELIVERY', deliveryOtp: '1234' });
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);
      prisma.pharmacyOrder.update.mockResolvedValue({ ...order, status: 'DELIVERED' });
      prisma.deliveryTracking.findFirst.mockResolvedValue({ id: 'dt-1' });
      prisma.deliveryTracking.update.mockResolvedValue({ id: 'dt-1', status: 'DELIVERED' });
      prisma.pharmacy.update.mockResolvedValue({});

      const result = await service.confirmDelivery('po-1', '1234');

      expect(result.status).toBe('DELIVERED');
      expect(prisma.pharmacyOrder.update).toHaveBeenCalledWith({
        where: { id: 'po-1' },
        data: expect.objectContaining({
          status: 'DELIVERED',
          deliveredAt: expect.any(Date),
        }),
      });
    });

    it('should reject with wrong OTP', async () => {
      const order = makeOrder({ status: 'OUT_FOR_DELIVERY', deliveryOtp: '1234' });
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);

      await expect(service.confirmDelivery('po-1', '9999')).rejects.toThrow(BadRequestException);
    });

    it('should decrement pharmacy queue on delivery', async () => {
      const order = makeOrder({ status: 'OUT_FOR_DELIVERY', deliveryOtp: '1234' });
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);
      prisma.pharmacyOrder.update.mockResolvedValue({ ...order, status: 'DELIVERED' });
      prisma.deliveryTracking.findFirst.mockResolvedValue({ id: 'dt-1' });
      prisma.deliveryTracking.update.mockResolvedValue({ id: 'dt-1', status: 'DELIVERED' });
      prisma.pharmacy.update.mockResolvedValue({});

      await service.confirmDelivery('po-1', '1234');

      expect(prisma.pharmacy.update).toHaveBeenCalledWith({
        where: { id: 'pharm-1' },
        data: { currentQueueSize: { decrement: 1 } },
      });
    });

    it('should update delivery tracking to DELIVERED with OTP verified', async () => {
      const order = makeOrder({ status: 'OUT_FOR_DELIVERY', deliveryOtp: '1234' });
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);
      prisma.pharmacyOrder.update.mockResolvedValue({ ...order, status: 'DELIVERED' });
      prisma.deliveryTracking.findFirst.mockResolvedValue({ id: 'dt-1' });
      prisma.deliveryTracking.update.mockResolvedValue({ id: 'dt-1', status: 'DELIVERED' });
      prisma.pharmacy.update.mockResolvedValue({});

      await service.confirmDelivery('po-1', '1234');

      expect(prisma.deliveryTracking.update).toHaveBeenCalledWith({
        where: { id: 'dt-1' },
        data: expect.objectContaining({
          status: 'DELIVERED',
          otpVerified: true,
          actualDeliveryTime: expect.any(Date),
        }),
      });
    });
  });

  // ========================================
  // reportDeliveryFailure
  // ========================================

  describe('reportDeliveryFailure', () => {
    it('should increment delivery attempts on failure', async () => {
      const order = makeOrder({ status: 'OUT_FOR_DELIVERY', deliveryAttempts: 0 });
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);
      prisma.pharmacyOrder.update.mockResolvedValue({ ...order, deliveryAttempts: 1, status: 'DELIVERY_ATTEMPTED' });
      prisma.deliveryTracking.findFirst.mockResolvedValue({ id: 'dt-1' });
      prisma.deliveryTracking.update.mockResolvedValue({});

      const result = await service.reportDeliveryFailure('po-1', 'Customer not available');

      expect(result.deliveryAttempts).toBe(1);
    });

    it('should NOT allow reattempt for cold chain orders', async () => {
      const order = makeOrder({ status: 'OUT_FOR_DELIVERY', requiresColdChain: true, deliveryAttempts: 0 });
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);
      prisma.pharmacyOrder.update.mockResolvedValue({ ...order, deliveryAttempts: 1, status: 'DELIVERY_FAILED' });
      prisma.deliveryTracking.findFirst.mockResolvedValue({ id: 'dt-1' });
      prisma.deliveryTracking.update.mockResolvedValue({});

      const result = await service.reportDeliveryFailure('po-1', 'Customer not available');

      // Cold chain: no reattempt, auto-fail
      expect(result.status).toBe('DELIVERY_FAILED');
    });

    it('should allow reattempt for standard orders (< 2 failures)', async () => {
      const order = makeOrder({ status: 'OUT_FOR_DELIVERY', requiresColdChain: false, deliveryAttempts: 0 });
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);
      prisma.pharmacyOrder.update.mockResolvedValue({ ...order, deliveryAttempts: 1, status: 'DELIVERY_ATTEMPTED' });
      prisma.deliveryTracking.findFirst.mockResolvedValue({ id: 'dt-1' });
      prisma.deliveryTracking.update.mockResolvedValue({});

      const result = await service.reportDeliveryFailure('po-1', 'Customer not available');

      expect(result.status).toBe('DELIVERY_ATTEMPTED');
    });

    it('should send admin alert after 2 failed attempts', async () => {
      const order = makeOrder({ status: 'OUT_FOR_DELIVERY', requiresColdChain: false, deliveryAttempts: 1 });
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);
      prisma.pharmacyOrder.update.mockResolvedValue({ ...order, deliveryAttempts: 2, status: 'DELIVERY_FAILED' });
      prisma.deliveryTracking.findFirst.mockResolvedValue({ id: 'dt-1' });
      prisma.deliveryTracking.update.mockResolvedValue({});
      prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });

      await service.reportDeliveryFailure('po-1', 'Address not found');

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'DELIVERY_FAILED_ADMIN',
        }),
      );
    });
  });

  // ========================================
  // updateDeliveryAddress
  // ========================================

  describe('updateDeliveryAddress', () => {
    it('should update address before dispatch', async () => {
      const order = makeOrder({ status: 'READY_FOR_PICKUP' });
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);
      prisma.pharmacyOrder.update.mockResolvedValue({
        ...order,
        deliveryAddress: '456 New St',
        deliveryPincode: '400002',
      });

      const result = await service.updateDeliveryAddress('po-1', 'patient-1', '456 New St', '400002');

      expect(result.deliveryAddress).toBe('456 New St');
    });

    it('should block address update after dispatch (OUT_FOR_DELIVERY)', async () => {
      const order = makeOrder({ status: 'OUT_FOR_DELIVERY' });
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);

      await expect(
        service.updateDeliveryAddress('po-1', 'patient-1', '456 New St', '400002'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should block if not the patient who placed the order', async () => {
      const order = makeOrder({ status: 'PREPARING' });
      prisma.pharmacyOrder.findUnique.mockResolvedValue(order);

      await expect(
        service.updateDeliveryAddress('po-1', 'other-patient', '456 New St', '400002'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
