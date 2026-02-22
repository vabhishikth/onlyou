import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { UserRole } from '@prisma/client';

// Spec: Phase 16 Chunk 1 — Phlebotomist Onboarding

export interface RegisterPhlebotomistInput {
  name: string;
  phone: string;
  email?: string;
  city: string;
  assignedLabId: string;
  serviceableAreas?: string[];
  maxDailyCapacity?: number;
}

export interface UploadPhlebotomistDocumentsInput {
  certificationDocumentUrl?: string;
  certificationNumber?: string;
  certificationExpiry?: Date;
  trainingDocumentUrl?: string;
}

@Injectable()
export class PhlebotomistOnboardingService {
  private readonly logger = new Logger(PhlebotomistOnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Register a new phlebotomist
   * Spec: Phase 16 Chunk 1 — Status → PENDING_VERIFICATION. Must be assigned to ACTIVE lab.
   */
  async registerPhlebotomist(adminId: string, input: RegisterPhlebotomistInput) {
    if (!input.name || input.name.trim() === '') {
      throw new BadRequestException('Phlebotomist name is required');
    }
    if (!input.phone || input.phone.trim() === '') {
      throw new BadRequestException('Phone is required');
    }
    if (!input.city || input.city.trim() === '') {
      throw new BadRequestException('City is required');
    }

    // Validate assigned lab exists and is ACTIVE
    const assignedLab = await this.prisma.partnerLab.findUnique({
      where: { id: input.assignedLabId },
    });
    if (!assignedLab) {
      throw new NotFoundException('Assigned partner lab not found');
    }
    if (assignedLab.status !== 'ACTIVE') {
      throw new BadRequestException('Phlebotomist must be assigned to an ACTIVE partner lab');
    }

    const phlebotomist = await this.prisma.labPhlebotomist.create({
      data: {
        name: input.name,
        phone: input.phone,
        email: input.email,
        city: input.city,
        assignedLabId: input.assignedLabId,
        serviceableAreas: input.serviceableAreas || [],
        maxDailyCapacity: input.maxDailyCapacity ?? 10,
        status: 'PHLEB_PENDING_VERIFICATION',
        onboardedById: adminId,
      },
    });

    this.logger.log(`Phlebotomist registered: ${input.name} (${input.city}) by admin ${adminId}`);
    return phlebotomist;
  }

  /**
   * Upload phlebotomist documents
   * Spec: Phase 16 Chunk 1 — Certification, ID proof, training completion form
   */
  async uploadPhlebotomistDocuments(phlebotomistId: string, _adminId: string, documents: UploadPhlebotomistDocumentsInput) {
    const phleb = await this.prisma.labPhlebotomist.findUnique({ where: { id: phlebotomistId } });
    if (!phleb) {
      throw new NotFoundException('Phlebotomist not found');
    }

    const updateData: any = {};
    if (documents.certificationDocumentUrl) updateData.certificationDocumentUrl = documents.certificationDocumentUrl;
    if (documents.certificationNumber) updateData.certificationNumber = documents.certificationNumber;
    if (documents.certificationExpiry) updateData.certificationExpiry = documents.certificationExpiry;
    if (documents.trainingDocumentUrl) updateData.trainingDocumentUrl = documents.trainingDocumentUrl;

    return this.prisma.labPhlebotomist.update({
      where: { id: phlebotomistId },
      data: updateData,
    });
  }

  /**
   * Start training
   * Spec: Phase 16 Chunk 1 — Status → TRAINING
   */
  async startTraining(phlebotomistId: string, _adminId: string) {
    const phleb = await this.prisma.labPhlebotomist.findUnique({ where: { id: phlebotomistId } });
    if (!phleb) {
      throw new NotFoundException('Phlebotomist not found');
    }

    return this.prisma.labPhlebotomist.update({
      where: { id: phlebotomistId },
      data: { status: 'PHLEB_TRAINING' },
    });
  }

  /**
   * Complete training
   * Spec: Phase 16 Chunk 1 — Does NOT auto-activate. Still needs equipment + background check.
   */
  async completeTraining(phlebotomistId: string, _adminId: string, trainingDate: Date) {
    const phleb = await this.prisma.labPhlebotomist.findUnique({ where: { id: phlebotomistId } });
    if (!phleb) {
      throw new NotFoundException('Phlebotomist not found');
    }

    return this.prisma.labPhlebotomist.update({
      where: { id: phlebotomistId },
      data: {
        trainingCompletedAt: trainingDate,
      },
    });
  }

  /**
   * Verify equipment
   * Spec: Phase 16 Chunk 1 — Admin verifies phlebotomist has all required equipment
   */
  async verifyEquipment(phlebotomistId: string, adminId: string, checklist: Record<string, any>) {
    const phleb = await this.prisma.labPhlebotomist.findUnique({ where: { id: phlebotomistId } });
    if (!phleb) {
      throw new NotFoundException('Phlebotomist not found');
    }

    return this.prisma.labPhlebotomist.update({
      where: { id: phlebotomistId },
      data: {
        equipmentChecklist: checklist,
        equipmentVerifiedAt: new Date(),
        equipmentVerifiedById: adminId,
      },
    });
  }

  /**
   * Update background verification
   * Spec: Phase 16 Chunk 1 — PENDING → IN_PROGRESS → VERIFIED or FAILED
   */
  async updateBackgroundVerification(phlebotomistId: string, _adminId: string, status: string) {
    const phleb = await this.prisma.labPhlebotomist.findUnique({ where: { id: phlebotomistId } });
    if (!phleb) {
      throw new NotFoundException('Phlebotomist not found');
    }

    const updateData: any = { backgroundVerificationStatus: status };
    if (status === 'BG_VERIFIED' || status === 'BG_FAILED') {
      updateData.backgroundVerificationCompletedAt = new Date();
    }

    return this.prisma.labPhlebotomist.update({
      where: { id: phlebotomistId },
      data: updateData,
    });
  }

  /**
   * Activate phlebotomist
   * Spec: Phase 16 Chunk 1 — ALL checks must pass:
   * 1. Training completed
   * 2. Equipment verified
   * 3. Background verification = VERIFIED
   * 4. Assigned lab is ACTIVE
   * 5. At least one serviceable area pincode set
   */
  async activatePhlebotomist(phlebotomistId: string, adminId: string) {
    const phleb = await this.prisma.labPhlebotomist.findUnique({ where: { id: phlebotomistId } });
    if (!phleb) {
      throw new NotFoundException('Phlebotomist not found');
    }

    // Check 1: Training completed
    if (!phleb.trainingCompletedAt) {
      throw new BadRequestException('Cannot activate: training not completed');
    }

    // Check 2: Equipment verified
    if (!phleb.equipmentVerifiedAt) {
      throw new BadRequestException('Cannot activate: equipment not verified');
    }

    // Check 3: Background verification
    if (phleb.backgroundVerificationStatus === 'BG_FAILED') {
      throw new BadRequestException('Cannot activate: background check failed');
    }
    if (phleb.backgroundVerificationStatus !== 'BG_VERIFIED') {
      throw new BadRequestException('Cannot activate: background check pending');
    }

    // Check 4: Assigned lab is ACTIVE
    const lab = await this.prisma.partnerLab.findUnique({ where: { id: phleb.assignedLabId } });
    if (!lab || lab.status !== 'ACTIVE') {
      throw new BadRequestException('Cannot activate: assigned lab not active');
    }

    // Check 5: At least one serviceable area
    if (!phleb.serviceableAreas || phleb.serviceableAreas.length === 0) {
      throw new BadRequestException('Cannot activate: no service areas defined');
    }

    return this.prisma.labPhlebotomist.update({
      where: { id: phlebotomistId },
      data: {
        status: 'PHLEB_ACTIVE',
        isActive: true,
        activatedById: adminId,
        activatedAt: new Date(),
      },
    });
  }

  /**
   * Suspend phlebotomist
   * Spec: Phase 16 Chunk 1 — Quality issues, patient complaints, etc.
   */
  async suspendPhlebotomist(phlebotomistId: string, adminId: string, reason: string) {
    const phleb = await this.prisma.labPhlebotomist.findUnique({ where: { id: phlebotomistId } });
    if (!phleb) {
      throw new NotFoundException('Phlebotomist not found');
    }

    return this.prisma.labPhlebotomist.update({
      where: { id: phlebotomistId },
      data: {
        status: 'PHLEB_SUSPENDED',
        isActive: false,
        suspensionReason: reason,
        suspendedById: adminId,
      },
    });
  }

  /**
   * Update serviceable areas
   * Spec: Phase 16 Chunk 1 — Admin manages coverage, not phlebotomist
   */
  async updateServiceableAreas(phlebotomistId: string, _adminId: string, pincodes: string[]) {
    const phleb = await this.prisma.labPhlebotomist.findUnique({ where: { id: phlebotomistId } });
    if (!phleb) {
      throw new NotFoundException('Phlebotomist not found');
    }

    return this.prisma.labPhlebotomist.update({
      where: { id: phlebotomistId },
      data: { serviceableAreas: pincodes },
    });
  }

  /**
   * Check expiring credentials (scheduled job)
   * Spec: Phase 16 Chunk 1 — Phlebotomist certification expiring → alert. Expired → auto-suspend.
   */
  @Cron('0 9 * * *')
  async checkExpiringCredentials() {
    this.logger.log('Running phlebotomist credential expiry check...');

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      select: { id: true },
    });
    const adminIds = admins.map((a: any) => a.id);

