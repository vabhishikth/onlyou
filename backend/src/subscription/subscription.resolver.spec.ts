import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionResolver } from './subscription.resolver';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../prisma/prisma.service';

// Spec: master spec Section 12 (Payment & Subscription)

describe('SubscriptionResolver', () => {
  let resolver: SubscriptionResolver;
  let mockSubscriptionService: any;
  let mockPrismaService: any;

  const mockUser = { id: 'patient-1' };

  const mockPlans = [
    {
      id: 'plan-hl-1',
      vertical: 'HAIR_LOSS',
      name: 'Hair Loss Monthly',
      description: 'Monthly hair loss treatment plan',
      priceInPaise: 99900,
      durationMonths: 1,
      features: ['Doctor consultation', 'Personalized treatment plan', 'Monthly medication'],
      isActive: true,
    },
    {
      id: 'plan-hl-3',
      vertical: 'HAIR_LOSS',
      name: 'Hair Loss Quarterly',
      description: 'Quarterly hair loss treatment plan — save 17%',
      priceInPaise: 249900,
      durationMonths: 3,
      features: ['Doctor consultation', 'Personalized treatment plan', 'Monthly medication', 'Save 17%'],
      isActive: true,
    },
    {
      id: 'plan-hl-12',
      vertical: 'HAIR_LOSS',
      name: 'Hair Loss Annual',
      description: 'Annual hair loss treatment plan — save 25%',
      priceInPaise: 899900,
      durationMonths: 12,
      features: ['Doctor consultation', 'Personalized treatment plan', 'Monthly medication', 'Save 25%', 'Priority support'],
      isActive: true,
    },
  ];

  const mockSubscription = {
    id: 'sub-1',
    userId: 'patient-1',
    planId: 'plan-hl-1',
    status: 'ACTIVE',
    currentPeriodStart: new Date('2026-02-20'),
    currentPeriodEnd: new Date('2026-03-20'),
    cancelledAt: null,
    activeUntil: null,
    plan: mockPlans[0],
  };

  beforeEach(async () => {
    mockSubscriptionService = {
      createSubscription: jest.fn(),
      cancelSubscription: jest.fn(),
      pauseSubscription: jest.fn(),
      resumeSubscription: jest.fn(),
      getPlanPricing: jest.fn(),
    };

    mockPrismaService = {
      subscriptionPlan: {
        findMany: jest.fn(),
      },
      subscription: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionResolver,
        { provide: SubscriptionService, useValue: mockSubscriptionService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    resolver = module.get<SubscriptionResolver>(SubscriptionResolver);
  });

  // ============================================
  // QUERIES
  // ============================================

  describe('availablePlans', () => {
    it('should return active plans for a vertical ordered by durationMonths', async () => {
      mockPrismaService.subscriptionPlan.findMany.mockResolvedValue(mockPlans);

      const result = await resolver.availablePlans('HAIR_LOSS');

      expect(mockPrismaService.subscriptionPlan.findMany).toHaveBeenCalledWith({
        where: { vertical: 'HAIR_LOSS', isActive: true },
        orderBy: { durationMonths: 'asc' },
      });
      expect(result).toHaveLength(3);
      expect(result[0].priceInPaise).toBe(99900);
      expect(result[2].priceInPaise).toBe(899900);
    });

    it('should return empty array when no plans exist for vertical', async () => {
      mockPrismaService.subscriptionPlan.findMany.mockResolvedValue([]);

      const result = await resolver.availablePlans('UNKNOWN');

      expect(result).toEqual([]);
    });
  });

  describe('mySubscriptions', () => {
    it('should return subscriptions for the authenticated user', async () => {
      mockPrismaService.subscription.findMany.mockResolvedValue([mockSubscription]);

      const result = await resolver.mySubscriptions(mockUser);

      expect(mockPrismaService.subscription.findMany).toHaveBeenCalledWith({
        where: { userId: 'patient-1' },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('ACTIVE');
    });

    it('should return empty array when user has no subscriptions', async () => {
      mockPrismaService.subscription.findMany.mockResolvedValue([]);

      const result = await resolver.mySubscriptions(mockUser);

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // MUTATIONS
  // ============================================

  describe('cancelSubscription', () => {
    it('should cancel subscription and return success', async () => {
      mockSubscriptionService.cancelSubscription.mockResolvedValue({
        ...mockSubscription,
        status: 'CANCELLED',
        cancelledAt: new Date(),
        activeUntil: mockSubscription.currentPeriodEnd,
      });

      const result = await resolver.cancelSubscription(mockUser, {
        subscriptionId: 'sub-1',
        reason: 'No longer needed',
      });

      expect(result.success).toBe(true);
      expect(mockSubscriptionService.cancelSubscription).toHaveBeenCalledWith('sub-1', 'No longer needed');
    });

    it('should return error when subscription not found', async () => {
      mockSubscriptionService.cancelSubscription.mockRejectedValue(
        new Error('Subscription not found'),
      );

      const result = await resolver.cancelSubscription(mockUser, {
        subscriptionId: 'sub-nonexistent',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Subscription not found');
    });
  });

  describe('pauseSubscription', () => {
    it('should pause subscription and return success', async () => {
      mockSubscriptionService.pauseSubscription.mockResolvedValue({
        ...mockSubscription,
        status: 'PAUSED',
        pausedAt: new Date(),
      });

      const result = await resolver.pauseSubscription(mockUser, 'sub-1');

      expect(result.success).toBe(true);
      expect(mockSubscriptionService.pauseSubscription).toHaveBeenCalledWith('sub-1');
    });
  });

  describe('resumeSubscription', () => {
    it('should resume subscription and return success', async () => {
      mockSubscriptionService.resumeSubscription.mockResolvedValue({
        ...mockSubscription,
        status: 'ACTIVE',
        resumedAt: new Date(),
      });

      const result = await resolver.resumeSubscription(mockUser, 'sub-1');

      expect(result.success).toBe(true);
      expect(mockSubscriptionService.resumeSubscription).toHaveBeenCalledWith('sub-1');
    });

    it('should return error when resume fails', async () => {
      mockSubscriptionService.resumeSubscription.mockRejectedValue(
        new Error('Cannot resume — subscription is cancelled'),
      );

      const result = await resolver.resumeSubscription(mockUser, 'sub-1');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Cannot resume — subscription is cancelled');
    });
  });
});
