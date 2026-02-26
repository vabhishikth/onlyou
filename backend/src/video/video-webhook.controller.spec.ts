import { Test, TestingModule } from '@nestjs/testing';
import { VideoWebhookController } from './video-webhook.controller';
import { HmsService } from './hms.service';
import { BadRequestException } from '@nestjs/common';

// Spec: Phase 14 — TDD for 100ms webhook REST endpoint
// 100ms posts webhooks via HTTP POST with HMAC signature in headers

describe('VideoWebhookController', () => {
  let controller: VideoWebhookController;
  let hmsService: jest.Mocked<Partial<HmsService>>;

  beforeEach(async () => {
    hmsService = {
      verifyWebhookSignature: jest.fn(),
      handleWebhook: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VideoWebhookController],
      providers: [
        { provide: HmsService, useValue: hmsService },
      ],
    }).compile();

    controller = module.get<VideoWebhookController>(VideoWebhookController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /webhooks/hms', () => {
    const validPayload = {
      version: '2.0',
      id: 'event-123',
      timestamp: '2026-02-26T10:00:00Z',
      type: 'peer.join.success',
      data: {
        room_id: 'room-abc',
        peer_id: 'peer-123',
        role: 'patient',
        joined_at: '2026-02-26T10:00:00Z',
      },
    };

    it('should reject requests with missing signature header', async () => {
      await expect(
        controller.handleWebhook(JSON.stringify(validPayload), '', validPayload),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject requests with invalid HMAC signature', async () => {
      hmsService.verifyWebhookSignature!.mockReturnValue(false);

      await expect(
        controller.handleWebhook(
          JSON.stringify(validPayload),
          'invalid-sig',
          validPayload,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(hmsService.verifyWebhookSignature).toHaveBeenCalledWith(
        JSON.stringify(validPayload),
        'invalid-sig',
      );
    });

    it('should accept requests with valid HMAC signature and route to hmsService', async () => {
      hmsService.verifyWebhookSignature!.mockReturnValue(true);

      const result = await controller.handleWebhook(
        JSON.stringify(validPayload),
        'valid-sig',
        validPayload,
      );

      expect(result).toEqual({ success: true });
      expect(hmsService.handleWebhook).toHaveBeenCalledWith({
        payload: validPayload,
        webhookSignature: 'valid-sig',
      });
    });

    it('should handle peer.join event', async () => {
      hmsService.verifyWebhookSignature!.mockReturnValue(true);
      const payload = { ...validPayload, type: 'peer.join.success' };

      await controller.handleWebhook(
        JSON.stringify(payload),
        'valid-sig',
        payload,
      );

      expect(hmsService.handleWebhook).toHaveBeenCalled();
    });

    it('should handle peer.leave event', async () => {
      hmsService.verifyWebhookSignature!.mockReturnValue(true);
      const payload = { ...validPayload, type: 'peer.leave.success' };

      await controller.handleWebhook(
        JSON.stringify(payload),
        'valid-sig',
        payload,
      );

      expect(hmsService.handleWebhook).toHaveBeenCalled();
    });

    it('should handle session.close event', async () => {
      hmsService.verifyWebhookSignature!.mockReturnValue(true);
      const payload = { ...validPayload, type: 'session.close.success' };

      await controller.handleWebhook(
        JSON.stringify(payload),
        'valid-sig',
        payload,
      );

      expect(hmsService.handleWebhook).toHaveBeenCalled();
    });

    it('should handle recording.success event', async () => {
      hmsService.verifyWebhookSignature!.mockReturnValue(true);
      const payload = {
        ...validPayload,
        type: 'recording.success',
        data: { room_id: 'room-abc', recording_url: 'https://recordings.100ms.live/file.mp4' },
      };

      await controller.handleWebhook(
        JSON.stringify(payload),
        'valid-sig',
        payload,
      );

      expect(hmsService.handleWebhook).toHaveBeenCalled();
    });

    it('should handle unknown event types gracefully (no error)', async () => {
      hmsService.verifyWebhookSignature!.mockReturnValue(true);
      const payload = { ...validPayload, type: 'unknown.event.type' };

      const result = await controller.handleWebhook(
        JSON.stringify(payload),
        'valid-sig',
        payload,
      );

      expect(result).toEqual({ success: true });
    });

    it('should return 500-style error if hmsService.handleWebhook throws', async () => {
      hmsService.verifyWebhookSignature!.mockReturnValue(true);
      hmsService.handleWebhook!.mockRejectedValue(new Error('DB connection lost'));

      await expect(
        controller.handleWebhook(
          JSON.stringify(validPayload),
          'valid-sig',
          validPayload,
        ),
      ).rejects.toThrow('DB connection lost');
    });
  });
});
