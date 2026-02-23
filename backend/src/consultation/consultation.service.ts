import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIService, AIAssessment } from '../ai/ai.service';
import { Consultation, ConsultationStatus, HealthVertical, UserRole } from '@prisma/client';

// Spec: master spec Section 3.7 (Consultation Lifecycle)

// Valid status transitions per state machine
// Spec: submitted → assigned → reviewed → completed/referred
// Phase 13: Added VIDEO_SCHEDULED, VIDEO_COMPLETED, AWAITING_LABS for video consultation flow
export const VALID_STATUS_TRANSITIONS: Record<ConsultationStatus, ConsultationStatus[]> = {
  [ConsultationStatus.PENDING_ASSESSMENT]: [ConsultationStatus.AI_REVIEWED],
  [ConsultationStatus.AI_REVIEWED]: [ConsultationStatus.DOCTOR_REVIEWING],
  [ConsultationStatus.DOCTOR_REVIEWING]: [
    ConsultationStatus.APPROVED,
    ConsultationStatus.VIDEO_SCHEDULED,  // Phase 13: doctor requests video consultation
    ConsultationStatus.NEEDS_INFO,
    ConsultationStatus.REJECTED,
  ],
  [ConsultationStatus.VIDEO_SCHEDULED]: [
    ConsultationStatus.VIDEO_COMPLETED,  // Phase 13: video call completed
    ConsultationStatus.DOCTOR_REVIEWING, // Phase 13: video cancelled, back to reviewing
  ],
  [ConsultationStatus.VIDEO_COMPLETED]: [
    ConsultationStatus.APPROVED,         // Phase 13: doctor prescribes after video
    ConsultationStatus.AWAITING_LABS,    // Phase 13: doctor wants labs before prescribing
    ConsultationStatus.REJECTED,
  ],
  [ConsultationStatus.AWAITING_LABS]: [
    ConsultationStatus.APPROVED,         // Phase 13: labs reviewed, doctor prescribes
    ConsultationStatus.REJECTED,
  ],
  [ConsultationStatus.NEEDS_INFO]: [ConsultationStatus.DOCTOR_REVIEWING],
  [ConsultationStatus.APPROVED]: [], // Terminal state
  [ConsultationStatus.REJECTED]: [], // Terminal state
};

