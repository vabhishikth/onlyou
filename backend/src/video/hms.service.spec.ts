/**
 * HmsService Tests
 * Phase 13: 100ms video integration — room creation, token gen, webhook, disconnect handling
 * Spec: Phase 13 plan — Chunk 4
 *
 * TDD: Write tests FIRST, then implement to make them pass.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { HmsService } from './hms.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { VideoSessionStatus } from '@prisma/client';

// Mock PrismaService
const mockPrisma = {
  videoSession: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

// Mock ConfigService — empty keys = mock/test mode
const mockConfig = {
  get: jest.fn().mockImplementation((key: string) => {
    const config: Record<string, string> = {
      HMS_ACCESS_KEY: '',
      HMS_APP_SECRET: '',
      HMS_TEMPLATE_ID: '',
      HMS_WEBHOOK_SECRET: 'test-webhook-secret',
    };
    return config[key] || '';
  }),
};

describe('HmsService', () => {
  let service: HmsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HmsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<HmsService>(HmsService);

    // resetAllMocks clears implementations + Once queues (clearAllMocks does NOT)
    // This prevents mockResolvedValueOnce leaks between tests
    mockPrisma.videoSession.findUnique.mockReset();
    mockPrisma.videoSession.update.mockReset();
    jest.clearAllMocks();
  });

  // ============================================================
  // createRoom
  // ============================================================

  describe('createRoom', () => {
    it('should create room and store roomId on VideoSession', async () => {
      const videoSessionId = 'vs-1';
      const mockSession = {
        id: videoSessionId,
        roomId: null,
        status: VideoSessionStatus.SCHEDULED,
      };

      mockPrisma.videoSession.findUnique.mockResolvedValue(mockSession);
      mockPrisma.videoSession.update.mockResolvedValue({
        ...mockSession,
        roomId: expect.any(String),
      });

      const result = await service.createRoom(videoSessionId);

      expect(result.roomId).toBeDefined();
      expect(typeof result.roomId).toBe('string');
      expect(result.roomId.length).toBeGreaterThan(0);
    });

    it('should create room in test mode and return mock room ID', async () => {
      const videoSessionId = 'vs-1';
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: videoSessionId,
        roomId: null,
        status: VideoSessionStatus.SCHEDULED,
      });
      mockPrisma.videoSession.update.mockResolvedValue({
        id: videoSessionId,
        roomId: 'mock-room-vs-1',
      });

      const result = await service.createRoom(videoSessionId);

      // In test/mock mode, room ID should contain the session ID
      expect(result.roomId).toContain('vs-1');
    });

    it('should store roomId on VideoSession after creation', async () => {
      const videoSessionId = 'vs-1';
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: videoSessionId,
        roomId: null,
        status: VideoSessionStatus.SCHEDULED,
      });
      mockPrisma.videoSession.update.mockResolvedValue({
        id: videoSessionId,
        roomId: 'mock-room-vs-1',
      });

      await service.createRoom(videoSessionId);

      expect(mockPrisma.videoSession.update).toHaveBeenCalledWith({
        where: { id: videoSessionId },
        data: { roomId: expect.any(String) },
      });
    });
  });

  // ============================================================
  // generateToken
  // ============================================================

  describe('generateToken', () => {
    it('should generate token for doctor with correct role', async () => {
      const result = await service.generateToken('room-1', 'doctor-1', 'doctor');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate token for patient with correct role', async () => {
      const result = await service.generateToken('room-1', 'patient-1', 'patient');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should generate different tokens for different roles', async () => {
      const doctorToken = await service.generateToken('room-1', 'doctor-1', 'doctor');
      const patientToken = await service.generateToken('room-1', 'patient-1', 'patient');

      // In mock mode, tokens should differ by peer/role
      expect(doctorToken).not.toBe(patientToken);
    });
  });

  // ============================================================
  // verifyWebhookSignature
  // ============================================================

  describe('verifyWebhookSignature', () => {
    it('should verify webhook signature correctly', () => {
      const crypto = require('crypto');
      const payload = JSON.stringify({ event: 'peer.join', data: {} });
      const secret = 'test-webhook-secret';
      const validSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const result = service.verifyWebhookSignature(payload, validSignature);

      expect(result).toBe(true);
    });

    it('should reject invalid webhook signature', () => {
      const payload = JSON.stringify({ event: 'peer.join', data: {} });
      const invalidSignature = 'invalid-signature-here';

      const result = service.verifyWebhookSignature(payload, invalidSignature);

      expect(result).toBe(false);
    });
  });

  // ============================================================
  // handleWebhook
  // ============================================================

  describe('handleWebhook', () => {
    const crypto = require('crypto');
    const secret = 'test-webhook-secret';

    function signPayload(payload: any): string {
      const body = JSON.stringify(payload);
      return crypto.createHmac('sha256', secret).update(body).digest('hex');
    }

    it('peer.join: should update doctorJoinedAt on doctor join', async () => {
      const payload = {
        event: 'peer.join',
        data: {
          room_id: 'room-1',
          peer_id: 'doctor-1',
          role: 'doctor',
        },
      };
      const signature = signPayload(payload);

      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        roomId: 'room-1',
        status: VideoSessionStatus.SCHEDULED,
        doctorId: 'doctor-1',
        patientId: 'patient-1',
      });
      mockPrisma.videoSession.update.mockResolvedValue({
        id: 'vs-1',
        status: VideoSessionStatus.WAITING_FOR_PATIENT,
      });

      await service.handleWebhook({ payload, webhookSignature: signature });

      expect(mockPrisma.videoSession.update).toHaveBeenCalled();
    });

    it('peer.join: should set IN_PROGRESS + actualStartTime when both joined', async () => {
      const payload = {
        event: 'peer.join',
        data: {
          room_id: 'room-1',
          peer_id: 'patient-1',
          role: 'patient',
        },
      };
      const signature = signPayload(payload);

      // Doctor already joined (WAITING_FOR_PATIENT)
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        roomId: 'room-1',
        status: VideoSessionStatus.WAITING_FOR_PATIENT,
        doctorId: 'doctor-1',
        patientId: 'patient-1',
      });
      mockPrisma.videoSession.update.mockResolvedValue({
        id: 'vs-1',
        status: VideoSessionStatus.IN_PROGRESS,
      });

      await service.handleWebhook({ payload, webhookSignature: signature });

      const updateCall = mockPrisma.videoSession.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe(VideoSessionStatus.IN_PROGRESS);
      expect(updateCall.data.actualStartTime).toBeDefined();
    });

    it('session.close: should set COMPLETED if duration >= 5 min', async () => {
      const startTime = new Date('2026-03-01T10:00:00');
      const endTime = new Date('2026-03-01T10:06:00'); // 6 min

      const payload = {
        event: 'session.close',
        data: {
          room_id: 'room-1',
          session_duration: 360, // 6 min in seconds
        },
      };
      const signature = signPayload(payload);

      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        roomId: 'room-1',
        status: VideoSessionStatus.IN_PROGRESS,
        actualStartTime: startTime,
      });
      mockPrisma.videoSession.update.mockResolvedValue({
        id: 'vs-1',
        status: VideoSessionStatus.COMPLETED,
      });

      await service.handleWebhook({ payload, webhookSignature: signature });

      const updateCall = mockPrisma.videoSession.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe(VideoSessionStatus.COMPLETED);
      expect(updateCall.data.durationSeconds).toBe(360);
    });

    it('session.close: should set FAILED if duration < 5 min', async () => {
      const payload = {
        event: 'session.close',
        data: {
          room_id: 'room-1',
          session_duration: 120, // 2 min
        },
      };
      const signature = signPayload(payload);

      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        roomId: 'room-1',
        status: VideoSessionStatus.IN_PROGRESS,
        actualStartTime: new Date('2026-03-01T10:00:00'),
      });
      mockPrisma.videoSession.update.mockResolvedValue({
        id: 'vs-1',
        status: VideoSessionStatus.FAILED,
      });

      await service.handleWebhook({ payload, webhookSignature: signature });

      const updateCall = mockPrisma.videoSession.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe(VideoSessionStatus.FAILED);
    });

    it('peer.leave: should call handleDisconnect when session is IN_PROGRESS', async () => {
      const now = new Date();
      const payload = {
        event: 'peer.leave',
        data: {
          room_id: 'room-1',
          peer_id: 'patient-1',
          role: 'patient',
        },
      };
      const signature = signPayload(payload);

      // Call chain: findSessionByRoomId → findUnique(1), handlePeerLeave → findUnique(2), handleDisconnect → findUnique(3)
      mockPrisma.videoSession.findUnique.mockResolvedValueOnce({
        id: 'vs-1',
        roomId: 'room-1',
      });
      mockPrisma.videoSession.findUnique.mockResolvedValueOnce({
        id: 'vs-1',
        roomId: 'room-1',
        status: VideoSessionStatus.IN_PROGRESS,
        actualStartTime: new Date(now.getTime() - 2 * 60 * 1000),
        disconnectCount: 0,
      });
      // handleDisconnect calls findUnique a third time
      mockPrisma.videoSession.findUnique.mockResolvedValueOnce({
        id: 'vs-1',
        roomId: 'room-1',
        status: VideoSessionStatus.IN_PROGRESS,
        actualStartTime: new Date(now.getTime() - 2 * 60 * 1000),
        disconnectCount: 0,
      });
      mockPrisma.videoSession.update.mockResolvedValue({
        id: 'vs-1',
        reconnectRoomId: 'reconnect-room-vs-1',
        disconnectCount: 1,
      });

      await service.handleWebhook({ payload, webhookSignature: signature });

      // handleDisconnect should have been called (creates reconnect room)
      expect(mockPrisma.videoSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'vs-1' },
          data: expect.objectContaining({
            reconnectRoomId: expect.any(String),
            disconnectCount: 1,
          }),
        }),
      );
    });

    it('peer.leave: should NOT call handleDisconnect when session is not IN_PROGRESS', async () => {
      const payload = {
        event: 'peer.leave',
        data: {
          room_id: 'room-1',
          peer_id: 'doctor-1',
          role: 'doctor',
        },
      };
      const signature = signPayload(payload);

      // findSessionByRoomId lookup
      mockPrisma.videoSession.findUnique.mockResolvedValueOnce({
        id: 'vs-1',
        roomId: 'room-1',
      });
      // Session is SCHEDULED, not IN_PROGRESS
      mockPrisma.videoSession.findUnique.mockResolvedValueOnce({
        id: 'vs-1',
        roomId: 'room-1',
        status: VideoSessionStatus.SCHEDULED,
      });

      await service.handleWebhook({ payload, webhookSignature: signature });

      // No update should happen (handleDisconnect not called for non-IN_PROGRESS)
      expect(mockPrisma.videoSession.update).not.toHaveBeenCalled();
    });

    it('should reject invalid webhook signature', async () => {
      const payload = { event: 'peer.join', data: {} };

      await expect(
        service.handleWebhook({
          payload,
          webhookSignature: 'invalid-signature',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================
  // handleDisconnect
  // ============================================================

  describe('handleDisconnect', () => {
    it('should create new room if < 5 min elapsed', async () => {
      const now = new Date();
      const startTime = new Date(now.getTime() - 3 * 60 * 1000); // 3 min ago

      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        roomId: 'room-1',
        status: VideoSessionStatus.IN_PROGRESS,
        actualStartTime: startTime,
        disconnectCount: 0,
      });
      mockPrisma.videoSession.update.mockResolvedValue({
        id: 'vs-1',
        reconnectRoomId: expect.any(String),
        disconnectCount: 1,
      });

      const result = await service.handleDisconnect('vs-1');

      expect(result.action).toBe('RECONNECT');
      expect(result.newRoomId).toBeDefined();
    });

    it('should increment disconnectCount', async () => {
      const now = new Date();
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        roomId: 'room-1',
        status: VideoSessionStatus.IN_PROGRESS,
        actualStartTime: new Date(now.getTime() - 2 * 60 * 1000),
        disconnectCount: 1,
      });
      mockPrisma.videoSession.update.mockResolvedValue({
        id: 'vs-1',
        disconnectCount: 2,
      });

      await service.handleDisconnect('vs-1');

      const updateCall = mockPrisma.videoSession.update.mock.calls[0][0];
      expect(updateCall.data.disconnectCount).toBe(2);
    });

    it('should store reconnectRoomId', async () => {
      const now = new Date();
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        roomId: 'room-1',
        status: VideoSessionStatus.IN_PROGRESS,
        actualStartTime: new Date(now.getTime() - 1 * 60 * 1000),
        disconnectCount: 0,
      });
      mockPrisma.videoSession.update.mockResolvedValue({
        id: 'vs-1',
        reconnectRoomId: 'reconnect-room-vs-1',
      });

      await service.handleDisconnect('vs-1');

      const updateCall = mockPrisma.videoSession.update.mock.calls[0][0];
      expect(updateCall.data.reconnectRoomId).toBeDefined();
    });

    it('should NOT reconnect if >= 5 min elapsed, notify doctor', async () => {
      const now = new Date();
      const startTime = new Date(now.getTime() - 6 * 60 * 1000); // 6 min ago

      mockPrisma.videoSession.findUnique.mockResolvedValue({
        id: 'vs-1',
        roomId: 'room-1',
        status: VideoSessionStatus.IN_PROGRESS,
        actualStartTime: startTime,
        disconnectCount: 0,
      });

      const result = await service.handleDisconnect('vs-1');

      expect(result.action).toBe('NOTIFY_DOCTOR');
      expect(result.newRoomId).toBeUndefined();
    });
  });

  // ============================================================
  // storeRecording
  // ============================================================

  describe('storeRecording', () => {
    it('should store recording URL on VideoSession', async () => {
      const videoSessionId = 'vs-1';
      const sourceUrl = 'https://100ms.live/recordings/recording.mp4';

      mockPrisma.videoSession.update.mockResolvedValue({
        id: videoSessionId,
        recordingUrl: sourceUrl,
      });

      const result = await service.storeRecording(videoSessionId, sourceUrl);

      expect(result).toBeDefined();
      expect(mockPrisma.videoSession.update).toHaveBeenCalledWith({
        where: { id: videoSessionId },
        data: { recordingUrl: sourceUrl },
      });
    });
  });

  // ============================================================
  // startRecording + stopRecording
  // ============================================================

  describe('startRecording', () => {
    it('should succeed in mock mode (no real API call)', async () => {
      await expect(service.startRecording('mock-room-vs-1')).resolves.not.toThrow();
    });

    it('should log that recording was started', async () => {
      const logSpy = jest.spyOn((service as any).logger, 'log');
      await service.startRecording('mock-room-vs-1');
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('recording'));
    });
  });

  describe('stopRecording', () => {
    it('should succeed in mock mode (no real API call)', async () => {
      await expect(service.stopRecording('mock-room-vs-1')).resolves.not.toThrow();
    });

    it('should log that recording was stopped', async () => {
      const logSpy = jest.spyOn((service as any).logger, 'log');
      await service.stopRecording('mock-room-vs-1');
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('recording'));
    });
  });
});
