import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  WalletBalanceType,
  WalletTransactionType,
  RefundType,
  CheckoutResultType,
  WalletMutationResponse,
  RefundMutationResponse,
  CreditWalletInput,
  ApplyWalletAtCheckoutInput,
  InitiateRefundInput,
} from './dto/wallet.dto';

// Spec: master spec Section 10 (Refund & Wallet)

/**
 * Map Prisma transaction to GraphQL type
 */
function mapToTransactionType(txn: any): WalletTransactionType {
  return {
    id: txn.id,
    walletId: txn.walletId,
    type: txn.type,
    creditType: txn.creditType ?? undefined,
    amountPaise: txn.amountPaise,
    balanceAfter: txn.balanceAfter,
    description: txn.description ?? undefined,
    referenceId: txn.referenceId ?? undefined,
    referenceType: txn.referenceType ?? undefined,
    expiresAt: txn.expiresAt ?? undefined,
    createdAt: txn.createdAt,
  };
}

/**
 * Map Prisma refund to GraphQL type
 */
function mapToRefundType(refund: any): RefundType {
  return {
    id: refund.id,
    userId: refund.userId,
    paymentId: refund.paymentId,
    orderId: refund.orderId ?? undefined,
    consultationId: refund.consultationId ?? undefined,
    trigger: refund.trigger,
    method: refund.method,
    amountPaise: refund.amountPaise,
    status: refund.status,
    razorpayRefundId: refund.razorpayRefundId ?? undefined,
    processedAt: refund.processedAt ?? undefined,
    createdAt: refund.createdAt,
  };
}

@Resolver()
export class WalletResolver {
  constructor(private readonly walletService: WalletService) {}

  // ============================================
  // QUERIES
  // ============================================

  /**
   * Get wallet balance
   * Spec: Balance stored in paise (integer, never float)
   */
  @Query(() => WalletBalanceType)
  @UseGuards(JwtAuthGuard)
  async walletBalance(
    @Args('userId') userId: string,
  ): Promise<WalletBalanceType> {
    return this.walletService.getBalance(userId);
  }

  /**
   * Get transaction history
   * Spec: Every credit and debit recorded
   */
  @Query(() => [WalletTransactionType])
  @UseGuards(JwtAuthGuard)
  async transactionHistory(
    @Args('userId') userId: string,
  ): Promise<WalletTransactionType[]> {
    const transactions = await this.walletService.getTransactionHistory(userId);
    return transactions.map(mapToTransactionType);
  }

  /**
   * Get refund status
   */
  @Query(() => RefundMutationResponse)
  @UseGuards(JwtAuthGuard)
  async refundStatus(
    @Args('refundId') refundId: string,
  ): Promise<RefundMutationResponse> {
    try {
      const refund = await this.walletService.getRefundStatus(refundId);
      return {
        success: true,
        message: 'Refund found',
        refund: mapToRefundType(refund),
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Refund not found',
      };
    }
  }

  /**
   * Get all refunds for a user
   */
  @Query(() => [RefundType])
  @UseGuards(JwtAuthGuard)
  async refundsByUser(
    @Args('userId') userId: string,
  ): Promise<RefundType[]> {
    const refunds = await this.walletService.getRefundsByUser(userId);
    return refunds.map(mapToRefundType);
  }

  // ============================================
  // MUTATIONS
  // ============================================

  /**
   * Credit wallet (admin action)
   */
  @Mutation(() => WalletMutationResponse)
  @UseGuards(JwtAuthGuard)
  async creditWallet(
    @Args('input') input: CreditWalletInput,
  ): Promise<WalletMutationResponse> {
    try {
      await this.walletService.creditWallet({
        userId: input.userId,
        amountPaise: input.amountPaise,
        creditType: input.creditType as 'REFUND' | 'PROMO' | 'COMEBACK',
        description: input.description,
      });
      return {
        success: true,
        message: 'Wallet credited successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to credit wallet',
      };
    }
  }

  /**
   * Apply wallet at checkout
   * Spec: Wallet applied first, remainder via Razorpay
   */
  @Mutation(() => CheckoutResultType)
  @UseGuards(JwtAuthGuard)
  async applyWalletAtCheckout(
    @Args('input') input: ApplyWalletAtCheckoutInput,
  ): Promise<CheckoutResultType> {
    return this.walletService.applyWalletAtCheckout(input);
  }

  /**
   * Initiate refund
   * Spec: Section 10 - Refund triggers with percentages
   */
  @Mutation(() => RefundMutationResponse)
  @UseGuards(JwtAuthGuard)
  async initiateRefund(
    @Args('input') input: InitiateRefundInput,
  ): Promise<RefundMutationResponse> {
    try {
      const refund = await this.walletService.initiateRefund({
        userId: input.userId,
        paymentId: input.paymentId,
        trigger: input.trigger as any,
        method: input.method as any,
        orderId: input.orderId,
        consultationId: input.consultationId,
      });
      return {
        success: true,
        message: 'Refund initiated',
        refund: mapToRefundType(refund),
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to initiate refund',
      };
    }
  }
}
