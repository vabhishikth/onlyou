import { Test, TestingModule } from '@nestjs/testing';
import { PaymentResolver } from './payment.resolver';
import { PaymentService } from './payment.service';
import { PrismaService } from '../prisma/prisma.service';

// Spec: master spec Section 12 (Payment & Subscription)

describe('PaymentResolver', () => {
  let resolver: PaymentResolver;
  let mockPaymentService: any;
  let mockPrismaService: any;

  const mockUser = { id: 'patient-1' };

  const mockPayment = {
    id: 'pay-1',
    userId: 'patient-1',
    amountPaise: 99900,
    status: 'PENDING',
    razorpayOrderId: 'order_abc123',
    razorpayPaymentId: null,
    razorpaySignature: null,
    method: null,
    failureReason: null,
    metadata: { purpose: 'CONSULTATION', vertical: 'HAIR_LOSS' },
    createdAt: new Date('2026-02-20'),
    updatedAt: new Date('2026-02-20'),
  };

  beforeEach(async () => {
    mockPaymentService = {
      createPaymentOrder: jest.fn(),
      verifyPaymentSignature: jest.fn(),
      processWebhook: jest.fn(),
      getSupportedPaymentMethods: jest.fn(),
      validatePricing: jest.fn(),
      getPayment: jest.fn(),
      getPaymentsByUser: jest.fn(),
    };

    mockPrismaService = {
      payment: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentResolver,
        { provide: PaymentService, useValue: mockPaymentService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    resolver = module.get<PaymentResolver>(PaymentResolver);
  });

  // ============================================
  // QUERIES
  // ============================================

  describe('myPayments', () => {
    it('should return payments for the authenticated user', async () => {
      const payments = [mockPayment, { ...mockPayment, id: 'pay-2' }];
      mockPaymentService.getPaymentsByUser.mockResolvedValue(payments);

      const result = await resolver.myPayments(mockUser);

      expect(mockPaymentService.getPaymentsByUser).toHaveBeenCalledWith('patient-1', undefined);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('pay-1');
    });

    it('should filter payments by status when provided', async () => {
      mockPaymentService.getPaymentsByUser.mockResolvedValue([mockPayment]);

      await resolver.myPayments(mockUser, 'COMPLETED');

      expect(mockPaymentService.getPaymentsByUser).toHaveBeenCalledWith('patient-1', 'COMPLETED');
    });
  });

  describe('supportedPaymentMethods', () => {
    it('should return list of supported payment methods', () => {
      mockPaymentService.getSupportedPaymentMethods.mockReturnValue(['upi', 'card', 'netbanking', 'wallet']);

      const result = resolver.supportedPaymentMethods();

      expect(result).toEqual(['upi', 'card', 'netbanking', 'wallet']);
    });
  });

  // ============================================
  // MUTATIONS
  // ============================================

  describe('createPaymentOrder', () => {
    const input = {
      amountPaise: 99900,
      currency: 'INR',
      purpose: 'CONSULTATION',
      vertical: 'HAIR_LOSS',
      planId: 'plan-1',
    };

    it('should create a payment order for the authenticated user', async () => {
      mockPaymentService.createPaymentOrder.mockResolvedValue({
        ...mockPayment,
        razorpayOrderId: 'order_new123',
        currency: 'INR',
      });

      const result = await resolver.createPaymentOrder(mockUser, input);

      expect(mockPaymentService.createPaymentOrder).toHaveBeenCalledWith({
        userId: 'patient-1',
        amountPaise: 99900,
        currency: 'INR',
        purpose: 'CONSULTATION',
        metadata: { vertical: 'HAIR_LOSS', planId: 'plan-1' },
      });
      expect(result.success).toBe(true);
      expect(result.razorpayOrderId).toBe('order_new123');
    });

    it('should return error when service throws', async () => {
      mockPaymentService.createPaymentOrder.mockRejectedValue(
        new Error('Amount must be at least ₹1 (100 paise)'),
      );

      const result = await resolver.createPaymentOrder(mockUser, { ...input, amountPaise: 50 });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Amount must be at least ₹1 (100 paise)');
    });

    it('should pass intakeResponseId in metadata when provided', async () => {
      mockPaymentService.createPaymentOrder.mockResolvedValue({
        ...mockPayment,
        razorpayOrderId: 'order_x',
        currency: 'INR',
      });

      await resolver.createPaymentOrder(mockUser, {
        ...input,
        intakeResponseId: 'intake-1',
      });

      expect(mockPaymentService.createPaymentOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ intakeResponseId: 'intake-1' }),
        }),
      );
    });
  });

  describe('verifyPayment', () => {
    const verifyInput = {
      razorpayOrderId: 'order_abc123',
      razorpayPaymentId: 'pay_xyz789',
      razorpaySignature: 'signature_valid',
    };

    it('should return success when signature is valid', async () => {
      mockPaymentService.verifyPaymentSignature.mockResolvedValue(true);
      mockPrismaService.payment.findFirst.mockResolvedValue(mockPayment);
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: 'COMPLETED',
        razorpayPaymentId: 'pay_xyz789',
      });

      const result = await resolver.verifyPayment(verifyInput);

      expect(result.success).toBe(true);
      expect(result.message).toContain('verified');
    });

    it('should return failure when signature is invalid', async () => {
      mockPaymentService.verifyPaymentSignature.mockResolvedValue(false);

      const result = await resolver.verifyPayment(verifyInput);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid');
    });

    it('should update payment status to COMPLETED on valid signature', async () => {
      mockPaymentService.verifyPaymentSignature.mockResolvedValue(true);
      mockPrismaService.payment.findFirst.mockResolvedValue(mockPayment);
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: 'COMPLETED',
      });

      await resolver.verifyPayment(verifyInput);

      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: mockPayment.id },
        data: {
          status: 'COMPLETED',
          razorpayPaymentId: 'pay_xyz789',
        },
      });
    });

    it('should return error when payment record not found', async () => {
      mockPaymentService.verifyPaymentSignature.mockResolvedValue(true);
      mockPrismaService.payment.findFirst.mockResolvedValue(null);

      const result = await resolver.verifyPayment(verifyInput);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('paymentWebhook', () => {
    const webhookInput = {
      event: 'payment.captured',
      payload: { payment: { entity: { order_id: 'order_abc123', id: 'pay_xyz', method: 'upi' } } },
      webhookSignature: 'valid_sig',
    };

    it('should process captured payment webhook', async () => {
      mockPaymentService.processWebhook.mockResolvedValue({
        processed: true,
        paymentId: 'pay-1',
        status: 'COMPLETED',
      });

      const result = await resolver.paymentWebhook(webhookInput);

      expect(result.success).toBe(true);
      expect(mockPaymentService.processWebhook).toHaveBeenCalledWith({
        event: 'payment.captured',
        payload: webhookInput.payload,
        webhookSignature: 'valid_sig',
      });
    });

    it('should process failed payment webhook', async () => {
      mockPaymentService.processWebhook.mockResolvedValue({
        processed: true,
        paymentId: 'pay-1',
        status: 'FAILED',
      });

      const result = await resolver.paymentWebhook({
        ...webhookInput,
        event: 'payment.failed',
      });

      expect(result.success).toBe(true);
    });

    it('should return error for invalid webhook signature', async () => {
      mockPaymentService.processWebhook.mockRejectedValue(
        new Error('Invalid webhook signature'),
      );

      const result = await resolver.paymentWebhook(webhookInput);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid webhook signature');
    });

    it('should handle already processed webhooks (idempotent)', async () => {
      mockPaymentService.processWebhook.mockResolvedValue({
        alreadyProcessed: true,
        paymentId: 'pay-1',
      });

      const result = await resolver.paymentWebhook(webhookInput);

      expect(result.success).toBe(true);
    });
  });

  describe('validatePricing', () => {
    it('should return valid for correct pricing', () => {
      mockPaymentService.validatePricing.mockReturnValue({ valid: true });

      const result = resolver.validatePricing('HAIR_LOSS', 'MONTHLY', 99900);

      expect(result.valid).toBe(true);
    });

    it('should return invalid for wrong pricing', () => {
      mockPaymentService.validatePricing.mockReturnValue({ valid: false, expectedPrice: 99900 });

      const result = resolver.validatePricing('HAIR_LOSS', 'MONTHLY', 50000);

      expect(result.valid).toBe(false);
      expect(result.expectedPrice).toBe(99900);
    });
  });
});