    const phlebotomistsWithExpiringCerts = await this.prisma.labPhlebotomist.findMany({
      where: {
        status: 'PHLEB_ACTIVE',
        certificationExpiry: { lte: thirtyDaysFromNow },
      },
    });

    for (const phleb of phlebotomistsWithExpiringCerts) {
      try {
        const isExpired = phleb.certificationExpiry && phleb.certificationExpiry <= now;

        if (isExpired) {
          // Auto-suspend
          await this.prisma.labPhlebotomist.update({
            where: { id: phleb.id },
            data: {
              status: 'PHLEB_SUSPENDED',
              isActive: false,
              suspensionReason: 'Certification expired — auto-suspended',
            },
          });

          for (const adminId of adminIds) {
            await this.notificationService.sendNotification({
              recipientId: adminId,
              recipientRole: 'ADMIN',
              channel: 'PUSH',
              eventType: 'PHLEBOTOMIST_CERTIFICATION_EXPIRED',
              title: 'URGENT: Phlebotomist Auto-Suspended',
              body: `Phlebotomist ${phleb.name} auto-suspended: certification expired.`,
            });
          }

          this.logger.warn(`Phlebotomist ${phleb.name} auto-suspended: certification expired`);
        } else {
          // Expiring soon — alert only
          for (const adminId of adminIds) {
            await this.notificationService.sendNotification({
              recipientId: adminId,
              recipientRole: 'ADMIN',
              channel: 'PUSH',
              eventType: 'PHLEBOTOMIST_CERTIFICATION_EXPIRING',
              title: 'Phlebotomist Certification Expiring',
              body: `Phlebotomist ${phleb.name} certification expires on ${phleb.certificationExpiry?.toISOString().split('T')[0]}.`,
            });
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to process credential check for phlebotomist ${phleb.id}: ${message}`);
      }
    }

    this.logger.log(`Phlebotomist credential check complete. Checked: ${phlebotomistsWithExpiringCerts.length}`);
  }
}
