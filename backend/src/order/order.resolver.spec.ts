import { Test, TestingModule } from '@nestjs/testing';
import { OrderResolver } from './order.resolver';
import { OrderService } from './order.service';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';

// Spec: master spec Section 8 (Medication Delivery)

describe('OrderResolver', () => {
  let resolver: OrderResolver;
  let mockOrderService: any;

  const mockOrder = {
    id: 'order-1',
    orderNumber: 'ORD-ABC123',
    patientId: 'patient-1',
    prescriptionId: 'prescription-1',
    consultationId: 'consultation-1',
    status: 'PRESCRIPTION_CREATED',
    pharmacyPartnerId: null,
    pharmacyPartnerName: null,
    pharmacyAddress: null,
    deliveryPersonName: null,
    deliveryPersonPhone: null,
    deliveryMethod: null,
    deliveryAddress: '123 Patient Street, Mumbai 400001',
    deliveryCity: 'Mumbai',
    deliveryPincode: '400001',
    deliveryOtp: null,
    estimatedDeliveryTime: null,
    medicationCost: 150000,
    deliveryCost: 5000,
    totalAmount: 155000,
    isReorder: false,
    parentOrderId: null,
    orderedAt: new Date('2026-02-20'),
    sentToPharmacyAt: null,
    pharmacyReadyAt: null,
    deliveredAt: null,
    cancelledAt: null,
    cancellationReason: null,
    deliveryFailedReason: null,
    pharmacyIssueReason: null,
    deliveryRating: null,
    patient: { id: 'patient-1', name: 'Test Patient', phone: '+919111111111' },
    prescription: { id: 'prescription-1' },
  };

  beforeEach(async () => {
    mockOrderService = {
      createOrder: jest.fn(),
      getOrder: jest.fn(),
      sendToPharmacy: jest.fn(),
      startPharmacyPreparing: jest.fn(),
      markPharmacyReady: jest.fn(),
      reportPharmacyIssue: jest.fn(),
      arrangePickup: jest.fn(),
      markOutForDelivery: jest.fn(),
      confirmDelivery: jest.fn(),
      markDeliveryFailed: jest.fn(),
      rescheduleDelivery: jest.fn(),
      cancelOrder: jest.fn(),
      getOrdersByPatient: jest.fn(),
      getOrdersByPharmacy: jest.fn(),
      getPendingDeliveries: jest.fn(),
      createReorder: jest.fn(),
      getOrdersDueForReorder: jest.fn(),
      rateDelivery: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderResolver,
        { provide: OrderService, useValue: mockOrderService },
      ],
    }).compile();

    resolver = module.get<OrderResolver>(OrderResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  // ============================================
  // QUERIES
  // ============================================

  describe('order (query)', () => {
    it('should return order by id', async () => {
      mockOrderService.getOrder.mockResolvedValue(mockOrder);

      const result = await resolver.order('order-1');

      expect(result.success).toBe(true);
      expect(result.order).toBeDefined();
      expect(result.order!.id).toBe('order-1');
      expect(mockOrderService.getOrder).toHaveBeenCalledWith('order-1');
    });

    it('should return error when order not found', async () => {
      mockOrderService.getOrder.mockRejectedValue(
        new NotFoundException('Order not found')
      );

      const result = await resolver.order('non-existent');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('ordersByPatient (query)', () => {
    it('should return orders for patient', async () => {
      mockOrderService.getOrdersByPatient.mockResolvedValue([mockOrder]);

      const result = await resolver.ordersByPatient('patient-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('order-1');
      expect(mockOrderService.getOrdersByPatient).toHaveBeenCalledWith('patient-1');
    });

    it('should return empty array when no orders', async () => {
      mockOrderService.getOrdersByPatient.mockResolvedValue([]);

      const result = await resolver.ordersByPatient('patient-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('pendingDeliveries (query)', () => {
    it('should return pending deliveries', async () => {
      mockOrderService.getPendingDeliveries.mockResolvedValue([mockOrder]);

      const result = await resolver.pendingDeliveries();

      expect(result).toHaveLength(1);
      expect(mockOrderService.getPendingDeliveries).toHaveBeenCalled();
    });
  });

  describe('ordersDueForReorder (query)', () => {
    it('should return orders due for monthly reorder', async () => {
      const deliveredOrder = { ...mockOrder, status: 'DELIVERED', deliveredAt: new Date() };
      mockOrderService.getOrdersDueForReorder.mockResolvedValue([deliveredOrder]);

      const result = await resolver.ordersDueForReorder();

      expect(result).toHaveLength(1);
      expect(mockOrderService.getOrdersDueForReorder).toHaveBeenCalled();
    });
  });

  // ============================================
  // MUTATIONS
  // ============================================

  describe('createOrder (mutation)', () => {
    // Spec: Section 8.2 Step 1 — Prescription Created
    it('should create order from prescription', async () => {
      mockOrderService.createOrder.mockResolvedValue(mockOrder);

      const result = await resolver.createOrder({
        prescriptionId: 'prescription-1',
        deliveryAddress: '123 Patient Street, Mumbai 400001',
        deliveryCity: 'Mumbai',
        deliveryPincode: '400001',
        medicationCost: 150000,
        deliveryCost: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('created');
      expect(result.order).toBeDefined();
    });

    it('should return error when prescription not found', async () => {
      mockOrderService.createOrder.mockRejectedValue(
        new NotFoundException('Prescription not found')
      );

      const result = await resolver.createOrder({
        prescriptionId: 'non-existent',
        deliveryAddress: '123 Street',
        deliveryCity: 'Mumbai',
        deliveryPincode: '400001',
        medicationCost: 150000,
        deliveryCost: 5000,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('sendToPharmacy (mutation)', () => {
    // Spec: Section 8.2 Step 2 — Sent to Pharmacy
    it('should send order to pharmacy', async () => {
      const sentOrder = {
        ...mockOrder,
        status: 'SENT_TO_PHARMACY',
        pharmacyPartnerId: 'pharmacy-1',
        pharmacyPartnerName: 'HealthFirst Pharmacy',
        sentToPharmacyAt: new Date(),
      };
      mockOrderService.sendToPharmacy.mockResolvedValue(sentOrder);

      const result = await resolver.sendToPharmacy({
        orderId: 'order-1',
        pharmacyId: 'pharmacy-1',
      });

      expect(result.success).toBe(true);
      expect(result.order!.status).toBe('SENT_TO_PHARMACY');
    });

    it('should return error for invalid status', async () => {
      mockOrderService.sendToPharmacy.mockRejectedValue(
        new BadRequestException('Cannot send to pharmacy')
      );

      const result = await resolver.sendToPharmacy({
        orderId: 'order-1',
        pharmacyId: 'pharmacy-1',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('arrangePickup (mutation)', () => {
    // Spec: Section 8.2 Step 4 — Delivery Arranged
    it('should arrange pickup and return order with OTP', async () => {
      const arrangedOrder = {
        ...mockOrder,
        status: 'PICKUP_ARRANGED',
        deliveryPersonName: 'Ravi Kumar',
        deliveryPersonPhone: '+919555555555',
        deliveryMethod: 'RAPIDO',
        deliveryOtp: '1234',
        pickupArrangedAt: new Date(),
      };
      mockOrderService.arrangePickup.mockResolvedValue(arrangedOrder);

      const result = await resolver.arrangePickup({
        orderId: 'order-1',
        deliveryPersonName: 'Ravi Kumar',
        deliveryPersonPhone: '+919555555555',
        deliveryMethod: 'RAPIDO',
        estimatedDeliveryTime: '2026-02-20 16:00',
      });

      expect(result.success).toBe(true);
      expect(result.order!.deliveryOtp).toBe('1234');
      expect(result.order!.deliveryPersonName).toBe('Ravi Kumar');
    });
  });

  describe('markOutForDelivery (mutation)', () => {
    // Spec: Section 8.2 Step 5 — Pickup
    it('should mark order as out for delivery', async () => {
      const outOrder = {
        ...mockOrder,
        status: 'OUT_FOR_DELIVERY',
        outForDeliveryAt: new Date(),
      };
      mockOrderService.markOutForDelivery.mockResolvedValue(outOrder);

      const result = await resolver.markOutForDelivery('order-1');

      expect(result.success).toBe(true);
      expect(result.order!.status).toBe('OUT_FOR_DELIVERY');
    });
  });

  describe('confirmDelivery (mutation)', () => {
    // Spec: Section 8.2 Step 6 — Delivery + OTP Confirmation
    it('should confirm delivery with correct OTP', async () => {
      const deliveredOrder = {
        ...mockOrder,
        status: 'DELIVERED',
        deliveredAt: new Date(),
      };
      mockOrderService.confirmDelivery.mockResolvedValue(deliveredOrder);

      const result = await resolver.confirmDelivery({
        orderId: 'order-1',
        otp: '1234',
      });

      expect(result.success).toBe(true);
      expect(result.order!.status).toBe('DELIVERED');
    });

    it('should return error for incorrect OTP', async () => {
      mockOrderService.confirmDelivery.mockRejectedValue(
        new BadRequestException('Invalid delivery OTP')
      );

      const result = await resolver.confirmDelivery({
        orderId: 'order-1',
        otp: '9999',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid');
    });
  });

  describe('markDeliveryFailed (mutation)', () => {
    it('should mark delivery as failed', async () => {
      const failedOrder = {
        ...mockOrder,
        status: 'DELIVERY_FAILED',
        deliveryFailedAt: new Date(),
        deliveryFailedReason: 'Patient not home',
      };
      mockOrderService.markDeliveryFailed.mockResolvedValue(failedOrder);

      const result = await resolver.markDeliveryFailed({
        orderId: 'order-1',
        reason: 'Patient not home',
      });

      expect(result.success).toBe(true);
      expect(result.order!.status).toBe('DELIVERY_FAILED');
    });
  });

  describe('rescheduleDelivery (mutation)', () => {
    it('should reschedule failed delivery', async () => {
      const rescheduledOrder = {
        ...mockOrder,
        status: 'RESCHEDULED',
        rescheduledAt: new Date(),
      };
      mockOrderService.rescheduleDelivery.mockResolvedValue(rescheduledOrder);

      const result = await resolver.rescheduleDelivery({
        orderId: 'order-1',
        newDeliveryDate: '2026-02-21',
      });

      expect(result.success).toBe(true);
      expect(result.order!.status).toBe('RESCHEDULED');
    });
  });

  describe('cancelOrder (mutation)', () => {
    it('should cancel order', async () => {
      const cancelledOrder = {
        ...mockOrder,
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: 'Patient request',
      };
      mockOrderService.cancelOrder.mockResolvedValue(cancelledOrder);

      const result = await resolver.cancelOrder({
        orderId: 'order-1',
        reason: 'Patient request',
      });

      expect(result.success).toBe(true);
      expect(result.order!.status).toBe('CANCELLED');
    });

    it('should return error when cancellation not allowed', async () => {
      mockOrderService.cancelOrder.mockRejectedValue(
        new BadRequestException('Cannot cancel order')
      );

      const result = await resolver.cancelOrder({
        orderId: 'order-1',
        reason: 'Patient request',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('createReorder (mutation)', () => {
    // Spec: Section 8.5 — Monthly Reorder Flow
    it('should create reorder from delivered order', async () => {
      const reorder = {
        ...mockOrder,
        id: 'order-2',
        parentOrderId: 'order-1',
        isReorder: true,
      };
      mockOrderService.createReorder.mockResolvedValue(reorder);

      const result = await resolver.createReorder('order-1');

      expect(result.success).toBe(true);
      expect(result.order!.isReorder).toBe(true);
      expect(result.order!.parentOrderId).toBe('order-1');
    });

    it('should return error if original not delivered', async () => {
      mockOrderService.createReorder.mockRejectedValue(
        new BadRequestException('Can only create reorder from delivered order')
      );

      const result = await resolver.createReorder('order-1');

      expect(result.success).toBe(false);
    });
  });

  describe('rateDelivery (mutation)', () => {
    it('should rate delivery', async () => {
      const ratedOrder = { ...mockOrder, status: 'DELIVERED', deliveryRating: 5 };
      mockOrderService.rateDelivery.mockResolvedValue(ratedOrder);

      const result = await resolver.rateDelivery({
        orderId: 'order-1',
        rating: 5,
      });

      expect(result.success).toBe(true);
      expect(result.order!.deliveryRating).toBe(5);
    });

    it('should return error for invalid rating', async () => {
      mockOrderService.rateDelivery.mockRejectedValue(
        new BadRequestException('Rating must be between 1 and 5')
      );

      const result = await resolver.rateDelivery({
        orderId: 'order-1',
        rating: 0,
      });

      expect(result.success).toBe(false);
    });
  });
});
