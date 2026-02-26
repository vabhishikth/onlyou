import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConsultationStatus, HealthVertical, UserRole } from '@prisma/client';

// Spec: master spec Section 5 (Doctor Dashboard)

// Dashboard-friendly status names
export enum DashboardStatus {
  NEW = 'NEW',
  IN_REVIEW = 'IN_REVIEW',
  AWAITING_RESPONSE = 'AWAITING_RESPONSE',
  LAB_RESULTS_READY = 'LAB_RESULTS_READY',
  FOLLOW_UP = 'FOLLOW_UP',
  COMPLETED = 'COMPLETED',
  REFERRED = 'REFERRED',
}

// Spec: master spec Section 5.1 — Status badges
export const DASHBOARD_STATUS_BADGES: Record<DashboardStatus, string> = {
  [DashboardStatus.NEW]: '🟢',
  [DashboardStatus.IN_REVIEW]: '🟡',
  [DashboardStatus.AWAITING_RESPONSE]: '🟠',
  [DashboardStatus.LAB_RESULTS_READY]: '🟣',
  [DashboardStatus.FOLLOW_UP]: '🔵',
  [DashboardStatus.COMPLETED]: '⚪',
  [DashboardStatus.REFERRED]: '🔴',
};

// Queue filter options
export interface QueueFilters {
  vertical?: HealthVertical;
  dashboardStatus?: DashboardStatus;
  attentionLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
}

// Case card display data
export interface CaseCard {
  id: string;
  patientName: string;
  patientAge: number | null;
  patientSex: string | null;
  vertical: HealthVertical;
  createdAt: Date;
  aiAttentionLevel: string | null;
  dashboardStatus: DashboardStatus;
  statusBadge: string;
  isFollowUp: boolean;
}

// Case detail data
export interface CaseDetail {
  consultation: {
    id: string;
    status: ConsultationStatus;
    vertical: HealthVertical;
    createdAt: Date;
    doctorNotes: string | null;
    videoRequested: boolean;
    bookedSlot?: {
      id: string;
      videoSessionId: string;
      slotDate: Date;
      startTime: Date;
      endTime: Date;
      status: string;
    };
  };
  patient: {
    name: string | null;
    age: number | null;
    sex: string | null;
    city: string | null;
    phone: string;
  };
  questionnaire: {
    responses: Record<string, unknown>;
    template: Record<string, unknown>;
  };
  aiAssessment: {
    summary: string;
    riskLevel: string;
    flags: string[];
    rawResponse?: Record<string, unknown>;
  } | null;
  photos: Array<{
    id: string;
    type: string;
    url: string;
  }>;
  messages: Array<{
    id: string;
    content: string;
    senderId: string;
    createdAt: Date;
  }>;
  prescription: {
    id: string;
    medications: unknown;
    validUntil: Date;
    issuedAt: Date;
    pdfUrl?: string;
    instructions?: string;
  } | null;
  labOrders: Array<{
    id: string;
    testPanel: string[];
    panelName: string | null;
    status: string;
    orderedAt: Date;
    resultFileUrl: string | null;
    criticalValues: boolean;
  }>;
}

// Queue statistics
export interface QueueStats {
  new: number;
  inReview: number;
  awaitingResponse: number;
  labResultsReady: number;
  followUp: number;
  completed: number;
  referred: number;
  totalActive: number;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Map ConsultationStatus to DashboardStatus
   * Spec: master spec Section 5.1
   */
  mapToDashboardStatus(status: ConsultationStatus): DashboardStatus {
    switch (status) {
      case ConsultationStatus.PENDING_ASSESSMENT:
      case ConsultationStatus.AI_REVIEWED:
        // Assigned but doctor hasn't started review yet
        return DashboardStatus.NEW;
      case ConsultationStatus.DOCTOR_REVIEWING:
      case ConsultationStatus.VIDEO_SCHEDULED:
      case ConsultationStatus.VIDEO_COMPLETED:
      case ConsultationStatus.AWAITING_LABS:
        // Doctor is actively working on this case
        return DashboardStatus.IN_REVIEW;
      case ConsultationStatus.NEEDS_INFO:
        return DashboardStatus.AWAITING_RESPONSE;
      case ConsultationStatus.APPROVED:
        return DashboardStatus.COMPLETED;
      case ConsultationStatus.REJECTED:
        return DashboardStatus.REFERRED;
      default:
        return DashboardStatus.NEW;
    }
  }

