import { Test, TestingModule } from '@nestjs/testing';
import { OtpService } from './otp.service';
import { ConfigService } from '@nestjs/config';

// Spec: master spec Section 3.1 (OTP), Section 14 (Security)
describe('OtpService', () => {
  let service: OtpService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'NODE_ENV') return 'development';
              if (key === 'MSG91_AUTH_KEY') return 'test-key';
              if (key === 'MSG91_TEMPLATE_ID') return 'test-template';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
    configService = module.get(ConfigService);
  });

  describe('sendOtp', () => {
    it('should reject invalid Indian phone numbers', async () => {
      const invalidPhones = [
        '1234567890', // No country code
        '+1234567890', // Wrong country code
        '+919123456', // Too short
        '+91912345678901', // Too long
        '+910123456789', // Starts with 0
        '+915123456789', // Starts with 5 (not 6-9)
      ];

      for (const phone of invalidPhones) {
        const result = await service.sendOtp(phone);
        expect(result.success).toBe(false);
        expect(result.message).toBe('Invalid Indian phone number');
      }
    });

    it('should accept valid Indian phone numbers (+91 followed by 6-9 and 9 more digits)', async () => {
      const validPhones = [
        '+919876543210',
        '+916123456789',
        '+917000000000',
        '+918999999999',
      ];

      for (const phone of validPhones) {
        const result = await service.sendOtp(phone);
        expect(result.success).toBe(true);
        expect(result.message).toBe('OTP sent successfully');
      }
    });

    it('should return success in development mode without calling MSG91', async () => {
      const result = await service.sendOtp('+919876543210');

      expect(result.success).toBe(true);
      expect(result.requestId).toBe('dev-mode');
    });

    it('should enforce rate limiting (max 5 OTP requests per phone)', async () => {
      const phone = '+919876543210';

      // First 5 requests should succeed
      for (let i = 0; i < 5; i++) {
        const result = await service.sendOtp(phone);
        expect(result.success).toBe(true);
      }

      // 6th request should fail with rate limit
      const result = await service.sendOtp(phone);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Too many OTP requests. Please try again later.');
    });

    it('should generate 6-digit OTP', async () => {
      const phone = '+919876543210';
      await service.sendOtp(phone);

      // Access internal otpStore to verify OTP format
      const stored = (service as any).otpStore.get(phone);
      expect(stored.otp).toMatch(/^\d{6}$/);
    });
  });

  describe('verifyOtp', () => {
    it('should return failure for non-existent OTP', async () => {
      const result = await service.verifyOtp('+919876543210', '123456');

      expect(result.success).toBe(false);
      expect(result.message).toBe('OTP expired or not requested');
    });

    it('should verify correct OTP', async () => {
      const phone = '+919876543210';
      await service.sendOtp(phone);

      // Get the stored OTP
      const stored = (service as any).otpStore.get(phone);
      const result = await service.verifyOtp(phone, stored.otp);

      expect(result.success).toBe(true);
      expect(result.message).toBe('OTP verified successfully');
    });

    it('should accept magic OTP (123456) in development mode', async () => {
      // Configure as development
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        return undefined;
      });

      const phone = '+919876543210';
      await service.sendOtp(phone);

      const result = await service.verifyOtp(phone, '123456');

      expect(result.success).toBe(true);
    });

    it('should return failure for incorrect OTP', async () => {
      const phone = '+919876543210';
      await service.sendOtp(phone);

      const result = await service.verifyOtp(phone, '000000');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid OTP');
    });

    it('should clear OTP after successful verification', async () => {
      const phone = '+919876543210';
      await service.sendOtp(phone);

      const stored = (service as any).otpStore.get(phone);
      await service.verifyOtp(phone, stored.otp);

      // OTP should be cleared
      expect((service as any).otpStore.get(phone)).toBeUndefined();
    });

    it('should return failure for expired OTP', async () => {
      const phone = '+919876543210';
      await service.sendOtp(phone);

      // Manually expire the OTP
      const stored = (service as any).otpStore.get(phone);
      stored.expiresAt = Date.now() - 1000; // 1 second ago
      (service as any).otpStore.set(phone, stored);

      const result = await service.verifyOtp(phone, stored.otp);

      expect(result.success).toBe(false);
      expect(result.message).toBe('OTP expired. Please request a new one.');
    });
  });
});
