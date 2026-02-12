import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Spec: master spec Section 10 (Refund & Wallet)

// Input types
export interface CreditWalletInput {
  userId: string;
  amountPaise: number;
  creditType: 'REFUND' | 'PROMO' | 'COMEBACK';
  description?: string;
  referenceId?: string;
  referenceType?: string;
  refundTrigger?: string;
}

export interface DebitWalletInput {
  userId: string;
  amountPaise: number;
  description?: string;
  referenceId?: string;
  referenceType?: string;
}

export interface ApplyWalletAtCheckoutInput {
  userId: string;
  totalAmountPaise: number;
  useWallet: boolean;
}

export interface InitiateRefundInput {
  userId: string;
  paymentId: string;
  trigger: 'DOCTOR_NOT_SUITABLE' | 'PATIENT_DECLINES_REFERRAL' | 'CANCEL_BEFORE_REVIEW' | 'CANCEL_AFTER_REVIEW' | 'TECHNICAL_ERROR' | 'DELIVERY_ISSUE';
  method: 'WALLET' | 'ORIGINAL_PAYMENT';
  orderId?: string;
  consultationId?: string;
}

// Refund percentages per trigger
// Spec: Section 10 - Refund triggers
const REFUND_PERCENTAGES: Record<string, number> = {
  DOCTOR_NOT_SUITABLE: 100,      // Full refund
  PATIENT_DECLINES_REFERRAL: 100, // Full refund
  CANCEL_BEFORE_REVIEW: 100,     // Full refund (<24hrs)
  CANCEL_AFTER_REVIEW: 50,       // 50% partial
  TECHNICAL_ERROR: 100,          // Full refund (auto)
  DELIVERY_ISSUE: 100,           // Full replacement or refund
};

