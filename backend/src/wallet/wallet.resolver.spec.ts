import { Test, TestingModule } from '@nestjs/testing';
import { WalletResolver } from './wallet.resolver';
import { WalletService } from './wallet.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

// Spec: master spec Section 10 (Refund & Wallet)

describe('WalletResolver', () => {
  let resolver: WalletResolver;
  let mockWalletService: any;

  const mockWallet = {
    id: 'wallet-1',
    userId: 'user-1',
    balancePaise: 150000,
  };

  const mockTransaction = {
    id: 'txn-1',
    walletId: 'wallet-1',
    type: 'CREDIT',
    creditType: 'REFUND',
    amountPaise: 150000,
    balanceAfter: 150000,
    description: 'Refund credited',
    referenceId: 'refund-1',
    referenceType: 'REFUND',
    expiresAt: null,
    createdAt: new Date('2026-02-20'),
  };

  const mockRefund = {
    id: 'refund-1',
    userId: 'user-1',
    paymentId: 'payment-1',
    orderId: null,
    consultationId: 'consultation-1',
    trigger: 'CANCEL_BEFORE_REVIEW',
    method: 'WALLET',
    amountPaise: 150000,
    status: 'COMPLETED',
    razorpayRefundId: null,
    processedAt: new Date('2026-02-20'),
    createdAt: new Date('2026-02-20'),
  };

  beforeEach(async () => {
    mockWalletService = {
      getBalance: jest.fn(),
      getTransactionHistory: jest.fn(),
      creditWallet: jest.fn(),
      debitWallet: jest.fn(),
      applyWalletAtCheckout: jest.fn(),
      initiateRefund: jest.fn(),
      getRefundStatus: jest.fn(),
      getRefundsByUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletResolver,
        { provide: WalletService, useValue: mockWalletService },
      ],
    }).compile();

    resolver = module.get<WalletResolver>(WalletResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  // ============================================
  // QUERIES
  // ============================================

  describe('walletBalance (query)', () => {
    it('should return wallet balance in paise and rupees', async () => {
      mockWalletService.getBalance.mockResolvedValue({
        balancePaise: 150000,
        balanceRupees: 1500,
      });

      const result = await resolver.walletBalance('user-1');

      expect(result.balancePaise).toBe(150000);
      expect(result.balanceRupees).toBe(1500);
      expect(mockWalletService.getBalance).toHaveBeenCalledWith('user-1');
    });

    it('should return zero balance for new user', async () => {
      mockWalletService.getBalance.mockResolvedValue({
        balancePaise: 0,
        balanceRupees: 0,
      });

      const result = await resolver.walletBalance('new-user');

      expect(result.balancePaise).toBe(0);
      expect(result.balanceRupees).toBe(0);
    });
  });

  describe('transactionHistory (query)', () => {
    it('should return transaction history', async () => {
      mockWalletService.getTransactionHistory.mockResolvedValue([mockTransaction]);

      const result = await resolver.transactionHistory('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('txn-1');
      expect(result[0].type).toBe('CREDIT');
      expect(mockWalletService.getTransactionHistory).toHaveBeenCalledWith('user-1');
    });

    it('should return empty array for user with no transactions', async () => {
      mockWalletService.getTransactionHistory.mockResolvedValue([]);

      const result = await resolver.transactionHistory('user-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('refundStatus (query)', () => {
    it('should return refund status', async () => {
      mockWalletService.getRefundStatus.mockResolvedValue(mockRefund);

      const result = await resolver.refundStatus('refund-1');

      expect(result.success).toBe(true);
      expect(result.refund).toBeDefined();
      expect(result.refund!.id).toBe('refund-1');
      expect(result.refund!.status).toBe('COMPLETED');
    });

    it('should return error when refund not found', async () => {
      mockWalletService.getRefundStatus.mockRejectedValue(
        new NotFoundException('Refund not found')
      );

      const result = await resolver.refundStatus('non-existent');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('refundsByUser (query)', () => {
    it('should return refunds for user', async () => {
      mockWalletService.getRefundsByUser.mockResolvedValue([mockRefund]);

      const result = await resolver.refundsByUser('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('refund-1');
      expect(mockWalletService.getRefundsByUser).toHaveBeenCalledWith('user-1');
    });
  });

  // ============================================
  // MUTATIONS
  // ============================================

  describe('creditWallet (mutation)', () => {
    it('should credit wallet and return success', async () => {
      mockWalletService.creditWallet.mockResolvedValue(mockTransaction);

      const result = await resolver.creditWallet({
        userId: 'user-1',
        amountPaise: 150000,
        creditType: 'REFUND',
        description: 'Refund credited',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('credited');
    });

    it('should return error for invalid amount', async () => {
      mockWalletService.creditWallet.mockRejectedValue(
        new BadRequestException('Credit amount must be positive')
      );

      const result = await resolver.creditWallet({
        userId: 'user-1',
        amountPaise: 0,
        creditType: 'REFUND',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('positive');
    });
  });

  describe('applyWalletAtCheckout (mutation)', () => {
    // Spec: Wallet applied first, remainder via Razorpay
    it('should return checkout result with wallet applied', async () => {
      mockWalletService.applyWalletAtCheckout.mockResolvedValue({
        walletAmountUsed: 100000,
        remainingAmountPaise: 50000,
        walletFullyCovered: false,
      });

      const result = await resolver.applyWalletAtCheckout({
        userId: 'user-1',
        totalAmountPaise: 150000,
        useWallet: true,
      });

      expect(result.walletAmountUsed).toBe(100000);
      expect(result.remainingAmountPaise).toBe(50000);
      expect(result.walletFullyCovered).toBe(false);
    });

    it('should return full coverage when wallet has enough', async () => {
      mockWalletService.applyWalletAtCheckout.mockResolvedValue({
        walletAmountUsed: 150000,
        remainingAmountPaise: 0,
        walletFullyCovered: true,
      });

      const result = await resolver.applyWalletAtCheckout({
        userId: 'user-1',
        totalAmountPaise: 150000,
        useWallet: true,
      });

      expect(result.walletFullyCovered).toBe(true);
      expect(result.remainingAmountPaise).toBe(0);
    });

    it('should skip wallet when useWallet is false', async () => {
      mockWalletService.applyWalletAtCheckout.mockResolvedValue({
        walletAmountUsed: 0,
        remainingAmountPaise: 150000,
        walletFullyCovered: false,
      });

      const result = await resolver.applyWalletAtCheckout({
        userId: 'user-1',
        totalAmountPaise: 150000,
        useWallet: false,
      });

      expect(result.walletAmountUsed).toBe(0);
    });
  });

  describe('initiateRefund (mutation)', () => {
    // Spec: Section 10 - Refund triggers
    it('should initiate refund to wallet', async () => {
      mockWalletService.initiateRefund.mockResolvedValue({
        ...mockRefund,
        refundPercentage: 100,
      });

      const result = await resolver.initiateRefund({
        userId: 'user-1',
        paymentId: 'payment-1',
        trigger: 'CANCEL_BEFORE_REVIEW',
        method: 'WALLET',
        consultationId: 'consultation-1',
      });

      expect(result.success).toBe(true);
      expect(result.refund).toBeDefined();
      expect(result.refund!.method).toBe('WALLET');
    });

    it('should return error when payment not found', async () => {
      mockWalletService.initiateRefund.mockRejectedValue(
        new NotFoundException('Payment not found')
      );

      const result = await resolver.initiateRefund({
        userId: 'user-1',
        paymentId: 'non-existent',
        trigger: 'TECHNICAL_ERROR',
        method: 'WALLET',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });
});
