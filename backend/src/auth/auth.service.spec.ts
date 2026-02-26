import { Test, TestingModule } from '@nestjs/testing';
import { AuthService, AuthResponse, AuthTokens } from './auth.service';
import { OtpService } from './otp.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { createHash } from 'crypto';

// Spec: master spec Section 3.1, Section 14
describe('AuthService', () => {
  let service: AuthService;
  let prismaService: jest.Mocked<PrismaService>;
  let otpService: jest.Mocked<OtpService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser = {
    id: 'user-123',
    phone: '+919876543210',
    email: null,
    name: null,
    role: UserRole.PATIENT,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            patientProfile: {
              create: jest.fn(),
            },
            refreshToken: {
              create: jest.fn(),
              findUnique: jest.fn(),
              delete: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
        {
          provide: OtpService,
          useValue: {
            sendOtp: jest.fn(),
            verifyOtp: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-access-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-jwt-secret'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    otpService = module.get(OtpService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  describe('requestOtp', () => {
    it('should call OtpService.sendOtp with phone number', async () => {
      const phone = '+919876543210';
      otpService.sendOtp.mockResolvedValue({ success: true, message: 'OTP sent' });

      const result = await service.requestOtp(phone);

      expect(otpService.sendOtp).toHaveBeenCalledWith(phone);
      expect(result.success).toBe(true);
    });

    it('should return failure for invalid phone number', async () => {
      const phone = '+919876543210';
      otpService.sendOtp.mockResolvedValue({ success: false, message: 'Invalid phone' });

      const result = await service.requestOtp(phone);

      expect(result.success).toBe(false);
    });
  });

  describe('verifyOtpAndLogin', () => {
    it('should return failure when OTP verification fails', async () => {
      otpService.verifyOtp.mockResolvedValue({ success: false, message: 'Invalid OTP' });

      const result = await service.verifyOtpAndLogin('+919876543210', '000000');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid OTP');
    });

    it('should create new user with PATIENT role when user does not exist', async () => {
      otpService.verifyOtp.mockResolvedValue({ success: true, message: 'OTP verified' });
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue(mockUser);
      prismaService.patientProfile.create.mockResolvedValue({} as any);
      prismaService.refreshToken.create.mockResolvedValue({} as any);

      const result = await service.verifyOtpAndLogin('+919876543210', '123456');

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          phone: '+919876543210',
          role: UserRole.PATIENT,
          isVerified: true,
        },
      });
      expect(prismaService.patientProfile.create).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.tokens).toBeDefined();
    });

    it('should return existing user when user exists', async () => {
      otpService.verifyOtp.mockResolvedValue({ success: true, message: 'OTP verified' });
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.refreshToken.create.mockResolvedValue({} as any);

      const result = await service.verifyOtpAndLogin('+919876543210', '123456');

      expect(prismaService.user.create).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.user?.id).toBe(mockUser.id);
    });

    it('should mark unverified user as verified on login', async () => {
      const unverifiedUser = { ...mockUser, isVerified: false };
      otpService.verifyOtp.mockResolvedValue({ success: true, message: 'OTP verified' });
      prismaService.user.findUnique.mockResolvedValue(unverifiedUser);
      prismaService.user.update.mockResolvedValue({ ...unverifiedUser, isVerified: true });
      prismaService.refreshToken.create.mockResolvedValue({} as any);

      const result = await service.verifyOtpAndLogin('+919876543210', '123456');

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: unverifiedUser.id },
        data: { isVerified: true },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('generateTokens', () => {
    it('should generate access token with correct payload', async () => {
      prismaService.refreshToken.create.mockResolvedValue({} as any);

      const tokens = await service.generateTokens(mockUser);

      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: mockUser.id, phone: mockUser.phone, role: mockUser.role },
        expect.objectContaining({ secret: 'test-jwt-secret', expiresIn: '1h' })
      );
      expect(tokens.accessToken).toBe('mock-access-token');
    });

    it('should create refresh token with 30-day expiry', async () => {
      prismaService.refreshToken.create.mockResolvedValue({} as any);

      const tokens = await service.generateTokens(mockUser);

      expect(prismaService.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUser.id,
          token: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      });
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.refreshToken.length).toBeGreaterThan(0);
    });

    it('should store SHA-256 hash of refresh token in DB, not raw token', async () => {
      // Spec: Section 14 (Security) — refresh tokens must be hashed before storage
      prismaService.refreshToken.create.mockResolvedValue({} as any);

      const tokens = await service.generateTokens(mockUser);

      // The raw token returned to user
      const rawToken = tokens.refreshToken;
      // The expected hash that should be stored in DB
      const expectedHash = createHash('sha256').update(rawToken).digest('hex');

      // Verify the DB received the hash, not the raw token
      const createCall = prismaService.refreshToken.create.mock.calls[0][0];
      expect(createCall.data.token).toBe(expectedHash);
      expect(createCall.data.token).not.toBe(rawToken);
    });

    it('should throw error if JWT_ACCESS_SECRET is not configured', async () => {
      configService.get.mockReturnValue(undefined);

      await expect(service.generateTokens(mockUser)).rejects.toThrow(
        'JWT_ACCESS_SECRET is not configured'
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('should hash incoming token before DB lookup', async () => {
      // Spec: Section 14 (Security) — tokens are hashed before comparison
      const rawToken = 'valid-refresh-token';
      const hashedToken = createHash('sha256').update(rawToken).digest('hex');
      const storedToken = {
        id: 'token-123',
        userId: mockUser.id,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
        user: mockUser,
      };
      prismaService.refreshToken.findUnique.mockResolvedValue(storedToken);
      prismaService.refreshToken.delete.mockResolvedValue({} as any);
      prismaService.refreshToken.create.mockResolvedValue({} as any);

      await service.refreshAccessToken(rawToken);

      // The DB lookup should use the hashed token
      expect(prismaService.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { token: hashedToken },
        include: { user: true },
      });
    });

    it('should return new tokens for valid refresh token', async () => {
      const rawToken = 'valid-refresh-token';
      const hashedToken = createHash('sha256').update(rawToken).digest('hex');
      const storedToken = {
        id: 'token-123',
        userId: mockUser.id,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 86400000), // 1 day from now
        createdAt: new Date(),
        user: mockUser,
      };
      prismaService.refreshToken.findUnique.mockResolvedValue(storedToken);
      prismaService.refreshToken.delete.mockResolvedValue({} as any);
      prismaService.refreshToken.create.mockResolvedValue({} as any);

      const result = await service.refreshAccessToken(rawToken);

      expect(result.success).toBe(true);
      expect(result.tokens).toBeDefined();
      expect(prismaService.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: storedToken.id },
      });
    });

    it('should throw UnauthorizedException for non-existent refresh token', async () => {
      prismaService.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshAccessToken('invalid-token')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException and delete expired refresh token', async () => {
      const rawToken = 'expired-token';
      const hashedToken = createHash('sha256').update(rawToken).digest('hex');
      const expiredToken = {
        id: 'token-123',
        userId: mockUser.id,
        token: hashedToken,
        expiresAt: new Date(Date.now() - 86400000), // 1 day ago
        createdAt: new Date(),
        user: mockUser,
      };
      prismaService.refreshToken.findUnique.mockResolvedValue(expiredToken);

      await expect(service.refreshAccessToken(rawToken)).rejects.toThrow(
        UnauthorizedException
      );
      expect(prismaService.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: expiredToken.id },
      });
    });
  });

  describe('logout', () => {
    it('should hash specific refresh token before deleting from DB', async () => {
      // Spec: Section 14 (Security) — hash tokens for logout comparison
      const rawToken = 'specific-token';
      const hashedToken = createHash('sha256').update(rawToken).digest('hex');
      prismaService.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.logout('user-123', rawToken);

      expect(prismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', token: hashedToken },
      });
      expect(result.success).toBe(true);
    });

    it('should delete all refresh tokens when token not provided (logout all devices)', async () => {
      prismaService.refreshToken.deleteMany.mockResolvedValue({ count: 3 });

      const result = await service.logout('user-123');

      expect(prismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserById('user-123');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.getUserById('non-existent');

      expect(result).toBeNull();
    });
  });
});