// Promo credits expiry
const PROMO_EXPIRY_DAYS = 90;

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('RAZORPAY_INSTANCE') private readonly razorpay: any,
  ) {}

  /**
   * Get or create wallet for a user
   */
  async getOrCreateWallet(userId: string): Promise<any> {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: { userId, balancePaise: 0 },
      });
    }

    return wallet;
  }

  /**
   * Get wallet balance
   * Spec: Balance stored in paise (integer, never float)
   */
  async getBalance(userId: string): Promise<{ balancePaise: number; balanceRupees: number }> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    const balancePaise = wallet?.balancePaise || 0;

    return {
      balancePaise,
      balanceRupees: balancePaise / 100,
    };
  }

  /**
   * Credit wallet
   * Spec: Credit types - refund (never expires), promo (90 days), comeback
   */
  async creditWallet(input: CreditWalletInput): Promise<any> {
    if (input.amountPaise <= 0) {
      throw new BadRequestException('Credit amount must be positive');
    }

    const wallet = await this.getOrCreateWallet(input.userId);

    const newBalance = wallet.balancePaise + input.amountPaise;

    // Update wallet balance
    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { balancePaise: newBalance },
    });

    // Calculate expiry for promo credits
    let expiresAt: Date | null = null;
    if (input.creditType === 'PROMO') {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + PROMO_EXPIRY_DAYS);
    }

    // Record transaction
    const transaction = await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'CREDIT',
        creditType: input.creditType,
        amountPaise: input.amountPaise,
        balanceAfter: newBalance,
        description: input.description,
        referenceId: input.referenceId,
        referenceType: input.referenceType,
        refundTrigger: input.refundTrigger as any,
        expiresAt,
      },
    });

    return transaction;
  }

  /**
   * Debit wallet
   */
  async debitWallet(input: DebitWalletInput): Promise<any> {
    const wallet = await this.getOrCreateWallet(input.userId);

    if (wallet.balancePaise < input.amountPaise) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    const newBalance = wallet.balancePaise - input.amountPaise;

    // Update wallet balance
    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { balancePaise: newBalance },
    });

    // Record transaction
    const transaction = await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'DEBIT',
        amountPaise: input.amountPaise,
        balanceAfter: newBalance,
        description: input.description,
        referenceId: input.referenceId,
        referenceType: input.referenceType,
      },
    });

    return transaction;
  }

  /**
   * Apply wallet at checkout
   * Spec: Wallet applied first, remainder via Razorpay
   */
  async applyWalletAtCheckout(input: ApplyWalletAtCheckoutInput): Promise<{
    walletAmountUsed: number;
    remainingAmountPaise: number;
    walletFullyCovered: boolean;
  }> {
    if (!input.useWallet) {
      return {
        walletAmountUsed: 0,
        remainingAmountPaise: input.totalAmountPaise,
        walletFullyCovered: false,
      };
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: input.userId },
    });

    const walletBalance = wallet?.balancePaise || 0;

    if (walletBalance === 0) {
      return {
        walletAmountUsed: 0,
        remainingAmountPaise: input.totalAmountPaise,
        walletFullyCovered: false,
      };
    }

    // Calculate how much wallet can cover
    const walletAmountUsed = Math.min(walletBalance, input.totalAmountPaise);
    const remainingAmountPaise = input.totalAmountPaise - walletAmountUsed;

    return {
      walletAmountUsed,
      remainingAmountPaise,
      walletFullyCovered: remainingAmountPaise === 0,
    };
  }

  /**
   * Initiate refund
   * Spec: Section 10 - Refund triggers with percentages
   */
  async initiateRefund(input: InitiateRefundInput): Promise<any> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: input.paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Calculate refund amount based on trigger
    const refundPercentage = REFUND_PERCENTAGES[input.trigger] || 100;
    const refundAmountPaise = Math.floor((payment.amountPaise * refundPercentage) / 100);

    // Process based on method
    if (input.method === 'WALLET') {
      await this.processRefundToWallet(input.userId, refundAmountPaise, `refund-${Date.now()}`);
    } else {
      await this.processRefundToOriginalPayment(
        input.paymentId,
        refundAmountPaise,
        `refund-${Date.now()}`,
      );
    }

    // Create refund record
    const refund = await this.prisma.refund.create({
      data: {
        userId: input.userId,
        paymentId: input.paymentId,
        orderId: input.orderId,
        consultationId: input.consultationId,
        trigger: input.trigger,
        method: input.method,
        amountPaise: refundAmountPaise,
        status: input.method === 'WALLET' ? 'COMPLETED' : 'PROCESSING',
        processedAt: input.method === 'WALLET' ? new Date() : null,
      },
    });

    return {
      ...refund,
      refundPercentage,
    };
  }

  /**
   * Process refund to wallet - instant
   * Spec: Patient chooses wallet credit (instant)
   */
  async processRefundToWallet(
    userId: string,
    amountPaise: number,
    refundId: string,
  ): Promise<{ instant: boolean }> {
    await this.creditWallet({
      userId,
      amountPaise,
      creditType: 'REFUND',
      description: 'Refund credited to wallet',
      referenceId: refundId,
      referenceType: 'REFUND',
    });

    return { instant: true };
  }

  /**
   * Process refund to original payment method - 5-7 days
   * Spec: Patient chooses original payment method (5-7 days)
   */
  async processRefundToOriginalPayment(
    paymentId: string,
    amountPaise: number,
    refundId: string,
  ): Promise<{ estimatedDays: string; razorpayRefundId?: string }> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment?.razorpayPaymentId) {
      throw new BadRequestException('No Razorpay payment ID found');
    }

    // Initiate Razorpay refund
    const razorpayRefund = await this.razorpay.payments.refund(
      payment.razorpayPaymentId,
      { amount: amountPaise },
    );

    // Update refund record with Razorpay ID
    await this.prisma.refund.update({
      where: { id: refundId },
      data: {
        razorpayRefundId: razorpayRefund.id,
      },
    });

    return {
      estimatedDays: '5-7',
      razorpayRefundId: razorpayRefund.id,
    };
  }

  /**
   * Get transaction history
   * Spec: Wallet transaction log (every credit and debit recorded)
   */
  async getTransactionHistory(userId: string): Promise<any[]> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      return [];
    }

    return this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Expire promo credits older than 90 days
   * Spec: Promo credits expire after 90 days
   */
  async expirePromoCredits(userId: string): Promise<{ expiredAmountPaise: number }> {
    const now = new Date();

    // Find expired promo credits
    const expiredCredits = await this.prisma.walletTransaction.findMany({
      where: {
        wallet: { userId },
        creditType: 'PROMO',
        expiresAt: { lte: now },
        type: 'CREDIT',
      },
    });

    if (expiredCredits.length === 0) {
      return { expiredAmountPaise: 0 };
    }

    const expiredAmountPaise = expiredCredits.reduce(
      (sum, credit) => sum + credit.amountPaise,
      0,
    );

    // Get wallet
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      return { expiredAmountPaise: 0 };
    }

    // Debit the expired amount
    const newBalance = Math.max(0, wallet.balancePaise - expiredAmountPaise);

    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { balancePaise: newBalance },
    });

    // Record expiry transaction
    await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'DEBIT',
        amountPaise: expiredAmountPaise,
        balanceAfter: newBalance,
        description: 'Promo credits expired',
      },
    });

    return { expiredAmountPaise };
  }

  /**
   * Get refund status
   */
  async getRefundStatus(refundId: string): Promise<any> {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    return refund;
  }

  /**
   * Get all refunds for a user
   */
  async getRefundsByUser(userId: string): Promise<any[]> {
    return this.prisma.refund.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
