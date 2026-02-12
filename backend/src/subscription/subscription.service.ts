import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Spec: master spec Section 12 (Payment & Subscription)

// Input types
export interface CreateSubscriptionInput {
  userId: string;
  planId: string;
  paymentId?: string;
}

export interface RenewSubscriptionInput {
  subscriptionId: string;
  paymentId: string;
}

// Spec: Section 12 — Pricing (in paise)
// Hair Loss: ₹999/month, ₹2,499/quarter, ₹8,999/year
// ED: ₹1,299/month, ₹3,299/quarter, ₹11,999/year
// Weight: ₹2,999/month, ₹7,999/quarter, ₹9,999/month (GLP-1 premium)
// PCOS: ₹1,499/month, ₹3,799/quarter, ₹13,999/year
const PRICING: Record<string, Record<string, number>> = {
  HAIR_LOSS: {
    MONTHLY: 99900,
    QUARTERLY: 249900,
    ANNUAL: 899900,
  },
  SEXUAL_HEALTH: {
    MONTHLY: 129900,
    QUARTERLY: 329900,
    ANNUAL: 1199900,
  },
  WEIGHT_MANAGEMENT: {
    MONTHLY: 299900,
    QUARTERLY: 799900,
    MONTHLY_PREMIUM: 999900, // GLP-1 premium
    ANNUAL: 2799900,
  },
  PCOS: {
    MONTHLY: 149900,
    QUARTERLY: 379900,
    ANNUAL: 1399900,
  },
};

