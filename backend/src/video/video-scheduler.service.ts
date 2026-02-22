import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VideoNotificationService } from './video-notification.service';
import { HmsService } from './hms.service';
import { ConsultationStatus, VideoSessionStatus } from '@prisma/client';

// Spec: Phase 13 — Cron-based video consultation automation
// Pattern follows: notification-scheduler.service.ts, sla-timer.service.ts

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
   * @Cron('0 9 * * *') — applied in video.module.ts
   */
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
        await this.notifications.notify24HourReminder(session.id);
      } catch (error) {
        this.logger.error(`Failed 24hr reminder for ${session.id}: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Every 15 min: send reminders for sessions starting in 55-65 min
   * @Cron('*\/15 * * * *')
   */
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
   * @Cron('*\/5 * * * *')
   */
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
   * @Cron('* * * * *')
   */
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
  async onAwaitingLabs(consultationId: string, labNotes: string): Promise<void> {
    await this.prisma.consultation.update({
      where: { id: consultationId },
      data: { status: ConsultationStatus.AWAITING_LABS },
    });
  }
}
