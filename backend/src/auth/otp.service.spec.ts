import { Test, TestingModule } from '@nestjs/testing';
import { OtpService } from './otp.service';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';

// Mock crypto.randomInt to verify secure OTP generation
const mockRandomInt = jest.fn().mockReturnValue(456789);
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomInt: (...args: any[]) => mockRandomInt(...args),
}));

// Spec: master spec Section 3.1 (OTP), Section 14 (Security)
describe('OtpService', () => {
  let service: OtpService;
  let configService: jest.Mocked<ConfigService>;
  let redisService: jest.Mocked<RedisService>;

  // In-memory store to simulate Redis for tests
  let redisStore: Map<string, { value: string; ttl?: number }>;

  beforeEach(async () => {
    redisStore = new Map();

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
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(async (key: string) => {
              const entry = redisStore.get(key);
              return entry ? entry.value : null;
            }),
            set: jest.fn(async (key: string, value: string, ttl?: number) => {
              redisStore.set(key, { value, ttl });
            }),
            del: jest.fn(async (key: string) => {
              redisStore.delete(key);
            }),
            incr: jest.fn(async (key: string) => {
              const entry = redisStore.get(key);
              const currentVal = entry ? parseInt(entry.value, 10) : 0;
              const newVal = currentVal + 1;
              redisStore.set(key, { value: newVal.toString(), ttl: entry?.ttl });
              return newVal;
            }),
            expire: jest.fn(async () => {}),
          },
        },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
    configService = module.get(ConfigService);
    redisService = module.get(RedisService);

    // Reset mockRandomInt to default
    mockRandomInt.mockReturnValue(456789);
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

    it('should store OTP data in Redis with key pattern otp:{phone}', async () => {
      // Spec: Section 14 (Security) — use Redis for OTP storage, not in-memory
      const phone = '+919876543210';
      await service.sendOtp(phone);

      expect(redisService.set).toHaveBeenCalledWith(
        `otp:${phone}`,
        expect.any(String),
        300, // 5 minutes TTL
      );

      // Verify stored data is valid JSON with otp, attempts, expiresAt
      const setCall = redisService.set.mock.calls[0];
      const storedData = JSON.parse(setCall[1]);
      expect(storedData).toHaveProperty('otp');
      expect(storedData).toHaveProperty('attempts');
      expect(storedData).toHaveProperty('expiresAt');
      expect(storedData.otp).toMatch(/^\d{6}$/);
    });

    it('should use Redis rate limit key otp_rate:{phone} with 1-hour TTL', async () => {
      // Spec: Section 14 (Security) — rate limit OTP requests per phone
      const phone = '+919876543210';
      await service.sendOtp(phone);

      expect(redisService.incr).toHaveBeenCalledWith(`otp_rate:${phone}`);
      expect(redisService.expire).toHaveBeenCalledWith(`otp_rate:${phone}`, 3600);
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

    it('should generate 6-digit OTP using crypto.randomInt (not Math.random)', async () => {
      // Spec: Section 14 (Security) — OTP must use cryptographic randomness
      mockRandomInt.mockClear();
      mockRandomInt.mockReturnValue(456789);
      const mathRandomSpy = jest.spyOn(Math, 'random');

      const phone = '+919876543210';
      await service.sendOtp(phone);

      // crypto.randomInt must be used for secure OTP generation
      expect(mockRandomInt).toHaveBeenCalledWith(100000, 999999);
      // Math.random must NOT be used (insecure)
      expect(mathRandomSpy).not.toHaveBeenCalled();

      mathRandomSpy.mockRestore();
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
      mockRandomInt.mockReturnValue(456789);
      await service.sendOtp(phone);

      const result = await service.verifyOtp(phone, '456789');

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

    it('should clear OTP from Redis after successful verification', async () => {
      const phone = '+919876543210';
      mockRandomInt.mockReturnValue(456789);
      await service.sendOtp(phone);

      await service.verifyOtp(phone, '456789');

      // OTP should be deleted from Redis
      expect(redisService.del).toHaveBeenCalledWith(`otp:${phone}`);
    });

    it('should return failure for expired OTP', async () => {
      const phone = '+919876543210';
      mockRandomInt.mockReturnValue(456789);

      // Store an already-expired OTP directly in the mock Redis
      const expiredData = JSON.stringify({
        otp: '456789',
        attempts: 1,
        expiresAt: Date.now() - 1000, // 1 second ago
      });
      redisStore.set(`otp:${phone}`, { value: expiredData });

      const result = await service.verifyOtp(phone, '456789');

      expect(result.success).toBe(false);
      expect(result.message).toBe('OTP expired. Please request a new one.');
    });
  });
});