@Injectable()
export class ConsultationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService
  ) {}

  /**
   * Check if a status transition is valid
   * Spec: master spec Section 3.7 — Status machine
   */
  isValidTransition(
    currentStatus: ConsultationStatus,
    newStatus: ConsultationStatus
  ): boolean {
    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
  }

  /**
   * Update consultation status with validation
   */
  async updateStatus(
    consultationId: string,
    newStatus: ConsultationStatus,
    doctorId?: string,
    rejectionReason?: string
  ): Promise<Consultation> {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    if (!this.isValidTransition(consultation.status, newStatus)) {
      throw new BadRequestException(
        `Invalid status transition: ${consultation.status} → ${newStatus}`
      );
    }

    // Require rejection reason when rejecting
    if (newStatus === ConsultationStatus.REJECTED && !rejectionReason) {
      throw new BadRequestException('Rejection reason is required');
    }

    const updateData: any = {
      status: newStatus,
    };

    // Set completedAt when approving
    if (newStatus === ConsultationStatus.APPROVED) {
      updateData.completedAt = new Date();
    }

    // Set doctor when assigning
    if (doctorId && newStatus === ConsultationStatus.DOCTOR_REVIEWING) {
      updateData.doctorId = doctorId;
    }

    // Set rejection reason
    if (rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    return this.prisma.consultation.update({
      where: { id: consultationId },
      data: updateData,
    });
  }

  /**
   * Find available doctors by specialization for a vertical
   * Spec: master spec Section 6 — Routing
   */
  async findAvailableDoctors(vertical: HealthVertical) {
    const specializations = this.aiService.getDoctorSpecializations(vertical);

    return this.prisma.user.findMany({
      where: {
        role: UserRole.DOCTOR,
        isVerified: true,
        doctorProfile: {
          specialization: { in: specializations },
          isAvailable: true,
        },
      },
      include: { doctorProfile: true },
    });
  }

  /**
   * Doctor requests a video consultation — sets videoRequested flag
   * Patient picks a time slot; bookVideoSlot mutation handles the actual scheduling
   */
  async requestVideo(
    consultationId: string,
    doctorId: string,
  ): Promise<Consultation> {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    if (consultation.doctorId !== doctorId) {
      throw new ForbiddenException('Only the assigned doctor can request video');
    }

    if (consultation.status !== ConsultationStatus.DOCTOR_REVIEWING) {
      throw new BadRequestException('Consultation must be in DOCTOR_REVIEWING status');
    }

    return this.prisma.consultation.update({
      where: { id: consultationId },
      data: { videoRequested: true },
    });
  }

  /**
   * Assign consultation to a doctor
   */
  async assignToDoctor(
    consultationId: string,
    doctorId: string
  ): Promise<Consultation> {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    // Can only assign from AI_REVIEWED status
    if (consultation.status !== ConsultationStatus.AI_REVIEWED) {
      throw new BadRequestException('Consultation must be in AI_REVIEWED status to assign');
    }

    // Verify doctor exists and is valid
    const doctor = await this.prisma.user.findFirst({
      where: {
        id: doctorId,
        role: UserRole.DOCTOR,
        isVerified: true,
      },
      include: { doctorProfile: true },
    });

    if (!doctor) {
      throw new BadRequestException('Invalid doctor');
    }

    return this.prisma.consultation.update({
      where: { id: consultationId },
      data: {
        doctorId,
        status: ConsultationStatus.DOCTOR_REVIEWING,
      },
    });
  }

  /**
   * Store AI assessment result and transition status
   * Spec: master spec Section 6 — Store in consultation.aiAssessment
   */
  async storeAIAssessment(
    consultationId: string,
    assessment: AIAssessment
  ): Promise<Consultation> {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    // Calculate attention level
    const attentionLevel = this.aiService.calculateAttentionLevel(assessment);

    // Create AI pre-assessment record
    await this.prisma.aIPreAssessment.create({
      data: {
        consultationId,
        summary: assessment.summary,
        riskLevel: attentionLevel.toUpperCase(),
        recommendedPlan: assessment.recommended_protocol?.primary || null,
        flags: assessment.red_flags || [],
        rawResponse: assessment as any,
        modelVersion: 'claude-3-sonnet-20240229',
      },
    });

    // Transition to AI_REVIEWED
    return this.prisma.consultation.update({
      where: { id: consultationId },
      data: { status: ConsultationStatus.AI_REVIEWED },
    });
  }

  /**
   * Get photos associated with a consultation
   */
  async getConsultationPhotos(consultationId: string) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
      include: { intakeResponse: true },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    return this.prisma.patientPhoto.findMany({
      where: { patientProfileId: consultation.intakeResponse.patientProfileId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get consultations assigned to a doctor
   */
  async getDoctorQueue(doctorId: string) {
    return this.prisma.consultation.findMany({
      where: {
        doctorId,
        status: {
          in: [ConsultationStatus.DOCTOR_REVIEWING, ConsultationStatus.NEEDS_INFO],
        },
      },
      include: {
        patient: true,
        intakeResponse: true,
        aiAssessment: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get unassigned consultations (AI_REVIEWED, no doctor)
   */
  async getUnassignedConsultations(
    vertical?: HealthVertical,
    attentionLevel?: 'low' | 'medium' | 'high'
  ) {
    const where: any = {
      status: ConsultationStatus.AI_REVIEWED,
      doctorId: null,
    };

    if (vertical) {
      where.vertical = vertical;
    }

    if (attentionLevel) {
      where.aiAssessment = { riskLevel: attentionLevel.toUpperCase() };
    }

    return this.prisma.consultation.findMany({
      where,
      include: {
        patient: true,
        intakeResponse: true,
        aiAssessment: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get consultation by ID with all relations
   */
  async getConsultation(consultationId: string) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        patient: true,
        doctor: true,
        intakeResponse: {
          include: { questionnaireTemplate: true },
        },
        aiAssessment: true,
        prescription: true,
        messages: true,
      },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    return consultation;
  }

  /**
   * Get consultations for a patient
   */
  async getPatientConsultations(patientId: string) {
    return this.prisma.consultation.findMany({
      where: { patientId },
      include: {
        intakeResponse: true,
        aiAssessment: true,
        prescription: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