// Retry schedule for failed payments
const RETRY_DAYS = [1, 3, 7]; // Day 1, 3, 7
const GRACE_PERIOD_DAYS = 3;

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('RAZORPAY_INSTANCE') private readonly razorpay: any,
  ) {}

  /**
   * Get pricing for a specific plan type
   * Spec: Section 12 — Pricing
   */
  getPlanPricing(vertical: string, planType: string): number {
    return PRICING[vertical]?.[planType] || 0;
  }

  /**
   * Create a new subscription
   * Spec: Section 12 — Auto-renewal via Razorpay Subscriptions API
   */
  async createSubscription(input: CreateSubscriptionInput): Promise<any> {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate plan exists
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: input.planId },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    // Create Razorpay subscription for auto-renewal
    const razorpaySubscription = await this.razorpay.subscriptions.create({
      plan_id: `plan_${input.planId}`, // Will be created in Razorpay
      customer_notify: 1,
      total_count: 12, // Max 12 billing cycles
      notes: {
        userId: input.userId,
        planId: input.planId,
      },
    });

    // Calculate period dates
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + plan.durationMonths);

    // Create subscription record
    return this.prisma.subscription.create({
      data: {
        userId: input.userId,
        planId: input.planId,
        status: 'ACTIVE',
        razorpaySubscriptionId: razorpaySubscription.id,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });
  }

  /**
   * Process auto-renewal for subscription
   * Spec: Subscription renew → triggers auto-reorder
   */
  async processAutoRenewal(subscriptionId: string): Promise<any> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Check Razorpay subscription status
    const razorpayStatus = await this.razorpay.subscriptions.fetch(
      subscription.razorpaySubscriptionId,
    );

    if (razorpayStatus.status !== 'active') {
      return { renewed: false, reason: 'RAZORPAY_NOT_ACTIVE' };
    }

    // Extend the period
    const newPeriodEnd = new Date(razorpayStatus.current_end * 1000);

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        currentPeriodEnd: newPeriodEnd,
      },
    });

    // Trigger auto-reorder
    const reorderResult = await this.triggerAutoReorder(
      subscription.userId,
      subscription.plan.vertical,
    );

    return {
      renewed: true,
      newPeriodEnd,
      autoReorderTriggered: !!reorderResult.orderId,
      orderId: reorderResult.orderId,
    };
  }

  /**
   * Handle failed payment - implements retry logic
   * Spec: Failed payment: 3-day grace period, retries on day 1, 3, 7
   */
  async handleFailedPayment(subscriptionId: string): Promise<any> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const currentFailCount = (subscription as any).failedPaymentCount || 0;
    const newFailCount = currentFailCount + 1;

    // Check if all retries exhausted (after 3 retries = day 1, 3, 7)
    if (currentFailCount >= 3) {
      await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'EXPIRED',
          failedPaymentCount: newFailCount,
        } as any,
      });

      return { expired: true, nextRetryDay: null };
    }

    // Calculate grace period end (3 days from now)
    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

    // Get next retry day based on current fail count
    const nextRetryDay = RETRY_DAYS[currentFailCount] || 7;
    const nextRetryAt = new Date();
    nextRetryAt.setDate(nextRetryAt.getDate() + nextRetryDay);

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        failedPaymentCount: newFailCount,
        gracePeriodEndAt: gracePeriodEnd,
        nextRetryAt,
      } as any,
    });

    return {
      inGracePeriod: true,
      gracePeriodEndAt: gracePeriodEnd,
      nextRetryDay,
      nextRetryAt,
    };
  }

  /**
   * Cancel subscription
   * Spec: Patient can cancel anytime, active until period ends
   */
  async cancelSubscription(subscriptionId: string, userId: string): Promise<any> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.userId !== userId) {
      throw new ForbiddenException('You are not authorized to cancel this subscription');
    }

    if (subscription.status === 'CANCELLED') {
      throw new BadRequestException('Subscription is already cancelled');
    }

    // Cancel on Razorpay
    if (subscription.razorpaySubscriptionId) {
      await this.razorpay.subscriptions.cancel(subscription.razorpaySubscriptionId);
    }

    // Update subscription - active until current period ends
    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        activeUntil: subscription.currentPeriodEnd,
      } as any,
    });
  }

  /**
   * Trigger auto-reorder on subscription renewal
   * Spec: Section 8.5 — Monthly Reorder Flow
   */
  async triggerAutoReorder(userId: string, vertical: string): Promise<any> {
    // Find active prescription for this patient and vertical
    const prescription = await this.prisma.prescription.findFirst({
      where: {
        consultation: {
          patientId: userId,
          vertical: vertical as any,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!prescription) {
      return { orderId: undefined, reason: 'NO_ACTIVE_PRESCRIPTION' };
    }

    // Get last order for delivery address
    const lastOrder = await this.prisma.order.findFirst({
      where: { patientId: userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastOrder) {
      return { orderId: undefined, reason: 'NO_PREVIOUS_ORDER' };
    }

    // Check if prescription has changed since last order
    const prescriptionChanged = lastOrder.prescriptionId !== prescription.id;

    // Create new order
    const newOrder = await this.prisma.order.create({
      data: {
        patientId: userId,
        prescriptionId: prescription.id,
        consultationId: prescription.consultationId,
        status: 'PRESCRIPTION_CREATED',
        deliveryAddress: lastOrder.deliveryAddress,
        deliveryCity: lastOrder.deliveryCity,
        deliveryPincode: lastOrder.deliveryPincode,
        medicationCost: lastOrder.medicationCost,
        deliveryCost: lastOrder.deliveryCost,
        totalAmount: lastOrder.totalAmount,
        isReorder: true,
        parentOrderId: lastOrder.id,
        needsReview: prescriptionChanged,
      } as any,
    });

    return {
      orderId: newOrder.id,
      needsCoordinatorReview: prescriptionChanged,
    };
  }

  /**
   * Get subscription by ID
   */
  async getSubscription(id: string): Promise<any> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  /**
   * Get all subscriptions for a user
   */
  async getSubscriptionsByUser(userId: string, status?: string): Promise<any[]> {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    return this.prisma.subscription.findMany({
      where,
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get active subscription for a specific vertical
   */
  async getActiveSubscriptionForVertical(userId: string, vertical: string): Promise<any | null> {
    return this.prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        plan: { vertical: vertical as any },
      },
      include: { plan: true },
    });
  }

  /**
   * Get available subscription plans for a vertical
   */
  async getAvailablePlans(vertical: string): Promise<any[]> {
    return this.prisma.subscriptionPlan.findMany({
      where: { vertical: vertical as any, isActive: true },
      orderBy: { durationMonths: 'asc' },
    });
  }

  /**
   * Pause subscription
   */
  async pauseSubscription(subscriptionId: string, userId: string): Promise<any> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.userId !== userId) {
      throw new ForbiddenException('You are not authorized to pause this subscription');
    }

    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'PAUSED',
        pausedAt: new Date(),
      } as any,
    });
  }

  /**
   * Resume paused subscription
   */
  async resumeSubscription(subscriptionId: string, userId: string): Promise<any> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.userId !== userId) {
      throw new ForbiddenException('You are not authorized to resume this subscription');
    }

    if (subscription.status !== 'PAUSED') {
      throw new BadRequestException('Subscription is not paused');
    }

    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'ACTIVE',
        resumedAt: new Date(),
      } as any,
    });
  }
}
