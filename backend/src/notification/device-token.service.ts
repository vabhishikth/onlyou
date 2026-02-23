import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Spec: Notification audit — DeviceToken storage for push delivery (FCM/Expo)

@Injectable()
export class DeviceTokenService {
  private readonly logger = new Logger(DeviceTokenService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Register or reactivate a device token for a user.
   * Upserts on (userId, token) unique constraint.
   */
  async registerToken(userId: string, token: string, platform: string) {
    const deviceToken = await this.prisma.deviceToken.upsert({
      where: {
        userId_token: { userId, token },
      },
      create: {
        userId,
        token,
        platform,
        isActive: true,
      },
      update: {
        isActive: true,
        platform,
      },
    });

    this.logger.log(`Device token registered for user ${userId} (${platform})`);
    return deviceToken;
  }

  /**
   * Deactivate a specific device token (e.g., on logout).
   */
  async removeToken(userId: string, token: string) {
    return this.prisma.deviceToken.updateMany({
      where: { userId, token },
      data: { isActive: false },
    });
  }

  /**
   * Get all active device tokens for a user (for sending push notifications).
   */
  async getActiveTokens(userId: string) {
    return this.prisma.deviceToken.findMany({
      where: { userId, isActive: true },
    });
  }

  /**
   * Deactivate all tokens for a user (e.g., on account deletion or full logout).
   */
  async deactivateAllTokens(userId: string) {
    return this.prisma.deviceToken.updateMany({
      where: { userId },
      data: { isActive: false },
    });
  }
}
