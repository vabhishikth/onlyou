import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AvailabilityService } from './availability.service';
import { SlotBookingService, CONNECTIVITY_WARNING } from './slot-booking.service';
import { HmsService } from './hms.service';
import { VideoSchedulerService } from './video-scheduler.service';
import { PrismaService } from '../prisma/prisma.service';
import { VideoSessionStatus } from '@prisma/client';
import { GraphQLJSON } from 'graphql-type-json';
import {
  SetAvailabilitySlotInput,
} from './dto/video.input';
import {
  AvailableSlotsResponse,
  BookingResponse,
  CancelBookingResult,
  JoinSessionResponse,
  RecordingConsentResponse,
  AvailabilitySlotType,
  NoShowResultType,
  VideoSessionType,
  DoctorVideoSessionType,
  BookedSlotType,
} from './dto/video.output';

// Spec: Phase 13 plan — Chunk 7, Phase 14 — Chunk 0 (GraphQL decorators)
// GraphQL resolver for video consultation endpoints

@Resolver()
export class VideoResolver {
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

  @Query(() => AvailableSlotsResponse, { name: 'availableVideoSlots' })
  @UseGuards(JwtAuthGuard)
  async getAvailableSlots(
    @Args('consultationId') consultationId: string,
  ) {
    const result = await this.availabilityService.getAvailableDoctorSlots(consultationId);
    return {
      ...result,
      connectivityWarning: CONNECTIVITY_WARNING,
    };
  }

  @Mutation(() => BookingResponse, { name: 'bookVideoSlot' })
  @UseGuards(JwtAuthGuard)
  async bookVideoSlot(
    @CurrentUser() user: any,
    @Args('consultationId') consultationId: string,
    @Args('slotDate') slotDate: string,
    @Args('startTime') startTime: string,
  ) {
    return this.slotBookingService.bookSlot({
      consultationId,
      patientId: user.id,
      slotDate: new Date(slotDate),
      startTime,
    });
  }

  @Mutation(() => CancelBookingResult, { name: 'cancelVideoBooking' })
  @UseGuards(JwtAuthGuard)
  async cancelVideoBooking(
    @CurrentUser() user: any,
    @Args('bookedSlotId') bookedSlotId: string,
    @Args('reason') reason: string,
  ) {
    return this.slotBookingService.cancelBooking(bookedSlotId, user.id, reason);
  }

  @Mutation(() => BookingResponse, { name: 'rescheduleVideoBooking' })
  @UseGuards(JwtAuthGuard)
  async rescheduleVideoBooking(
    @CurrentUser() user: any,
    @Args('bookedSlotId') bookedSlotId: string,
    @Args('newSlotDate') newSlotDate: string,
    @Args('newStartTime') newStartTime: string,
  ) {
    return this.slotBookingService.rescheduleBooking(
      bookedSlotId,
      new Date(newSlotDate),
      newStartTime,
      user.id,
    );
  }

  @Query(() => [BookedSlotType], { name: 'myUpcomingVideoSessions' })
  @UseGuards(JwtAuthGuard)
  async getMyUpcomingVideoSessions(@CurrentUser() user: any) {
    return this.slotBookingService.getUpcomingBookings(user.id, user.role);
  }

  @Query(() => VideoSessionType, { name: 'videoSession' })
  @UseGuards(JwtAuthGuard)
  async getVideoSession(
    @CurrentUser() user: any,
    @Args('videoSessionId') videoSessionId: string,
  ) {
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

    return session;
  }

  @Mutation(() => JoinSessionResponse, { name: 'joinVideoSession' })
  @UseGuards(JwtAuthGuard)
  async joinVideoSession(
    @CurrentUser() user: any,
    @Args('videoSessionId') videoSessionId: string,
  ) {
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
    // Lazy room creation: if no room exists yet, create one now
    let roomId = session.reconnectRoomId || session.roomId;
    if (!roomId) {
      const created = await this.hmsService.createRoom(videoSessionId);
      roomId = created.roomId;
    }
    const role = user.role === 'DOCTOR' ? 'doctor' : 'patient';

    const token = await this.hmsService.generateToken(roomId, user.id, role);

    return { roomId, token };
  }

