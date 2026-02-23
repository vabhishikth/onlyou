import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { UserRole } from '@prisma/client';

// Spec: Phase 15 — Pharmacy Onboarding + Management

export interface RegisterPharmacyInput {
  name: string;
  city: string;
  address: string;
  pincode: string;
  contactPhone: string;
  contactEmail?: string;
  drugLicenseNumber: string;
  drugLicenseExpiry?: Date;
  gstNumber?: string;
  pharmacyRegistrationNumber?: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  hasColdChainCapability?: boolean;
  servicesAvailable?: string[];
  dailyOrderLimit?: number;
  operatingHoursStart?: string;
  operatingHoursEnd?: string;
}

export interface UploadDocumentsInput {
  drugLicenseDocumentUrl?: string;
  gstDocumentUrl?: string;
  agreementDocumentUrl?: string;
  pharmacistRegistrationDocumentUrl?: string;
}

export interface InviteStaffInput {
  name: string;
  phone: string;
  email?: string;
  role: 'PHARMACIST' | 'DISPENSER' | 'DELIVERY_COORDINATOR' | 'PHARMACY_ADMIN';
  pharmacistRegistrationNumber?: string;
  pharmacistRegistrationExpiry?: Date;
}

export interface UpdatePermissionsInput {
  canAcceptOrders?: boolean;
  canDispense?: boolean;
  canManageInventory?: boolean;
}

export interface PharmacyListFilters {
  city?: string;
  status?: string;
}

@Injectable()
export class PharmacyOnboardingService {
  private readonly logger = new Logger(PharmacyOnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Register a new pharmacy (admin-only)
   * Spec: Phase 15 Chunk 1 — Admin creates pharmacy, status -> PENDING_VERIFICATION
   */
  async registerPharmacy(adminId: string, input: RegisterPharmacyInput) {
    // Validate required fields
    if (!input.name || input.name.trim() === '') {
      throw new BadRequestException('Pharmacy name is required');
    }
    if (!input.drugLicenseNumber || input.drugLicenseNumber.trim() === '') {
      throw new BadRequestException('Drug license number is required');
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

    // Normalize and validate phone format
    const contactDigits = (input.contactPhone || '').replace(/\D/g, '');
    const contactLast10 = contactDigits.slice(-10);
    if (contactLast10.length !== 10) {
      throw new BadRequestException('Contact phone must be valid Indian mobile (+91 followed by 10 digits)');
    }
    input.contactPhone = `+91${contactLast10}`;

    // Check drug license uniqueness
    const existingLicense = await this.prisma.pharmacy.findFirst({
      where: { drugLicenseNumber: input.drugLicenseNumber },
    });
    if (existingLicense) {
      throw new BadRequestException('A pharmacy with this drug license number already exists');
    }

    const pharmacy = await this.prisma.pharmacy.create({
      data: {
        name: input.name,
        city: input.city,
        address: input.address,
        pincode: input.pincode,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        drugLicenseNumber: input.drugLicenseNumber,
        drugLicenseExpiry: input.drugLicenseExpiry,
        gstNumber: input.gstNumber,
        pharmacyRegistrationNumber: input.pharmacyRegistrationNumber,
        ownerName: input.ownerName,
        ownerPhone: input.ownerPhone,
        ownerEmail: input.ownerEmail,
        hasColdChainCapability: input.hasColdChainCapability || false,
        servicesAvailable: input.servicesAvailable || ['standard'],
        dailyOrderLimit: input.dailyOrderLimit || 50,
        operatingHoursStart: input.operatingHoursStart,
        operatingHoursEnd: input.operatingHoursEnd,
        status: 'PENDING_VERIFICATION',
        onboardedById: adminId,
      },
    });

    this.logger.log(`Pharmacy registered: ${input.name} (${input.city}) by admin ${adminId}`);

    return pharmacy;
  }

  /**
   * Upload pharmacy documents
   * Spec: Phase 15 Chunk 1 — Status -> DOCUMENTS_SUBMITTED
   */
  async uploadPharmacyDocuments(pharmacyId: string, _adminId: string, documents: UploadDocumentsInput) {
    const pharmacy = await this.prisma.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }

    const updateData: any = {};
    if (documents.drugLicenseDocumentUrl) updateData.drugLicenseDocumentUrl = documents.drugLicenseDocumentUrl;
    if (documents.gstDocumentUrl) updateData.gstDocumentUrl = documents.gstDocumentUrl;
    if (documents.agreementDocumentUrl) updateData.agreementDocumentUrl = documents.agreementDocumentUrl;
    updateData.status = 'DOCUMENTS_SUBMITTED';

    return this.prisma.pharmacy.update({
      where: { id: pharmacyId },
      data: updateData,
    });
  }

  /**
   * Review pharmacy (approve/reject)
   * Spec: Phase 15 Chunk 1 — Approve -> ACTIVE, Reject -> UNDER_REVIEW with notes
   */
  async reviewPharmacy(pharmacyId: string, adminId: string, approved: boolean, notes?: string) {
    const pharmacy = await this.prisma.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }

    if (approved) {
      return this.prisma.pharmacy.update({
        where: { id: pharmacyId },
        data: {
          status: 'ACTIVE',
          activatedById: adminId,
          activatedAt: new Date(),
          notes: notes || pharmacy.notes,
        },
      });
    } else {
      return this.prisma.pharmacy.update({
        where: { id: pharmacyId },
        data: {
          status: 'UNDER_REVIEW',
          notes: notes || 'Review pending',
        },
      });
    }
  }