  /**
   * Get badge emoji for dashboard status
   */
  getBadge(status: DashboardStatus): string {
    return DASHBOARD_STATUS_BADGES[status];
  }

  /**
   * Calculate age from date of birth
   */
  calculateAge(dateOfBirth: Date | null): number | null {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Verify user is a doctor
   */
  private async verifyDoctor(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        role: UserRole.DOCTOR,
        isVerified: true,
      },
    });

    if (!user) {
      throw new ForbiddenException('Access denied. Doctor role required.');
    }

    return user;
  }

  /**
   * Verify user is an admin
   */
  private async verifyAdmin(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
    });

    if (!user || user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied. Admin role required.');
    }

    return user;
  }

  /**
   * Verify user is a doctor or admin
   */
  private async verifyDoctorOrAdmin(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        OR: [
          { role: UserRole.DOCTOR, isVerified: true },
          { role: UserRole.ADMIN },
        ],
      },
    });

    if (!user) {
      throw new ForbiddenException('Access denied. Doctor or Admin role required.');
    }

    return user;
  }

  /**
   * Build where clause for status filtering
   */
  private buildStatusFilter(dashboardStatus?: DashboardStatus): Record<string, unknown> {
    if (!dashboardStatus) return {};

    switch (dashboardStatus) {
      case DashboardStatus.NEW:
        return {
          status: {
            in: [ConsultationStatus.PENDING_ASSESSMENT, ConsultationStatus.AI_REVIEWED],
          },
        };
      case DashboardStatus.IN_REVIEW:
        return {
          status: {
            in: [ConsultationStatus.DOCTOR_REVIEWING, ConsultationStatus.VIDEO_SCHEDULED, ConsultationStatus.VIDEO_COMPLETED, ConsultationStatus.AWAITING_LABS],
          },
        };
      case DashboardStatus.AWAITING_RESPONSE:
        return { status: ConsultationStatus.NEEDS_INFO };
      case DashboardStatus.COMPLETED:
        return { status: ConsultationStatus.APPROVED };
      case DashboardStatus.REFERRED:
        return { status: ConsultationStatus.REJECTED };
      case DashboardStatus.FOLLOW_UP:
        return {
          followUps: {
            some: {
              isCompleted: false,
              scheduledAt: { lte: new Date() },
            },
          },
        };
      case DashboardStatus.LAB_RESULTS_READY:
        // This would need lab order integration - for now return empty
        return {};
      default:
        return {};
    }
  }

  /**
   * Transform consultation to case card
   */
  private toCaseCard(consultation: Record<string, unknown>): CaseCard {
    const dashboardStatus = this.mapToDashboardStatus(consultation.status as ConsultationStatus);
    // A case is a follow-up if it has any pending (incomplete) follow-up scheduled
    const followUps = consultation.followUps as Array<{ isCompleted: boolean; scheduledAt: Date }> | undefined;
    const isFollowUp = followUps?.some((fu) => !fu.isCompleted) || false;
    // For dashboard status badge, only show FOLLOW_UP badge if follow-up is due
    const hasDueFollowUp = followUps?.some(
      (fu) => !fu.isCompleted && new Date(fu.scheduledAt) <= new Date()
    );

    const patient = consultation.patient as Record<string, unknown> | undefined;
    const patientProfile = (patient?.patientProfile as Record<string, unknown>) || {};
    const aiAssessment = consultation.aiAssessment as Record<string, unknown> | undefined;

    return {
      id: consultation.id as string,
      patientName: (patient?.name as string) || 'Unknown',
      patientAge: this.calculateAge(patientProfile?.dateOfBirth as Date | undefined),
      patientSex: (patientProfile?.gender as string) || null,
      vertical: consultation.vertical as HealthVertical,
      createdAt: consultation.createdAt as Date,
      aiAttentionLevel: (aiAssessment?.riskLevel as string) || null,
      dashboardStatus: hasDueFollowUp ? DashboardStatus.FOLLOW_UP : dashboardStatus,
      statusBadge: this.getBadge(hasDueFollowUp ? DashboardStatus.FOLLOW_UP : dashboardStatus),
      isFollowUp,
    };
  }

  /**
   * Get cases assigned to a doctor
   * Spec: master spec Section 5.1 — Case Queue
   */
  async getDoctorQueue(
    doctorId: string,
    filters: QueueFilters = {},
    take = 20,
    skip = 0,
  ): Promise<{ cases: CaseCard[] }> {
    await this.verifyDoctor(doctorId);

    const where: Record<string, unknown> = {
      doctorId,
      ...this.buildStatusFilter(filters.dashboardStatus),
    };

    if (filters.vertical) {
      where.vertical = filters.vertical;
    }

    const consultations = await this.prisma.consultation.findMany({
      where,
      include: {
        patient: {
          include: {
            patientProfile: true,
          },
        },
        aiAssessment: true,
        followUps: true,
      },
      orderBy: { createdAt: 'asc' },
      take,
      skip,
    });

    return {
      cases: consultations.map((c) => this.toCaseCard(c)),
    };
  }

  /**
   * Get all cases for admin
   */
  async getAdminQueue(
    adminId: string,
    filters: QueueFilters = {},
    take = 20,
    skip = 0,
  ): Promise<{ cases: CaseCard[] }> {
    await this.verifyAdmin(adminId);

    const where: Record<string, unknown> = {
      ...this.buildStatusFilter(filters.dashboardStatus),
    };

    if (filters.vertical) {
      where.vertical = filters.vertical;
    }

    const consultations = await this.prisma.consultation.findMany({
      where,
      include: {
        patient: {
          include: {
            patientProfile: true,
          },
        },
        aiAssessment: true,
        followUps: true,
      },
      orderBy: { createdAt: 'asc' },
      take,
      skip,
    });

    return {
      cases: consultations.map((c) => this.toCaseCard(c)),
    };
  }

  /**
   * Get unassigned cases (AI_REVIEWED, no doctor)
   */
  async getUnassignedCases(
    adminId: string,
    filters: QueueFilters = {},
    take = 20,
    skip = 0,
  ): Promise<{ cases: CaseCard[] }> {
    await this.verifyAdmin(adminId);

    const where: Record<string, unknown> = {
      status: ConsultationStatus.AI_REVIEWED,
      doctorId: null,
    };

    if (filters.vertical) {
      where.vertical = filters.vertical;
    }

    if (filters.attentionLevel) {
      where.aiAssessment = { riskLevel: filters.attentionLevel };
    }

    const consultations = await this.prisma.consultation.findMany({
      where,
      include: {
        patient: {
          include: {
            patientProfile: true,
          },
        },
        aiAssessment: true,
        followUps: true,
      },
      orderBy: { createdAt: 'asc' },
      take,
      skip,
    });

    return {
      cases: consultations.map((c) => this.toCaseCard(c)),
    };
  }

  /**
   * Get full case details
   * Spec: master spec Section 5.2 — Case Review
   */
  async getCaseDetail(consultationId: string, userId: string): Promise<CaseDetail> {
    const user = await this.verifyDoctorOrAdmin(userId);

    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        patient: {
          include: {
            patientProfile: true,
          },
        },
        intakeResponse: {
          include: {
            questionnaireTemplate: true,
          },
        },
        aiAssessment: true,
        prescription: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        labOrders: {
          orderBy: { orderedAt: 'desc' },
        },
        followUps: true,
        bookedSlots: {
          where: { status: 'BOOKED' },
          orderBy: { slotDate: 'asc' },
          take: 1,
        },
      },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    // Access control: doctors can only see their own cases
    if (user.role === UserRole.DOCTOR && consultation.doctorId !== userId) {
      throw new ForbiddenException('You do not have access to this case');
    }

    // Get patient photos
    const photos = await this.prisma.patientPhoto.findMany({
      where: {
        patientProfileId: consultation.intakeResponse.patientProfileId,
      },
      select: {
        id: true,
        type: true,
        url: true,
      },
    });

    const bookedSlot = (consultation as any).bookedSlots?.[0] || null;

    return {
      consultation: {
        id: consultation.id,
        status: consultation.status,
        vertical: consultation.vertical,
        createdAt: consultation.createdAt,
        doctorNotes: consultation.doctorNotes,
        videoRequested: (consultation as any).videoRequested ?? false,
        bookedSlot: bookedSlot ? {
          id: bookedSlot.id,
          videoSessionId: bookedSlot.videoSessionId,
          slotDate: bookedSlot.slotDate,
          startTime: bookedSlot.startTime,
          endTime: bookedSlot.endTime,
          status: bookedSlot.status,
        } : undefined,
      },
      patient: {
        name: consultation.patient.name,
        age: this.calculateAge(consultation.patient.patientProfile?.dateOfBirth || null),
        sex: consultation.patient.patientProfile?.gender || null,
        city: consultation.patient.patientProfile?.city || null,
        phone: consultation.patient.phone,
      },
      questionnaire: {
        responses: consultation.intakeResponse.responses,
        template: consultation.intakeResponse.questionnaireTemplate.schema,
      },
      aiAssessment: consultation.aiAssessment
        ? {
            summary: consultation.aiAssessment.summary,
            riskLevel: consultation.aiAssessment.riskLevel,
            flags: consultation.aiAssessment.flags,
            rawResponse: consultation.aiAssessment.rawResponse,
          }
        : null,
      photos,
      messages: consultation.messages.map((m) => ({
        id: m.id,
        content: m.content,
        senderId: m.senderId,
        createdAt: m.createdAt,
      })),
      prescription: consultation.prescription,
      labOrders: (consultation.labOrders || []).map((lo) => ({
        id: lo.id,
        testPanel: lo.testPanel,
        panelName: lo.panelName,
        status: lo.status,
        orderedAt: lo.orderedAt,
        resultFileUrl: lo.resultFileUrl,
        criticalValues: lo.criticalValues,
      })),
    };
  }

  /**
   * Get queue statistics for a doctor
   */
  async getQueueStats(doctorId: string): Promise<QueueStats> {
    await this.verifyDoctor(doctorId);

    const baseWhere = { doctorId };

    const [
      newCount,
      inReviewCount,
      awaitingResponseCount,
      labResultsReadyCount,
      followUpCount,
      completedCount,
      referredCount,
    ] = await Promise.all([
      this.prisma.consultation.count({
        where: {
          ...baseWhere,
          status: { in: [ConsultationStatus.PENDING_ASSESSMENT, ConsultationStatus.AI_REVIEWED] },
        },
      }),
      this.prisma.consultation.count({
        where: {
          ...baseWhere,
          status: { in: [ConsultationStatus.DOCTOR_REVIEWING, ConsultationStatus.VIDEO_SCHEDULED, ConsultationStatus.VIDEO_COMPLETED, ConsultationStatus.AWAITING_LABS] },
        },
      }),
      this.prisma.consultation.count({
        where: { ...baseWhere, status: ConsultationStatus.NEEDS_INFO },
      }),
      // Lab results ready - would need lab order integration
      this.prisma.consultation.count({
        where: { ...baseWhere, id: 'never-match' }, // Placeholder
      }),
      // Follow-up cases
      this.prisma.consultation.count({
        where: {
          ...baseWhere,
          followUps: {
            some: {
              isCompleted: false,
              scheduledAt: { lte: new Date() },
            },
          },
        },
      }),
      this.prisma.consultation.count({
        where: { ...baseWhere, status: ConsultationStatus.APPROVED },
      }),
      this.prisma.consultation.count({
        where: { ...baseWhere, status: ConsultationStatus.REJECTED },
      }),
    ]);

    const totalActive =
      newCount + inReviewCount + awaitingResponseCount + labResultsReadyCount + followUpCount;

    return {
      new: newCount,
      inReview: inReviewCount,
      awaitingResponse: awaitingResponseCount,
      labResultsReady: labResultsReadyCount,
      followUp: followUpCount,
      completed: completedCount,
      referred: referredCount,
      totalActive,
    };
  }
}
