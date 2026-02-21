import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  SubscriptionPlanType,
  SubscriptionType,
  SubscriptionMutationResponse,
  CancelSubscriptionInput,
} from './dto/subscription.dto';

// Spec: master spec Section 12 (Payment & Subscription)

@Resolver()
export class SubscriptionResolver {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly prisma: PrismaService,
  ) {}

  // ============================================
  // QUERIES
  // ============================================

  /**
   * Get available subscription plans for a vertical
   * Spec: Section 12 — Pricing for 4 verticals × 3 durations
   */
  @Query(() => [SubscriptionPlanType])
  async availablePlans(
    @Args('vertical') vertical: string,
  ): Promise<SubscriptionPlanType[]> {
    return this.prisma.subscriptionPlan.findMany({
      where: { vertical: vertical as any, isActive: true },
      orderBy: { durationMonths: 'asc' },
    });
  }

  /**
   * Get subscriptions for the authenticated user
   */
  @Query(() => [SubscriptionType])
  @UseGuards(JwtAuthGuard)
  async mySubscriptions(
    @CurrentUser() user: any,
  ): Promise<SubscriptionType[]> {
    return this.prisma.subscription.findMany({
      where: { userId: user.id },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============================================
  // MUTATIONS
  // ============================================

  /**
   * Cancel subscription
   * Spec: Cancel flow — active until currentPeriodEnd
   */
  @Mutation(() => SubscriptionMutationResponse)
  @UseGuards(JwtAuthGuard)
  async cancelSubscription(
    @CurrentUser() user: any,
    @Args('input') input: CancelSubscriptionInput,
  ): Promise<SubscriptionMutationResponse> {
    try {
      await this.subscriptionService.cancelSubscription(
        input.subscriptionId,
        user.id,
      );
      return { success: true, message: 'Subscription cancelled' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to cancel subscription',
      };
    }
  }

  /**
   * Pause subscription
   * Spec: Pause/Resume — patient can pause temporarily
   */
  @Mutation(() => SubscriptionMutationResponse)
  @UseGuards(JwtAuthGuard)
  async pauseSubscription(
    @CurrentUser() user: any,
    @Args('subscriptionId') subscriptionId: string,
  ): Promise<SubscriptionMutationResponse> {
    try {
      await this.subscriptionService.pauseSubscription(subscriptionId, user.id);
      return { success: true, message: 'Subscription paused' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to pause subscription',
      };
    }
  }

  /**
   * Resume subscription
   * Spec: Pause/Resume — patient can resume
   */
  @Mutation(() => SubscriptionMutationResponse)
  @UseGuards(JwtAuthGuard)
  async resumeSubscription(
    @CurrentUser() user: any,
    @Args('subscriptionId') subscriptionId: string,
  ): Promise<SubscriptionMutationResponse> {
    try {
      await this.subscriptionService.resumeSubscription(subscriptionId, user.id);
      return { success: true, message: 'Subscription resumed' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to resume subscription',
      };
    }
  }
}
