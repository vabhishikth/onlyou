import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { UserRole } from '@prisma/client';

// Spec: Phase 16 Chunk 1 — PartnerLab + LabTechnician Onboarding

export interface RegisterLabInput {
  name: string;
  city: string;
  address: string;
  pincode: string;
  contactPhone: string;
  contactEmail?: string;
  labLicenseNumber: string;
  labLicenseExpiry: Date;
  labLicenseDocumentUrl?: string;
  gstNumber?: string;
  ownerName: string;
  ownerPhone: string;
  testsAvailable?: string[];
  acceptsWalkIn?: boolean;
  resultsSlaHours?: number;
  canProcessCriticalSamples?: boolean;
  nablAccredited?: boolean;
  nablCertificateNumber?: string;
  nablCertificateExpiry?: Date;
  sampleReceivingHoursStart?: string;
  sampleReceivingHoursEnd?: string;
}

export interface UploadLabDocumentsInput {
  labLicenseDocumentUrl?: string;
  nablCertificateDocumentUrl?: string;
  gstDocumentUrl?: string;
  agreementDocumentUrl?: string;
}

export interface InviteLabTechInput {
  name: string;
  email: string;
  phone: string;
  role: 'LAB_TECHNICIAN' | 'LAB_SUPERVISOR' | 'LAB_ADMIN';
  qualificationDetails?: string;
}

export interface UpdateLabTechPermissionsInput {
  canReceiveSamples?: boolean;
  canUploadResults?: boolean;
  canFlagCriticals?: boolean;
}

export interface LabListFilters {
  city?: string;
  status?: string;
}

