import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SubscriptionService, CreateSubscriptionInput, RenewSubscriptionInput } from './subscription.service';
import { PrismaService } from '../prisma/prisma.service';

// Spec: master spec Section 12 (Payment & Subscription)

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    subscriptionPlan: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    subscription: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    prescription: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  // Mock Razorpay subscriptions
  const mockRazorpay = {
    subscriptions: {
      create: jest.fn(),
      cancel: jest.fn(),
      fetch: jest.fn(),
    },
    plans: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: 'RAZORPAY_INSTANCE', useValue: mockRazorpay },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  // ==========================================
  // SUBSCRIPTION PLANS PRICING
  // ==========================================

  describe('getPlanPricing', () => {
    // Spec: Section 12 — Pricing
    // Hair Loss: ₹999/month, ₹2,499/quarter, ₹8,999/year
    // ED: ₹1,299/month, ₹3,299/quarter, ₹11,999/year
    // Weight: ₹2,999/month, ₹7,999/quarter, ₹9,999/month (GLP-1 premium)
    // PCOS: ₹1,499/month, ₹3,799/quarter, ₹13,999/year

    describe('Hair Loss pricing', () => {
      it('should return ₹999/month (99900 paise) for Hair Loss monthly', () => {
        const price = service.getPlanPricing('HAIR_LOSS', 'MONTHLY');
        expect(price).toBe(99900);
      });

      it('should return ₹2,499/quarter (249900 paise) for Hair Loss quarterly', () => {
        const price = service.getPlanPricing('HAIR_LOSS', 'QUARTERLY');
        expect(price).toBe(249900);
      });

      it('should return ₹8,999/year (899900 paise) for Hair Loss annual', () => {
        const price = service.getPlanPricing('HAIR_LOSS', 'ANNUAL');
        expect(price).toBe(899900);
      });
    });

    describe('ED (Sexual Health) pricing', () => {
      it('should return ₹1,299/month (129900 paise) for ED monthly', () => {
        const price = service.getPlanPricing('SEXUAL_HEALTH', 'MONTHLY');
        expect(price).toBe(129900);
      });

      it('should return ₹3,299/quarter (329900 paise) for ED quarterly', () => {
        const price = service.getPlanPricing('SEXUAL_HEALTH', 'QUARTERLY');
        expect(price).toBe(329900);
      });

      it('should return ₹11,999/year (1199900 paise) for ED annual', () => {
        const price = service.getPlanPricing('SEXUAL_HEALTH', 'ANNUAL');
        expect(price).toBe(1199900);
      });
    });

    describe('Weight Management pricing', () => {
      it('should return ₹2,999/month (299900 paise) for Weight standard monthly', () => {
        const price = service.getPlanPricing('WEIGHT_MANAGEMENT', 'MONTHLY');
        expect(price).toBe(299900);
      });

      it('should return ₹7,999/quarter (799900 paise) for Weight quarterly', () => {
        const price = service.getPlanPricing('WEIGHT_MANAGEMENT', 'QUARTERLY');
        expect(price).toBe(799900);
      });

      it('should return ₹9,999/month (999900 paise) for Weight GLP-1 premium', () => {
        const price = service.getPlanPricing('WEIGHT_MANAGEMENT', 'MONTHLY_PREMIUM');
        expect(price).toBe(999900);
      });
    });

    describe('PCOS pricing', () => {
      it('should return ₹1,499/month (149900 paise) for PCOS monthly', () => {
        const price = service.getPlanPricing('PCOS', 'MONTHLY');
        expect(price).toBe(149900);
      });

      it('should return ₹3,799/quarter (379900 paise) for PCOS quarterly', () => {
        const price = service.getPlanPricing('PCOS', 'QUARTERLY');
        expect(price).toBe(379900);
      });

      it('should return ₹13,999/year (1399900 paise) for PCOS annual', () => {
        const price = service.getPlanPricing('PCOS', 'ANNUAL');
        expect(price).toBe(1399900);
      });
    });
  });

  // ==========================================
  // CREATE SUBSCRIPTION
  // ==========================================

  describe('createSubscription', () => {
    const validInput: CreateSubscriptionInput = {
      userId: 'user-1',
      planId: 'plan-hair-monthly',
    };

    it('should create subscription with correct start and end dates', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.subscriptionPlan.findUnique.mockResolvedValue({
        id: 'plan-hair-monthly',
        vertical: 'HAIR_LOSS',
        priceInPaise: 99900,
        durationMonths: 1,
      });
      mockRazorpay.subscriptions.create.mockResolvedValue({
        id: 'sub_razorpay123',
        status: 'active',
      });
      mockPrismaService.subscription.create.mockResolvedValue({
        id: 'subscription-1',
        userId: 'user-1',
        planId: 'plan-hair-monthly',
        status: 'ACTIVE',
        currentPeriodStart: expect.any(Date),
        currentPeriodEnd: expect.any(Date),
      });

      const result = await service.createSubscription(validInput);

      expect(result.status).toBe('ACTIVE');
      expect(mockPrismaService.subscription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          planId: 'plan-hair-monthly',
          status: 'ACTIVE',
        }),
      });
    });

    it('should set period end 1 month ahead for monthly subscription', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.subscriptionPlan.findUnique.mockResolvedValue({
        id: 'plan-1',
        durationMonths: 1,
        priceInPaise: 99900,
      });
      mockRazorpay.subscriptions.create.mockResolvedValue({ id: 'sub_123' });
      mockPrismaService.subscription.create.mockImplementation(({ data }) => ({
        ...data,
        id: 'subscription-1',
      }));

      const result = await service.createSubscription(validInput);

      const createCall = mockPrismaService.subscription.create.mock.calls[0][0];
      const startDate = new Date(createCall.data.currentPeriodStart);
      const endDate = new Date(createCall.data.currentPeriodEnd);
      const monthDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth());
      expect(monthDiff).toBe(1);
    });

    it('should set period end 3 months ahead for quarterly subscription', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.subscriptionPlan.findUnique.mockResolvedValue({
        id: 'plan-quarterly',
        durationMonths: 3,
        priceInPaise: 249900,
      });
      mockRazorpay.subscriptions.create.mockResolvedValue({ id: 'sub_123' });
      mockPrismaService.subscription.create.mockImplementation(({ data }) => ({
        ...data,
        id: 'subscription-1',
      }));

      await service.createSubscription({ userId: 'user-1', planId: 'plan-quarterly' });

      const createCall = mockPrismaService.subscription.create.mock.calls[0][0];
      const startDate = new Date(createCall.data.currentPeriodStart);
      const endDate = new Date(createCall.data.currentPeriodEnd);
      const monthDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth());
      expect(monthDiff).toBe(3);
    });

    it('should set period end 12 months ahead for annual subscription', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.subscriptionPlan.findUnique.mockResolvedValue({
        id: 'plan-annual',
        durationMonths: 12,
        priceInPaise: 899900,
      });
      mockRazorpay.subscriptions.create.mockResolvedValue({ id: 'sub_123' });
      mockPrismaService.subscription.create.mockImplementation(({ data }) => ({
        ...data,
        id: 'subscription-1',
      }));

      await service.createSubscription({ userId: 'user-1', planId: 'plan-annual' });

      const createCall = mockPrismaService.subscription.create.mock.calls[0][0];
      const startDate = new Date(createCall.data.currentPeriodStart);
      const endDate = new Date(createCall.data.currentPeriodEnd);
      const monthDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth());
      expect(monthDiff).toBe(12);
    });

    it('should throw if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.createSubscription(validInput)).rejects.toThrow(NotFoundException);
    });

    it('should throw if plan not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.subscriptionPlan.findUnique.mockResolvedValue(null);

      await expect(service.createSubscription(validInput)).rejects.toThrow(NotFoundException);
    });

    it('should store Razorpay subscription ID', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.subscriptionPlan.findUnique.mockResolvedValue({
        id: 'plan-1',
        durationMonths: 1,
        priceInPaise: 99900,
      });
      mockRazorpay.subscriptions.create.mockResolvedValue({
        id: 'sub_razorpay_abc',
        status: 'active',
      });
      mockPrismaService.subscription.create.mockImplementation(({ data }) => ({
        ...data,
        id: 'subscription-1',
      }));

      await service.createSubscription(validInput);

      expect(mockPrismaService.subscription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          razorpaySubscriptionId: 'sub_razorpay_abc',
        }),
      });
    });
  });

  // ==========================================
  // AUTO-RENEWAL
  // ==========================================

  describe('processAutoRenewal', () => {
    it('should renew subscription and extend period on successful payment', async () => {
      const subscription = {
        id: 'subscription-1',
        userId: 'user-1',
        planId: 'plan-1',
        status: 'ACTIVE',
        razorpaySubscriptionId: 'sub_rp123',
        currentPeriodEnd: new Date(),
        plan: {
          id: 'plan-1',
          durationMonths: 1,
          priceInPaise: 99900,
          vertical: 'HAIR_LOSS',
        },
      };

      mockPrismaService.subscription.findUnique.mockResolvedValue(subscription);
      mockRazorpay.subscriptions.fetch.mockResolvedValue({
        id: 'sub_rp123',
        status: 'active',
        current_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days from now
      });
      mockPrismaService.subscription.update.mockResolvedValue({
        ...subscription,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const result = await service.processAutoRenewal('subscription-1');

      expect(result.renewed).toBe(true);
      expect(mockPrismaService.subscription.update).toHaveBeenCalledWith({
        where: { id: 'subscription-1' },
        data: expect.objectContaining({
          currentPeriodEnd: expect.any(Date),
        }),
      });
    });

    it('should trigger auto-reorder on successful renewal', async () => {
      const subscription = {
        id: 'subscription-1',
        userId: 'user-1',
        planId: 'plan-1',
        status: 'ACTIVE',
        razorpaySubscriptionId: 'sub_rp123',
        currentPeriodEnd: new Date(),
        plan: {
          id: 'plan-1',
          durationMonths: 1,
          priceInPaise: 99900,
          vertical: 'HAIR_LOSS',
        },
      };

      mockPrismaService.subscription.findUnique.mockResolvedValue(subscription);
      mockRazorpay.subscriptions.fetch.mockResolvedValue({
        id: 'sub_rp123',
        status: 'active',
        current_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      });
      mockPrismaService.subscription.update.mockResolvedValue({
        ...subscription,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      mockPrismaService.prescription.findFirst.mockResolvedValue({
        id: 'prescription-1',
        patientId: 'user-1',
        consultationId: 'consult-1',
      });
      mockPrismaService.order.findFirst.mockResolvedValue({
        id: 'last-order',
        prescriptionId: 'prescription-1',
        deliveryAddress: '123 Main St',
        deliveryCity: 'Mumbai',
        deliveryPincode: '400001',
        medicationCost: 50000,
        deliveryCost: 5000,
        totalAmount: 55000,
      });
      mockPrismaService.order.create.mockResolvedValue({
        id: 'order-reorder-1',
        isReorder: true,
      });

      const result = await service.processAutoRenewal('subscription-1');

      expect(result.autoReorderTriggered).toBe(true);
    });
  });

  // ==========================================
  // FAILED PAYMENT HANDLING
  // ==========================================

  describe('handleFailedPayment', () => {
    const subscription = {
      id: 'subscription-1',
      userId: 'user-1',
      status: 'ACTIVE',
      currentPeriodEnd: new Date(),
      failedPaymentCount: 0,
    };

    it('should mark subscription in grace period on first failed payment', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue(subscription);
      mockPrismaService.subscription.update.mockResolvedValue({
        ...subscription,
        failedPaymentCount: 1,
        gracePeriodEndAt: expect.any(Date),
      });

      const result = await service.handleFailedPayment('subscription-1');

      expect(result.inGracePeriod).toBe(true);
      expect(mockPrismaService.subscription.update).toHaveBeenCalledWith({
        where: { id: 'subscription-1' },
        data: expect.objectContaining({
          failedPaymentCount: 1,
        }),
      });
    });

    it('should set 3-day grace period on failed payment', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue(subscription);
      mockPrismaService.subscription.update.mockImplementation(({ data }) => ({
        ...subscription,
        ...data,
      }));

      await service.handleFailedPayment('subscription-1');

      const updateCall = mockPrismaService.subscription.update.mock.calls[0][0];
      const gracePeriodEnd = new Date(updateCall.data.gracePeriodEndAt);
      const now = new Date();
      const daysDiff = Math.round((gracePeriodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      expect(daysDiff).toBe(3);
    });

    it('should schedule retry on day 1', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue({
        ...subscription,
        failedPaymentCount: 0,
      });
      mockPrismaService.subscription.update.mockResolvedValue({
        ...subscription,
        nextRetryAt: expect.any(Date),
      });

      const result = await service.handleFailedPayment('subscription-1');

      expect(result.nextRetryDay).toBe(1);
    });

    it('should schedule retry on day 3 after first retry fails', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue({
        ...subscription,
        failedPaymentCount: 1,
      });
      mockPrismaService.subscription.update.mockResolvedValue({
        ...subscription,
        failedPaymentCount: 2,
      });

      const result = await service.handleFailedPayment('subscription-1');

      expect(result.nextRetryDay).toBe(3);
    });

    it('should schedule retry on day 7 after second retry fails', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue({
        ...subscription,
        failedPaymentCount: 2,
      });
      mockPrismaService.subscription.update.mockResolvedValue({
        ...subscription,
        failedPaymentCount: 3,
      });

      const result = await service.handleFailedPayment('subscription-1');

      expect(result.nextRetryDay).toBe(7);
    });

    it('should mark subscription EXPIRED after all retries fail', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue({
        ...subscription,
        failedPaymentCount: 3, // Already had 3 retries
      });
      mockPrismaService.subscription.update.mockResolvedValue({
        ...subscription,
        status: 'EXPIRED',
      });

      const result = await service.handleFailedPayment('subscription-1');

      expect(result.expired).toBe(true);
      expect(mockPrismaService.subscription.update).toHaveBeenCalledWith({
        where: { id: 'subscription-1' },
        data: expect.objectContaining({
          status: 'EXPIRED',
        }),
      });
    });
  });

  // ==========================================
  // CANCEL SUBSCRIPTION
  // ==========================================

  describe('cancelSubscription', () => {
    const activeSubscription = {
      id: 'subscription-1',
      userId: 'user-1',
      status: 'ACTIVE',
      razorpaySubscriptionId: 'sub_rp123',
      currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
    };

    it('should allow patient to cancel anytime', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue(activeSubscription);
      mockRazorpay.subscriptions.cancel.mockResolvedValue({
        id: 'sub_rp123',
        status: 'cancelled',
      });
      mockPrismaService.subscription.update.mockResolvedValue({
        ...activeSubscription,
        status: 'CANCELLED',
        cancelledAt: expect.any(Date),
      });

      const result = await service.cancelSubscription('subscription-1', 'user-1');

      expect(result.status).toBe('CANCELLED');
      expect(result.cancelledAt).toBeDefined();
    });

    it('should keep subscription active until current period ends', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue(activeSubscription);
      mockRazorpay.subscriptions.cancel.mockResolvedValue({
        id: 'sub_rp123',
        status: 'cancelled',
      });
      mockPrismaService.subscription.update.mockResolvedValue({
        ...activeSubscription,
        status: 'CANCELLED',
        cancelledAt: new Date(),
        activeUntil: activeSubscription.currentPeriodEnd,
      });

      const result = await service.cancelSubscription('subscription-1', 'user-1');

      expect(result.activeUntil).toEqual(activeSubscription.currentPeriodEnd);
    });

    it('should throw if user tries to cancel another users subscription', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue(activeSubscription);

      await expect(
        service.cancelSubscription('subscription-1', 'different-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw if subscription not found', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue(null);

      await expect(
        service.cancelSubscription('non-existent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if subscription already cancelled', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue({
        ...activeSubscription,
        status: 'CANCELLED',
      });

      await expect(
        service.cancelSubscription('subscription-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should cancel Razorpay subscription on cancel', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue(activeSubscription);
      mockRazorpay.subscriptions.cancel.mockResolvedValue({ id: 'sub_rp123' });
      mockPrismaService.subscription.update.mockResolvedValue({
        ...activeSubscription,
        status: 'CANCELLED',
      });

      await service.cancelSubscription('subscription-1', 'user-1');

      expect(mockRazorpay.subscriptions.cancel).toHaveBeenCalledWith('sub_rp123');
    });
  });

  // ==========================================
  // SUBSCRIPTION RENEWAL → AUTO-REORDER
  // ==========================================

  describe('triggerAutoReorder', () => {
    it('should create new order from latest prescription on renewal', async () => {
      mockPrismaService.prescription.findFirst.mockResolvedValue({
        id: 'prescription-1',
        patientId: 'user-1',
        consultationId: 'consult-1',
        medications: [{ name: 'Finasteride', dosage: '1mg' }],
      });
      mockPrismaService.order.findFirst.mockResolvedValue({
        id: 'last-order',
        deliveryAddress: '123 Main St',
        deliveryCity: 'Mumbai',
        deliveryPincode: '400001',
        medicationCost: 50000,
        deliveryCost: 5000,
        totalAmount: 55000,
      });
      mockPrismaService.order.create.mockResolvedValue({
        id: 'new-order-1',
        isReorder: true,
        status: 'PRESCRIPTION_CREATED',
      });

      const result = await service.triggerAutoReorder('user-1', 'HAIR_LOSS');

      expect(mockPrismaService.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isReorder: true,
          status: 'PRESCRIPTION_CREATED',
        }),
      });
      expect(result.orderId).toBe('new-order-1');
    });

    it('should use delivery address from last order for reorder', async () => {
      mockPrismaService.prescription.findFirst.mockResolvedValue({
        id: 'prescription-1',
        patientId: 'user-1',
        consultationId: 'consult-1',
      });
      mockPrismaService.order.findFirst.mockResolvedValue({
        id: 'last-order',
        prescriptionId: 'prescription-1',
        deliveryAddress: '456 Oak Street',
        deliveryCity: 'Delhi',
        deliveryPincode: '110001',
        medicationCost: 60000,
        deliveryCost: 5000,
        totalAmount: 65000,
      });
      mockPrismaService.order.create.mockResolvedValue({
        id: 'reorder-1',
        deliveryAddress: '456 Oak Street',
      });

      await service.triggerAutoReorder('user-1', 'HAIR_LOSS');

      expect(mockPrismaService.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          deliveryAddress: '456 Oak Street',
          deliveryCity: 'Delhi',
          deliveryPincode: '110001',
        }),
      });
    });

    it('should not create reorder if no active prescription exists', async () => {
      mockPrismaService.prescription.findFirst.mockResolvedValue(null);

      const result = await service.triggerAutoReorder('user-1', 'HAIR_LOSS');

      expect(result.orderId).toBeUndefined();
      expect(result.reason).toBe('NO_ACTIVE_PRESCRIPTION');
      expect(mockPrismaService.order.create).not.toHaveBeenCalled();
    });

    it('should flag for review if prescription was modified since last order', async () => {
      mockPrismaService.prescription.findFirst.mockResolvedValue({
        id: 'prescription-2', // Different prescription ID
        patientId: 'user-1',
        consultationId: 'consult-2',
        updatedAt: new Date(), // Recently updated
      });
      mockPrismaService.order.findFirst.mockResolvedValue({
        id: 'last-order',
        prescriptionId: 'prescription-1', // Old prescription
        deliveryAddress: '123 Main St',
        deliveryCity: 'Mumbai',
        deliveryPincode: '400001',
        medicationCost: 50000,
        deliveryCost: 5000,
        totalAmount: 55000,
      });
      mockPrismaService.order.create.mockResolvedValue({
        id: 'new-order',
        prescriptionId: 'prescription-2',
        needsReview: true,
      });

      const result = await service.triggerAutoReorder('user-1', 'HAIR_LOSS');

      expect(result.needsCoordinatorReview).toBe(true);
    });
  });

  // ==========================================
  // GET SUBSCRIPTION
  // ==========================================

  describe('getSubscription', () => {
    it('should return subscription by ID', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue({
        id: 'subscription-1',
        userId: 'user-1',
        status: 'ACTIVE',
        plan: {
          id: 'plan-1',
          vertical: 'HAIR_LOSS',
          priceInPaise: 99900,
        },
      });

      const result = await service.getSubscription('subscription-1');

      expect(result.id).toBe('subscription-1');
      expect(result.plan.vertical).toBe('HAIR_LOSS');
    });

    it('should throw if subscription not found', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue(null);

      await expect(service.getSubscription('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSubscriptionsByUser', () => {
    it('should return all subscriptions for a user', async () => {
      mockPrismaService.subscription.findMany.mockResolvedValue([
        { id: 'sub-1', status: 'ACTIVE' },
        { id: 'sub-2', status: 'CANCELLED' },
      ]);

      const result = await service.getSubscriptionsByUser('user-1');

      expect(result).toHaveLength(2);
    });

    it('should filter by status if provided', async () => {
      mockPrismaService.subscription.findMany.mockResolvedValue([
        { id: 'sub-1', status: 'ACTIVE' },
      ]);

      await service.getSubscriptionsByUser('user-1', 'ACTIVE');

      expect(mockPrismaService.subscription.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: 'ACTIVE' },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getActiveSubscriptionForVertical', () => {
    it('should return active subscription for specific vertical', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        status: 'ACTIVE',
        plan: { vertical: 'HAIR_LOSS' },
      });

      const result = await service.getActiveSubscriptionForVertical('user-1', 'HAIR_LOSS');

      expect(result.plan.vertical).toBe('HAIR_LOSS');
      expect(mockPrismaService.subscription.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: 'ACTIVE',
          plan: { vertical: 'HAIR_LOSS' },
        },
        include: { plan: true },
      });
    });

    it('should return null if no active subscription for vertical', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue(null);

      const result = await service.getActiveSubscriptionForVertical('user-1', 'PCOS');

      expect(result).toBeNull();
    });
  });

  // ==========================================
  // SUBSCRIPTION PLANS
  // ==========================================

  describe('getAvailablePlans', () => {
    it('should return all active plans for a vertical', async () => {
      mockPrismaService.subscriptionPlan.findMany.mockResolvedValue([
        { id: 'plan-1', vertical: 'HAIR_LOSS', durationMonths: 1, priceInPaise: 99900 },
        { id: 'plan-2', vertical: 'HAIR_LOSS', durationMonths: 3, priceInPaise: 249900 },
        { id: 'plan-3', vertical: 'HAIR_LOSS', durationMonths: 12, priceInPaise: 899900 },
      ]);

      const result = await service.getAvailablePlans('HAIR_LOSS');

      expect(result).toHaveLength(3);
      expect(mockPrismaService.subscriptionPlan.findMany).toHaveBeenCalledWith({
        where: { vertical: 'HAIR_LOSS', isActive: true },
        orderBy: { durationMonths: 'asc' },
      });
    });
  });

  // ==========================================
  // PAUSE/RESUME SUBSCRIPTION
  // ==========================================

  describe('pauseSubscription', () => {
    it('should pause an active subscription', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        status: 'ACTIVE',
        razorpaySubscriptionId: 'sub_rp123',
      });
      mockPrismaService.subscription.update.mockResolvedValue({
        id: 'sub-1',
        status: 'PAUSED',
        pausedAt: expect.any(Date),
      });

      const result = await service.pauseSubscription('sub-1', 'user-1');

      expect(result.status).toBe('PAUSED');
    });

    it('should throw if subscription not found', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue(null);

      await expect(service.pauseSubscription('non-existent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if user is not owner', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        status: 'ACTIVE',
      });

      await expect(service.pauseSubscription('sub-1', 'different-user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('resumeSubscription', () => {
    it('should resume a paused subscription', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        status: 'PAUSED',
        razorpaySubscriptionId: 'sub_rp123',
      });
      mockPrismaService.subscription.update.mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
        resumedAt: expect.any(Date),
      });

      const result = await service.resumeSubscription('sub-1', 'user-1');

      expect(result.status).toBe('ACTIVE');
    });

    it('should throw if subscription is not paused', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        status: 'ACTIVE', // Not paused
      });

      await expect(service.resumeSubscription('sub-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
