import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentService, CreatePaymentOrderInput, VerifyPaymentInput, ProcessWebhookInput } from './payment.service';
import { PrismaService } from '../prisma/prisma.service';

// Spec: master spec Section 12 (Payment & Subscription)

describe('PaymentService', () => {
  let service: PaymentService;
  let prisma: PrismaService;

  // Mock Razorpay (we'll inject this via config in real implementation)
  const mockRazorpay = {
    orders: {
      create: jest.fn(),
    },
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    consultation: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    subscriptionPlan: {
      findUnique: jest.fn(),
    },
    subscription: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  // Mock ConfigService — non-production by default for tests
  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      const config: Record<string, string> = {
        RAZORPAY_KEY_SECRET: 'test_razorpay_secret',
        NODE_ENV: 'test',
      };
      return config[key] || '';
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: 'RAZORPAY_INSTANCE', useValue: mockRazorpay },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  // ==========================================
  // CREATE RAZORPAY ORDER
  // ==========================================

  describe('createPaymentOrder', () => {
    const validInput: CreatePaymentOrderInput = {
      userId: 'user-1',
      amountPaise: 99900, // ₹999 in paise
      currency: 'INR',
      purpose: 'CONSULTATION',
      metadata: { vertical: 'HAIR_LOSS', planId: 'plan-1' },
    };

    it('should create a Razorpay order with amount in paise', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1', phone: '+919876543210' });
      mockRazorpay.orders.create.mockResolvedValue({
        id: 'order_razorpay123',
        amount: 99900,
        currency: 'INR',
        status: 'created',
      });
      mockPrismaService.payment.create.mockResolvedValue({
        id: 'payment-1',
        userId: 'user-1',
        amountPaise: 99900,
        razorpayOrderId: 'order_razorpay123',
        status: 'PENDING',
      });

      const result = await service.createPaymentOrder(validInput);

      expect(mockRazorpay.orders.create).toHaveBeenCalledWith({
        amount: 99900, // Must be in paise
        currency: 'INR',
        receipt: expect.any(String),
        notes: expect.objectContaining({
          userId: 'user-1',
          purpose: 'CONSULTATION',
        }),
      });
      expect(result.razorpayOrderId).toBe('order_razorpay123');
      expect(result.amountPaise).toBe(99900);
    });

    it('should reject if amount is less than minimum (₹1 = 100 paise)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });

      await expect(
        service.createPaymentOrder({ ...validInput, amountPaise: 50 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.createPaymentOrder(validInput)).rejects.toThrow(NotFoundException);
    });

    it('should store Razorpay order ID in payment record', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockRazorpay.orders.create.mockResolvedValue({
        id: 'order_xyz789',
        amount: 99900,
        currency: 'INR',
        status: 'created',
      });
      mockPrismaService.payment.create.mockResolvedValue({
        id: 'payment-2',
        razorpayOrderId: 'order_xyz789',
      });

      await service.createPaymentOrder(validInput);

      expect(mockPrismaService.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          razorpayOrderId: 'order_xyz789',
          status: 'PENDING',
        }),
      });
    });

    it('should generate unique receipt ID', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockRazorpay.orders.create.mockResolvedValue({
        id: 'order_abc',
        amount: 99900,
        currency: 'INR',
        status: 'created',
      });
      mockPrismaService.payment.create.mockResolvedValue({ id: 'payment-1' });

      await service.createPaymentOrder(validInput);

      const createCall = mockRazorpay.orders.create.mock.calls[0][0];
      expect(createCall.receipt).toMatch(/^rcpt_/);
    });
  });

  // ==========================================
  // VERIFY PAYMENT SIGNATURE
  // ==========================================

  describe('verifyPaymentSignature', () => {
    const validVerifyInput: VerifyPaymentInput = {
      razorpayOrderId: 'order_123',
      razorpayPaymentId: 'pay_456',
      razorpaySignature: 'valid_signature_hash',
    };

    it('should return true for valid signature', async () => {
      // Mock internal signature verification
      jest.spyOn(service, 'computeSignature' as any).mockReturnValue('valid_signature_hash');

      const result = await service.verifyPaymentSignature(validVerifyInput);

      expect(result).toBe(true);
    });

    it('should return false for invalid signature', async () => {
      jest.spyOn(service, 'computeSignature' as any).mockReturnValue('different_hash');

      const result = await service.verifyPaymentSignature(validVerifyInput);

      expect(result).toBe(false);
    });

    it('should use HMAC SHA256 for signature computation', async () => {
      const computeSpy = jest.spyOn(service, 'computeSignature' as any);

      await service.verifyPaymentSignature(validVerifyInput);

      expect(computeSpy).toHaveBeenCalledWith(
        'order_123|pay_456',
        expect.any(String), // secret key
      );
    });

    // Security: stub_pay_ bypass must only work in non-production
    // Spec: P0 security fix — payment signature bypass must be gated by NODE_ENV
    it('should accept stub_pay_ prefix in non-production (test) environment', async () => {
      const stubInput: VerifyPaymentInput = {
        razorpayOrderId: 'order_test',
        razorpayPaymentId: 'stub_pay_12345',
        razorpaySignature: 'any_signature',
      };

      const result = await service.verifyPaymentSignature(stubInput);
      expect(result).toBe(true);
    });

    it('should NOT accept stub_pay_ prefix in production environment', async () => {
      // Create a production-configured service
      const productionConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
          const config: Record<string, string> = {
            RAZORPAY_KEY_SECRET: 'real_production_secret',
            NODE_ENV: 'production',
          };
          return config[key] || '';
        }),
      };

      const productionModule: TestingModule = await Test.createTestingModule({
        providers: [
          PaymentService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: 'RAZORPAY_INSTANCE', useValue: mockRazorpay },
          { provide: ConfigService, useValue: productionConfigService },
        ],
      }).compile();

      const productionService = productionModule.get<PaymentService>(PaymentService);

      const stubInput: VerifyPaymentInput = {
        razorpayOrderId: 'order_test',
        razorpayPaymentId: 'stub_pay_12345',
        razorpaySignature: 'wrong_signature',
      };

      const result = await productionService.verifyPaymentSignature(stubInput);
      // In production, stub_pay_ should NOT bypass — it should verify normally and fail
      expect(result).toBe(false);
    });
  });

  // ==========================================
  // CONSTRUCTOR / CONFIG SECURITY
  // Spec: P1 security fix — Razorpay secret must use ConfigService, not process.env
  // ==========================================

  describe('constructor security', () => {
    it('should use ConfigService for RAZORPAY_KEY_SECRET (not process.env)', async () => {
      // The mock ConfigService returns 'test_razorpay_secret' for RAZORPAY_KEY_SECRET
      // If the service uses ConfigService properly, verifyPaymentSignature should
      // use 'test_razorpay_secret' as the secret
      expect(mockConfigService.get).toHaveBeenCalledWith('RAZORPAY_KEY_SECRET');
    });

    it('should throw error if RAZORPAY_KEY_SECRET is missing in production', async () => {
      const productionNoSecretConfig = {
        get: jest.fn().mockImplementation((key: string) => {
          const config: Record<string, string> = {
            NODE_ENV: 'production',
            // RAZORPAY_KEY_SECRET is deliberately missing
          };
          return config[key] || '';
        }),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            PaymentService,
            { provide: PrismaService, useValue: mockPrismaService },
            { provide: 'RAZORPAY_INSTANCE', useValue: mockRazorpay },
            { provide: ConfigService, useValue: productionNoSecretConfig },
          ],
        }).compile(),
      ).rejects.toThrow('RAZORPAY_KEY_SECRET is required in production');
    });

    it('should NOT throw error if RAZORPAY_KEY_SECRET is missing in non-production', async () => {
      const testNoSecretConfig = {
        get: jest.fn().mockImplementation((key: string) => {
          const config: Record<string, string> = {
            NODE_ENV: 'test',
            // RAZORPAY_KEY_SECRET is deliberately missing
          };
          return config[key] || '';
        }),
      };

      // Should not throw — empty secret is allowed in non-production
      const module = await Test.createTestingModule({
        providers: [
          PaymentService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: 'RAZORPAY_INSTANCE', useValue: mockRazorpay },
          { provide: ConfigService, useValue: testNoSecretConfig },
        ],
      }).compile();

      expect(module.get(PaymentService)).toBeDefined();
    });

    it('should not use hardcoded test_secret fallback', async () => {
      // Create service with empty RAZORPAY_KEY_SECRET in test mode
      const emptySecretConfig = {
        get: jest.fn().mockImplementation((key: string) => {
          const config: Record<string, string> = {
            NODE_ENV: 'test',
            RAZORPAY_KEY_SECRET: '',
          };
          return config[key] || '';
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          PaymentService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: 'RAZORPAY_INSTANCE', useValue: mockRazorpay },
          { provide: ConfigService, useValue: emptySecretConfig },
        ],
      }).compile();

      const svc = module.get<PaymentService>(PaymentService);

      // With an empty secret, the HMAC should be computed with empty string
      // It should NOT fall back to 'test_secret'
      const input: VerifyPaymentInput = {
        razorpayOrderId: 'order_x',
        razorpayPaymentId: 'pay_y',
        razorpaySignature: 'some_sig',
      };

      // Compute what signature would be with empty string vs 'test_secret'
      const crypto = require('crypto');
      const emptySecretSig = crypto
        .createHmac('sha256', '')
        .update('order_x|pay_y')
        .digest('hex');
      const testSecretSig = crypto
        .createHmac('sha256', 'test_secret')
        .update('order_x|pay_y')
        .digest('hex');

      // Verify with the empty-secret signature should return true
      const resultWithEmptySig = await svc.verifyPaymentSignature({
        ...input,
        razorpaySignature: emptySecretSig,
      });
      expect(resultWithEmptySig).toBe(true);

      // Verify with the old 'test_secret' signature should return false
      const resultWithTestSecret = await svc.verifyPaymentSignature({
        ...input,
        razorpaySignature: testSecretSig,
      });
      expect(resultWithTestSecret).toBe(false);
    });
  });

  // ==========================================
  // WEBHOOK PROCESSING
  // ==========================================

  describe('processWebhook', () => {
    const paymentCapturedEvent: ProcessWebhookInput = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_captured123',
            order_id: 'order_captured123',
            amount: 99900,
            currency: 'INR',
            method: 'upi',
            status: 'captured',
          },
        },
      },
      webhookSignature: 'valid_webhook_signature',
    };

    it('should reject webhook with invalid signature', async () => {
      jest.spyOn(service, 'verifyWebhookSignature' as any).mockReturnValue(false);

      await expect(service.processWebhook(paymentCapturedEvent)).rejects.toThrow(BadRequestException);
    });

    it('should process payment.captured event and update payment status to COMPLETED', async () => {
      jest.spyOn(service, 'verifyWebhookSignature' as any).mockReturnValue(true);
      mockPrismaService.payment.findFirst.mockResolvedValue({
        id: 'payment-1',
        razorpayOrderId: 'order_captured123',
        status: 'PENDING',
        userId: 'user-1',
        metadata: { purpose: 'CONSULTATION', vertical: 'HAIR_LOSS', intakeResponseId: 'intake-1' },
      });
      mockPrismaService.payment.update.mockResolvedValue({
        id: 'payment-1',
        status: 'COMPLETED',
        userId: 'user-1',
        metadata: { purpose: 'CONSULTATION', vertical: 'HAIR_LOSS', intakeResponseId: 'intake-1' },
      });
      mockPrismaService.consultation.create.mockResolvedValue({
        id: 'consultation-1',
        patientId: 'user-1',
        vertical: 'HAIR_LOSS',
      });

      await service.processWebhook(paymentCapturedEvent);

      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          razorpayPaymentId: 'pay_captured123',
          method: 'upi',
        }),
      });
    });

    it('should process payment.failed event and update payment status to FAILED', async () => {
      jest.spyOn(service, 'verifyWebhookSignature' as any).mockReturnValue(true);
      const failedEvent: ProcessWebhookInput = {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_failed123',
              order_id: 'order_failed123',
              amount: 99900,
              error_code: 'BAD_REQUEST_ERROR',
              error_description: 'Card declined',
            },
          },
        },
        webhookSignature: 'valid_webhook_signature',
      };

      mockPrismaService.payment.findFirst.mockResolvedValue({
        id: 'payment-2',
        razorpayOrderId: 'order_failed123',
        status: 'PENDING',
      });
      mockPrismaService.payment.update.mockResolvedValue({
        id: 'payment-2',
        status: 'FAILED',
      });

      await service.processWebhook(failedEvent);

      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-2' },
        data: expect.objectContaining({
          status: 'FAILED',
          failureReason: 'Card declined',
        }),
      });
    });

    it('should handle idempotency - same webhook processed twice should not duplicate', async () => {
      jest.spyOn(service, 'verifyWebhookSignature' as any).mockReturnValue(true);

      // First call - payment is pending
      mockPrismaService.payment.findFirst.mockResolvedValueOnce({
        id: 'payment-1',
        razorpayOrderId: 'order_captured123',
        status: 'PENDING',
        userId: 'user-1',
      });
      mockPrismaService.payment.update.mockResolvedValueOnce({
        id: 'payment-1',
        status: 'COMPLETED',
      });

      await service.processWebhook(paymentCapturedEvent);

      // Second call - payment is already COMPLETED
      mockPrismaService.payment.findFirst.mockResolvedValueOnce({
        id: 'payment-1',
        razorpayOrderId: 'order_captured123',
        status: 'COMPLETED', // Already processed
        razorpayPaymentId: 'pay_captured123',
      });

      // Should not throw, should return early
      const result = await service.processWebhook(paymentCapturedEvent);

      expect(result.alreadyProcessed).toBe(true);
      // Update should only be called once (from first call)
      expect(mockPrismaService.payment.update).toHaveBeenCalledTimes(1);
    });

    it('should throw if payment record not found for webhook', async () => {
      jest.spyOn(service, 'verifyWebhookSignature' as any).mockReturnValue(true);
      mockPrismaService.payment.findFirst.mockResolvedValue(null);

      await expect(service.processWebhook(paymentCapturedEvent)).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================
  // PAYMENT SUCCESS → CREATE CONSULTATION
  // ==========================================

  describe('handlePaymentSuccess', () => {
    it('should create consultation when payment succeeds for CONSULTATION purpose', async () => {
      const payment = {
        id: 'payment-1',
        userId: 'user-1',
        status: 'COMPLETED',
        amountPaise: 99900,
        metadata: {
          purpose: 'CONSULTATION',
          vertical: 'HAIR_LOSS',
          intakeResponseId: 'intake-1',
        },
      };

      mockPrismaService.consultation.create.mockResolvedValue({
        id: 'consultation-1',
        patientId: 'user-1',
        vertical: 'HAIR_LOSS',
        status: 'PENDING_ASSESSMENT',
      });

      const result = await service.handlePaymentSuccess(payment);

      expect(mockPrismaService.consultation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          patientId: 'user-1',
          vertical: 'HAIR_LOSS',
          intakeResponseId: 'intake-1',
          status: 'PENDING_ASSESSMENT',
        }),
      });
      expect(result.consultationId).toBe('consultation-1');
    });

    it('should create subscription when payment succeeds for SUBSCRIPTION purpose', async () => {
      const payment = {
        id: 'payment-2',
        userId: 'user-1',
        status: 'COMPLETED',
        amountPaise: 249900,
        metadata: {
          purpose: 'SUBSCRIPTION',
          planId: 'plan-hair-quarterly',
        },
      };

      mockPrismaService.subscriptionPlan.findUnique.mockResolvedValue({
        id: 'plan-hair-quarterly',
        priceInPaise: 249900,
        durationMonths: 3,
      });
      mockPrismaService.subscription.create.mockResolvedValue({
        id: 'subscription-1',
        userId: 'user-1',
        planId: 'plan-hair-quarterly',
        status: 'ACTIVE',
      });

      const result = await service.handlePaymentSuccess(payment);

      expect(mockPrismaService.subscription.create).toHaveBeenCalled();
      expect(result.subscriptionId).toBe('subscription-1');
    });

    it('should not create consultation if payment has different purpose', async () => {
      const payment = {
        id: 'payment-3',
        userId: 'user-1',
        status: 'COMPLETED',
        metadata: {
          purpose: 'LAB_ORDER',
          labOrderId: 'lab-1',
        },
      };

      await service.handlePaymentSuccess(payment);

      expect(mockPrismaService.consultation.create).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // PAYMENT FAILURE → NO CONSULTATION
  // ==========================================

  describe('handlePaymentFailure', () => {
    it('should not create consultation when payment fails', async () => {
      const failedPayment = {
        id: 'payment-failed',
        userId: 'user-1',
        status: 'FAILED',
        metadata: {
          purpose: 'CONSULTATION',
          vertical: 'HAIR_LOSS',
        },
      };

      await service.handlePaymentFailure(failedPayment);

      expect(mockPrismaService.consultation.create).not.toHaveBeenCalled();
    });

    it('should log failure reason for analytics', async () => {
      const failedPayment = {
        id: 'payment-failed',
        userId: 'user-1',
        status: 'FAILED',
        failureReason: 'Insufficient funds',
        metadata: { purpose: 'CONSULTATION' },
      };

      const result = await service.handlePaymentFailure(failedPayment);

      expect(result.logged).toBe(true);
      expect(result.reason).toBe('Insufficient funds');
    });
  });

  // ==========================================
  // SUPPORTED PAYMENT METHODS
  // ==========================================

  describe('getSupportedPaymentMethods', () => {
    it('should return UPI as supported method', () => {
      const methods = service.getSupportedPaymentMethods();
      expect(methods).toContain('upi');
    });

    it('should return card as supported method', () => {
      const methods = service.getSupportedPaymentMethods();
      expect(methods).toContain('card');
    });

    it('should return netbanking as supported method', () => {
      const methods = service.getSupportedPaymentMethods();
      expect(methods).toContain('netbanking');
    });

    it('should return wallet as supported method', () => {
      const methods = service.getSupportedPaymentMethods();
      expect(methods).toContain('wallet');
    });

    it('should return all 4 supported methods', () => {
      const methods = service.getSupportedPaymentMethods();
      expect(methods).toHaveLength(4);
      expect(methods).toEqual(['upi', 'card', 'netbanking', 'wallet']);
    });
  });

  // ==========================================
  // PRICING VALIDATION
  // ==========================================

  describe('validatePricing', () => {
    // Spec: Section 12 — Pricing
    // Hair Loss: ₹999/month, ₹2,499/quarter, ₹8,999/year
    // ED: ₹1,299/month, ₹3,299/quarter, ₹11,999/year
    // Weight: ₹2,999/month, ₹7,999/quarter, ₹9,999/month (GLP-1)
    // PCOS: ₹1,499/month, ₹3,799/quarter, ₹13,999/year

    it('should validate Hair Loss monthly price (₹999 = 99900 paise)', () => {
      const result = service.validatePricing('HAIR_LOSS', 'MONTHLY', 99900);
      expect(result.valid).toBe(true);
    });

    it('should validate Hair Loss quarterly price (₹2,499 = 249900 paise)', () => {
      const result = service.validatePricing('HAIR_LOSS', 'QUARTERLY', 249900);
      expect(result.valid).toBe(true);
    });

    it('should validate Hair Loss annual price (₹8,999 = 899900 paise)', () => {
      const result = service.validatePricing('HAIR_LOSS', 'ANNUAL', 899900);
      expect(result.valid).toBe(true);
    });

    it('should validate ED monthly price (₹1,299 = 129900 paise)', () => {
      const result = service.validatePricing('SEXUAL_HEALTH', 'MONTHLY', 129900);
      expect(result.valid).toBe(true);
    });

    it('should validate ED quarterly price (₹3,299 = 329900 paise)', () => {
      const result = service.validatePricing('SEXUAL_HEALTH', 'QUARTERLY', 329900);
      expect(result.valid).toBe(true);
    });

    it('should validate ED annual price (₹11,999 = 1199900 paise)', () => {
      const result = service.validatePricing('SEXUAL_HEALTH', 'ANNUAL', 1199900);
      expect(result.valid).toBe(true);
    });

    it('should validate Weight Management monthly price (₹2,999 = 299900 paise)', () => {
      const result = service.validatePricing('WEIGHT_MANAGEMENT', 'MONTHLY', 299900);
      expect(result.valid).toBe(true);
    });

    it('should validate Weight Management quarterly price (₹7,999 = 799900 paise)', () => {
      const result = service.validatePricing('WEIGHT_MANAGEMENT', 'QUARTERLY', 799900);
      expect(result.valid).toBe(true);
    });

    it('should validate PCOS monthly price (₹1,499 = 149900 paise)', () => {
      const result = service.validatePricing('PCOS', 'MONTHLY', 149900);
      expect(result.valid).toBe(true);
    });

    it('should validate PCOS quarterly price (₹3,799 = 379900 paise)', () => {
      const result = service.validatePricing('PCOS', 'QUARTERLY', 379900);
      expect(result.valid).toBe(true);
    });

    it('should validate PCOS annual price (₹13,999 = 1399900 paise)', () => {
      const result = service.validatePricing('PCOS', 'ANNUAL', 1399900);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid price for condition/plan combination', () => {
      const result = service.validatePricing('HAIR_LOSS', 'MONTHLY', 50000); // Wrong price
      expect(result.valid).toBe(false);
      expect(result.expectedPrice).toBe(99900);
    });
  });

  // ==========================================
  // GET PAYMENT DETAILS
  // ==========================================

  describe('getPayment', () => {
    it('should return payment by ID', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        id: 'payment-1',
        userId: 'user-1',
        amountPaise: 99900,
        status: 'COMPLETED',
      });

      const result = await service.getPayment('payment-1');

      expect(result.id).toBe('payment-1');
      expect(result.amountPaise).toBe(99900);
    });

    it('should throw if payment not found', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      await expect(service.getPayment('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPaymentByRazorpayOrderId', () => {
    it('should return payment by Razorpay order ID', async () => {
      mockPrismaService.payment.findFirst.mockResolvedValue({
        id: 'payment-1',
        razorpayOrderId: 'order_rp123',
        status: 'PENDING',
      });

      const result = await service.getPaymentByRazorpayOrderId('order_rp123');

      expect(result.razorpayOrderId).toBe('order_rp123');
    });

    it('should return null if not found', async () => {
      mockPrismaService.payment.findFirst.mockResolvedValue(null);

      const result = await service.getPaymentByRazorpayOrderId('non-existent');

      expect(result).toBeNull();
    });
  });

  // ==========================================
  // PAYMENT HISTORY
  // ==========================================

  describe('getPaymentsByUser', () => {
    it('should return all payments for a user', async () => {
      mockPrismaService.payment.findMany = jest.fn().mockResolvedValue([
        { id: 'payment-1', status: 'COMPLETED' },
        { id: 'payment-2', status: 'FAILED' },
      ]);

      const result = await service.getPaymentsByUser('user-1');

      expect(result).toHaveLength(2);
    });

    it('should filter payments by status if provided', async () => {
      mockPrismaService.payment.findMany = jest.fn().mockResolvedValue([
        { id: 'payment-1', status: 'COMPLETED' },
      ]);

      const result = await service.getPaymentsByUser('user-1', 'COMPLETED');

      expect(mockPrismaService.payment.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
