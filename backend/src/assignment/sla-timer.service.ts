import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AssignmentService } from './assignment.service';
import { NotificationService } from '../notification/notification.service';
import { ConsultationStatus, UserRole } from '@prisma/client';

// Spec: Phase 12 — SLA Timer Service
// Runs every 5 minutes. Detects breached consultations, triggers reassignment.
// Max 3 bounces — after that, urgent admin alert only.

const MAX_BOUNCES = 3;

@Injectable()
export class SlaTimerService {
  private readonly logger = new Logger(SlaTimerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly assignmentService: AssignmentService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Every 5 minutes — check for SLA breaches on DOCTOR_REVIEWING consultations
   */
  @Cron('*/5 * * * *')
  async checkSlaBreaches(): Promise<void> {
    this.logger.log('Running SLA breach check...');

    const breached = await this.prisma.consultation.findMany({
      where: {
        status: ConsultationStatus.DOCTOR_REVIEWING,
        slaDeadline: { lt: new Date() },
      },
    });

    for (const consultation of breached) {
      try {
        const allPreviousIds: string[] = [
          ...(consultation.previousDoctorIds || []),
        ];

        // Add current doctor to exclusion list
        if (consultation.doctorId && !allPreviousIds.includes(consultation.doctorId)) {
          allPreviousIds.push(consultation.doctorId);
        }

        // Check if max bounces reached (3 previous doctors = 4 total including current)
        if (allPreviousIds.length > MAX_BOUNCES) {
          await this.sendUrgentAdminAlert(consultation.id, allPreviousIds);
          continue;
        }

        // Notify admin of SLA breach
        await this.notifyAdminSlaBreach(consultation.id, consultation.doctorId);

        // Attempt reassignment
        const result = await this.assignmentService.reassignDoctor(
          consultation.id,
          allPreviousIds,
        );

        if (result.assigned) {
          this.logger.log(
            `SLA breach: consultation ${consultation.id} reassigned to ${result.doctorName}`,
          );
        } else {
          this.logger.warn(
            `SLA breach: consultation ${consultation.id} could not be reassigned — ${result.reason}`,
          );
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Failed to process SLA breach for consultation ${consultation.id}: ${message}`,
        );
      }
    }

    this.logger.log(`SLA breach check complete. Processed ${breached.length} consultations.`);
  }

  private async notifyAdminSlaBreach(consultationId: string, doctorId: string | null): Promise<void> {
    const admin = await this.prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
    });

    if (admin) {
      await this.notificationService.sendNotification({
        recipientId: admin.id,
        recipientRole: 'ADMIN',
        channel: 'IN_APP',
        eventType: 'SLA_BREACH',
        title: 'SLA Breach Detected',
        body: `Doctor ${doctorId || 'unknown'} missed SLA for case #${consultationId}. Attempting reassignment.`,
        data: { consultationId, doctorId },
      }).catch(err => {
        this.logger.error(`Failed to send SLA breach admin notification: ${err?.message}`);
      });
    }
  }

  private async sendUrgentAdminAlert(consultationId: string, previousDoctorIds: string[]): Promise<void> {
    this.logger.warn(
      `Max bounces (${MAX_BOUNCES}) reached for consultation ${consultationId}. Sending urgent alert.`,
    );

    const admin = await this.prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
    });

    if (admin) {
      await this.notificationService.sendNotification({
        recipientId: admin.id,
        recipientRole: 'ADMIN',
        channel: 'IN_APP',
        eventType: 'SLA_MAX_BOUNCES',
        title: 'URGENT: Case Bounced 3+ Times',
        body: `Case #${consultationId} has been reassigned ${previousDoctorIds.length} times. Manual intervention required.`,
        data: { consultationId, previousDoctorIds, bounceCount: previousDoctorIds.length },
      }).catch(err => {
        this.logger.error(`Failed to send urgent admin alert: ${err?.message}`);
      });
    }
  }
}
