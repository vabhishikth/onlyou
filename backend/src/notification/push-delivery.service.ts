import { Injectable, Logger } from '@nestjs/common';
import Expo from 'expo-server-sdk';
import { DeviceTokenService } from './device-token.service';

// Spec: Notification audit — Expo Push delivery
// Uses Expo's push service as middleman for FCM (Android) + APNs (iOS)

export interface PushResult {
  sent: number;
  failed: number;
  skipped: number;
  errors: string[];
}

@Injectable()
export class PushDeliveryService {
  private readonly logger = new Logger(PushDeliveryService.name);
  private readonly expo: Expo;

  constructor(private readonly deviceTokenService: DeviceTokenService) {
    this.expo = new Expo();
  }

  /**
   * Send a push notification to all active devices for a user.
   * Gracefully handles: no tokens, invalid tokens, Expo API errors.
   */
  async sendPush(
    userId: string,
    title: string,
    body: string,
    data: Record<string, any>,
  ): Promise<PushResult> {
    const result: PushResult = { sent: 0, failed: 0, skipped: 0, errors: [] };

    // Get all active device tokens for the user
    const tokens = await this.deviceTokenService.getActiveTokens(userId);

    if (tokens.length === 0) {
      this.logger.debug(`No active tokens for user ${userId}, skipping push`);
      return result;
    }

    // Build messages, filtering out invalid tokens
    const messages = [];
    for (const deviceToken of tokens) {
      if (!this.isValidExpoPushToken(deviceToken.token)) {
        this.logger.warn(`Invalid Expo push token: ${deviceToken.token}`);
        result.skipped++;
        continue;
      }

      messages.push({
        to: deviceToken.token,
        title,
        body,
        sound: 'default' as const,
        priority: 'high' as const,
        data,
      });
    }

    if (messages.length === 0) {
      return result;
    }

    // Chunk and send
    const chunks = this.expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);

        for (const ticket of tickets) {
          if (ticket.status === 'ok') {
            result.sent++;
          } else {
            result.failed++;
            if ('message' in ticket) {
              result.errors.push(ticket.message);
            }
          }
        }
      } catch (error) {
        result.failed += chunk.length;
        result.errors.push(error.message);
        this.logger.error(`Expo push failed: ${error.message}`);
      }
    }

    this.logger.debug(
      `Push delivery for ${userId}: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped`,
    );

    return result;
  }

  /**
   * Validate Expo push token format.
   * Tokens are: ExponentPushToken[...] or ExpoPushToken[...]
   */
  private isValidExpoPushToken(token: string): boolean {
    return /^Expo(nent)?PushToken\[.+\]$/.test(token);
  }
}