  /**
   * Suspend pharmacy
   * Spec: Phase 15 Chunk 1 — Status -> SUSPENDED, admin alert for order reassignment
   */
  async suspendPharmacy(pharmacyId: string, adminId: string, reason: string) {
    const pharmacy = await this.prisma.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }

    const result = await this.prisma.pharmacy.update({
      where: { id: pharmacyId },
      data: {
        status: 'SUSPENDED',
        suspensionReason: reason,
        suspendedById: adminId,
        suspendedAt: new Date(),
      },
    });

    // Notify admins about suspension (fire-and-forget)
    this.notificationService.sendNotification({
      recipientId: adminId,
      recipientRole: 'ADMIN',
      channel: 'PUSH',
      eventType: 'PHARMACY_SUSPENDED',
      title: 'Pharmacy Suspended',
      body: `Pharmacy ${pharmacy.name} has been suspended. Reason: ${reason}. Active orders need reassignment.`,
    }).catch(err => {
      this.logger.error(`Failed to send suspension notification: ${err?.message}`);
    });

    return result;
  }

  /**
   * Reactivate pharmacy from suspension
   * Spec: Phase 15 Chunk 1 — Status -> ACTIVE from SUSPENDED only
   */
  async reactivatePharmacy(pharmacyId: string, _adminId: string, notes?: string) {
    const pharmacy = await this.prisma.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }

    if (pharmacy.status !== 'SUSPENDED') {
      throw new BadRequestException('Only suspended pharmacies can be reactivated');
    }

    return this.prisma.pharmacy.update({
      where: { id: pharmacyId },
      data: {
        status: 'ACTIVE',
        suspensionReason: null,
        suspendedById: null,
        suspendedAt: null,
        notes: notes || pharmacy.notes,
      },
    });
  }

  /**
   * Deactivate pharmacy (permanent)
   * Spec: Phase 15 Chunk 1 — Block if active orders exist
   */
  async deactivatePharmacy(pharmacyId: string, _adminId: string, reason: string) {
    const pharmacy = await this.prisma.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }

    // Check for active orders
    const activeOrders = await this.prisma.pharmacyOrder.count({
      where: {
        pharmacyId,
        status: { notIn: ['DELIVERED', 'CANCELLED', 'DELIVERY_FAILED'] },
      },
    });

    if (activeOrders > 0) {
      throw new BadRequestException(
        `Cannot deactivate: ${activeOrders} active orders. Reassign or complete them first.`,
      );
    }

    return this.prisma.pharmacy.update({
      where: { id: pharmacyId },
      data: {
        status: 'DEACTIVATED',
        deactivationReason: reason,
      },
    });
  }

  /**
   * Invite pharmacy staff
   * Spec: Phase 15 Chunk 1 — Creates User (role=PHARMACY) + PharmacyStaff in transaction
   */
  async invitePharmacyStaff(pharmacyId: string, adminId: string, input: InviteStaffInput) {
    const pharmacy = await this.prisma.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }

    if (pharmacy.status !== 'ACTIVE') {
      throw new BadRequestException('Can only add staff to an ACTIVE pharmacy');
    }

    // PHARMACIST role requires registration number
    if (input.role === 'PHARMACIST' && (!input.pharmacistRegistrationNumber || input.pharmacistRegistrationNumber.trim() === '')) {
      throw new BadRequestException('Pharmacist registration number is required for PHARMACIST role');
    }

    // Normalize and validate phone format
    const staffDigits = (input.phone || '').replace(/\D/g, '');
    const staffLast10 = staffDigits.slice(-10);
    if (staffLast10.length !== 10) {
      throw new BadRequestException('Phone must be valid Indian mobile (+91 followed by 10 digits)');
    }
    input.phone = `+91${staffLast10}`;

    // Check phone uniqueness
    const existingPhone = await this.prisma.user.findFirst({
      where: { phone: input.phone },
    });
    if (existingPhone) {
      throw new BadRequestException('A user with this phone number already exists');
    }

    // Transaction: create User + PharmacyStaff
    const staff = await this.prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          phone: input.phone,
          email: input.email,
          name: input.name,
          role: UserRole.PHARMACY,
          isVerified: true,
        },
      });

      const pharmacyStaff = await tx.pharmacyStaff.create({
        data: {
          pharmacyId,
          userId: user.id,
          name: input.name,
          email: input.email,
          phone: input.phone,
          role: input.role,
          pharmacistRegistrationNumber: input.pharmacistRegistrationNumber || null,
          pharmacistRegistrationExpiry: input.pharmacistRegistrationExpiry || null,
          invitedById: adminId,
          invitedAt: new Date(),
        },
      });

      return pharmacyStaff;
    });

    // Send invite notification (fire-and-forget)
    this.notificationService.sendNotification({
      recipientId: staff.userId,
      recipientRole: 'PHARMACY',
      channel: 'SMS',
      eventType: 'PHARMACY_STAFF_INVITED',
      title: 'Welcome to Onlyou Pharmacy Portal',
      body: `You've been invited to ${pharmacy.name} on Onlyou. Login at pharmacy.onlyou.life with your phone number.`,
    }).catch(err => {
      this.logger.error(`Failed to send staff invite notification: ${err?.message}`);
    });

    this.logger.log(`Staff invited: ${input.name} (${input.role}) to pharmacy ${pharmacy.name}`);

    return staff;
  }

  /**
   * Update staff permissions
   * Spec: Phase 15 Chunk 1 — Only PHARMACIST can have canAcceptOrders=true
   */
  async updatePharmacyStaffPermissions(staffId: string, _adminId: string, permissions: UpdatePermissionsInput) {
    const staff = await this.prisma.pharmacyStaff.findUnique({ where: { id: staffId } });
    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    // Only PHARMACIST can accept orders (regulatory requirement)
    if (permissions.canAcceptOrders === true && staff.role !== 'PHARMACIST') {
      throw new BadRequestException('Only PHARMACIST role can have canAcceptOrders permission');
    }

    return this.prisma.pharmacyStaff.update({
      where: { id: staffId },
      data: {
        ...(permissions.canAcceptOrders !== undefined && { canAcceptOrders: permissions.canAcceptOrders }),
        ...(permissions.canDispense !== undefined && { canDispense: permissions.canDispense }),
        ...(permissions.canManageInventory !== undefined && { canManageInventory: permissions.canManageInventory }),
      },
    });
  }

  /**
   * Deactivate staff member
   * Spec: Phase 15 Chunk 1 — isActive -> false, revokes access
   */
  async deactivatePharmacyStaff(staffId: string, _adminId: string) {
    const staff = await this.prisma.pharmacyStaff.findUnique({ where: { id: staffId } });
    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    return this.prisma.pharmacyStaff.update({
      where: { id: staffId },
      data: { isActive: false },
    });
  }

  /**
   * Check expiring credentials (scheduled job)
   * Spec: Phase 15 Chunk 1 — Daily at 9 AM. Expiring in 30 days -> alert. Expired -> auto-suspend.
   */
  @Cron('0 9 * * *')
  async checkExpiringCredentials() {
    this.logger.log('Running pharmacy credential expiry check...');

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Find admins for notifications
    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      select: { id: true },
    });
    const adminIds = admins.map((a: any) => a.id);

    // Check pharmacy drug licenses
    const pharmaciesWithExpiringLicenses = await this.prisma.pharmacy.findMany({
      where: {
        status: 'ACTIVE',
        drugLicenseExpiry: { lte: thirtyDaysFromNow },
      },
    });

    for (const pharmacy of pharmaciesWithExpiringLicenses) {
      try {
        const isExpired = pharmacy.drugLicenseExpiry && pharmacy.drugLicenseExpiry <= now;

        if (isExpired) {
          // Auto-suspend
          await this.prisma.pharmacy.update({
            where: { id: pharmacy.id },
            data: {
              status: 'SUSPENDED',
              suspensionReason: 'Drug license expired — auto-suspended',
              suspendedAt: now,
            },
          });

          for (const adminId of adminIds) {
            await this.notificationService.sendNotification({
              recipientId: adminId,
              recipientRole: 'ADMIN',
              channel: 'PUSH',
              eventType: 'PHARMACY_LICENSE_EXPIRED',
              title: 'URGENT: Pharmacy Auto-Suspended',
              body: `Pharmacy ${pharmacy.name} has been auto-suspended due to expired drug license.`,
            });
          }

          this.logger.warn(`Pharmacy ${pharmacy.name} auto-suspended: drug license expired`);
        } else {
          // Expiring soon — alert
          for (const adminId of adminIds) {
            await this.notificationService.sendNotification({
              recipientId: adminId,
              recipientRole: 'ADMIN',
              channel: 'PUSH',
              eventType: 'PHARMACY_LICENSE_EXPIRING',
              title: 'Pharmacy License Expiring',
              body: `Pharmacy ${pharmacy.name} drug license expires on ${pharmacy.drugLicenseExpiry?.toISOString().split('T')[0]}. Follow up for renewal.`,
            });
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to process credential check for pharmacy ${pharmacy.id}: ${message}`);
      }
    }

    // Check pharmacist registrations
    const staffWithExpiringRegistrations = await this.prisma.pharmacyStaff.findMany({
      where: {
        isActive: true,
        role: 'PHARMACIST',
        pharmacistRegistrationExpiry: { lte: thirtyDaysFromNow },
      },
    });

    for (const staff of staffWithExpiringRegistrations) {
      try {
        const isExpired = staff.pharmacistRegistrationExpiry && staff.pharmacistRegistrationExpiry <= now;

        if (isExpired) {
          await this.prisma.pharmacyStaff.update({
            where: { id: staff.id },
            data: { isActive: false },
          });

          for (const adminId of adminIds) {
            await this.notificationService.sendNotification({
              recipientId: adminId,
              recipientRole: 'ADMIN',
              channel: 'PUSH',
              eventType: 'PHARMACIST_REGISTRATION_EXPIRED',
              title: 'Pharmacist Registration Expired',
              body: `Pharmacist ${staff.name} registration expired. Staff deactivated.`,
            });
          }

          this.logger.warn(`Pharmacist ${staff.name} deactivated: registration expired`);
        } else {
          for (const adminId of adminIds) {
            await this.notificationService.sendNotification({
              recipientId: adminId,
              recipientRole: 'ADMIN',
              channel: 'PUSH',
              eventType: 'PHARMACIST_REGISTRATION_EXPIRING',
              title: 'Pharmacist Registration Expiring',
              body: `Pharmacist ${staff.name} registration expires on ${staff.pharmacistRegistrationExpiry?.toISOString().split('T')[0]}.`,
            });
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to process credential check for staff ${staff.id}: ${message}`);
      }
    }

    this.logger.log(
      `Credential check complete. Pharmacies: ${pharmaciesWithExpiringLicenses.length}, Staff: ${staffWithExpiringRegistrations.length}`,
    );
  }

  /**
   * List pharmacies with optional filters
   */
  async listPharmacies(filters?: PharmacyListFilters) {
    const where: any = {};
    if (filters?.city) where.city = filters.city;
    if (filters?.status) where.status = filters.status;

    return this.prisma.pharmacy.findMany({
      where,
      include: { staff: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get pharmacy by ID with staff
   */
  async getPharmacyById(id: string) {
    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: { id },
      include: { staff: true },
    });

    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }

    return pharmacy;
  }
}
