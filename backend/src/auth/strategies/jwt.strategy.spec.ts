import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy, JwtPayload } from './jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

// Spec: master spec Section 3.1 (Auth), Section 14 (Security)
// JWT strategy must verify user is verified and role matches token
describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prismaService: jest.Mocked<PrismaService>;

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
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-jwt-secret'),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    prismaService = module.get(PrismaService);
  });

  describe('validate', () => {
    it('should return user for valid payload with verified user', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const payload: JwtPayload = {
        sub: 'user-123',
        phone: '+919876543210',
        role: UserRole.PATIENT,
      };

      const result = await strategy.validate(payload);
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const payload: JwtPayload = {
        sub: 'non-existent',
        phone: '+919876543210',
        role: UserRole.PATIENT,
      };

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(payload)).rejects.toThrow('User not found');
    });

    it('should throw UnauthorizedException when user is not verified', async () => {
      // Spec: Section 14 (Security) — unverified accounts must not access protected resources
      const unverifiedUser = { ...mockUser, isVerified: false };
      prismaService.user.findUnique.mockResolvedValue(unverifiedUser);

      const payload: JwtPayload = {
        sub: 'user-123',
        phone: '+919876543210',
        role: UserRole.PATIENT,
      };

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(payload)).rejects.toThrow(
        'Account not verified',
      );
    });

    it('should throw UnauthorizedException when token role does not match user current role', async () => {
      // Spec: Section 14 (Security) — prevent privilege escalation via stale tokens
      const doctorUser = { ...mockUser, role: UserRole.DOCTOR };
      prismaService.user.findUnique.mockResolvedValue(doctorUser);

      const payload: JwtPayload = {
        sub: 'user-123',
        phone: '+919876543210',
        role: UserRole.PATIENT, // Token says PATIENT but user is now DOCTOR
      };

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(payload)).rejects.toThrow(
        'Token role mismatch',
      );
    });

    it('should accept token when role matches user current role', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const payload: JwtPayload = {
        sub: 'user-123',
        phone: '+919876543210',
        role: UserRole.PATIENT,
      };

      const result = await strategy.validate(payload);
      expect(result.role).toBe(UserRole.PATIENT);
    });
  });
});
