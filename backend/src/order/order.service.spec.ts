import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { OrderService, OrderStatus, VALID_ORDER_TRANSITIONS } from './order.service';
import { PrismaService } from '../prisma/prisma.service';

// Spec: master spec Section 8 (Medication Delivery)

describe('OrderService', () => {
  let service: OrderService;
  let mockPrismaService: any;

  const mockOrder = {
    id: 'order-1',
    patientId: 'patient-1',
    prescriptionId: 'prescription-1',
    consultationId: 'consultation-1',
    status: OrderStatus.PRESCRIPTION_CREATED,
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
    medicationCost: 150000, // 1500 rupees in paise
    deliveryCost: 5000, // 50 rupees
    totalAmount: 155000,
    orderedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPharmacy = {
    id: 'pharmacy-1',
    name: 'HealthFirst Pharmacy',
    address: '456 Pharmacy Lane, Mumbai 400002',
    city: 'Mumbai',
    phone: '+919777777777',
    isActive: true,
  };

  beforeEach(async () => {
    mockPrismaService = {
      order: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      partnerPharmacy: {
        findUnique: jest.fn(),
      },
      prescription: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  describe('Service Setup', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ============================================
  // STATUS ENUM AND TRANSITIONS
  // Spec: Section 8.3 — Order Status Enum
  // ============================================
  describe('Order Status Enum', () => {
    it('should define all 12 order statuses', () => {
      expect(Object.keys(OrderStatus)).toHaveLength(12);
      expect(OrderStatus.PRESCRIPTION_CREATED).toBe('PRESCRIPTION_CREATED');
      expect(OrderStatus.SENT_TO_PHARMACY).toBe('SENT_TO_PHARMACY');
      expect(OrderStatus.PHARMACY_PREPARING).toBe('PHARMACY_PREPARING');
      expect(OrderStatus.PHARMACY_READY).toBe('PHARMACY_READY');
      expect(OrderStatus.PHARMACY_ISSUE).toBe('PHARMACY_ISSUE');
      expect(OrderStatus.PICKUP_ARRANGED).toBe('PICKUP_ARRANGED');
      expect(OrderStatus.OUT_FOR_DELIVERY).toBe('OUT_FOR_DELIVERY');
      expect(OrderStatus.DELIVERED).toBe('DELIVERED');
      expect(OrderStatus.DELIVERY_FAILED).toBe('DELIVERY_FAILED');
      expect(OrderStatus.RESCHEDULED).toBe('RESCHEDULED');
      expect(OrderStatus.RETURNED).toBe('RETURNED');
      expect(OrderStatus.CANCELLED).toBe('CANCELLED');
    });

    it('should define valid status transitions', () => {
      expect(VALID_ORDER_TRANSITIONS[OrderStatus.PRESCRIPTION_CREATED]).toContain(
        OrderStatus.SENT_TO_PHARMACY
      );
      expect(VALID_ORDER_TRANSITIONS[OrderStatus.SENT_TO_PHARMACY]).toContain(
        OrderStatus.PHARMACY_PREPARING
      );
      expect(VALID_ORDER_TRANSITIONS[OrderStatus.PHARMACY_PREPARING]).toContain(
        OrderStatus.PHARMACY_READY
      );
      expect(VALID_ORDER_TRANSITIONS[OrderStatus.PHARMACY_READY]).toContain(
        OrderStatus.PICKUP_ARRANGED
      );
      expect(VALID_ORDER_TRANSITIONS[OrderStatus.OUT_FOR_DELIVERY]).toContain(
        OrderStatus.DELIVERED
      );
    });
  });

  // ============================================
  // CREATE ORDER
  // ============================================
  describe('createOrder', () => {
    it('should create an order from prescription', async () => {
      mockPrismaService.prescription.findUnique.mockResolvedValue({
        id: 'prescription-1',
        consultationId: 'consultation-1',
        consultation: { patientId: 'patient-1' },
      });
      mockPrismaService.order.create.mockResolvedValue(mockOrder);

      const result = await service.createOrder({
        prescriptionId: 'prescription-1',
        deliveryAddress: '123 Patient Street, Mumbai 400001',
        deliveryCity: 'Mumbai',
        deliveryPincode: '400001',
        medicationCost: 150000,
        deliveryCost: 5000,
      });

      expect(result.status).toBe(OrderStatus.PRESCRIPTION_CREATED);
      expect(mockPrismaService.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: OrderStatus.PRESCRIPTION_CREATED,
          orderedAt: expect.any(Date),
        }),
      });
    });

    it('should throw error if prescription not found', async () => {
      mockPrismaService.prescription.findUnique.mockResolvedValue(null);

      await expect(
        service.createOrder({
          prescriptionId: 'non-existent',
          deliveryAddress: '123 Street',
          deliveryCity: 'Mumbai',
          deliveryPincode: '400001',
          medicationCost: 150000,
          deliveryCost: 5000,
        })
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // SEND TO PHARMACY
  // Spec: Section 8.2 Step 2 — Sent to Pharmacy
  // ============================================
  describe('sendToPharmacy', () => {
    it('should send order to pharmacy', async () => {
      const createdOrder = { ...mockOrder, status: OrderStatus.PRESCRIPTION_CREATED };
      mockPrismaService.order.findUnique.mockResolvedValue(createdOrder);
      mockPrismaService.partnerPharmacy.findUnique.mockResolvedValue(mockPharmacy);
      mockPrismaService.order.update.mockResolvedValue({
        ...createdOrder,
        status: OrderStatus.SENT_TO_PHARMACY,
        pharmacyPartnerId: 'pharmacy-1',
        pharmacyPartnerName: 'HealthFirst Pharmacy',
        pharmacyAddress: '456 Pharmacy Lane, Mumbai 400002',
        sentToPharmacyAt: new Date(),
      });

      const result = await service.sendToPharmacy({
        orderId: 'order-1',
        pharmacyId: 'pharmacy-1',
      });

      expect(result.status).toBe(OrderStatus.SENT_TO_PHARMACY);
      expect(result.pharmacyPartnerId).toBe('pharmacy-1');
    });

    it('should throw error if pharmacy not found', async () => {
      const createdOrder = { ...mockOrder, status: OrderStatus.PRESCRIPTION_CREATED };
      mockPrismaService.order.findUnique.mockResolvedValue(createdOrder);
      mockPrismaService.partnerPharmacy.findUnique.mockResolvedValue(null);

      await expect(
        service.sendToPharmacy({
          orderId: 'order-1',
          pharmacyId: 'non-existent',
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if pharmacy is not active', async () => {
      const createdOrder = { ...mockOrder, status: OrderStatus.PRESCRIPTION_CREATED };
      mockPrismaService.order.findUnique.mockResolvedValue(createdOrder);
      mockPrismaService.partnerPharmacy.findUnique.mockResolvedValue({
        ...mockPharmacy,
        isActive: false,
      });

      await expect(
        service.sendToPharmacy({
          orderId: 'order-1',
          pharmacyId: 'pharmacy-1',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if order not in PRESCRIPTION_CREATED status', async () => {
      const wrongStatusOrder = { ...mockOrder, status: OrderStatus.SENT_TO_PHARMACY };
      mockPrismaService.order.findUnique.mockResolvedValue(wrongStatusOrder);

      await expect(
        service.sendToPharmacy({
          orderId: 'order-1',
          pharmacyId: 'pharmacy-1',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // PHARMACY FLOW
  // Spec: Section 8.2 Step 3 — Pharmacy Prepares
  // ============================================
  describe('startPharmacyPreparing', () => {
    it('should mark order as pharmacy preparing', async () => {
      const sentOrder = { ...mockOrder, status: OrderStatus.SENT_TO_PHARMACY, pharmacyPartnerId: 'pharmacy-1' };
      mockPrismaService.order.findUnique.mockResolvedValue(sentOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...sentOrder,
        status: OrderStatus.PHARMACY_PREPARING,
        pharmacyPreparingAt: new Date(),
      });

      const result = await service.startPharmacyPreparing({
        orderId: 'order-1',
        pharmacyId: 'pharmacy-1',
      });

      expect(result.status).toBe(OrderStatus.PHARMACY_PREPARING);
    });

    it('should throw error if pharmacy is not assigned to this order', async () => {
      const sentOrder = { ...mockOrder, status: OrderStatus.SENT_TO_PHARMACY, pharmacyPartnerId: 'different-pharmacy' };
      mockPrismaService.order.findUnique.mockResolvedValue(sentOrder);

      await expect(
        service.startPharmacyPreparing({
          orderId: 'order-1',
          pharmacyId: 'pharmacy-1',
        })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('markPharmacyReady', () => {
    it('should mark order as pharmacy ready', async () => {
      const preparingOrder = { ...mockOrder, status: OrderStatus.PHARMACY_PREPARING, pharmacyPartnerId: 'pharmacy-1' };
      mockPrismaService.order.findUnique.mockResolvedValue(preparingOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...preparingOrder,
        status: OrderStatus.PHARMACY_READY,
        pharmacyReadyAt: new Date(),
      });

      const result = await service.markPharmacyReady({
        orderId: 'order-1',
        pharmacyId: 'pharmacy-1',
      });

      expect(result.status).toBe(OrderStatus.PHARMACY_READY);
    });
  });

  describe('reportPharmacyIssue', () => {
    it('should mark order with pharmacy issue', async () => {
      const preparingOrder = { ...mockOrder, status: OrderStatus.PHARMACY_PREPARING, pharmacyPartnerId: 'pharmacy-1' };
      mockPrismaService.order.findUnique.mockResolvedValue(preparingOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...preparingOrder,
        status: OrderStatus.PHARMACY_ISSUE,
        pharmacyIssueAt: new Date(),
        pharmacyIssueReason: 'Medication out of stock',
      });

      const result = await service.reportPharmacyIssue({
        orderId: 'order-1',
        pharmacyId: 'pharmacy-1',
        reason: 'Medication out of stock',
      });

      expect(result.status).toBe(OrderStatus.PHARMACY_ISSUE);
    });

    it('should allow re-preparing after issue resolution', async () => {
      const issueOrder = { ...mockOrder, status: OrderStatus.PHARMACY_ISSUE, pharmacyPartnerId: 'pharmacy-1' };
      mockPrismaService.order.findUnique.mockResolvedValue(issueOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...issueOrder,
        status: OrderStatus.PHARMACY_PREPARING,
      });

      const result = await service.startPharmacyPreparing({
        orderId: 'order-1',
        pharmacyId: 'pharmacy-1',
      });

      expect(result.status).toBe(OrderStatus.PHARMACY_PREPARING);
    });
  });

  // ============================================
  // DELIVERY ARRANGEMENT
  // Spec: Section 8.2 Step 4 — Delivery Arranged
  // ============================================
  describe('arrangePickup', () => {
    it('should arrange pickup and generate delivery OTP', async () => {
      const readyOrder = { ...mockOrder, status: OrderStatus.PHARMACY_READY };
      mockPrismaService.order.findUnique.mockResolvedValue(readyOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...readyOrder,
        status: OrderStatus.PICKUP_ARRANGED,
        deliveryPersonName: 'Ravi Kumar',
        deliveryPersonPhone: '+919555555555',
        deliveryMethod: 'RAPIDO',
        estimatedDeliveryTime: '2026-02-12 16:00',
        deliveryOtp: '1234',
        pickupArrangedAt: new Date(),
      });

      const result = await service.arrangePickup({
        orderId: 'order-1',
        deliveryPersonName: 'Ravi Kumar',
        deliveryPersonPhone: '+919555555555',
        deliveryMethod: 'RAPIDO',
        estimatedDeliveryTime: '2026-02-12 16:00',
      });

      expect(result.status).toBe(OrderStatus.PICKUP_ARRANGED);
      expect(result.deliveryOtp).toBeDefined();
      expect(result.deliveryOtp).toHaveLength(4);
    });

    it('should generate 4-digit OTP', async () => {
      const readyOrder = { ...mockOrder, status: OrderStatus.PHARMACY_READY };
      mockPrismaService.order.findUnique.mockResolvedValue(readyOrder);

      // Mock update to capture the OTP
      mockPrismaService.order.update.mockImplementation(({ data }) => {
        expect(data.deliveryOtp).toMatch(/^\d{4}$/);
        return Promise.resolve({ ...readyOrder, ...data });
      });

      await service.arrangePickup({
        orderId: 'order-1',
        deliveryPersonName: 'Ravi Kumar',
        deliveryPersonPhone: '+919555555555',
        deliveryMethod: 'RAPIDO',
        estimatedDeliveryTime: '2026-02-12 16:00',
      });
    });

    it('should throw error if order not ready', async () => {
      const wrongStatusOrder = { ...mockOrder, status: OrderStatus.PHARMACY_PREPARING };
      mockPrismaService.order.findUnique.mockResolvedValue(wrongStatusOrder);

      await expect(
        service.arrangePickup({
          orderId: 'order-1',
          deliveryPersonName: 'Ravi Kumar',
          deliveryPersonPhone: '+919555555555',
          deliveryMethod: 'RAPIDO',
          estimatedDeliveryTime: '2026-02-12 16:00',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // OUT FOR DELIVERY
  // Spec: Section 8.2 Step 5 — Pickup
  // ============================================
  describe('markOutForDelivery', () => {
    it('should mark order as out for delivery', async () => {
      const arrangedOrder = { ...mockOrder, status: OrderStatus.PICKUP_ARRANGED };
      mockPrismaService.order.findUnique.mockResolvedValue(arrangedOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...arrangedOrder,
        status: OrderStatus.OUT_FOR_DELIVERY,
        outForDeliveryAt: new Date(),
      });

      const result = await service.markOutForDelivery('order-1');

      expect(result.status).toBe(OrderStatus.OUT_FOR_DELIVERY);
    });
  });

  // ============================================
  // DELIVERY + OTP CONFIRMATION
  // Spec: Section 8.2 Step 6 — Delivery + OTP
  // ============================================
  describe('confirmDelivery', () => {
    it('should confirm delivery with correct OTP', async () => {
      const outForDeliveryOrder = {
        ...mockOrder,
        status: OrderStatus.OUT_FOR_DELIVERY,
        deliveryOtp: '1234',
      };
      mockPrismaService.order.findUnique.mockResolvedValue(outForDeliveryOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...outForDeliveryOrder,
        status: OrderStatus.DELIVERED,
        deliveredAt: new Date(),
      });

      const result = await service.confirmDelivery({
        orderId: 'order-1',
        otp: '1234',
      });

      expect(result.status).toBe(OrderStatus.DELIVERED);
    });

    it('should throw error for incorrect OTP', async () => {
      const outForDeliveryOrder = {
        ...mockOrder,
        status: OrderStatus.OUT_FOR_DELIVERY,
        deliveryOtp: '1234',
      };
      mockPrismaService.order.findUnique.mockResolvedValue(outForDeliveryOrder);

      await expect(
        service.confirmDelivery({
          orderId: 'order-1',
          otp: '9999',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if order not out for delivery', async () => {
      const wrongStatusOrder = { ...mockOrder, status: OrderStatus.PICKUP_ARRANGED, deliveryOtp: '1234' };
      mockPrismaService.order.findUnique.mockResolvedValue(wrongStatusOrder);

      await expect(
        service.confirmDelivery({
          orderId: 'order-1',
          otp: '1234',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // DELIVERY FAILED
  // ============================================
  describe('markDeliveryFailed', () => {
    it('should mark delivery as failed with reason', async () => {
      const outForDeliveryOrder = { ...mockOrder, status: OrderStatus.OUT_FOR_DELIVERY };
      mockPrismaService.order.findUnique.mockResolvedValue(outForDeliveryOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...outForDeliveryOrder,
        status: OrderStatus.DELIVERY_FAILED,
        deliveryFailedAt: new Date(),
        deliveryFailedReason: 'Patient not home',
      });

      const result = await service.markDeliveryFailed({
        orderId: 'order-1',
        reason: 'Patient not home',
      });

      expect(result.status).toBe(OrderStatus.DELIVERY_FAILED);
    });
  });

  // ============================================
  // RESCHEDULE
  // ============================================
  describe('rescheduleDelivery', () => {
    it('should reschedule failed delivery', async () => {
      const failedOrder = { ...mockOrder, status: OrderStatus.DELIVERY_FAILED };
      mockPrismaService.order.findUnique.mockResolvedValue(failedOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...failedOrder,
        status: OrderStatus.RESCHEDULED,
        rescheduledAt: new Date(),
      });

      const result = await service.rescheduleDelivery({
        orderId: 'order-1',
        newDeliveryDate: '2026-02-13',
      });

      expect(result.status).toBe(OrderStatus.RESCHEDULED);
    });

    it('should allow re-arranging pickup after reschedule', async () => {
      const rescheduledOrder = { ...mockOrder, status: OrderStatus.RESCHEDULED };
      mockPrismaService.order.findUnique.mockResolvedValue(rescheduledOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...rescheduledOrder,
        status: OrderStatus.PICKUP_ARRANGED,
      });

      const result = await service.arrangePickup({
        orderId: 'order-1',
        deliveryPersonName: 'Ravi Kumar',
        deliveryPersonPhone: '+919555555555',
        deliveryMethod: 'RAPIDO',
        estimatedDeliveryTime: '2026-02-13 16:00',
      });

      expect(result.status).toBe(OrderStatus.PICKUP_ARRANGED);
    });
  });

  // ============================================
  // CANCEL ORDER
  // ============================================
  describe('cancelOrder', () => {
    it('should cancel order', async () => {
      const createdOrder = { ...mockOrder, status: OrderStatus.PRESCRIPTION_CREATED };
      mockPrismaService.order.findUnique.mockResolvedValue(createdOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...createdOrder,
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: 'Patient request',
      });

      const result = await service.cancelOrder({
        orderId: 'order-1',
        reason: 'Patient request',
      });

      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('should not allow cancellation after delivery', async () => {
      const deliveredOrder = { ...mockOrder, status: OrderStatus.DELIVERED };
      mockPrismaService.order.findUnique.mockResolvedValue(deliveredOrder);

      await expect(
        service.cancelOrder({
          orderId: 'order-1',
          reason: 'Patient request',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // GET ORDERS
  // ============================================
  describe('getOrder', () => {
    it('should return order by id', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.getOrder('order-1');

      expect(result.id).toBe('order-1');
    });

    it('should throw error if not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.getOrder('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getOrdersByPatient', () => {
    it('should return orders for patient', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([mockOrder]);

      const result = await service.getOrdersByPatient('patient-1');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { patientId: 'patient-1' },
        })
      );
    });
  });

  describe('getOrdersByPharmacy', () => {
    it('should return orders for pharmacy', async () => {
      const sentOrder = { ...mockOrder, status: OrderStatus.SENT_TO_PHARMACY, pharmacyPartnerId: 'pharmacy-1' };
      mockPrismaService.order.findMany.mockResolvedValue([sentOrder]);

      const result = await service.getOrdersByPharmacy('pharmacy-1');

      expect(result).toHaveLength(1);
    });

    it('should filter by status', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([]);

      await service.getOrdersByPharmacy('pharmacy-1', OrderStatus.PHARMACY_PREPARING);

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            pharmacyPartnerId: 'pharmacy-1',
            status: OrderStatus.PHARMACY_PREPARING,
          },
        })
      );
    });
  });

  describe('getPendingDeliveries', () => {
    it('should return orders awaiting delivery', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([]);

      await service.getPendingDeliveries();

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: {
              in: [OrderStatus.PHARMACY_READY, OrderStatus.PICKUP_ARRANGED, OrderStatus.RESCHEDULED],
            },
          },
        })
      );
    });
  });

  // ============================================
  // MONTHLY REORDER
  // Spec: Section 8.5 — Monthly Reorder Flow
  // ============================================
  describe('createReorder', () => {
    it('should create reorder from previous order', async () => {
      const deliveredOrder = {
        ...mockOrder,
        status: OrderStatus.DELIVERED,
        deliveredAt: new Date(),
      };
      mockPrismaService.order.findUnique.mockResolvedValue(deliveredOrder);
      mockPrismaService.order.create.mockResolvedValue({
        ...mockOrder,
        id: 'order-2',
        parentOrderId: 'order-1',
        isReorder: true,
      });

      const result = await service.createReorder('order-1');

      expect(result.parentOrderId).toBe('order-1');
      expect(result.isReorder).toBe(true);
      expect(mockPrismaService.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          parentOrderId: 'order-1',
          isReorder: true,
        }),
      });
    });

    it('should throw error if original order not delivered', async () => {
      const notDeliveredOrder = { ...mockOrder, status: OrderStatus.OUT_FOR_DELIVERY };
      mockPrismaService.order.findUnique.mockResolvedValue(notDeliveredOrder);

      await expect(service.createReorder('order-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getOrdersDueForReorder', () => {
    it('should return orders due for monthly reorder', async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deliveredOrder = {
        ...mockOrder,
        status: OrderStatus.DELIVERED,
        deliveredAt: thirtyDaysAgo,
      };
      mockPrismaService.order.findMany.mockResolvedValue([deliveredOrder]);

      const result = await service.getOrdersDueForReorder();

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: OrderStatus.DELIVERED,
          }),
        })
      );
    });
  });

  // ============================================
  // DELIVERY RATING
  // ============================================
  describe('rateDelivery', () => {
    it('should rate delivery', async () => {
      const deliveredOrder = { ...mockOrder, status: OrderStatus.DELIVERED };
      mockPrismaService.order.findUnique.mockResolvedValue(deliveredOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...deliveredOrder,
        deliveryRating: 5,
      });

      const result = await service.rateDelivery({
        orderId: 'order-1',
        rating: 5,
      });

      expect(result.deliveryRating).toBe(5);
    });

    it('should validate rating is between 1 and 5', async () => {
      const deliveredOrder = { ...mockOrder, status: OrderStatus.DELIVERED };
      mockPrismaService.order.findUnique.mockResolvedValue(deliveredOrder);

      await expect(
        service.rateDelivery({ orderId: 'order-1', rating: 0 })
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.rateDelivery({ orderId: 'order-1', rating: 6 })
      ).rejects.toThrow(BadRequestException);
    });

    it('should only allow rating delivered orders', async () => {
      const notDeliveredOrder = { ...mockOrder, status: OrderStatus.OUT_FOR_DELIVERY };
      mockPrismaService.order.findUnique.mockResolvedValue(notDeliveredOrder);

      await expect(
        service.rateDelivery({ orderId: 'order-1', rating: 5 })
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // STATUS TRANSITION VALIDATION
  // ============================================
  describe('isValidTransition', () => {
    it('should return true for valid transitions', () => {
      expect(
        service.isValidTransition(OrderStatus.PRESCRIPTION_CREATED, OrderStatus.SENT_TO_PHARMACY)
      ).toBe(true);
      expect(
        service.isValidTransition(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED)
      ).toBe(true);
    });

    it('should return false for invalid transitions', () => {
      expect(
        service.isValidTransition(OrderStatus.PRESCRIPTION_CREATED, OrderStatus.DELIVERED)
      ).toBe(false);
      expect(
        service.isValidTransition(OrderStatus.DELIVERED, OrderStatus.OUT_FOR_DELIVERY)
      ).toBe(false);
    });
  });
});
