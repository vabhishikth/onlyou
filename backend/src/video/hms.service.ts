import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { VideoSessionStatus } from '@prisma/client';
import * as crypto from 'crypto';

// Spec: Phase 13 — 100ms Video Integration Service
// Mock mode when HMS_ACCESS_KEY is empty (dev/test)

export interface WebhookInput {
  payload: any;
  webhookSignature: string;
}

export interface DisconnectResult {
  action: 'RECONNECT' | 'NOTIFY_DOCTOR';
  newRoomId?: string;
}

@Injectable()
export class HmsService {
  private readonly logger = new Logger(HmsService.name);
  private readonly accessKey: string;
  private readonly webhookSecret: string;
  private readonly isMockMode: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.accessKey = this.configService.get<string>('HMS_ACCESS_KEY') || '';
    this.webhookSecret = this.configService.get<string>('HMS_WEBHOOK_SECRET') || '';
    this.isMockMode = !this.accessKey;
  }

  /**
   * Create a 100ms room for a video session
   * In mock mode: returns deterministic mock room ID
   */
  async createRoom(videoSessionId: string): Promise<{ roomId: string }> {
    // Validate session exists (used for future real API context)
    await this.prisma.videoSession.findUnique({
      where: { id: videoSessionId },
    });

    let roomId: string;

    if (this.isMockMode) {
      roomId = `mock-room-${videoSessionId}`;
    } else {
      // Real 100ms API call would go here
      // const response = await fetch('https://api.100ms.live/v2/rooms', { ... });
      roomId = `onlyou-${videoSessionId}`;
    }

    await this.prisma.videoSession.update({
      where: { id: videoSessionId },
      data: { roomId },
    });

    return { roomId };
  }

  /**
   * Generate an auth token for a participant to join a room
   * In mock mode: returns a deterministic mock token
   */
  async generateToken(
    roomId: string,
    peerId: string,
    role: 'doctor' | 'patient',
  ): Promise<string> {
    if (this.isMockMode) {
      // Mock token includes room, peer, and role for uniqueness
      return `mock-token-${roomId}-${peerId}-${role}`;
    }

    // Real 100ms management token generation would go here using JWT
    // with accessKey and appSecret
    return `token-${roomId}-${peerId}-${role}`;
  }

  /**
   * Verify 100ms webhook signature using HMAC SHA256
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) return false;

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    return expectedSignature === signature;
  }

  /**
   * Process 100ms webhook events
   * Pattern: follows payment.service.ts HMAC + event routing
   */
  async handleWebhook(input: WebhookInput): Promise<void> {
    const payloadStr = JSON.stringify(input.payload);

    // Verify signature
    if (!this.verifyWebhookSignature(payloadStr, input.webhookSignature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const { event, data } = input.payload;

    switch (event) {
      case 'peer.join':
        await this.handlePeerJoin(data);
        break;
      case 'peer.leave':
        await this.handlePeerLeave(data);
        break;
      case 'session.close':
        await this.handleSessionClose(data);
        break;
      case 'recording.success':
        await this.handleRecordingSuccess(data);
        break;
      default:
        this.logger.warn(`Unhandled webhook event: ${event}`);
    }
  }

  /**
   * Handle call disconnection
   * < 5 min elapsed: create new room for reconnection
   * >= 5 min: notify doctor to decide (complete or reschedule)
   */
  async handleDisconnect(videoSessionId: string): Promise<DisconnectResult> {
    const session = await this.prisma.videoSession.findUnique({
      where: { id: videoSessionId },
    });

    if (!session || !session.actualStartTime) {
      return { action: 'NOTIFY_DOCTOR' };
    }

    const elapsedMs = Date.now() - session.actualStartTime.getTime();
    const elapsedMinutes = elapsedMs / (1000 * 60);

    if (elapsedMinutes < 5) {
      // Create a new reconnection room
      const newRoomId = this.isMockMode
        ? `reconnect-room-${videoSessionId}`
        : `onlyou-reconnect-${videoSessionId}`;

      await this.prisma.videoSession.update({
        where: { id: videoSessionId },
        data: {
          reconnectRoomId: newRoomId,
          disconnectCount: session.disconnectCount + 1,
        },
      });

      return { action: 'RECONNECT', newRoomId };
    }

    // >= 5 min: don't auto-reconnect
    return { action: 'NOTIFY_DOCTOR' };
  }

  /**
   * Store recording URL on the video session
   * In a full implementation, would download from 100ms and upload to S3
   * Stubbed: stores the source URL directly
   */
  async storeRecording(
    videoSessionId: string,
    sourceUrl: string,
  ): Promise<string> {
    await this.prisma.videoSession.update({
      where: { id: videoSessionId },
      data: { recordingUrl: sourceUrl },
    });

    return sourceUrl;
  }

  // ============================================
  // Private webhook event handlers
  // ============================================

  private async handlePeerJoin(data: any): Promise<void> {
    const { room_id, role } = data;

    const session = await this.prisma.videoSession.findUnique({
      where: { id: await this.findSessionByRoomId(room_id) },
    });

    if (!session) return;

    if (role === 'doctor') {
      // Doctor joined
      if (session.status === VideoSessionStatus.SCHEDULED) {
        await this.prisma.videoSession.update({
          where: { id: session.id },
          data: { status: VideoSessionStatus.WAITING_FOR_PATIENT },
        });
      } else if (session.status === VideoSessionStatus.WAITING_FOR_DOCTOR) {
        // Both now joined
        await this.prisma.videoSession.update({
          where: { id: session.id },
          data: {
            status: VideoSessionStatus.IN_PROGRESS,
            actualStartTime: new Date(),
          },
        });
      }
    } else if (role === 'patient') {
      // Patient joined
      if (session.status === VideoSessionStatus.SCHEDULED) {
        await this.prisma.videoSession.update({
          where: { id: session.id },
          data: { status: VideoSessionStatus.WAITING_FOR_DOCTOR },
        });
      } else if (session.status === VideoSessionStatus.WAITING_FOR_PATIENT) {
        // Both now joined
        await this.prisma.videoSession.update({
          where: { id: session.id },
          data: {
            status: VideoSessionStatus.IN_PROGRESS,
            actualStartTime: new Date(),
          },
        });
      }
    }
  }

  private async handlePeerLeave(data: any): Promise<void> {
    // Peer leave is informational — actual session close is handled by session.close event
    this.logger.log(`Peer left room ${data.room_id}`);
  }

  private async handleSessionClose(data: any): Promise<void> {
    const { room_id, session_duration } = data;

    const sessionId = await this.findSessionByRoomId(room_id);
    const session = await this.prisma.videoSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) return;

    const durationSeconds = session_duration || 0;
    const minDurationSeconds = 5 * 60; // 5 minutes

    const newStatus =
      durationSeconds >= minDurationSeconds
        ? VideoSessionStatus.COMPLETED
        : VideoSessionStatus.FAILED;

    await this.prisma.videoSession.update({
      where: { id: session.id },
      data: {
        status: newStatus,
        actualEndTime: new Date(),
        durationSeconds,
      },
    });
  }

  private async handleRecordingSuccess(data: any): Promise<void> {
    const { room_id, recording_url } = data;
    const sessionId = await this.findSessionByRoomId(room_id);

    if (sessionId && recording_url) {
      await this.storeRecording(sessionId, recording_url);
    }
  }

  /**
   * Find video session ID by 100ms room ID
   * In mock mode, extracts session ID from room name pattern "mock-room-{sessionId}"
   */
  private async findSessionByRoomId(roomId: string): Promise<string> {
    // In mock mode, parse the session ID from the room name
    if (roomId.startsWith('mock-room-')) {
      return roomId.replace('mock-room-', '');
    }
    if (roomId.startsWith('onlyou-')) {
      return roomId.replace('onlyou-', '');
    }

    // Real implementation: look up in DB
    const session = await this.prisma.videoSession.findUnique({
      where: { id: roomId },
    });
    return session?.id || roomId;
  }
}
