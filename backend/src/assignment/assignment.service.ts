import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { HealthVertical, ConsultationStatus, UserRole } from '@prisma/client';

// Spec: Phase 12 — Load-Balanced Doctor Auto-Assignment

// SLA windows by risk level (in hours)
const SLA_HOURS: Record<string, number> = {
  LOW: 4,
  MEDIUM: 2,
  HIGH: 1,
};

// Active statuses — consultations in these states count toward doctor's load
const ACTIVE_STATUSES = [
  ConsultationStatus.DOCTOR_REVIEWING,
  ConsultationStatus.NEEDS_INFO,
];

export interface AssignmentResult {
  assigned: boolean;
  doctorId?: string;
  doctorName?: string;
  reason: 'assigned' | 'no_eligible_doctors' | 'no_senior_doctors' | 'reassigned' | 'max_reassignments';
  loadScore?: number;
  slaDeadline?: Date;
}

interface EligibleDoctor {
  id: string; // DoctorProfile id
  userId: string;
  name: string;
  dailyCaseLimit: number;
  lastAssignedAt: Date | null;
  seniorDoctor: boolean;
  activeCount: number;
  loadScore: number;
}

@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Pure function: calculate load score
   * Spec: Phase 12 — loadScore = activeCount / dailyLimit
   */
  calculateLoadScore(activeCount: number, dailyLimit: number): number {
    if (dailyLimit <= 0) return 1.0; // Treat as fully loaded
    return activeCount / dailyLimit;
  }

  /**
   * Get eligible doctors for a vertical, with optional senior filter and exclusions
   * Spec: Phase 12 — Real-time active count query per doctor
   */
  private async getEligibleDoctors(
    vertical: HealthVertical,
    seniorOnly: boolean,
    excludeUserIds: string[] = [],
  ): Promise<EligibleDoctor[]> {
    const where: any = {
      verticals: { has: vertical },
      isAvailable: true,
      isActive: true,
      user: { isVerified: true },
    };

    if (seniorOnly) {
      where.seniorDoctor = true;
    }

    if (excludeUserIds.length > 0) {
      where.userId = { notIn: excludeUserIds };
    }

    const doctors = await this.prisma.doctorProfile.findMany({
      where,
      include: { user: true },
    });

    // Get real-time active count for each doctor
    const eligible: EligibleDoctor[] = [];
    for (const doctor of doctors) {
      // Skip doctors with dailyCaseLimit = 0
      if (doctor.dailyCaseLimit <= 0) continue;

      const activeCount = await this.prisma.consultation.count({
        where: {
          doctorId: doctor.userId,
          status: { in: ACTIVE_STATUSES },
        },
      });

      // Skip doctors at or over their limit
      if (activeCount >= doctor.dailyCaseLimit) continue;

      eligible.push({
        id: doctor.id,
        userId: doctor.userId,
        name: doctor.user.name || 'Unknown',
        dailyCaseLimit: doctor.dailyCaseLimit,
        lastAssignedAt: doctor.lastAssignedAt,
        seniorDoctor: doctor.seniorDoctor,
        activeCount,
        loadScore: this.calculateLoadScore(activeCount, doctor.dailyCaseLimit),
      });
    }

    // Sort by loadScore ASC, then lastAssignedAt ASC (oldest first for tie-break)
    eligible.sort((a, b) => {
      if (a.loadScore !== b.loadScore) return a.loadScore - b.loadScore;
      const aTime = a.lastAssignedAt?.getTime() ?? 0;
      const bTime = b.lastAssignedAt?.getTime() ?? 0;
      return aTime - bTime;
    });

    return eligible;
  }

  /**
   * Send admin notification helper
   */
  private async notifyAdmin(eventType: string, title: string, body: string, data?: Record<string, any>): Promise<void> {
    // Find an admin user to notify
    const admin = await this.prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
    });

    if (admin) {
      await this.notificationService.sendNotification({
        recipientId: admin.id,
        recipientRole: 'ADMIN',
        channel: 'IN_APP',
        eventType,
        title,
        body,
        data,
      }).catch(err => {
        this.logger.error(`Failed to send admin notification: ${err?.message}`);
      });
    }
  }

  /**
   * Core: assign best doctor to consultation
   * Spec: Phase 12 — Triggered after AI assessment completes
   */
  async assignDoctor(consultationId: string): Promise<AssignmentResult> {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
      include: { aiAssessment: true },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    // Only assign from AI_REVIEWED status
    if (consultation.status !== ConsultationStatus.AI_REVIEWED) {
      this.logger.warn(`Cannot assign: consultation ${consultationId} is in ${consultation.status}, not AI_REVIEWED`);
      return { assigned: false, reason: 'no_eligible_doctors' };
    }

    const vertical = consultation.vertical;
    const riskLevel = consultation.aiAssessment?.riskLevel || 'LOW';
    const isHighAttention = riskLevel === 'HIGH';
    const excludeUserIds = consultation.previousDoctorIds || [];

    // For HIGH attention: first try senior doctors only
    let eligible: EligibleDoctor[];
    if (isHighAttention) {
      eligible = await this.getEligibleDoctors(vertical, true, excludeUserIds);

      if (eligible.length === 0) {
        // Fallback: try all doctors (non-senior included)
        eligible = await this.getEligibleDoctors(vertical, false, excludeUserIds);

        if (eligible.length > 0) {
          // Alert admin: high-attention case assigned to non-senior
          await this.notifyAdmin(
            'HIGH_ATTENTION_NON_SENIOR',
            'High-Attention Case — Non-Senior Doctor',
            `High-attention ${vertical} case #${consultationId} assigned to non-senior doctor due to no senior doctors available`,
            { consultationId, vertical, riskLevel },
          );
        }
      }
    } else {
      eligible = await this.getEligibleDoctors(vertical, false, excludeUserIds);
    }

    // No eligible doctors
    if (eligible.length === 0) {
      await this.notifyAdmin(
        'NO_ELIGIBLE_DOCTORS',
        'No Available Doctor',
        `No available doctor for ${vertical} case #${consultationId}. Please onboard or enable a doctor.`,
        { consultationId, vertical, riskLevel },
      );

      return { assigned: false, reason: 'no_eligible_doctors' };
    }

    // Pick the best doctor (first in sorted list)
    const bestDoctor = eligible[0];

    // Calculate SLA deadline
    const slaHours = SLA_HOURS[riskLevel] || SLA_HOURS.LOW;
    const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    // Update consultation
    await this.prisma.consultation.update({
      where: { id: consultationId },
      data: {
        doctorId: bestDoctor.userId,
        status: ConsultationStatus.DOCTOR_REVIEWING,
        assignedAt: new Date(),
        slaDeadline,
      },
    });

    // Update doctor's lastAssignedAt
    await this.prisma.doctorProfile.update({
      where: { id: bestDoctor.id },
      data: { lastAssignedAt: new Date() },
    });

    // Notify doctor
    await this.notificationService.sendNotification({
      recipientId: bestDoctor.userId,
      recipientRole: 'DOCTOR',
      channel: 'PUSH',
      eventType: 'CASE_ASSIGNED',
      title: 'New Case Assigned',
      body: `New ${vertical} case assigned. Attention: ${riskLevel}. Please review within ${slaHours}h.`,
      consultationId,
      data: { consultationId, vertical, riskLevel, slaHours },
    }).catch(err => {
      this.logger.error(`Failed to notify doctor ${bestDoctor.userId}: ${err?.message}`);
    });

    this.logger.log(
      `Assigned consultation ${consultationId} to ${bestDoctor.name} (load: ${bestDoctor.loadScore.toFixed(2)}, SLA: ${slaHours}h)`,
    );

    return {
      assigned: true,
      doctorId: bestDoctor.userId,
      doctorName: bestDoctor.name,
      reason: 'assigned',
      loadScore: bestDoctor.loadScore,
      slaDeadline,
    };
  }

  /**
   * Re-assign on SLA breach — excludes previously assigned doctors
   * Spec: Phase 12 — Called by SLA timer cron job
   */
  async reassignDoctor(consultationId: string, excludeDoctorIds: string[]): Promise<AssignmentResult> {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
      include: { aiAssessment: true },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    const vertical = consultation.vertical;
    const riskLevel = consultation.aiAssessment?.riskLevel || 'LOW';
    const isHighAttention = riskLevel === 'HIGH';

    // Get eligible doctors excluding previous ones
    let eligible: EligibleDoctor[];
    if (isHighAttention) {
      eligible = await this.getEligibleDoctors(vertical, true, excludeDoctorIds);
      if (eligible.length === 0) {
        eligible = await this.getEligibleDoctors(vertical, false, excludeDoctorIds);
      }
    } else {
      eligible = await this.getEligibleDoctors(vertical, false, excludeDoctorIds);
    }

    if (eligible.length === 0) {
      await this.notifyAdmin(
        'REASSIGNMENT_FAILED',
        'SLA Breach — No Alternative Doctors',
        `SLA breach on case #${consultationId}. No alternative doctors available for reassignment.`,
        { consultationId, vertical, excludeDoctorIds },
      );

      return { assigned: false, reason: 'no_eligible_doctors' };
    }

    const bestDoctor = eligible[0];
    const slaHours = SLA_HOURS[riskLevel] || SLA_HOURS.LOW;
    const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    // Update consultation with new doctor
    await this.prisma.consultation.update({
      where: { id: consultationId },
      data: {
        doctorId: bestDoctor.userId,
        assignedAt: new Date(),
        slaDeadline,
        previousDoctorIds: excludeDoctorIds,
      },
    });

    await this.prisma.doctorProfile.update({
      where: { id: bestDoctor.id },
      data: { lastAssignedAt: new Date() },
    });

    // Notify new doctor
    await this.notificationService.sendNotification({
      recipientId: bestDoctor.userId,
      recipientRole: 'DOCTOR',
      channel: 'PUSH',
      eventType: 'CASE_ASSIGNED',
      title: 'New Case Assigned (Reassigned)',
      body: `Reassigned ${vertical} case. Attention: ${riskLevel}. Please review within ${slaHours}h.`,
      consultationId,
      data: { consultationId, vertical, riskLevel, slaHours, reassignment: true },
    }).catch(err => {
      this.logger.error(`Failed to notify doctor ${bestDoctor.userId}: ${err?.message}`);
    });

    this.logger.log(`Reassigned consultation ${consultationId} to ${bestDoctor.name}`);

    return {
      assigned: true,
      doctorId: bestDoctor.userId,
      doctorName: bestDoctor.name,
      reason: 'reassigned',
      loadScore: bestDoctor.loadScore,
      slaDeadline,
    };
  }
}
