import { Test, TestingModule } from '@nestjs/testing';
import { NotificationPreferenceService } from './notification-preference.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

// Spec: master spec Section 11 — Patient Notification Preferences

describe('NotificationPreferenceService', () => {
  let service: NotificationPreferenceService;
  let mockPrismaService: any;

  const mockPreference = {
    id: 'pref-1',
    userId: 'user-1',
    pushEnabled: true,
    whatsappEnabled: true,
    smsEnabled: true,
    emailEnabled: true,
    discreetMode: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockPrismaService = {
      notificationPreference: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationPreferenceService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<NotificationPreferenceService>(
      NotificationPreferenceService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // GET PREFERENCES
  // ============================================

  describe('getPreferences', () => {
    it('should return user preferences if they exist', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);

      const result = await service.getPreferences('user-1');

      expect(result).toEqual(mockPreference);
      expect(mockPrismaService.notificationPreference.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('should create default preferences if none exist', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationPreference.create.mockResolvedValue({
        ...mockPreference,
        id: 'new-pref',
      });

      const result = await service.getPreferences('user-1');

      expect(result.pushEnabled).toBe(true);
      expect(result.whatsappEnabled).toBe(true);
      expect(result.smsEnabled).toBe(true);
      expect(result.emailEnabled).toBe(true);
      expect(result.discreetMode).toBe(false);
    });

    // Spec: Default: all channels ON
    it('should have all channels enabled by default', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationPreference.create.mockImplementation((args) => {
        return Promise.resolve({
          id: 'new-pref',
          userId: args.data.userId,
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      const result = await service.getPreferences('user-1');

      expect(result.pushEnabled).toBe(true);
      expect(result.whatsappEnabled).toBe(true);
      expect(result.smsEnabled).toBe(true);
      expect(result.emailEnabled).toBe(true);
    });
  });

  // ============================================
  // UPDATE PREFERENCES
  // ============================================

  describe('updatePreferences', () => {
    it('should update push preference', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
      mockPrismaService.notificationPreference.update.mockResolvedValue({
        ...mockPreference,
        pushEnabled: false,
      });

      const result = await service.updatePreferences('user-1', {
        pushEnabled: false,
      });

      expect(result.pushEnabled).toBe(false);
    });

    it('should update whatsapp preference', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
      mockPrismaService.notificationPreference.update.mockResolvedValue({
        ...mockPreference,
        whatsappEnabled: false,
      });

      const result = await service.updatePreferences('user-1', {
        whatsappEnabled: false,
      });

      expect(result.whatsappEnabled).toBe(false);
    });

    it('should update sms preference', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
      mockPrismaService.notificationPreference.update.mockResolvedValue({
        ...mockPreference,
        smsEnabled: false,
      });

      const result = await service.updatePreferences('user-1', {
        smsEnabled: false,
      });

      expect(result.smsEnabled).toBe(false);
    });

    it('should update email preference', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
      mockPrismaService.notificationPreference.update.mockResolvedValue({
        ...mockPreference,
        emailEnabled: false,
      });

      const result = await service.updatePreferences('user-1', {
        emailEnabled: false,
      });

      expect(result.emailEnabled).toBe(false);
    });

    it('should update multiple preferences at once', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
      mockPrismaService.notificationPreference.update.mockResolvedValue({
        ...mockPreference,
        pushEnabled: false,
        smsEnabled: false,
        whatsappEnabled: true,
        emailEnabled: true,
      });

      const result = await service.updatePreferences('user-1', {
        pushEnabled: false,
        smsEnabled: false,
      });

      expect(result.pushEnabled).toBe(false);
      expect(result.smsEnabled).toBe(false);
      expect(result.whatsappEnabled).toBe(true);
      expect(result.emailEnabled).toBe(true);
    });

    it('should create preferences if they do not exist', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationPreference.upsert.mockResolvedValue({
        ...mockPreference,
        pushEnabled: false,
      });

      const result = await service.updatePreferences('user-1', {
        pushEnabled: false,
      });

      expect(result.pushEnabled).toBe(false);
    });
  });

  // ============================================
  // DISCREET MODE
  // ============================================

  describe('Discreet Mode', () => {
    // Spec: Sensitive mode — notifications show "Onlyou: You have an update"
    it('should enable discreet mode', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
      mockPrismaService.notificationPreference.update.mockResolvedValue({
        ...mockPreference,
        discreetMode: true,
      });

      const result = await service.updatePreferences('user-1', {
        discreetMode: true,
      });

      expect(result.discreetMode).toBe(true);
    });

    it('should disable discreet mode', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue({
        ...mockPreference,
        discreetMode: true,
      });
      mockPrismaService.notificationPreference.update.mockResolvedValue({
        ...mockPreference,
        discreetMode: false,
      });

      const result = await service.updatePreferences('user-1', {
        discreetMode: false,
      });

      expect(result.discreetMode).toBe(false);
    });

    it('should have discreet mode off by default', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationPreference.create.mockImplementation((args) => {
        return Promise.resolve({
          id: 'new-pref',
          userId: args.data.userId,
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      const result = await service.getPreferences('user-1');

      expect(result.discreetMode).toBe(false);
    });
  });

  // ============================================
  // TOGGLE CHANNEL METHODS
  // ============================================

  describe('togglePush', () => {
    it('should toggle push off', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
      mockPrismaService.notificationPreference.update.mockResolvedValue({
        ...mockPreference,
        pushEnabled: false,
      });

      const result = await service.togglePush('user-1', false);

      expect(result.pushEnabled).toBe(false);
    });

    it('should toggle push on', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue({
        ...mockPreference,
        pushEnabled: false,
      });
      mockPrismaService.notificationPreference.update.mockResolvedValue({
        ...mockPreference,
        pushEnabled: true,
      });

      const result = await service.togglePush('user-1', true);

      expect(result.pushEnabled).toBe(true);
    });
  });

  describe('toggleWhatsApp', () => {
    it('should toggle whatsapp off', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
      mockPrismaService.notificationPreference.update.mockResolvedValue({
        ...mockPreference,
        whatsappEnabled: false,
      });

      const result = await service.toggleWhatsApp('user-1', false);

      expect(result.whatsappEnabled).toBe(false);
    });

    it('should toggle whatsapp on', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue({
        ...mockPreference,
        whatsappEnabled: false,
      });
      mockPrismaService.notificationPreference.update.mockResolvedValue({
        ...mockPreference,
        whatsappEnabled: true,
      });

      const result = await service.toggleWhatsApp('user-1', true);

      expect(result.whatsappEnabled).toBe(true);
    });
  });

  describe('toggleSMS', () => {
    it('should toggle sms off', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
      mockPrismaService.notificationPreference.update.mockResolvedValue({
        ...mockPreference,
        smsEnabled: false,
      });

      const result = await service.toggleSMS('user-1', false);

      expect(result.smsEnabled).toBe(false);
    });

    it('should toggle sms on', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue({
        ...mockPreference,
        smsEnabled: false,
      });
      mockPrismaService.notificationPreference.update.mockResolvedValue({
        ...mockPreference,
        smsEnabled: true,
      });

      const result = await service.toggleSMS('user-1', true);

      expect(result.smsEnabled).toBe(true);
    });
  });

  describe('toggleEmail', () => {
    it('should toggle email off', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
      mockPrismaService.notificationPreference.update.mockResolvedValue({
        ...mockPreference,
        emailEnabled: false,
      });

      const result = await service.toggleEmail('user-1', false);

      expect(result.emailEnabled).toBe(false);
    });

    it('should toggle email on', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue({
        ...mockPreference,
        emailEnabled: false,
      });
      mockPrismaService.notificationPreference.update.mockResolvedValue({
        ...mockPreference,
        emailEnabled: true,
      });

      const result = await service.toggleEmail('user-1', true);

      expect(result.emailEnabled).toBe(true);
    });
  });

  describe('toggleDiscreetMode', () => {
    it('should toggle discreet mode on', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
      mockPrismaService.notificationPreference.update.mockResolvedValue({
        ...mockPreference,
        discreetMode: true,
      });

      const result = await service.toggleDiscreetMode('user-1', true);

      expect(result.discreetMode).toBe(true);
    });

    it('should toggle discreet mode off', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue({
        ...mockPreference,
        discreetMode: true,
      });
      mockPrismaService.notificationPreference.update.mockResolvedValue({
        ...mockPreference,
        discreetMode: false,
      });

      const result = await service.toggleDiscreetMode('user-1', false);

      expect(result.discreetMode).toBe(false);
    });
  });

  // ============================================
  // CHANNEL STATUS CHECKS
  // ============================================

  describe('isChannelEnabled', () => {
    it('should return true for enabled push', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);

      const result = await service.isChannelEnabled('user-1', 'PUSH');

      expect(result).toBe(true);
    });

    it('should return false for disabled push', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue({
        ...mockPreference,
        pushEnabled: false,
      });

      const result = await service.isChannelEnabled('user-1', 'PUSH');

      expect(result).toBe(false);
    });

    it('should return true for enabled whatsapp', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);

      const result = await service.isChannelEnabled('user-1', 'WHATSAPP');

      expect(result).toBe(true);
    });

    it('should return true for enabled sms', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);

      const result = await service.isChannelEnabled('user-1', 'SMS');

      expect(result).toBe(true);
    });

    it('should return true for enabled email', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);

      const result = await service.isChannelEnabled('user-1', 'EMAIL');

      expect(result).toBe(true);
    });

    it('should always return true for IN_APP', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);

      const result = await service.isChannelEnabled('user-1', 'IN_APP');

      expect(result).toBe(true);
    });

    it('should return true by default if no preferences set', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);

      const result = await service.isChannelEnabled('user-1', 'PUSH');

      expect(result).toBe(true);
    });
  });

  // ============================================
  // CRITICAL ALERTS
  // ============================================

  describe('Critical Alerts', () => {
    // Spec: Push cannot be disabled for critical alerts
    it('should identify critical event types', () => {
      expect(service.isCriticalEventType('LAB_CRITICAL_VALUES')).toBe(true);
      expect(service.isCriticalEventType('LAB_SAMPLE_ISSUE')).toBe(true);
      expect(service.isCriticalEventType('LAB_COLLECTION_FAILED')).toBe(true);
      expect(service.isCriticalEventType('DELIVERY_PHARMACY_ISSUE')).toBe(true);
      expect(service.isCriticalEventType('DELIVERY_FAILED')).toBe(true);
    });

    it('should identify non-critical event types', () => {
      expect(service.isCriticalEventType('LAB_TESTS_ORDERED')).toBe(false);
      expect(service.isCriticalEventType('LAB_SLOT_BOOKED')).toBe(false);
      expect(service.isCriticalEventType('DELIVERY_DELIVERED')).toBe(false);
    });

    it('should allow push for critical alerts even when disabled', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue({
        ...mockPreference,
        pushEnabled: false, // User disabled push
      });

      const shouldSend = await service.shouldSendNotification(
        'user-1',
        'PUSH',
        'LAB_CRITICAL_VALUES',
      );

      expect(shouldSend).toBe(true);
    });

    it('should block non-critical push when disabled', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue({
        ...mockPreference,
        pushEnabled: false,
      });

      const shouldSend = await service.shouldSendNotification(
        'user-1',
        'PUSH',
        'LAB_TESTS_ORDERED',
      );

      expect(shouldSend).toBe(false);
    });
  });

  // ============================================
  // GET ENABLED CHANNELS
  // ============================================

  describe('getEnabledChannels', () => {
    it('should return all enabled channels', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);

      const channels = await service.getEnabledChannels('user-1');

      expect(channels).toContain('PUSH');
      expect(channels).toContain('WHATSAPP');
      expect(channels).toContain('SMS');
      expect(channels).toContain('EMAIL');
      expect(channels).toContain('IN_APP');
    });

    it('should exclude disabled channels', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue({
        ...mockPreference,
        pushEnabled: false,
        smsEnabled: false,
      });

      const channels = await service.getEnabledChannels('user-1');

      expect(channels).not.toContain('PUSH');
      expect(channels).not.toContain('SMS');
      expect(channels).toContain('WHATSAPP');
      expect(channels).toContain('EMAIL');
      expect(channels).toContain('IN_APP');
    });

    it('should return all channels by default if no preferences', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);

      const channels = await service.getEnabledChannels('user-1');

      expect(channels).toHaveLength(5);
    });
  });

  // ============================================
  // RESET TO DEFAULTS
  // ============================================

  describe('resetToDefaults', () => {
    it('should reset all preferences to defaults', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue({
        ...mockPreference,
        pushEnabled: false,
        whatsappEnabled: false,
        smsEnabled: false,
        emailEnabled: false,
        discreetMode: true,
      });
      mockPrismaService.notificationPreference.update.mockResolvedValue({
        ...mockPreference,
        pushEnabled: true,
        whatsappEnabled: true,
        smsEnabled: true,
        emailEnabled: true,
        discreetMode: false,
      });

      const result = await service.resetToDefaults('user-1');

      expect(result.pushEnabled).toBe(true);
      expect(result.whatsappEnabled).toBe(true);
      expect(result.smsEnabled).toBe(true);
      expect(result.emailEnabled).toBe(true);
      expect(result.discreetMode).toBe(false);
    });

    it('should create default preferences if none exist', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationPreference.create.mockResolvedValue(mockPreference);

      const result = await service.resetToDefaults('user-1');

      expect(result.pushEnabled).toBe(true);
      expect(result.whatsappEnabled).toBe(true);
      expect(result.smsEnabled).toBe(true);
      expect(result.emailEnabled).toBe(true);
      expect(result.discreetMode).toBe(false);
    });
  });
});
