import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { PharmacyAssignmentService } from './pharmacy-assignment.service';
import { UserRole } from '@prisma/client';

// Spec: Phase 15 Chunk 9 — Returns + Damaged Medication + Payment Validation

@Injectable()
export class ReturnsService {
  private readonly logger = new Logger(ReturnsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly assignmentService: PharmacyAssignmentService,
  ) {}

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
   * Report damaged order
   * Spec: Phase 15 Chunk 9 — Patient submits photos + description. Admin reviews.
   */
  async reportDamagedOrder(orderId: string, patientId: string, photos: string[], description: string) {
    const order = await this.prisma.pharmacyOrder.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Pharmacy order not found');
    }

    if (order.patientId !== patientId) {
      throw new BadRequestException('You can only report damage for your own orders');
    }

    const updated = await this.prisma.pharmacyOrder.update({
      where: { id: orderId },
      data: {
        status: 'DAMAGE_REPORTED',
        damageReportPhotos: photos,
        damageReportDescription: description,
        damageReportedAt: new Date(),
      },
    });

    // Notify admin for review
    await this.notifyAdmin(
      'DAMAGE_REPORT_SUBMITTED',
      'Damage Report Submitted',
      `Patient reported damaged medication for order ${orderId}. Review required.`,
      { pharmacyOrderId: orderId, patientId },
    );

    this.logger.log(`Damage reported for order ${orderId} by patient ${patientId}`);
    return updated;
  }

  /**
   * Approve damage report
   * Spec: Phase 15 Chunk 9 — Admin approves, triggers free replacement PharmacyOrder.
   */
  async approveDamageReport(orderId: string, adminId: string) {
    const order = await this.prisma.pharmacyOrder.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Pharmacy order not found');
    }

    if (order.status !== 'DAMAGE_REPORTED') {
      throw new BadRequestException('Order is not in DAMAGE_REPORTED status');
    }

    const updated = await this.prisma.pharmacyOrder.update({
      where: { id: orderId },
      data: {
        status: 'DAMAGE_APPROVED',
        damageApprovedById: adminId,
        damageApprovedAt: new Date(),
      },
    });

    // Trigger free replacement order via assignment
    await this.assignmentService.assignPharmacy(order.prescriptionId);

    this.logger.log(`Damage report approved for order ${orderId} by admin ${adminId}. Replacement triggered.`);
    return updated;
  }

  /**
   * Process return
   * Spec: Phase 15 Chunk 9 — No returns on opened meds. Sealed/unopened within 48h -> accepted.
   */
  async processReturn(orderId: string, patientId: string, reason: string) {
    const order = await this.prisma.pharmacyOrder.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Pharmacy order not found');
    }

    if (order.patientId !== patientId) {
      throw new BadRequestException('You can only return your own orders');
    }

    // Check if medication is opened
    if (order.isOpened) {
      throw new BadRequestException('Cannot return opened medication. Returns are only accepted for sealed/unopened packages.');
    }

    // Check 48-hour window
    if (order.deliveredAt) {
      const hoursSinceDelivery = (Date.now() - new Date(order.deliveredAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceDelivery > 48) {
        throw new BadRequestException('Returns are only accepted within 48 hours of delivery.');
      }
    }

    const updated = await this.prisma.pharmacyOrder.update({
      where: { id: orderId },
      data: {
        status: 'RETURN_ACCEPTED',
        returnReason: reason,
        returnRequestedAt: new Date(),
      },
    });

    this.logger.log(`Return accepted for order ${orderId} by patient ${patientId}: ${reason}`);
    return updated;
  }

  /**
   * Handle cold chain breach
   * Spec: Phase 15 Chunk 9 — Auto-replacement for cold chain breach. No questions asked.
   */
  async handleColdChainBreach(orderId: string) {
    const order = await this.prisma.pharmacyOrder.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Pharmacy order not found');
    }

    if (!order.requiresColdChain) {
      throw new BadRequestException('This order does not require cold chain handling');
    }

    await this.prisma.pharmacyOrder.update({
      where: { id: orderId },
      data: {
        status: 'COLD_CHAIN_BREACH',
        coldChainBreachAt: new Date(),
      },
    });

    // Auto-trigger replacement — no admin approval needed for cold chain
    await this.assignmentService.assignPharmacy(order.prescriptionId);

    // Admin notification
    await this.notifyAdmin(
      'COLD_CHAIN_BREACH',
      'Cold Chain Breach — Auto-Replacement',
      `Cold chain breach detected for order ${orderId}. Replacement order auto-created.`,
      { pharmacyOrderId: orderId },
    );

    this.logger.log(`Cold chain breach for order ${orderId}. Auto-replacement triggered.`);
  }

  /**
   * Validate payment before order
   * Spec: Phase 15 Chunk 9 — Active subscription required to proceed with pharmacy order.
   */
  async validatePaymentBeforeOrder(patientId: string, consultationId: string): Promise<{ valid: boolean; reason?: string }> {
    // Get the consultation's vertical to check subscription
    const prescription = await this.prisma.prescription.findUnique({
      where: { consultationId },
      include: { consultation: true },
    });

    if (!prescription?.consultation) {
      return { valid: false, reason: 'NO_ACTIVE_SUBSCRIPTION' };
    }

    const vertical = prescription.consultation.vertical;

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId: patientId,
        plan: { vertical },
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return { valid: false, reason: 'NO_ACTIVE_SUBSCRIPTION' };
    }

    if (subscription.status !== 'ACTIVE') {
      return { valid: false, reason: 'SUBSCRIPTION_EXPIRED' };
    }

    return { valid: true };
  }

  /**
   * Handle payment for blood work
   * Spec: Phase 15 Chunk 9 — Separate charge unless included in subscription tier.
   */
  async handlePaymentForBloodWork(patientId: string, labOrderId: string): Promise<{ requiresPayment: boolean; reason: string }> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId: patientId,
        status: 'ACTIVE',
      },
      include: { plan: true },
    });

    if (!subscription) {
      return { requiresPayment: true, reason: 'NO_ACTIVE_SUBSCRIPTION' };
    }

    // Check if blood work is included in the plan
    if (subscription.plan?.includesBloodWork) {
      return { requiresPayment: false, reason: 'INCLUDED_IN_PLAN' };
    }

    return { requiresPayment: true, reason: 'NOT_INCLUDED_IN_PLAN' };
  }
}
