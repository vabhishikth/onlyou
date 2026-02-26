import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { VideoNotificationService } from './video-notification.service';
import { HmsService } from './hms.service';
import { ConsultationStatus, VideoSessionStatus } from '@prisma/client';
import { transitionStatus } from './video-state-machine';

// Spec: Phase 13+14 — Cron-based video consultation automation
// Includes: reminders, room pre-creation, no-show, stale session cleanup
// All reminders are idempotent (check lastReminderSentAt before sending)

@Injectable()
export class VideoSchedulerService {
  private readonly logger = new Logger(VideoSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: VideoNotificationService,
    private readonly hmsService: HmsService,
  ) {}

  /**
   * Daily 9am IST: send reminders for tomorrow's sessions
   */
  @Cron('0 9 * * *')
  async send24HourReminders(): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const sessions = await this.prisma.videoSession.findMany({
      where: {
        status: VideoSessionStatus.SCHEDULED,
        scheduledStartTime: {
          gte: tomorrow,
          lt: dayAfterTomorrow,
        },
      },
    });

    for (const session of sessions) {
      try {
        // Idempotency: skip if reminder was already sent (within last 12 hours)
        if (session.lastReminderSentAt) {
          const hoursSinceLast = (Date.now() - new Date(session.lastReminderSentAt).getTime()) / (1000 * 60 * 60);
          if (hoursSinceLast < 12) continue;
        }

        await this.notifications.notify24HourReminder(session.id);
        await this.prisma.videoSession.update({
          where: { id: session.id },
          data: { lastReminderSentAt: new Date() },
        });
      } catch (error) {
        this.logger.error(`Failed 24hr reminder for ${session.id}: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Every 15 min: send reminders for sessions starting in 55-65 min
   */
  @Cron('*/15 * * * *')
  async send1HourReminders(): Promise<void> {
    const now = new Date();
    const from = new Date(now.getTime() + 55 * 60 * 1000);
    const to = new Date(now.getTime() + 65 * 60 * 1000);

    const sessions = await this.prisma.videoSession.findMany({
      where: {
        status: VideoSessionStatus.SCHEDULED,
        scheduledStartTime: { gte: from, lt: to },
      },
    });

    for (const session of sessions) {
      try {
        await this.notifications.notify1HourReminder(session.id);
      } catch (error) {
        this.logger.error(`Failed 1hr reminder for ${session.id}: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Every 5 min: create rooms for sessions starting in 0-5 min
   */
  @Cron('*/5 * * * *')
  async createRoomsForUpcomingSessions(): Promise<void> {
    const now = new Date();
    const fiveMinFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    const sessions = await this.prisma.videoSession.findMany({
      where: {
        status: VideoSessionStatus.SCHEDULED,
        roomId: null,
        scheduledStartTime: { gte: now, lte: fiveMinFromNow },
      },
    });

    for (const session of sessions) {
      try {
        await this.hmsService.createRoom(session.id);
        await this.notifications.notifyRoomReady(session.id);
      } catch (error) {
        this.logger.error(`Failed room creation for ${session.id}: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Every minute: check for doctor no-shows
   * 3 min after scheduledStartTime, doctor hasn't joined -> URGENT admin alert
   * 5 min after scheduledStartTime, doctor still hasn't joined -> patient apology, mark NO_SHOW_DOCTOR
   */
  @Cron('* * * * *')
  async checkDoctorNoShow(): Promise<void> {
    const now = new Date();
    // Find sessions that should have started (scheduled time is in the past)
    // and still in SCHEDULED status (doctor hasn't joined)
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const threeMinAgo = new Date(now.getTime() - 3 * 60 * 1000);

    // Sessions where scheduled time was 3+ min ago but status is still SCHEDULED
    const sessions = await this.prisma.videoSession.findMany({
      where: {
        status: VideoSessionStatus.SCHEDULED,
        scheduledStartTime: { lte: threeMinAgo },
      },
    });

    for (const session of sessions) {
      try {
        const minutesLate = Math.floor(
          (now.getTime() - session.scheduledStartTime.getTime()) / (1000 * 60),
        );

        // Always send admin alert (>= 3 min)
        await this.notifications.notifyDoctorNoShowAdmin(session.id, minutesLate);

        // If >= 5 min, send patient apology and mark no-show
        if (session.scheduledStartTime <= fiveMinAgo) {
          await this.notifications.notifyPatientApology(session.id);
          await this.prisma.videoSession.update({
            where: { id: session.id },
            data: {
              status: VideoSessionStatus.NO_SHOW_DOCTOR,
              noShowMarkedBy: 'SYSTEM',
            },
          });
        }
      } catch (error) {
        this.logger.error(`Failed no-show check for ${session.id}: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Every 5 min: find IN_PROGRESS sessions > 45 min old and auto-complete
   * Catches sessions where webhook failed or both participants disconnected silently
   */
  @Cron('*/5 * * * *')
  async checkStaleInProgress(): Promise<void> {
    const cutoff = new Date(Date.now() - 45 * 60 * 1000);

    const sessions = await this.prisma.videoSession.findMany({
      where: {
        status: VideoSessionStatus.IN_PROGRESS,
        actualStartTime: { lte: cutoff },
      },
    });

    for (const session of sessions) {
      try {
        await transitionStatus(
          this.prisma,
          session.id,
          VideoSessionStatus.COMPLETED,
          'cron:stale_in_progress',
          'SESSION_TIMEOUT',
        );
        this.logger.warn(`Auto-completed stale session ${session.id} (>45 min)`);
      } catch (error) {
        this.logger.error(`Failed stale cleanup for ${session.id}: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Every 2 min: find WAITING_FOR_* sessions > 10 min old and mark FAILED
   * Catches sessions where one party joined but the other never did
   */
  @Cron('*/2 * * * *')
  async checkStaleWaiting(): Promise<void> {
    const cutoff = new Date(Date.now() - 10 * 60 * 1000);

    const sessions = await this.prisma.videoSession.findMany({
      where: {
        status: {
          in: [VideoSessionStatus.WAITING_FOR_PATIENT, VideoSessionStatus.WAITING_FOR_DOCTOR],
        },
        scheduledStartTime: { lte: cutoff },
      },
    });

    for (const session of sessions) {
      try {
        await transitionStatus(
          this.prisma,
          session.id,
          VideoSessionStatus.FAILED,
          'cron:stale_waiting',
          'WAITING_TIMEOUT',
        );
        this.logger.warn(`Timed out waiting session ${session.id} (>10 min)`);
      } catch (error) {
        this.logger.error(`Failed waiting timeout for ${session.id}: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Post-call: transition consultation to VIDEO_COMPLETED and notify parties
   * Called from webhook handler when session completes
   */
  async onVideoCompleted(
    videoSessionId: string,
    session: { id: string; consultationId: string; doctorId: string; patientId: string },
  ): Promise<void> {
    await this.prisma.consultation.update({
      where: { id: session.consultationId },
      data: { status: ConsultationStatus.VIDEO_COMPLETED },
    });

    await this.notifications.notifyVideoCompleted(videoSessionId);
  }

  /**
   * Transition consultation to AWAITING_LABS
   * Called when doctor requests labs before prescribing
   */
  async onAwaitingLabs(consultationId: string, _labNotes: string): Promise<void> {
    await this.prisma.consultation.update({
      where: { id: consultationId },
      data: { status: ConsultationStatus.AWAITING_LABS },
    });
  }
}
