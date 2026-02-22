import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { UserRole } from '@prisma/client';
import { requiresColdChain } from './constants';

// Spec: Phase 15 Chunk 3 — Pharmacy Assignment Engine

export interface PharmacyAssignmentResult {
  assigned: boolean;
  pharmacyId?: string;
  pharmacyName?: string;
  pharmacyOrderId?: string;
  reason: 'assigned' | 'no_eligible_pharmacy' | 'reassigned';
}

interface EligiblePharmacy {
  id: string;
  name: string;
  pincode: string;
  currentQueueSize: number;
  dailyOrderLimit: number;
  coldChainVerified: boolean;
  staff: Array<{ id: string; role: string; canAcceptOrders: boolean; isActive: boolean; userId: string }>;
}

interface AssignmentContext {
  prescriptionId: string;
  patientId: string;
  consultationId: string;
  medications: Array<{ name?: string; genericName?: string }>;
  patientCity: string;
  patientPincode: string;
  patientAddress: string;
  excludePharmacyIds: string[];
}

@Injectable()
export class PharmacyAssignmentService {
  private readonly logger = new Logger(PharmacyAssignmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Pure function: check if medications require cold chain
   * Spec: Phase 15 Chunk 3 — semaglutide, liraglutide, dulaglutide, insulin, tirzepatide
   */
  determineColdChainRequirement(medications: Array<{ name?: string; genericName?: string }>): boolean {
    return requiresColdChain(medications);
  }

  /**
   * Rank eligible pharmacies: lowest queue first, pincode match as tie-breaker
   */
  private rankPharmacies(pharmacies: EligiblePharmacy[], patientPincode: string): EligiblePharmacy[] {
    return [...pharmacies].sort((a, b) => {
      // Primary: lowest queue size
      if (a.currentQueueSize !== b.currentQueueSize) {
        return a.currentQueueSize - b.currentQueueSize;
      }
      // Tie-breaker: same pincode as patient preferred
      const aMatch = a.pincode === patientPincode ? 0 : 1;
      const bMatch = b.pincode === patientPincode ? 0 : 1;
      return aMatch - bMatch;
    });
  }

  /**
   * Send admin notification helper
   */
  private async notifyAdmin(eventType: string, title: string, body: string, data?: Record<string, any>): Promise<void> {
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
   * Extract address from patient profile (supports addressLine1/addressLine2 and legacy address field)
   */
  private extractAddress(profile: any): string {
    if (!profile) return '';
    // Support both schema formats
    if (profile.addressLine1 || profile.addressLine2) {
      return [profile.addressLine1, profile.addressLine2].filter(Boolean).join(', ');
    }
    return profile.address || '';
  }

  /**
   * Core assignment logic shared by assignPharmacy and reassignPharmacy
   */
  private async performAssignment(ctx: AssignmentContext): Promise<PharmacyAssignmentResult> {
    const needsColdChain = this.determineColdChainRequirement(ctx.medications);
    const now = new Date();

    // Find eligible pharmacies: ACTIVE, same city, not excluded
    const pharmacies = await this.prisma.pharmacy.findMany({
      where: {
        status: 'ACTIVE',
        city: ctx.patientCity,
        ...(ctx.excludePharmacyIds.length > 0 && { id: { notIn: ctx.excludePharmacyIds } }),
      },
      include: { staff: true },
    });

    // Filter eligible pharmacies
    const eligible: EligiblePharmacy[] = pharmacies.filter((pharmacy: any) => {
      // Skip at or over capacity
      if (pharmacy.currentQueueSize >= pharmacy.dailyOrderLimit) return false;

      // Skip expired license
      if (pharmacy.drugLicenseExpiry && pharmacy.drugLicenseExpiry <= now) return false;

      // Cold chain requirement: must be verified (not just capable)
      if (needsColdChain && !pharmacy.coldChainVerified) return false;

      return true;
    });

    if (eligible.length === 0) {
      await this.notifyAdmin(
        'NO_ELIGIBLE_PHARMACY',
        'No Available Pharmacy',
        `No eligible pharmacy found for prescription ${ctx.prescriptionId} in ${ctx.patientCity}. Manual assignment needed.`,
        { prescriptionId: ctx.prescriptionId, patientCity: ctx.patientCity, needsColdChain },
      );

      return { assigned: false, reason: 'no_eligible_pharmacy' };
    }

    // Rank and pick best pharmacy
    const ranked = this.rankPharmacies(eligible, ctx.patientPincode);
    const bestPharmacy = ranked[0];

    // Generate unique order number: PO-XXXXXX
    const orderNumber = `PO-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    // Create PharmacyOrder
    const pharmacyOrder = await this.prisma.pharmacyOrder.create({
      data: {
        orderNumber,
        prescriptionId: ctx.prescriptionId,
        pharmacyId: bestPharmacy.id,
        patientId: ctx.patientId,
        consultationId: ctx.consultationId,
        status: 'ASSIGNED',
        assignedAt: now,
        requiresColdChain: needsColdChain,
        deliveryCity: ctx.patientCity,
        deliveryPincode: ctx.patientPincode,
        deliveryAddress: ctx.patientAddress,
      },
    });

    // Increment pharmacy queue
    await this.prisma.pharmacy.update({
      where: { id: bestPharmacy.id },
      data: { currentQueueSize: { increment: 1 } },
    });

    // Notify pharmacy staff with canAcceptOrders (fire-and-forget)
    const staffToNotify = bestPharmacy.staff.filter(
      (s: any) => s.canAcceptOrders && s.isActive,
    );

    for (const staff of staffToNotify) {
      this.notificationService.sendNotification({
        recipientId: staff.userId,
        recipientRole: 'PHARMACY',
        channel: 'PUSH',
        eventType: 'PHARMACY_ORDER_ASSIGNED',
        title: 'New Order Assigned',
        body: `New prescription order assigned to your pharmacy. Please review and accept.`,
        data: { pharmacyOrderId: pharmacyOrder.id, prescriptionId: ctx.prescriptionId },
      }).catch(err => {
        this.logger.error(`Failed to notify staff ${staff.userId}: ${err?.message}`);
      });
    }

    this.logger.log(
      `Assigned prescription ${ctx.prescriptionId} to pharmacy ${bestPharmacy.name} (queue: ${bestPharmacy.currentQueueSize + 1}/${bestPharmacy.dailyOrderLimit})`,
    );

    return {
      assigned: true,
      pharmacyId: bestPharmacy.id,
      pharmacyName: bestPharmacy.name,
      pharmacyOrderId: pharmacyOrder.id,
      reason: 'assigned',
    };
  }

  /**
   * Assign best pharmacy to a prescription
   * Spec: Phase 15 Chunk 3 — Extract meds, detect cold chain, find eligible, rank, create order
   */
  async assignPharmacy(prescriptionId: string, excludePharmacyIds: string[] = []): Promise<PharmacyAssignmentResult> {
    // Load prescription with consultation + patient info
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        consultation: {
          include: {
            patient: {
              include: { patientProfile: true },
            },
          },
        },
      },
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    const ctx: AssignmentContext = {
      prescriptionId,
      patientId: prescription.consultation?.patientId || '',
      consultationId: prescription.consultationId,
      medications: (prescription.medications as any[]) || [],
      patientCity: prescription.consultation?.patient?.patientProfile?.city || '',
      patientPincode: prescription.consultation?.patient?.patientProfile?.pincode || '',
      patientAddress: this.extractAddress(prescription.consultation?.patient?.patientProfile),
      excludePharmacyIds,
    };

    return this.performAssignment(ctx);
  }

  /**
   * Reassign pharmacy order: decrement old queue, exclude old pharmacy, re-run assignment
   * Spec: Phase 15 Chunk 3 — Called when pharmacy rejects or SLA breaches
   */
  async reassignPharmacy(pharmacyOrderId: string, reason: string): Promise<PharmacyAssignmentResult> {
    const existingOrder = await this.prisma.pharmacyOrder.findFirst({
      where: { id: pharmacyOrderId },
      include: {
        prescription: {
          include: {
            consultation: {
              include: {
                patient: {
                  include: { patientProfile: true },
                },
              },
            },
          },
        },
      },
    });

    if (!existingOrder) {
      throw new NotFoundException('Pharmacy order not found');
    }

    const oldPharmacyId = existingOrder.pharmacyId;

    // Decrement old pharmacy queue if it was assigned
    if (oldPharmacyId) {
      await this.prisma.pharmacy.update({
        where: { id: oldPharmacyId },
        data: { currentQueueSize: { decrement: 1 } },
      });
    }

    // Build context from existing order data
    const prescription = existingOrder.prescription;
    const ctx: AssignmentContext = {
      prescriptionId: existingOrder.prescriptionId,
      patientId: existingOrder.patientId,
      consultationId: existingOrder.consultationId,
      medications: (prescription?.medications as any[]) || [],
      patientCity: existingOrder.deliveryCity || '',
      patientPincode: existingOrder.deliveryPincode || '',
      patientAddress: existingOrder.deliveryAddress || '',
      excludePharmacyIds: oldPharmacyId ? [oldPharmacyId] : [],
    };

    const result = await this.performAssignment(ctx);

    if (!result.assigned) {
      // Notify admin about reassignment failure
      await this.notifyAdmin(
        'REASSIGNMENT_FAILED',
        'Pharmacy Reassignment Failed',
        `Could not find alternative pharmacy for order ${pharmacyOrderId}. Reason: ${reason}.`,
        { pharmacyOrderId, reason, prescriptionId: existingOrder.prescriptionId },
      );
    }

    return result;
  }
}
