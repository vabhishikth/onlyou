import { Test, TestingModule } from '@nestjs/testing';
import { DeviceTokenService } from './device-token.service';
import { PrismaService } from '../prisma/prisma.service';

// Spec: Notification audit — DeviceToken CRUD for push delivery

describe('DeviceTokenService', () => {
  let service: DeviceTokenService;
  let prisma: any;

  const mockPrisma = {
    deviceToken: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceTokenService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DeviceTokenService>(DeviceTokenService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('registerToken', () => {
    it('should upsert a device token for a user', async () => {
      const mockToken = {
        id: 'dt-1',
        userId: 'user-1',
        token: 'expo-push-token-abc',
        platform: 'android',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.deviceToken.upsert.mockResolvedValue(mockToken);

      const result = await service.registerToken('user-1', 'expo-push-token-abc', 'android');

      expect(prisma.deviceToken.upsert).toHaveBeenCalledWith({
        where: {
          userId_token: { userId: 'user-1', token: 'expo-push-token-abc' },
        },
        create: {
          userId: 'user-1',
          token: 'expo-push-token-abc',
          platform: 'android',
          isActive: true,
        },
        update: {
          isActive: true,
          platform: 'android',
        },
      });

      expect(result).toEqual(mockToken);
    });

    it('should reactivate an existing deactivated token', async () => {
      const mockToken = {
        id: 'dt-1',
        userId: 'user-1',
        token: 'expo-push-token-abc',
        platform: 'ios',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.deviceToken.upsert.mockResolvedValue(mockToken);

      const result = await service.registerToken('user-1', 'expo-push-token-abc', 'ios');

      expect(result.isActive).toBe(true);
    });
  });

  describe('removeToken', () => {
    it('should deactivate a specific device token', async () => {
      prisma.deviceToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.removeToken('user-1', 'expo-push-token-abc');

      expect(prisma.deviceToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', token: 'expo-push-token-abc' },
        data: { isActive: false },
      });

      expect(result).toEqual({ count: 1 });
    });
  });

  describe('getActiveTokens', () => {
    it('should return all active tokens for a user', async () => {
      const mockTokens = [
        { id: 'dt-1', userId: 'user-1', token: 'token-1', platform: 'android', isActive: true },
        { id: 'dt-2', userId: 'user-1', token: 'token-2', platform: 'web', isActive: true },
      ];

      prisma.deviceToken.findMany.mockResolvedValue(mockTokens);

      const result = await service.getActiveTokens('user-1');

      expect(prisma.deviceToken.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isActive: true },
      });

      expect(result).toHaveLength(2);
    });
  });

  describe('deactivateAllTokens', () => {
    it('should deactivate all tokens for a user', async () => {
      prisma.deviceToken.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.deactivateAllTokens('user-1');

      expect(prisma.deviceToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { isActive: false },
      });

      expect(result).toEqual({ count: 3 });
    });
  });
});