  @Mutation(() => RecordingConsentResponse, { name: 'giveRecordingConsent' })
  @UseGuards(JwtAuthGuard)
  async giveRecordingConsent(
    @CurrentUser() user: any,
    @Args('videoSessionId') videoSessionId: string,
  ) {
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

  @Query(() => [DoctorVideoSessionType], { name: 'doctorVideoSessions' })
  @UseGuards(JwtAuthGuard)
  async getDoctorVideoSessions(@CurrentUser() user: any) {
    if (user.role !== 'DOCTOR') {
      throw new ForbiddenException('Only doctors can view their video sessions');
    }

    const sessions = await this.prisma.videoSession.findMany({
      where: {
        doctorId: user.id,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      },
      include: {
        patient: {
          include: {
            patientProfile: true,
          },
        },
      },
      orderBy: { scheduledStartTime: 'asc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      consultationId: s.consultationId,
      patientName: s.patient?.patientProfile?.fullName || 'Patient',
      patientId: s.patientId,
      status: s.status,
      scheduledStartTime: s.scheduledStartTime,
      scheduledEndTime: s.scheduledEndTime,
      recordingConsentGiven: s.recordingConsentGiven,
    }));
  }

  @Mutation(() => [AvailabilitySlotType], { name: 'setMyAvailability' })
  @UseGuards(JwtAuthGuard)
  async setMyAvailability(
    @CurrentUser() user: any,
    @Args('slots', { type: () => [SetAvailabilitySlotInput] }) slots: SetAvailabilitySlotInput[],
  ) {
    if (user.role !== 'DOCTOR') {
      throw new ForbiddenException('Only doctors can set availability');
    }

    return this.availabilityService.setRecurringAvailability(user.id, slots);
  }

  @Query(() => [AvailabilitySlotType], { name: 'myAvailability' })
  @UseGuards(JwtAuthGuard)
  async getMyAvailability(@CurrentUser() user: any) {
    return this.availabilityService.getAvailability(user.id);
  }

  @Mutation(() => NoShowResultType, { name: 'markNoShow' })
  @UseGuards(JwtAuthGuard)
  async markNoShow(
    @CurrentUser() user: any,
    @Args('videoSessionId') videoSessionId: string,
  ) {
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

  @Mutation(() => VideoSessionType, { name: 'completeVideoSession' })
  @UseGuards(JwtAuthGuard)
  async completeVideoSession(
    @CurrentUser() user: any,
    @Args('videoSessionId') videoSessionId: string,
    @Args('notes') notes: string,
    @Args('callType', { nullable: true }) callType?: string,
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
        callType: (callType || 'VIDEO') as any,
        actualEndTime: new Date(),
      },
    });

    // Trigger post-call automation (fixed: pass videoSessionId + session object)
    await this.schedulerService.onVideoCompleted(videoSessionId, session);

    return updated;
  }

  @Mutation(() => Boolean, { name: 'markAwaitingLabs' })
  @UseGuards(JwtAuthGuard)
  async markAwaitingLabs(
    @CurrentUser() user: any,
    @Args('videoSessionId') videoSessionId: string,
    @Args('labNotes') labNotes: string,
  ) {
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
    return true;
  }

  // ============================================================
  // Webhook (no auth guard — verified by HMAC signature)
  // ============================================================

  @Mutation(() => Boolean, { name: 'hmsWebhook' })
  async hmsWebhook(
    @Args('payload', { type: () => GraphQLJSON }) payload: any,
    @Args('signature') signature: string,
  ) {
    await this.hmsService.handleWebhook({ ...payload, webhookSignature: signature });
    return true;
  }
}
