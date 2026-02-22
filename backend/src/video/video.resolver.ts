import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import {
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { SlotBookingService, CONNECTIVITY_WARNING } from './slot-booking.service';
import { HmsService } from './hms.service';
import { VideoSchedulerService } from './video-scheduler.service';
import { PrismaService } from '../prisma/prisma.service';
import { VideoSessionStatus } from '@prisma/client';

// Spec: Phase 13 plan — Chunk 7
// GraphQL resolver for video consultation endpoints

@Resolver()
export class VideoResolver {
  private readonly logger = new Logger(VideoResolver.name);

  constructor(
    private readonly availabilityService: AvailabilityService,
    private readonly slotBookingService: SlotBookingService,
    private readonly hmsService: HmsService,
    private readonly schedulerService: VideoSchedulerService,
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================
  // Patient endpoints
  // ============================================================

  async getAvailableSlots(consultationId: string) {
    const result = await this.availabilityService.getAvailableDoctorSlots(consultationId);
    return {
      ...result,
      connectivityWarning: CONNECTIVITY_WARNING,
    };
  }

  async bookVideoSlot(
    user: any,
    consultationId: string,
    slotDate: string,
    startTime: string,
  ) {
    return this.slotBookingService.bookSlot({
      consultationId,
      patientId: user.id,
      slotDate: new Date(slotDate),
      startTime,
    });
  }

  async cancelVideoBooking(user: any, bookedSlotId: string, reason: string) {
    return this.slotBookingService.cancelBooking(bookedSlotId, user.id, reason);
  }

  async rescheduleVideoBooking(
    user: any,
    bookedSlotId: string,
    newSlotDate: string,
    newStartTime: string,
  ) {
    return this.slotBookingService.rescheduleBooking(
      bookedSlotId,
      new Date(newSlotDate),
      newStartTime,
      user.id,
    );
  }

  async getMyUpcomingVideoSessions(user: any) {
    return this.slotBookingService.getUpcomingBookings(user.id, user.role);
  }

  async joinVideoSession(user: any, videoSessionId: string) {
    const session = await this.prisma.videoSession.findUnique({
      where: { id: videoSessionId },
    });

    if (!session) {
      throw new NotFoundException('Video session not found');
    }

    // Access control: user must be the patient or doctor on this session
    if (session.patientId !== user.id && session.doctorId !== user.id) {
      throw new ForbiddenException('You do not have access to this video session');
    }

    // Recording consent required before joining
    if (!session.recordingConsentGiven) {
      throw new BadRequestException(
        'Recording consent must be given before joining the video session',
      );
    }

    // Use reconnect room if available, otherwise original room
    const roomId = session.reconnectRoomId || session.roomId;
    const role = user.role === 'DOCTOR' ? 'doctor' : 'patient';

    const token = await this.hmsService.generateToken(roomId, user.id, role);

    return { roomId, token };
  }

  async giveRecordingConsent(user: any, videoSessionId: string) {
    const session = await this.prisma.videoSession.findUnique({
      where: { id: videoSessionId },
    });

    if (!session) {
      throw new NotFoundException('Video session not found');
    }

    if (session.patientId !== user.id) {
      throw new ForbiddenException('Only the patient can give recording consent');
    }

    return this.prisma.videoSession.update({
      where: { id: videoSessionId },
      data: { recordingConsentGiven: true },
    });
  }

  // ============================================================
  // Doctor endpoints
  // ============================================================

  async setMyAvailability(user: any, slots: any[]) {
    if (user.role !== 'DOCTOR') {
      throw new ForbiddenException('Only doctors can set availability');
    }

    return this.availabilityService.setRecurringAvailability(user.id, slots);
  }

  async getMyAvailability(user: any) {
    return this.availabilityService.getAvailability(user.id);
  }

  async markNoShow(user: any, videoSessionId: string) {
    const session = await this.prisma.videoSession.findUnique({
      where: { id: videoSessionId },
    });

    if (!session) {
      throw new NotFoundException('Video session not found');
    }

    if (session.doctorId !== user.id) {
      throw new ForbiddenException('Only the assigned doctor can mark no-show');
    }

    // Server-side 5-minute grace period enforcement
    const now = new Date();
    const gracePeriodEnd = new Date(
      session.scheduledStartTime.getTime() + 5 * 60 * 1000,
    );

    if (now < gracePeriodEnd) {
      throw new BadRequestException(
        'Cannot mark no-show before the 5-minute grace period has elapsed',
      );
    }

    return this.slotBookingService.handleNoShow(
      videoSessionId,
      'PATIENT',
      user.id,
    );
  }

  async completeVideoSession(
    user: any,
    videoSessionId: string,
    notes: string,
    callType?: string,
  ) {
    const session = await this.prisma.videoSession.findUnique({
      where: { id: videoSessionId },
    });

    if (!session) {
      throw new NotFoundException('Video session not found');
    }

    if (session.doctorId !== user.id) {
      throw new ForbiddenException('Only the assigned doctor can complete the session');
    }

    if (session.status !== VideoSessionStatus.IN_PROGRESS) {
      throw new BadRequestException('Session must be in IN_PROGRESS status to complete');
    }

    const updated = await this.prisma.videoSession.update({
      where: { id: videoSessionId },
      data: {
        status: VideoSessionStatus.COMPLETED,
        notes,
        callType: callType || 'VIDEO',
        actualEndTime: new Date(),
      },
    });

    // Trigger post-call automation
    await this.schedulerService.onVideoCompleted(session.consultationId);

    return updated;
  }

  async markAwaitingLabs(user: any, videoSessionId: string, labNotes: string) {
    const session = await this.prisma.videoSession.findUnique({
      where: { id: videoSessionId },
    });

    if (!session) {
      throw new NotFoundException('Video session not found');
    }

    if (session.doctorId !== user.id) {
      throw new ForbiddenException('Only the assigned doctor can mark awaiting labs');
    }

    await this.schedulerService.onAwaitingLabs(session.consultationId, labNotes);
  }

  // ============================================================
  // Webhook (no auth guard — verified by HMAC signature)
  // ============================================================

  async hmsWebhook(payload: any, signature: string) {
    await this.hmsService.handleWebhook({ ...payload, webhookSignature: signature });
  }
}
