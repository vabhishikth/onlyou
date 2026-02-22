import { Injectable, BadRequestException, ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { PharmacyAssignmentService } from './pharmacy-assignment.service';
import { UserRole } from '@prisma/client';

// Spec: Phase 15 Chunk 4 — Pharmacy Fulfillment Flows

@Injectable()
export class PharmacyFulfillmentService {
  private readonly logger = new Logger(PharmacyFulfillmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly assignmentService: PharmacyAssignmentService,
  ) {}

  /**
   * Validate staff has required permissions
   */
  private async validateStaffPermission(staffId: string, permission: 'canAcceptOrders' | 'canDispense' | 'canManageInventory'): Promise<any> {
    const staff = await this.prisma.pharmacyStaff.findUnique({ where: { id: staffId } });
    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    if (permission === 'canAcceptOrders') {
      if (staff.role !== 'PHARMACIST' || !staff.canAcceptOrders) {
        throw new ForbiddenException('Only PHARMACIST with canAcceptOrders permission can perform this action');
      }
    } else if (permission === 'canDispense') {
      if (!staff.canDispense) {
        throw new ForbiddenException('Staff does not have canDispense permission');
      }
    } else if (permission === 'canManageInventory') {
      if (!staff.canManageInventory) {
        throw new ForbiddenException('Staff does not have canManageInventory permission');
      }
    }

    return staff;
  }

  /**
   * Find order or throw
   */
  private async findOrder(orderId: string): Promise<any> {
    const order = await this.prisma.pharmacyOrder.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Pharmacy order not found');
    }
    return order;
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
   * Accept order
   * Spec: Phase 15 Chunk 4 — PHARMACIST + canAcceptOrders required. ASSIGNED -> PHARMACY_ACCEPTED
   */
  async acceptOrder(orderId: string, staffId: string) {
    await this.validateStaffPermission(staffId, 'canAcceptOrders');
    const order = await this.findOrder(orderId);

    const updated = await this.prisma.pharmacyOrder.update({
      where: { id: orderId },
      data: {
        status: 'PHARMACY_ACCEPTED',
        acceptedAt: new Date(),
        acceptedByStaffId: staffId,
      },
    });

    // Notify patient (fire-and-forget)
    this.notificationService.sendNotification({
      recipientId: order.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'PHARMACY_ORDER_ACCEPTED',
      title: 'Order Accepted',
      body: 'Your prescription order has been accepted and is being prepared.',
      data: { pharmacyOrderId: orderId },
    }).catch(err => {
      this.logger.error(`Failed to notify patient: ${err?.message}`);
    });

    this.logger.log(`Order ${orderId} accepted by staff ${staffId}`);
    return updated;
  }

  /**
   * Reject order
   * Spec: Phase 15 Chunk 4 — PHARMACIST + canAcceptOrders required. Triggers reassignment.
   * Doctor gets specific reason, patient gets vague message.
   */
  async rejectOrder(orderId: string, staffId: string, reason: string) {
    await this.validateStaffPermission(staffId, 'canAcceptOrders');
    const order = await this.findOrder(orderId);

    await this.prisma.pharmacyOrder.update({
      where: { id: orderId },
      data: {
        status: 'PHARMACY_REJECTED',
        rejectionReason: reason,
        rejectedByStaffId: staffId,
      },
    });

    // Notify doctor with specific reason (fire-and-forget)
    this.notificationService.sendNotification({
      recipientId: order.consultationId, // resolved via consultation's doctor
      recipientRole: 'DOCTOR',
      channel: 'PUSH',
      eventType: 'PHARMACY_ORDER_REJECTED_DOCTOR',
      title: 'Pharmacy Rejected Order',
      body: `Pharmacy rejected prescription order. Reason: ${reason}.`,
      data: { pharmacyOrderId: orderId, reason },
    }).catch(err => {
      this.logger.error(`Failed to notify doctor: ${err?.message}`);
    });

    // Notify patient with vague message — no specific details (fire-and-forget)
    this.notificationService.sendNotification({
      recipientId: order.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'PHARMACY_ORDER_REJECTED_PATIENT',
      title: 'Order Update',
      body: 'Your order is being reassigned to another pharmacy for faster processing.',
      data: { pharmacyOrderId: orderId },
    }).catch(err => {
      this.logger.error(`Failed to notify patient: ${err?.message}`);
    });

    // Trigger reassignment
    await this.assignmentService.reassignPharmacy(orderId, reason);

    this.logger.log(`Order ${orderId} rejected by staff ${staffId}: ${reason}`);
  }

  /**
   * Report stock issue
   * Spec: Phase 15 Chunk 4 — Status -> STOCK_ISSUE. Auto-update inventory. Admin alert.
   */
  async reportStockIssue(orderId: string, staffId: string, missingItems: string[]) {
    await this.validateStaffPermission(staffId, 'canAcceptOrders');
    const order = await this.findOrder(orderId);

    const updated = await this.prisma.pharmacyOrder.update({
      where: { id: orderId },
      data: {
        status: 'STOCK_ISSUE',
        stockIssueDetails: JSON.stringify(missingItems),
      },
    });

    // Auto-update inventory for missing items
    for (const item of missingItems) {
      await this.prisma.pharmacyInventory.upsert({
        where: {
          pharmacyId_medicationName: { pharmacyId: order.pharmacyId, medicationName: item },
        },
        update: { isInStock: false, quantity: 0, lastUpdatedById: staffId },
        create: {
          pharmacyId: order.pharmacyId,
          medicationName: item,
          isInStock: false,
          quantity: 0,
          lastUpdatedById: staffId,
        },
      });
    }

    // Admin alert (fire-and-forget)
    this.notifyAdmin(
      'PHARMACY_STOCK_ISSUE',
      'Pharmacy Stock Issue',
      `Stock issue for order ${orderId}. Missing: ${missingItems.join(', ')}.`,
      { pharmacyOrderId: orderId, missingItems },
    );

    this.logger.log(`Stock issue reported for order ${orderId}: ${missingItems.join(', ')}`);
    return updated;
  }

  /**
   * Propose substitution
   * Spec: Phase 15 Chunk 4 — PHARMACIST only. Status -> AWAITING_SUBSTITUTION_APPROVAL.
   */
  async proposeSubstitution(orderId: string, staffId: string, substitutionDetails: Record<string, any>) {
    const staff = await this.prisma.pharmacyStaff.findUnique({ where: { id: staffId } });
    if (!staff || staff.role !== 'PHARMACIST') {
      throw new ForbiddenException('Only PHARMACIST can propose substitutions');
    }

    const order = await this.findOrder(orderId);

    const updated = await this.prisma.pharmacyOrder.update({
      where: { id: orderId },
      data: {
        status: 'AWAITING_SUBSTITUTION_APPROVAL',
        substitutionDetails: JSON.stringify(substitutionDetails),
        substitutionProposedByStaffId: staffId,
      },
    });

    // Notify doctor about pending substitution (fire-and-forget)
    this.notificationService.sendNotification({
      recipientId: order.consultationId,
      recipientRole: 'DOCTOR',
      channel: 'PUSH',
      eventType: 'SUBSTITUTION_APPROVAL_NEEDED',
      title: 'Substitution Approval Needed',
      body: `Pharmacy has proposed a medication substitution. Please review and approve/reject.`,
      data: { pharmacyOrderId: orderId, substitutionDetails },
    }).catch(err => {
      this.logger.error(`Failed to notify doctor: ${err?.message}`);
    });

    this.logger.log(`Substitution proposed for order ${orderId} by pharmacist ${staffId}`);
    return updated;
  }

  /**
   * Approve substitution (doctor action)
   * Spec: Phase 15 Chunk 4 — Status -> PREPARING
   */
  async approveSubstitution(orderId: string, doctorId: string) {
    await this.findOrder(orderId);

    const updated = await this.prisma.pharmacyOrder.update({
      where: { id: orderId },
      data: {
        status: 'PREPARING',
        substitutionApprovedBy: doctorId,
      },
    });

    this.logger.log(`Substitution approved for order ${orderId} by doctor ${doctorId}`);
    return updated;
  }

  /**
   * Reject substitution (doctor action)
   * Spec: Phase 15 Chunk 4 — Status -> STOCK_ISSUE. Admin alert.
   */
  async rejectSubstitution(orderId: string, doctorId: string, reason: string) {
    await this.findOrder(orderId);

    const updated = await this.prisma.pharmacyOrder.update({
      where: { id: orderId },
      data: {
        status: 'STOCK_ISSUE',
      },
    });

    // Admin alert
    await this.notifyAdmin(
      'SUBSTITUTION_REJECTED',
      'Substitution Rejected by Doctor',
      `Doctor rejected substitution for order ${orderId}. Reason: ${reason}. Manual intervention needed.`,
      { pharmacyOrderId: orderId, reason, doctorId },
    );

    this.logger.log(`Substitution rejected for order ${orderId} by doctor ${doctorId}: ${reason}`);
    return updated;
  }

  /**
   * Confirm discreet packaging
   * Spec: Phase 15 Chunk 4 — Non-negotiable gate for markReadyForPickup
   */
  async confirmDiscreetPackaging(orderId: string, staffId: string) {
    await this.validateStaffPermission(staffId, 'canAcceptOrders');
    await this.findOrder(orderId);

    const updated = await this.prisma.pharmacyOrder.update({
      where: { id: orderId },
      data: {
        isDiscreetPackagingConfirmed: true,
        discreetPackagingConfirmedById: staffId,
      },
    });

    this.logger.log(`Discreet packaging confirmed for order ${orderId} by staff ${staffId}`);
    return updated;
  }

  /**
   * Mark ready for pickup
   * Spec: Phase 15 Chunk 4 — Gate: discreet packaging confirmed. canDispense required.
   * Generates 4-digit OTP. Status -> READY_FOR_PICKUP.
   */
  async markReadyForPickup(orderId: string, staffId: string) {
    await this.validateStaffPermission(staffId, 'canDispense');
    const order = await this.findOrder(orderId);

    // Gate: discreet packaging MUST be confirmed
    if (!order.isDiscreetPackagingConfirmed) {
      throw new BadRequestException('Discreet packaging must be confirmed before marking ready for pickup');
    }

    // Generate 4-digit delivery OTP
    const otp = String(Math.floor(1000 + Math.random() * 9000));

    const updated = await this.prisma.pharmacyOrder.update({
      where: { id: orderId },
      data: {
        status: 'READY_FOR_PICKUP',
        readyForPickupAt: new Date(),
        deliveryOtp: otp,
      },
    });

    this.logger.log(`Order ${orderId} marked ready for pickup by staff ${staffId}`);
    return updated;
  }

  /**
   * Update inventory
   * Spec: Phase 15 Chunk 4 — canManageInventory required. Tracks which staff updated.
   */
  async updateInventory(pharmacyId: string, staffId: string, updates: Array<{ medicationName: string; isInStock: boolean; quantity: number; genericName?: string }>) {
    await this.validateStaffPermission(staffId, 'canManageInventory');

    for (const item of updates) {
      await this.prisma.pharmacyInventory.upsert({
        where: {
          pharmacyId_medicationName: { pharmacyId, medicationName: item.medicationName },
        },
        update: {
          isInStock: item.isInStock,
          quantity: item.quantity,
          lastUpdatedById: staffId,
          lastUpdatedAt: new Date(),
        },
        create: {
          pharmacyId,
          medicationName: item.medicationName,
          genericName: item.genericName,
          isInStock: item.isInStock,
          quantity: item.quantity,
          lastUpdatedById: staffId,
        },
      });
    }

    this.logger.log(`Inventory updated for pharmacy ${pharmacyId} by staff ${staffId}: ${updates.length} items`);
  }
}
