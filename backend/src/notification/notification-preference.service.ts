import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Spec: master spec Section 11 — Patient Notification Preferences

// Critical event types that cannot be disabled for push
const CRITICAL_EVENT_TYPES = [
  'LAB_CRITICAL_VALUES',
  'LAB_SAMPLE_ISSUE',
  'LAB_COLLECTION_FAILED',
  'DELIVERY_PHARMACY_ISSUE',
  'DELIVERY_FAILED',
];

// All available channels
const ALL_CHANNELS = ['PUSH', 'WHATSAPP', 'SMS', 'EMAIL', 'IN_APP'];

export interface UpdatePreferencesDto {
  pushEnabled?: boolean;
  whatsappEnabled?: boolean;
  smsEnabled?: boolean;
  emailEnabled?: boolean;
  discreetMode?: boolean;
}

@Injectable()
export class NotificationPreferenceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get user's notification preferences
   * Creates default preferences if none exist
   * Spec: Default: all channels ON
   */
  async getPreferences(userId: string): Promise<any> {
    let preference = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    // Create default preferences if none exist
    if (!preference) {
      preference = await this.prisma.notificationPreference.create({
        data: {
          userId,
          pushEnabled: true,
          whatsappEnabled: true,
          smsEnabled: true,
          emailEnabled: true,
          discreetMode: false,
        },
      });
    }

    return preference;
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    userId: string,
    updates: UpdatePreferencesDto,
  ): Promise<any> {
    const existing = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (existing) {
      return this.prisma.notificationPreference.update({
        where: { userId },
        data: updates,
      });
    }

    // Create with updates if no existing preferences
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        pushEnabled: updates.pushEnabled ?? true,
        whatsappEnabled: updates.whatsappEnabled ?? true,
        smsEnabled: updates.smsEnabled ?? true,
        emailEnabled: updates.emailEnabled ?? true,
        discreetMode: updates.discreetMode ?? false,
      },
      update: updates,
    });
  }

  /**
   * Toggle push notifications
   */
  async togglePush(userId: string, enabled: boolean): Promise<any> {
    return this.updatePreferences(userId, { pushEnabled: enabled });
  }

  /**
   * Toggle WhatsApp notifications
   */
  async toggleWhatsApp(userId: string, enabled: boolean): Promise<any> {
    return this.updatePreferences(userId, { whatsappEnabled: enabled });
  }

  /**
   * Toggle SMS notifications
   */
  async toggleSMS(userId: string, enabled: boolean): Promise<any> {
    return this.updatePreferences(userId, { smsEnabled: enabled });
  }

  /**
   * Toggle email notifications
   */
  async toggleEmail(userId: string, enabled: boolean): Promise<any> {
    return this.updatePreferences(userId, { emailEnabled: enabled });
  }

  /**
   * Toggle discreet mode
   * Spec: Sensitive mode — notifications show "Onlyou: You have an update"
   */
  async toggleDiscreetMode(userId: string, enabled: boolean): Promise<any> {
    return this.updatePreferences(userId, { discreetMode: enabled });
  }

  /**
   * Check if a specific channel is enabled for a user
   */
  async isChannelEnabled(userId: string, channel: string): Promise<boolean> {
    // IN_APP is always enabled
    if (channel === 'IN_APP') {
      return true;
    }

    const preference = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    // Default: all channels enabled
    if (!preference) {
      return true;
    }

    switch (channel) {
      case 'PUSH':
        return preference.pushEnabled;
      case 'WHATSAPP':
        return preference.whatsappEnabled;
      case 'SMS':
        return preference.smsEnabled;
      case 'EMAIL':
        return preference.emailEnabled;
      default:
        return true;
    }
  }

  /**
   * Check if an event type is critical
   * Spec: Push cannot be disabled for critical alerts
   */
  isCriticalEventType(eventType: string): boolean {
    return CRITICAL_EVENT_TYPES.includes(eventType);
  }

  /**
   * Determine if a notification should be sent based on preferences and event type
   * Spec: Push cannot be disabled for critical alerts
   */
  async shouldSendNotification(
    userId: string,
    channel: string,
    eventType: string,
  ): Promise<boolean> {
    // Critical alerts always bypass preferences for PUSH
    if (channel === 'PUSH' && this.isCriticalEventType(eventType)) {
      return true;
    }

    return this.isChannelEnabled(userId, channel);
  }

  /**
   * Get all enabled channels for a user
   */
  async getEnabledChannels(userId: string): Promise<string[]> {
    const preference = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    // Default: all channels enabled
    if (!preference) {
      return ALL_CHANNELS;
    }

    const enabled: string[] = [];

    if (preference.pushEnabled) enabled.push('PUSH');
    if (preference.whatsappEnabled) enabled.push('WHATSAPP');
    if (preference.smsEnabled) enabled.push('SMS');
    if (preference.emailEnabled) enabled.push('EMAIL');

    // IN_APP is always enabled
    enabled.push('IN_APP');

    return enabled;
  }

  /**
   * Reset all preferences to defaults
   * Spec: Default: all channels ON, discreet mode OFF
   */
  async resetToDefaults(userId: string): Promise<any> {
    const existing = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (existing) {
      return this.prisma.notificationPreference.update({
        where: { userId },
        data: {
          pushEnabled: true,
          whatsappEnabled: true,
          smsEnabled: true,
          emailEnabled: true,
          discreetMode: false,
        },
      });
    }

    return this.prisma.notificationPreference.create({
      data: {
        userId,
        pushEnabled: true,
        whatsappEnabled: true,
        smsEnabled: true,
        emailEnabled: true,
        discreetMode: false,
      },
    });
  }
}
