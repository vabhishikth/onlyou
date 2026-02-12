import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  WalletService,
  CreditWalletInput,
  DebitWalletInput,
  InitiateRefundInput,
  ApplyWalletAtCheckoutInput,
} from './wallet.service';
import { PrismaService } from '../prisma/prisma.service';

// Spec: master spec Section 10 (Refund & Wallet)

describe('WalletService', () => {
  let service: WalletService;
  let prisma: PrismaService;

  const mockPrismaService = {
    wallet: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    walletTransaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    refund: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    consultation: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  // Mock Razorpay for refunds
  const mockRazorpay = {
    payments: {
      refund: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: 'RAZORPAY_INSTANCE', useValue: mockRazorpay },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  // ==========================================
  // WALLET BALANCE (paise only)
  // ==========================================

  describe('getOrCreateWallet', () => {
    it('should return existing wallet if found', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        userId: 'user-1',
        balancePaise: 50000, // ₹500
      });

      const result = await service.getOrCreateWallet('user-1');

      expect(result.balancePaise).toBe(50000);
    });

    it('should create wallet with 0 balance if not exists', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(null);
      mockPrismaService.wallet.create.mockResolvedValue({
        id: 'wallet-new',
        userId: 'user-1',
        balancePaise: 0,
      });

      const result = await service.getOrCreateWallet('user-1');

      expect(result.balancePaise).toBe(0);
      expect(mockPrismaService.wallet.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', balancePaise: 0 },
      });
    });

    it('should store balance in paise (integer), never rupees (float)', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        balancePaise: 99950, // ₹999.50 in paise
      });

      const result = await service.getOrCreateWallet('user-1');

      expect(Number.isInteger(result.balancePaise)).toBe(true);
      expect(result.balancePaise).toBe(99950);
    });
  });

  describe('getBalance', () => {
    it('should return balance in paise', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        balancePaise: 150000, // ₹1500
      });

      const result = await service.getBalance('user-1');

      expect(result.balancePaise).toBe(150000);
      expect(result.balanceRupees).toBe(1500);
    });

    it('should return 0 balance if wallet not found', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(null);

      const result = await service.getBalance('user-1');

      expect(result.balancePaise).toBe(0);
    });
  });

  // ==========================================
  // CREDIT TYPES
  // ==========================================

  describe('creditWallet', () => {
    const baseInput: CreditWalletInput = {
      userId: 'user-1',
      amountPaise: 50000, // ₹500
      creditType: 'REFUND',
      description: 'Refund for cancelled order',
    };

    it('should credit refund type - never expires', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        userId: 'user-1',
        balancePaise: 10000,
      });
      mockPrismaService.wallet.update.mockResolvedValue({
        id: 'wallet-1',
        balancePaise: 60000,
      });
      mockPrismaService.walletTransaction.create.mockResolvedValue({
        id: 'txn-1',
        creditType: 'REFUND',
        expiresAt: null,
      });

      const result = await service.creditWallet(baseInput);

      expect(result.creditType).toBe('REFUND');
      expect(result.expiresAt).toBeNull();
    });

    it('should credit promo type - expires after 90 days', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        balancePaise: 10000,
      });
      mockPrismaService.wallet.update.mockResolvedValue({
        id: 'wallet-1',
        balancePaise: 60000,
      });
      mockPrismaService.walletTransaction.create.mockImplementation(({ data }) => ({
        id: 'txn-1',
        ...data,
      }));

      const result = await service.creditWallet({
        ...baseInput,
        creditType: 'PROMO',
      });

      const expiresAt = new Date(result.expiresAt);
      const now = new Date();
      const daysDiff = Math.round(
        (expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
      );

      expect(daysDiff).toBeGreaterThanOrEqual(89);
      expect(daysDiff).toBeLessThanOrEqual(91);
    });

    it('should credit comeback type for returning customers', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        balancePaise: 0,
      });
      mockPrismaService.wallet.update.mockResolvedValue({
        id: 'wallet-1',
        balancePaise: 50000,
      });
      mockPrismaService.walletTransaction.create.mockResolvedValue({
        id: 'txn-1',
        creditType: 'COMEBACK',
      });

      const result = await service.creditWallet({
        ...baseInput,
        creditType: 'COMEBACK',
      });

      expect(result.creditType).toBe('COMEBACK');
    });

    it('should update wallet balance correctly on credit', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        balancePaise: 10000, // ₹100 existing
      });
      mockPrismaService.wallet.update.mockResolvedValue({
        id: 'wallet-1',
        balancePaise: 60000, // ₹100 + ₹500 = ₹600
      });
      mockPrismaService.walletTransaction.create.mockResolvedValue({
        id: 'txn-1',
        balanceAfter: 60000,
      });

      await service.creditWallet(baseInput);

      expect(mockPrismaService.wallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { balancePaise: 60000 },
      });
    });

    it('should record transaction with balance after', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        balancePaise: 25000,
      });
      mockPrismaService.wallet.update.mockResolvedValue({
        id: 'wallet-1',
        balancePaise: 75000,
      });
      mockPrismaService.walletTransaction.create.mockImplementation(({ data }) => ({
        id: 'txn-1',
        ...data,
      }));

      const result = await service.creditWallet(baseInput);

      expect(mockPrismaService.walletTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          walletId: 'wallet-1',
          type: 'CREDIT',
          amountPaise: 50000,
          balanceAfter: 75000,
        }),
      });
    });

    it('should reject credit with negative amount', async () => {
      await expect(
        service.creditWallet({ ...baseInput, amountPaise: -1000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject credit with zero amount', async () => {
      await expect(
        service.creditWallet({ ...baseInput, amountPaise: 0 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================
  // DEBIT WALLET
  // ==========================================

  describe('debitWallet', () => {
    const baseDebitInput: DebitWalletInput = {
      userId: 'user-1',
      amountPaise: 30000,
      description: 'Payment for order',
      referenceId: 'order-1',
      referenceType: 'ORDER',
    };

    it('should debit from wallet balance', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        userId: 'user-1',
        balancePaise: 50000, // ₹500
      });
      mockPrismaService.wallet.update.mockResolvedValue({
        id: 'wallet-1',
        balancePaise: 20000, // ₹500 - ₹300 = ₹200
      });
      mockPrismaService.walletTransaction.create.mockResolvedValue({
        id: 'txn-1',
        type: 'DEBIT',
      });

      const result = await service.debitWallet(baseDebitInput);

      expect(mockPrismaService.wallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { balancePaise: 20000 },
      });
    });

    it('should throw if insufficient balance', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        balancePaise: 10000, // Only ₹100
      });

      await expect(
        service.debitWallet({ ...baseDebitInput, amountPaise: 50000 }), // Trying to debit ₹500
      ).rejects.toThrow(BadRequestException);
    });

    it('should record debit transaction', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        balancePaise: 100000,
      });
      mockPrismaService.wallet.update.mockResolvedValue({
        id: 'wallet-1',
        balancePaise: 70000,
      });
      mockPrismaService.walletTransaction.create.mockImplementation(({ data }) => ({
        id: 'txn-1',
        ...data,
      }));

      await service.debitWallet(baseDebitInput);

      expect(mockPrismaService.walletTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'DEBIT',
          amountPaise: 30000,
          balanceAfter: 70000,
          referenceId: 'order-1',
          referenceType: 'ORDER',
        }),
      });
    });
  });

  // ==========================================
  // WALLET APPLIED FIRST AT CHECKOUT
  // ==========================================

  describe('applyWalletAtCheckout', () => {
    const checkoutInput: ApplyWalletAtCheckoutInput = {
      userId: 'user-1',
      totalAmountPaise: 99900, // ₹999
      useWallet: true,
    };

    it('should apply wallet first, remainder via Razorpay', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        balancePaise: 30000, // ₹300 in wallet
      });

      const result = await service.applyWalletAtCheckout(checkoutInput);

      expect(result.walletAmountUsed).toBe(30000); // ₹300 from wallet
      expect(result.remainingAmountPaise).toBe(69900); // ₹699 via Razorpay
      expect(result.walletFullyCovered).toBe(false);
    });

    it('should fully cover if wallet balance >= total', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        balancePaise: 150000, // ₹1500 in wallet
      });

      const result = await service.applyWalletAtCheckout(checkoutInput);

      expect(result.walletAmountUsed).toBe(99900); // Only use what's needed
      expect(result.remainingAmountPaise).toBe(0);
      expect(result.walletFullyCovered).toBe(true);
    });

    it('should not apply wallet if useWallet is false', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        balancePaise: 50000,
      });

      const result = await service.applyWalletAtCheckout({
        ...checkoutInput,
        useWallet: false,
      });

      expect(result.walletAmountUsed).toBe(0);
      expect(result.remainingAmountPaise).toBe(99900);
    });

    it('should handle zero wallet balance', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        balancePaise: 0,
      });

      const result = await service.applyWalletAtCheckout(checkoutInput);

      expect(result.walletAmountUsed).toBe(0);
      expect(result.remainingAmountPaise).toBe(99900);
    });
  });

  // ==========================================
  // REFUND TRIGGERS
  // ==========================================

  describe('initiateRefund', () => {
    // Spec: Section 10 - Refund triggers

    describe('DOCTOR_NOT_SUITABLE - full refund', () => {
      it('should refund full amount when doctor says not suitable', async () => {
        const input: InitiateRefundInput = {
          userId: 'user-1',
          paymentId: 'payment-1',
          trigger: 'DOCTOR_NOT_SUITABLE',
          method: 'WALLET',
        };

        mockPrismaService.payment.findUnique.mockResolvedValue({
          id: 'payment-1',
          userId: 'user-1',
          amountPaise: 99900,
          status: 'COMPLETED',
        });
        mockPrismaService.wallet.findUnique.mockResolvedValue({
          id: 'wallet-1',
          balancePaise: 0,
        });
        mockPrismaService.wallet.update.mockResolvedValue({
          id: 'wallet-1',
          balancePaise: 99900,
        });
        mockPrismaService.walletTransaction.create.mockResolvedValue({ id: 'txn-1' });
        mockPrismaService.refund.create.mockResolvedValue({
          id: 'refund-1',
          amountPaise: 99900,
          trigger: 'DOCTOR_NOT_SUITABLE',
        });

        const result = await service.initiateRefund(input);

        expect(result.amountPaise).toBe(99900); // Full refund
        expect(result.refundPercentage).toBe(100);
      });
    });

    describe('CANCEL_BEFORE_REVIEW - full refund', () => {
      it('should refund full amount when patient cancels <24hrs before review', async () => {
        const input: InitiateRefundInput = {
          userId: 'user-1',
          paymentId: 'payment-1',
          trigger: 'CANCEL_BEFORE_REVIEW',
          method: 'WALLET',
        };

        mockPrismaService.payment.findUnique.mockResolvedValue({
          id: 'payment-1',
          amountPaise: 99900,
          status: 'COMPLETED',
        });
        mockPrismaService.wallet.findUnique.mockResolvedValue({
          id: 'wallet-1',
          balancePaise: 0,
        });
        mockPrismaService.wallet.update.mockResolvedValue({
          id: 'wallet-1',
          balancePaise: 99900,
        });
        mockPrismaService.walletTransaction.create.mockResolvedValue({ id: 'txn-1' });
        mockPrismaService.refund.create.mockResolvedValue({
          id: 'refund-1',
          amountPaise: 99900,
        });

        const result = await service.initiateRefund(input);

        expect(result.amountPaise).toBe(99900);
        expect(result.refundPercentage).toBe(100);
      });
    });

    describe('CANCEL_AFTER_REVIEW - 50% refund', () => {
      it('should refund 50% when patient cancels after review', async () => {
        const input: InitiateRefundInput = {
          userId: 'user-1',
          paymentId: 'payment-1',
          trigger: 'CANCEL_AFTER_REVIEW',
          method: 'WALLET',
        };

        mockPrismaService.payment.findUnique.mockResolvedValue({
          id: 'payment-1',
          amountPaise: 100000, // ₹1000
          status: 'COMPLETED',
        });
        mockPrismaService.wallet.findUnique.mockResolvedValue({
          id: 'wallet-1',
          balancePaise: 0,
        });
        mockPrismaService.wallet.update.mockResolvedValue({
          id: 'wallet-1',
          balancePaise: 50000, // 50% = ₹500
        });
        mockPrismaService.walletTransaction.create.mockResolvedValue({ id: 'txn-1' });
        mockPrismaService.refund.create.mockResolvedValue({
          id: 'refund-1',
          amountPaise: 50000,
        });

        const result = await service.initiateRefund(input);

        expect(result.amountPaise).toBe(50000); // 50% refund
        expect(result.refundPercentage).toBe(50);
      });
    });

    describe('DELIVERY_ISSUE - full refund', () => {
      it('should refund full amount for delivery issue', async () => {
        const input: InitiateRefundInput = {
          userId: 'user-1',
          paymentId: 'payment-1',
          trigger: 'DELIVERY_ISSUE',
          method: 'WALLET',
        };

        mockPrismaService.payment.findUnique.mockResolvedValue({
          id: 'payment-1',
          amountPaise: 99900,
          status: 'COMPLETED',
        });
        mockPrismaService.wallet.findUnique.mockResolvedValue({
          id: 'wallet-1',
          balancePaise: 0,
        });
        mockPrismaService.wallet.update.mockResolvedValue({
          id: 'wallet-1',
          balancePaise: 99900,
        });
        mockPrismaService.walletTransaction.create.mockResolvedValue({ id: 'txn-1' });
        mockPrismaService.refund.create.mockResolvedValue({
          id: 'refund-1',
          amountPaise: 99900,
        });

        const result = await service.initiateRefund(input);

        expect(result.amountPaise).toBe(99900);
        expect(result.refundPercentage).toBe(100);
      });
    });

    describe('TECHNICAL_ERROR - full auto refund', () => {
      it('should auto-refund full amount on technical error via webhook', async () => {
        const input: InitiateRefundInput = {
          userId: 'user-1',
          paymentId: 'payment-1',
          trigger: 'TECHNICAL_ERROR',
          method: 'ORIGINAL_PAYMENT',
        };

        mockPrismaService.payment.findUnique.mockResolvedValue({
          id: 'payment-1',
          amountPaise: 99900,
          status: 'COMPLETED',
          razorpayPaymentId: 'pay_xyz',
        });
        mockRazorpay.payments.refund.mockResolvedValue({
          id: 'rfnd_123',
          amount: 99900,
          status: 'processed',
        });
        mockPrismaService.refund.create.mockResolvedValue({
          id: 'refund-1',
          amountPaise: 99900,
          razorpayRefundId: 'rfnd_123',
        });

        const result = await service.initiateRefund(input);

        expect(result.amountPaise).toBe(99900);
        expect(result.refundPercentage).toBe(100);
      });
    });
  });

  // ==========================================
  // REFUND METHOD - WALLET vs ORIGINAL
  // ==========================================

  describe('processRefundToWallet', () => {
    it('should credit wallet instantly for WALLET method', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        balancePaise: 10000,
      });
      mockPrismaService.wallet.update.mockResolvedValue({
        id: 'wallet-1',
        balancePaise: 109900,
      });
      mockPrismaService.walletTransaction.create.mockResolvedValue({ id: 'txn-1' });

      const result = await service.processRefundToWallet('user-1', 99900, 'refund-1');

      expect(result.instant).toBe(true);
      expect(mockPrismaService.wallet.update).toHaveBeenCalled();
    });
  });

  describe('processRefundToOriginalPayment', () => {
    it('should initiate Razorpay refund for ORIGINAL_PAYMENT method', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        id: 'payment-1',
        razorpayPaymentId: 'pay_abc123',
        amountPaise: 99900,
      });
      mockRazorpay.payments.refund.mockResolvedValue({
        id: 'rfnd_xyz',
        amount: 99900,
        status: 'processed',
      });
      mockPrismaService.refund.update.mockResolvedValue({
        id: 'refund-1',
        razorpayRefundId: 'rfnd_xyz',
      });

      const result = await service.processRefundToOriginalPayment('payment-1', 99900, 'refund-1');

      expect(mockRazorpay.payments.refund).toHaveBeenCalledWith('pay_abc123', {
        amount: 99900,
      });
      expect(result.estimatedDays).toBe('5-7');
    });
  });

  // ==========================================
  // WALLET TRANSACTION LOG
  // ==========================================

  describe('getTransactionHistory', () => {
    it('should return all transactions for a wallet', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
      });
      mockPrismaService.walletTransaction.findMany.mockResolvedValue([
        { id: 'txn-1', type: 'CREDIT', amountPaise: 50000 },
        { id: 'txn-2', type: 'DEBIT', amountPaise: 30000 },
        { id: 'txn-3', type: 'CREDIT', amountPaise: 10000 },
      ]);

      const result = await service.getTransactionHistory('user-1');

      expect(result).toHaveLength(3);
    });

    it('should return transactions in descending order (newest first)', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
      });
      mockPrismaService.walletTransaction.findMany.mockResolvedValue([
        { id: 'txn-3', createdAt: new Date('2026-02-12') },
        { id: 'txn-2', createdAt: new Date('2026-02-11') },
        { id: 'txn-1', createdAt: new Date('2026-02-10') },
      ]);

      await service.getTransactionHistory('user-1');

      expect(mockPrismaService.walletTransaction.findMany).toHaveBeenCalledWith({
        where: { walletId: 'wallet-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should record every credit and debit', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        balancePaise: 0,
      });
      mockPrismaService.wallet.update.mockResolvedValue({
        id: 'wallet-1',
        balancePaise: 50000,
      });
      mockPrismaService.walletTransaction.create.mockResolvedValue({
        id: 'txn-1',
        type: 'CREDIT',
        amountPaise: 50000,
        balanceAfter: 50000,
      });

      await service.creditWallet({
        userId: 'user-1',
        amountPaise: 50000,
        creditType: 'PROMO',
        description: 'Welcome bonus',
      });

      expect(mockPrismaService.walletTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'CREDIT',
          description: 'Welcome bonus',
        }),
      });
    });
  });

  // ==========================================
  // PROMO CREDIT EXPIRY
  // ==========================================

  describe('expirePromoCredits', () => {
    it('should expire promo credits older than 90 days', async () => {
      const expiredCredits = [
        { id: 'txn-1', amountPaise: 10000, creditType: 'PROMO' },
        { id: 'txn-2', amountPaise: 5000, creditType: 'PROMO' },
      ];

      mockPrismaService.walletTransaction.findMany.mockResolvedValue(expiredCredits);
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        balancePaise: 25000, // Current balance
      });
      mockPrismaService.wallet.update.mockResolvedValue({
        id: 'wallet-1',
        balancePaise: 10000, // After expiring 15000
      });
      mockPrismaService.walletTransaction.create.mockResolvedValue({
        id: 'txn-expiry',
        type: 'DEBIT',
        description: 'Promo credits expired',
      });

      const result = await service.expirePromoCredits('user-1');

      expect(result.expiredAmountPaise).toBe(15000);
      expect(mockPrismaService.wallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { balancePaise: 10000 },
      });
    });

    it('should not expire refund credits', async () => {
      mockPrismaService.walletTransaction.findMany.mockResolvedValue([]); // No promo credits to expire

      const result = await service.expirePromoCredits('user-1');

      expect(result.expiredAmountPaise).toBe(0);
    });
  });

  // ==========================================
  // REFUND STATUS
  // ==========================================

  describe('getRefundStatus', () => {
    it('should return refund status', async () => {
      mockPrismaService.refund.findUnique.mockResolvedValue({
        id: 'refund-1',
        status: 'COMPLETED',
        amountPaise: 99900,
        method: 'WALLET',
        processedAt: new Date(),
      });

      const result = await service.getRefundStatus('refund-1');

      expect(result.status).toBe('COMPLETED');
    });

    it('should throw if refund not found', async () => {
      mockPrismaService.refund.findUnique.mockResolvedValue(null);

      await expect(service.getRefundStatus('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getRefundsByUser', () => {
    it('should return all refunds for a user', async () => {
      mockPrismaService.refund.findMany.mockResolvedValue([
        { id: 'refund-1', status: 'COMPLETED' },
        { id: 'refund-2', status: 'PENDING' },
      ]);

      const result = await service.getRefundsByUser('user-1');

      expect(result).toHaveLength(2);
    });
  });
});