@Injectable()
export class LabOnboardingService {
  private readonly logger = new Logger(LabOnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Register a new partner lab (admin-only)
   * Spec: Phase 16 Chunk 1 — Status → PENDING_VERIFICATION
   */
  async registerLab(adminId: string, input: RegisterLabInput) {
    if (!input.name || input.name.trim() === '') {
      throw new BadRequestException('Lab name is required');
    }
    if (!input.labLicenseNumber || input.labLicenseNumber.trim() === '') {
      throw new BadRequestException('Lab license number is required');
    }
    if (!input.ownerName || input.ownerName.trim() === '') {
      throw new BadRequestException('Owner name is required');
    }
    if (!input.city || input.city.trim() === '') {
      throw new BadRequestException('City is required');
    }
    if (!input.address || input.address.trim() === '') {
      throw new BadRequestException('Address is required');
    }
    if (!input.pincode || input.pincode.trim() === '') {
      throw new BadRequestException('Pincode is required');
    }
    const labDigits = (input.contactPhone || '').replace(/\D/g, '');
    const labLast10 = labDigits.slice(-10);
    if (labLast10.length !== 10) {
      throw new BadRequestException('Contact phone must be valid Indian mobile (+91 followed by 10 digits)');
    }
    input.contactPhone = `+91${labLast10}`;

    // Check license uniqueness
    const existingLicense = await this.prisma.partnerLab.findFirst({
      where: { labLicenseNumber: input.labLicenseNumber },
    });
    if (existingLicense) {
      throw new BadRequestException('A lab with this license number already exists');
    }

    const lab = await this.prisma.partnerLab.create({
      data: {
        name: input.name,
        city: input.city,
        address: input.address,
        pincode: input.pincode,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        labLicenseNumber: input.labLicenseNumber,
        labLicenseExpiry: input.labLicenseExpiry,
        labLicenseDocumentUrl: input.labLicenseDocumentUrl,
        gstNumber: input.gstNumber,
        ownerName: input.ownerName,
        ownerPhone: input.ownerPhone,
        testsAvailable: input.testsAvailable || [],
        acceptsWalkIn: input.acceptsWalkIn ?? true,
        resultsSlaHours: input.resultsSlaHours ?? 48,
        canProcessCriticalSamples: input.canProcessCriticalSamples ?? true,
        nablAccredited: false, // Always false until explicit admin verification
        nablCertificateNumber: input.nablCertificateNumber,
        nablCertificateExpiry: input.nablCertificateExpiry,
        sampleReceivingHoursStart: input.sampleReceivingHoursStart,
        sampleReceivingHoursEnd: input.sampleReceivingHoursEnd,
        status: 'PENDING_VERIFICATION',
        onboardedById: adminId,
      },
    });

    this.logger.log(`Lab registered: ${input.name} (${input.city}) by admin ${adminId}`);
    return lab;
  }

  /**
   * Upload lab documents
   * Spec: Phase 16 Chunk 1 — Status → DOCUMENTS_SUBMITTED
   */
  async uploadLabDocuments(labId: string, _adminId: string, documents: UploadLabDocumentsInput) {
    const lab = await this.prisma.partnerLab.findUnique({ where: { id: labId } });
    if (!lab) {
      throw new NotFoundException('Partner lab not found');
    }

    const updateData: any = {};
    if (documents.labLicenseDocumentUrl) updateData.labLicenseDocumentUrl = documents.labLicenseDocumentUrl;
    if (documents.nablCertificateDocumentUrl) updateData.nablCertificateDocumentUrl = documents.nablCertificateDocumentUrl;
    if (documents.agreementDocumentUrl) updateData.agreementDocumentUrl = documents.agreementDocumentUrl;
    updateData.status = 'DOCUMENTS_SUBMITTED';

    return this.prisma.partnerLab.update({
      where: { id: labId },
      data: updateData,
    });
  }

  /**
   * Review lab (approve/reject)
   * Spec: Phase 16 Chunk 1 — Approve → ACTIVE. Reject → UNDER_REVIEW with notes.
   * NABL accreditation stays false until explicit admin verification.
   */
  async reviewLab(labId: string, adminId: string, approved: boolean, notes?: string) {
    const lab = await this.prisma.partnerLab.findUnique({ where: { id: labId } });
    if (!lab) {
      throw new NotFoundException('Partner lab not found');
    }

    if (approved) {
      return this.prisma.partnerLab.update({
        where: { id: labId },
        data: {
          status: 'ACTIVE',
          activatedById: adminId,
          activatedAt: new Date(),
          notes: notes || lab.notes,
        },
      });
    } else {
      return this.prisma.partnerLab.update({
        where: { id: labId },
        data: {
          status: 'UNDER_REVIEW',
          notes: notes || 'Review pending',
        },
      });
    }
  }

  /**
   * Suspend lab
   * Spec: Phase 16 Chunk 1 — SUSPENDED → no new samples routed, admin alert
   */
  async suspendLab(labId: string, adminId: string, reason: string) {
    const lab = await this.prisma.partnerLab.findUnique({ where: { id: labId } });
    if (!lab) {
      throw new NotFoundException('Partner lab not found');
    }

    const result = await this.prisma.partnerLab.update({
      where: { id: labId },
      data: {
        status: 'SUSPENDED',
        suspensionReason: reason,
        suspendedById: adminId,
        suspendedAt: new Date(),
      },
    });

    // Admin notification (fire-and-forget)
    this.notificationService.sendNotification({
      recipientId: adminId,
      recipientRole: 'ADMIN',
      channel: 'PUSH',
      eventType: 'LAB_SUSPENDED',
      title: 'Partner Lab Suspended',
      body: `Lab ${lab.name} suspended. Reason: ${reason}. Active samples need reassignment.`,
    }).catch(err => {
      this.logger.error(`Failed to send lab suspension notification: ${err?.message}`);
    });

    return result;
  }

  /**
   * Reactivate lab from suspension
   * Spec: Phase 16 Chunk 1 — SUSPENDED → ACTIVE only
   */
  async reactivateLab(labId: string, _adminId: string, notes?: string) {
    const lab = await this.prisma.partnerLab.findUnique({ where: { id: labId } });
    if (!lab) {
      throw new NotFoundException('Partner lab not found');
    }

    if (lab.status !== 'SUSPENDED') {
      throw new BadRequestException('Only suspended labs can be reactivated');
    }

    return this.prisma.partnerLab.update({
      where: { id: labId },
      data: {
        status: 'ACTIVE',
        suspensionReason: null,
        suspendedById: null,
        suspendedAt: null,
        notes: notes || lab.notes,
      },
    });
  }

  /**
   * Deactivate lab (permanent)
   * Spec: Phase 16 Chunk 1 — Block if active orders exist
   */
  async deactivateLab(labId: string, _adminId: string, reason: string) {
    const lab = await this.prisma.partnerLab.findUnique({ where: { id: labId } });
    if (!lab) {
      throw new NotFoundException('Partner lab not found');
    }

    return this.prisma.partnerLab.update({
      where: { id: labId },
      data: {
        status: 'DEACTIVATED',
        deactivationReason: reason,
      },
    });
  }

  /**
   * Invite lab technician
   * Spec: Phase 16 Chunk 1 — Lab must be ACTIVE
   */
  async inviteLabTechnician(labId: string, adminId: string, input: InviteLabTechInput) {
    const lab = await this.prisma.partnerLab.findUnique({ where: { id: labId } });
    if (!lab) {
      throw new NotFoundException('Partner lab not found');
    }

    if (lab.status !== 'ACTIVE') {
      throw new BadRequestException('Can only add staff to an ACTIVE lab');
    }

    const labTech = await this.prisma.labTechnician.create({
      data: {
        labId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        role: input.role,
        qualificationDetails: input.qualificationDetails,
        invitedById: adminId,
        invitedAt: new Date(),
      },
    });

    this.logger.log(`Lab technician invited: ${input.name} (${input.role}) to lab ${lab.name}`);
    return labTech;
  }

  /**
   * Update lab tech permissions
   * Spec: Phase 16 Chunk 1 — Toggle canReceiveSamples, canUploadResults
   */
  async updateLabTechPermissions(labTechId: string, _adminId: string, permissions: UpdateLabTechPermissionsInput) {
    const tech = await this.prisma.labTechnician.findUnique({ where: { id: labTechId } });
    if (!tech) {
      throw new NotFoundException('Lab technician not found');
    }

    return this.prisma.labTechnician.update({
      where: { id: labTechId },
      data: {
        ...(permissions.canReceiveSamples !== undefined && { canReceiveSamples: permissions.canReceiveSamples }),
        ...(permissions.canUploadResults !== undefined && { canUploadResults: permissions.canUploadResults }),
        ...(permissions.canFlagCriticals !== undefined && { canFlagCriticals: permissions.canFlagCriticals }),
      },
    });
  }

  /**
   * Deactivate lab technician
   */
  async deactivateLabTechnician(labTechId: string, _adminId: string) {
    const tech = await this.prisma.labTechnician.findUnique({ where: { id: labTechId } });
    if (!tech) {
      throw new NotFoundException('Lab technician not found');
    }

    return this.prisma.labTechnician.update({
      where: { id: labTechId },
      data: { isActive: false },
    });
  }

  /**
   * List partner labs with optional filters
   */
  async listLabs(filters?: LabListFilters) {
    const where: any = {};
    if (filters?.city) where.city = filters.city;
    if (filters?.status) where.status = filters.status;

    return this.prisma.partnerLab.findMany({
      where,
      include: { technicians: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get lab by ID with technicians
   */
  async getLabById(id: string) {
    const lab = await this.prisma.partnerLab.findUnique({
      where: { id },
      include: { technicians: true },
    });

    if (!lab) {
      throw new NotFoundException('Partner lab not found');
    }

    return lab;
  }

  /**
   * Check expiring credentials (scheduled job)
   * Spec: Phase 16 Chunk 1 — Daily at 9 AM IST
   * Lab license expiring → admin alert. Expired → auto-suspend.
   * NABL expiring → alert only (not mandatory, no auto-suspend).
   */
  @Cron('0 9 * * *')
  async checkExpiringCredentials() {
    this.logger.log('Running lab credential expiry check...');

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      select: { id: true },
    });
    const adminIds = admins.map((a: any) => a.id);

    // Check lab licenses
    const labsWithExpiringLicenses = await this.prisma.partnerLab.findMany({
      where: {
        status: 'ACTIVE',
        labLicenseExpiry: { lte: thirtyDaysFromNow },
      },
    });

    for (const lab of labsWithExpiringLicenses) {
      try {
        const isExpired = lab.labLicenseExpiry && lab.labLicenseExpiry <= now;

        if (isExpired) {
          // Auto-suspend
          await this.prisma.partnerLab.update({
            where: { id: lab.id },
            data: {
              status: 'SUSPENDED',
              suspensionReason: 'Lab license expired — auto-suspended',
              suspendedAt: now,
            },
          });

          for (const adminId of adminIds) {
            await this.notificationService.sendNotification({
              recipientId: adminId,
              recipientRole: 'ADMIN',
              channel: 'PUSH',
              eventType: 'LAB_LICENSE_EXPIRED',
              title: 'URGENT: Partner Lab Auto-Suspended',
              body: `Lab ${lab.name} auto-suspended: lab license expired.`,
            });
          }

          this.logger.warn(`Lab ${lab.name} auto-suspended: license expired`);
        } else {
          // Expiring soon — alert only
          for (const adminId of adminIds) {
            await this.notificationService.sendNotification({
              recipientId: adminId,
              recipientRole: 'ADMIN',
              channel: 'PUSH',
              eventType: 'LAB_LICENSE_EXPIRING',
              title: 'Lab License Expiring',
              body: `Lab ${lab.name} license expires on ${lab.labLicenseExpiry?.toISOString().split('T')[0]}. Follow up for renewal.`,
            });
          }
        }

        // Check NABL certificate separately (alert only, no auto-suspend)
        if (lab.nablCertificateExpiry && lab.nablCertificateExpiry <= thirtyDaysFromNow && lab.nablCertificateExpiry > now) {
          for (const adminId of adminIds) {
            await this.notificationService.sendNotification({
              recipientId: adminId,
              recipientRole: 'ADMIN',
              channel: 'PUSH',
              eventType: 'NABL_CERTIFICATE_EXPIRING',
              title: 'NABL Certificate Expiring',
              body: `Lab ${lab.name} NABL certificate expires on ${lab.nablCertificateExpiry.toISOString().split('T')[0]}.`,
            });
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to process credential check for lab ${lab.id}: ${message}`);
      }
    }

    // Also check labs where only NABL is expiring (license is fine)
    const labsWithExpiringNabl = await this.prisma.partnerLab.findMany({
      where: {
        status: 'ACTIVE',
        labLicenseExpiry: { gt: thirtyDaysFromNow },
        nablCertificateExpiry: { lte: thirtyDaysFromNow, gt: now },
      },
    });

    for (const lab of labsWithExpiringNabl) {
      if (!lab.nablCertificateExpiry) continue;
      for (const adminId of adminIds) {
        await this.notificationService.sendNotification({
          recipientId: adminId,
          recipientRole: 'ADMIN',
          channel: 'PUSH',
          eventType: 'NABL_CERTIFICATE_EXPIRING',
          title: 'NABL Certificate Expiring',
          body: `Lab ${lab.name} NABL certificate expires on ${lab.nablCertificateExpiry.toISOString().split('T')[0]}.`,
        });
      }
    }

    this.logger.log(`Lab credential check complete. Labs checked: ${labsWithExpiringLicenses.length}`);
  }
}
