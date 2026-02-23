import { Test, TestingModule } from '@nestjs/testing';
import { PushDeliveryService } from './push-delivery.service';
import { DeviceTokenService } from './device-token.service';

// Spec: Notification audit — Expo Push delivery via expo-server-sdk

var mockSend = jest.fn();
var mockChunk = jest.fn();

jest.mock('expo-server-sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      sendPushNotificationsAsync: mockSend,
      chunkPushNotifications: mockChunk,
    })),
  };
});

describe('PushDeliveryService', () => {
  let service: PushDeliveryService;
  let mockDeviceTokenService: any;

  beforeEach(async () => {
    mockSend.mockReset();
    mockChunk.mockReset();

    mockDeviceTokenService = {
      getActiveTokens: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushDeliveryService,
        { provide: DeviceTokenService, useValue: mockDeviceTokenService },
      ],
    }).compile();

    service = module.get<PushDeliveryService>(PushDeliveryService);
  });

  describe('sendPush', () => {
    it('should send push notification to all active device tokens', async () => {
      const tokens = [
        { id: 't1', userId: 'user-1', token: 'ExponentPushToken[abc123]', platform: 'android', isActive: true },
        { id: 't2', userId: 'user-1', token: 'ExponentPushToken[def456]', platform: 'ios', isActive: true },
      ];

      mockDeviceTokenService.getActiveTokens.mockResolvedValue(tokens);
      mockChunk.mockReturnValue([[
        { to: 'ExponentPushToken[abc123]', title: 'Test', body: 'Hello', data: {} },
        { to: 'ExponentPushToken[def456]', title: 'Test', body: 'Hello', data: {} },
      ]]);
      mockSend.mockResolvedValue([
        { status: 'ok', id: 'receipt-1' },
        { status: 'ok', id: 'receipt-2' },
      ]);

      const result = await service.sendPush('user-1', 'Test', 'Hello', {});

      expect(mockDeviceTokenService.getActiveTokens).toHaveBeenCalledWith('user-1');
      expect(mockSend).toHaveBeenCalled();
      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should skip invalid expo push tokens', async () => {
      const tokens = [
        { id: 't1', userId: 'user-1', token: 'invalid-token', platform: 'android', isActive: true },
        { id: 't2', userId: 'user-1', token: 'ExponentPushToken[abc123]', platform: 'ios', isActive: true },
      ];

      mockDeviceTokenService.getActiveTokens.mockResolvedValue(tokens);
      mockChunk.mockReturnValue([[
        { to: 'ExponentPushToken[abc123]', title: 'Test', body: 'Hello', data: {} },
      ]]);
      mockSend.mockResolvedValue([{ status: 'ok', id: 'receipt-1' }]);

      const result = await service.sendPush('user-1', 'Test', 'Hello', {});

      expect(result.sent).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it('should return gracefully when user has no active tokens', async () => {
      mockDeviceTokenService.getActiveTokens.mockResolvedValue([]);

      const result = await service.sendPush('user-1', 'Test', 'Hello', {});

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(0);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should handle Expo API errors gracefully', async () => {
      const tokens = [
        { id: 't1', userId: 'user-1', token: 'ExponentPushToken[abc123]', platform: 'android', isActive: true },
      ];

      mockDeviceTokenService.getActiveTokens.mockResolvedValue(tokens);
      mockChunk.mockReturnValue([[
        { to: 'ExponentPushToken[abc123]', title: 'Test', body: 'Hello', data: {} },
      ]]);
      mockSend.mockRejectedValue(new Error('Expo API unavailable'));

      const result = await service.sendPush('user-1', 'Test', 'Hello', {});

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Expo API unavailable');
    });

    it('should handle individual ticket errors', async () => {
      const tokens = [
        { id: 't1', userId: 'user-1', token: 'ExponentPushToken[abc123]', platform: 'android', isActive: true },
        { id: 't2', userId: 'user-1', token: 'ExponentPushToken[def456]', platform: 'ios', isActive: true },
      ];

      mockDeviceTokenService.getActiveTokens.mockResolvedValue(tokens);
      mockChunk.mockReturnValue([[
        { to: 'ExponentPushToken[abc123]', title: 'Test', body: 'Hello', data: {} },
        { to: 'ExponentPushToken[def456]', title: 'Test', body: 'Hello', data: {} },
      ]]);
      mockSend.mockResolvedValue([
        { status: 'ok', id: 'receipt-1' },
        { status: 'error', message: 'DeviceNotRegistered', details: { error: 'DeviceNotRegistered' } },
      ]);

      const result = await service.sendPush('user-1', 'Test', 'Hello', {});

      expect(result.sent).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('should pass sound and priority options', async () => {
      const tokens = [
        { id: 't1', userId: 'user-1', token: 'ExponentPushToken[abc123]', platform: 'android', isActive: true },
      ];

      mockDeviceTokenService.getActiveTokens.mockResolvedValue(tokens);
      mockChunk.mockImplementation((msgs) => [msgs]);
      mockSend.mockResolvedValue([{ status: 'ok', id: 'receipt-1' }]);

      await service.sendPush('user-1', 'Urgent', 'Critical alert', { screen: 'lab-results' });

      const passedMessages = mockChunk.mock.calls[0][0];
      expect(passedMessages[0]).toMatchObject({
        to: 'ExponentPushToken[abc123]',
        title: 'Urgent',
        body: 'Critical alert',
        sound: 'default',
        priority: 'high',
        data: { screen: 'lab-results' },
      });
    });
  });
});
