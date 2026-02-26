import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { VideoSessionStatus } from '@prisma/client';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { transitionStatus, validateTransition } from './video-state-machine';

// Spec: Phase 13 — 100ms Video Integration Service
// Mock mode when HMS_ACCESS_KEY is empty (dev/test)
// Real mode: calls 100ms REST API with management token authentication

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
  private readonly appSecret: string;
  private readonly templateId: string;
  private readonly webhookSecret: string;
  private readonly isMockMode: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.accessKey = this.configService.get<string>('HMS_ACCESS_KEY') || '';
    this.appSecret = this.configService.get<string>('HMS_APP_SECRET') || '';
    this.templateId = this.configService.get<string>('HMS_TEMPLATE_ID') || '';
    this.webhookSecret = this.configService.get<string>('HMS_WEBHOOK_SECRET') || '';
    this.isMockMode = !this.accessKey;

    if (this.isMockMode) {
      this.logger.warn('100ms running in MOCK mode — set HMS_ACCESS_KEY for real API');
    } else {
      this.logger.log('100ms configured with real API credentials');
    }
  }

  /**
   * Generate a 100ms management token (JWT signed with HS256)
   * Used to authenticate server-side REST API calls
   * Ref: https://www.100ms.live/docs/server-side/v2/foundation/authentication-and-tokens
   */
  private generateManagementToken(): string {
    const now = Math.floor(Date.now() / 1000);

    const payload = {
      access_key: this.accessKey,
      type: 'management',
      version: 2,
      iat: now,
      nbf: now,
      exp: now + 86400, // 24 hours
      jti: crypto.randomUUID(),
    };

    return jwt.sign(payload, this.appSecret, { algorithm: 'HS256' });
  }

  /**
   * Generate a 100ms auth token for a participant to join a room
   * Ref: https://www.100ms.live/docs/server-side/v2/foundation/authentication-and-tokens
   */
  private generateAuthToken(roomId: string, userId: string, role: string): string {
    const now = Math.floor(Date.now() / 1000);

    const payload = {
      access_key: this.accessKey,
      type: 'app',
      version: 2,
      room_id: roomId,
      user_id: userId,
      role,
      iat: now,
      nbf: now,
      exp: now + 86400, // 24 hours
      jti: crypto.randomUUID(),
    };

    return jwt.sign(payload, this.appSecret, { algorithm: 'HS256' });
  }

  /**
   * Create a 100ms room for a video session
   * Mock mode: returns deterministic mock room ID
   * Real mode: calls POST https://api.100ms.live/v2/rooms
   */
  async createRoom(videoSessionId: string): Promise<{ roomId: string }> {
    // Validate session exists
    await this.prisma.videoSession.findUnique({
      where: { id: videoSessionId },
    });

    let roomId: string;

    if (this.isMockMode) {
      roomId = `mock-room-${videoSessionId}`;
    } else {
      const managementToken = this.generateManagementToken();

      const response = await fetch('https://api.100ms.live/v2/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${managementToken}`,
        },
        body: JSON.stringify({
          name: `onlyou-${videoSessionId}`,
          template_id: this.templateId,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(`100ms createRoom failed: ${response.status} ${errorBody}`);
        throw new BadRequestException('Failed to create video room');
      }

      const data = await response.json() as { id: string };
      roomId = data.id;
      this.logger.log(`100ms room created: ${roomId} for session ${videoSessionId}`);
    }

    await this.prisma.videoSession.update({
      where: { id: videoSessionId },
      data: { roomId },
    });

    return { roomId };
  }

  /**
   * Generate an auth token for a participant to join a room
   * Mock mode: returns a deterministic mock token
   * Real mode: signs a JWT auth token with app secret
   */
  async generateToken(
    roomId: string,
    peerId: string,
    role: 'doctor' | 'patient',
  ): Promise<string> {
    if (this.isMockMode) {
      return `mock-token-${roomId}-${peerId}-${role}`;
    }

    return this.generateAuthToken(roomId, peerId, role);
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
   * Start recording for a 100ms room
   * Mock mode: logs and returns (no real API call)
   * Real mode: POST https://api.100ms.live/v2/recordings/room/{roomId}/start
   * Spec: Phase 13 plan — Task 1.4
   */
  async startRecording(roomId: string): Promise<void> {
    if (this.isMockMode) {
      this.logger.log(`Mock: started recording for room ${roomId}`);
      return;
    }

    const managementToken = this.generateManagementToken();
    const response = await fetch(
      `https://api.100ms.live/v2/recordings/room/${roomId}/start`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${managementToken}`,
        },
        body: JSON.stringify({ meeting_url: '', resolution: { width: 1280, height: 720 } }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`100ms startRecording failed: ${response.status} ${errorBody}`);
      throw new BadRequestException('Failed to start recording');
    }

    this.logger.log(`Started recording for room ${roomId}`);
  }

  /**
   * Stop recording for a 100ms room
   * Mock mode: logs and returns (no real API call)
   * Real mode: POST https://api.100ms.live/v2/recordings/room/{roomId}/stop
   * Spec: Phase 13 plan — Task 1.4
   */
  async stopRecording(roomId: string): Promise<void> {
    if (this.isMockMode) {
      this.logger.log(`Mock: stopped recording for room ${roomId}`);
      return;
    }

    const managementToken = this.generateManagementToken();
    const response = await fetch(
      `https://api.100ms.live/v2/recordings/room/${roomId}/stop`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${managementToken}`,
        },
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`100ms stopRecording failed: ${response.status} ${errorBody}`);
      throw new BadRequestException('Failed to stop recording');
    }

    this.logger.log(`Stopped recording for room ${roomId}`);
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

    const sessionId = await this.findSessionByRoomId(room_id);
    const session = await this.prisma.videoSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) return;

    let targetStatus: VideoSessionStatus | null = null;

    if (role === 'doctor') {
      if (session.status === VideoSessionStatus.SCHEDULED) {
        targetStatus = VideoSessionStatus.WAITING_FOR_PATIENT;
      } else if (session.status === VideoSessionStatus.WAITING_FOR_DOCTOR) {
        targetStatus = VideoSessionStatus.IN_PROGRESS;
      }
    } else if (role === 'patient') {
      if (session.status === VideoSessionStatus.SCHEDULED) {
        targetStatus = VideoSessionStatus.WAITING_FOR_DOCTOR;
      } else if (session.status === VideoSessionStatus.WAITING_FOR_PATIENT) {
        targetStatus = VideoSessionStatus.IN_PROGRESS;
      }
    }

    if (targetStatus && validateTransition(session.status, targetStatus)) {
      await transitionStatus(this.prisma, session.id, targetStatus, `webhook:${role}`);
    }
  }

  private async handlePeerLeave(data: any): Promise<void> {
    const { room_id } = data;
    this.logger.log(`Peer left room ${room_id}`);

    // Check if session is IN_PROGRESS — trigger reconnection flow
    const sessionId = await this.findSessionByRoomId(room_id);
    const session = await this.prisma.videoSession.findUnique({
      where: { id: sessionId },
    });

    if (session?.status === VideoSessionStatus.IN_PROGRESS) {
      const result = await this.handleDisconnect(sessionId);
      this.logger.log(`Disconnect handled for ${sessionId}: ${result.action}`);
    }
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

    // Only transition if valid (e.g., session might already be COMPLETED by doctor)
    if (validateTransition(session.status, newStatus)) {
      await transitionStatus(
        this.prisma,
        session.id,
        newStatus,
        'webhook:session.close',
        newStatus === VideoSessionStatus.FAILED ? 'SESSION_TOO_SHORT' : undefined,
        { durationSeconds },
      );
    }
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
   * In real mode, looks up by roomId in the database
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
