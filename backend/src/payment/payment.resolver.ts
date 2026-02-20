import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  PaymentType,
  PaymentOrderResponse,
  PaymentMutationResponse,
  PricingValidationResponse,
  CreatePaymentOrderInput,
  VerifyPaymentInput,
  WebhookInput,
} from './dto/payment.dto';

// Spec: master spec Section 12 (Payment & Subscription)

@Resolver()
export class PaymentResolver {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly prisma: PrismaService,
  ) {}

  // ============================================
  // QUERIES
  // ============================================

  /**
   * Get payments for the authenticated user
   * Spec: Section 12 — Payment history
   */
  @Query(() => [PaymentType])
  @UseGuards(JwtAuthGuard)
  async myPayments(
    @CurrentUser() user: any,
    @Args('status', { nullable: true }) status?: string,
  ): Promise<PaymentType[]> {
    const payments = await this.paymentService.getPaymentsByUser(user.id, status);
    return payments.map((p: any) => ({
      id: p.id,
      userId: p.userId,
      amountPaise: p.amountPaise,
      status: p.status,
      razorpayOrderId: p.razorpayOrderId ?? undefined,
      razorpayPaymentId: p.razorpayPaymentId ?? undefined,
      method: p.method ?? undefined,
      failureReason: p.failureReason ?? undefined,
      createdAt: p.createdAt,
    }));
  }

  /**
   * Get supported payment methods
   * Spec: UPI, card, net banking, wallets
   */
  @Query(() => [String])
  supportedPaymentMethods(): string[] {
    return this.paymentService.getSupportedPaymentMethods();
  }

  /**
   * Validate pricing for a vertical and plan type
   */
  @Query(() => PricingValidationResponse)
  validatePricing(
    @Args('vertical') vertical: string,
    @Args('planType') planType: string,
    @Args('amountPaise', { type: () => Int }) amountPaise: number,
  ): PricingValidationResponse {
    return this.paymentService.validatePricing(
      vertical,
      planType as 'MONTHLY' | 'QUARTERLY' | 'ANNUAL',
      amountPaise,
    );
  }

  // ============================================
  // MUTATIONS
  // ============================================

  /**
   * Create a Razorpay payment order
   * Spec: Section 12 — Create order → checkout
   */
  @Mutation(() => PaymentOrderResponse)
  @UseGuards(JwtAuthGuard)
  async createPaymentOrder(
    @CurrentUser() user: any,
    @Args('input') input: CreatePaymentOrderInput,
  ): Promise<PaymentOrderResponse> {
    try {
      const result = await this.paymentService.createPaymentOrder({
        userId: user.id,
        amountPaise: input.amountPaise,
        currency: input.currency || 'INR',
        purpose: input.purpose as 'CONSULTATION' | 'SUBSCRIPTION' | 'LAB_ORDER' | 'ORDER',
        metadata: {
          vertical: input.vertical,
          planId: input.planId,
          intakeResponseId: input.intakeResponseId,
        },
      });

      return {
        success: true,
        message: 'Payment order created',
        paymentId: result.id,
        razorpayOrderId: result.razorpayOrderId,
        amountPaise: result.amountPaise,
        currency: result.currency || 'INR',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create payment order',
      };
    }
  }

  /**
   * Verify payment signature from Razorpay
   * Spec: Verify webhook signature (valid → process, invalid → reject)
   */
  @Mutation(() => PaymentMutationResponse)
  @UseGuards(JwtAuthGuard)
  async verifyPayment(
    @Args('input') input: VerifyPaymentInput,
  ): Promise<PaymentMutationResponse> {
    try {
      const isValid = await this.paymentService.verifyPaymentSignature(input);

      if (!isValid) {
        return { success: false, message: 'Invalid payment signature' };
      }

      // Find and update payment record
      const payment = await this.prisma.payment.findFirst({
        where: { razorpayOrderId: input.razorpayOrderId },
      });

      if (!payment) {
        return { success: false, message: 'Payment record not found' };
      }

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          razorpayPaymentId: input.razorpayPaymentId,
        },
      });

      return { success: true, message: 'Payment verified successfully' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to verify payment',
      };
    }
  }

  /**
   * Process Razorpay webhook (no auth guard — Razorpay calls this)
   * Spec: Webhook → create consultation on payment.captured
   */
  @Mutation(() => PaymentMutationResponse)
  async paymentWebhook(
    @Args('input') input: WebhookInput,
  ): Promise<PaymentMutationResponse> {
    try {
      await this.paymentService.processWebhook({
        event: input.event,
        payload: input.payload,
        webhookSignature: input.webhookSignature,
      });

      return { success: true, message: 'Webhook processed' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process webhook',
      };
    }
  }
}
