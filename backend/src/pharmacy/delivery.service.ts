import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { UserRole } from '@prisma/client';

// Spec: Phase 15 Chunk 5 — Delivery Tracking + OTP Confirmation

// Statuses where address update is still allowed (before dispatch)
const PRE_DISPATCH_STATUSES = [
  'PENDING_ASSIGNMENT',
  'ASSIGNED',
  'PHARMACY_ACCEPTED',
  'PREPARING',
  'STOCK_ISSUE',
  'AWAITING_SUBSTITUTION_APPROVAL',
  'READY_FOR_PICKUP',
];

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
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
   * Dispatch order for delivery
   * Spec: Phase 15 Chunk 5 — Status -> OUT_FOR_DELIVERY. Create DeliveryTracking. Set SLA.
   */
  async dispatchOrder(orderId: string, deliveryPersonName: string, deliveryPersonPhone: string) {
    const order = await this.prisma.pharmacyOrder.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Pharmacy order not found');
    }

    const now = new Date();
    const isColdChain = order.requiresColdChain;

    // Update order status
    const updated = await this.prisma.pharmacyOrder.update({
      where: { id: orderId },
      data: {
        status: 'OUT_FOR_DELIVERY',
        dispatchedAt: now,
      },
    });

    // Create delivery tracking record
    await this.prisma.deliveryTracking.create({
      data: {
        pharmacyOrderId: orderId,
        status: 'PICKED_UP',
        statusUpdatedAt: now,
        deliveryPersonName,
        deliveryPersonPhone,
        attemptNumber: (order.deliveryAttempts || 0) + 1,
        isColdChain: isColdChain || false,
      },
    });

    // Notify patient (fire-and-forget)
    this.notificationService.sendNotification({
      recipientId: order.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'ORDER_DISPATCHED',
      title: 'Order Out for Delivery',
      body: `Your order is on its way! Share OTP with delivery person to receive your package.`,
      data: { pharmacyOrderId: orderId },
    }).catch(err => {
      this.logger.error(`Failed to notify patient: ${err?.message}`);
    });

    this.logger.log(`Order ${orderId} dispatched to ${deliveryPersonName}${isColdChain ? ' (cold chain)' : ''}`);
    return updated;
  }

  /**
   * Update delivery tracking status
   * Spec: Phase 15 Chunk 5 — ARRIVED triggers patient notification with OTP reminder
   */
  async updateDeliveryStatus(orderId: string, newStatus: string, notes?: string) {
    const order = await this.prisma.pharmacyOrder.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Pharmacy order not found');
    }

    // Find active tracking record
    const tracking = await this.prisma.deliveryTracking.findFirst({
      where: { pharmacyOrderId: orderId },
      orderBy: { createdAt: 'desc' },
    });

    if (!tracking) {
      throw new NotFoundException('Delivery tracking not found');
    }

    const updated = await this.prisma.deliveryTracking.update({
      where: { id: tracking.id },
      data: {
        status: newStatus,
        statusUpdatedAt: new Date(),
        notes: notes || tracking.notes,
      },
    });

    // If ARRIVED, notify patient with OTP reminder
    if (newStatus === 'ARRIVED') {
      this.notificationService.sendNotification({
        recipientId: order.patientId,
        recipientRole: 'PATIENT',
        channel: 'PUSH',
        eventType: 'DELIVERY_ARRIVED',
        title: 'Delivery Has Arrived',
        body: `Your delivery person has arrived. Please share your OTP to receive your package.`,
        data: { pharmacyOrderId: orderId },
      }).catch(err => {
        this.logger.error(`Failed to notify patient: ${err?.message}`);
      });
    }

    return updated;
  }

  /**
   * Confirm delivery with OTP
   * Spec: Phase 15 Chunk 5 — Validate OTP. Status -> DELIVERED. Decrement queue.
   */
  async confirmDelivery(orderId: string, otpEntered: string) {
    const order = await this.prisma.pharmacyOrder.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Pharmacy order not found');
    }

    // Validate OTP
    if (order.deliveryOtp !== otpEntered) {
      throw new BadRequestException('Invalid delivery OTP');
    }

    const now = new Date();

    // Update order status
    const updated = await this.prisma.pharmacyOrder.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERED',
        deliveredAt: now,
      },
    });

    // Update delivery tracking
    const tracking = await this.prisma.deliveryTracking.findFirst({
      where: { pharmacyOrderId: orderId },
      orderBy: { createdAt: 'desc' },
    });

    if (tracking) {
      await this.prisma.deliveryTracking.update({
        where: { id: tracking.id },
        data: {
          status: 'DELIVERED',
          otpVerified: true,
          actualDeliveryTime: now,
        },
      });
    }

    // Decrement pharmacy queue
    if (order.pharmacyId) {
      await this.prisma.pharmacy.update({
        where: { id: order.pharmacyId },
        data: { currentQueueSize: { decrement: 1 } },
      });
    }

    // Notify patient
    this.notificationService.sendNotification({
      recipientId: order.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'ORDER_DELIVERED',
      title: 'Order Delivered',
      body: 'Your order has been delivered successfully!',
      data: { pharmacyOrderId: orderId },
    }).catch(err => {
      this.logger.error(`Failed to notify patient: ${err?.message}`);
    });

    this.logger.log(`Order ${orderId} delivered successfully`);
    return updated;
  }

  /**
   * Report delivery failure
   * Spec: Phase 15 Chunk 5 — Cold chain: NO reattempt. Standard: allow reattempt. 2 failures -> admin alert.
   */
  async reportDeliveryFailure(orderId: string, reason: string) {
    const order = await this.prisma.pharmacyOrder.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Pharmacy order not found');
    }

    const newAttempts = (order.deliveryAttempts || 0) + 1;
    const isColdChain = order.requiresColdChain;

    // Cold chain: no reattempt, auto-fail. Standard: fail after 2 attempts.
    const shouldFail = isColdChain || newAttempts >= 2;
    const newStatus = shouldFail ? 'DELIVERY_FAILED' : 'DELIVERY_ATTEMPTED';

    const updated = await this.prisma.pharmacyOrder.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        deliveryAttempts: newAttempts,
      },
    });

    // Update delivery tracking
    const tracking = await this.prisma.deliveryTracking.findFirst({
      where: { pharmacyOrderId: orderId },
      orderBy: { createdAt: 'desc' },
    });

    if (tracking) {
      await this.prisma.deliveryTracking.update({
        where: { id: tracking.id },
        data: {
          status: 'FAILED_ATTEMPT',
          failureReason: reason,
        },
      });
    }

    // Admin alert after 2 failures or any cold chain failure
    if (shouldFail) {
      await this.notifyAdmin(
        'DELIVERY_FAILED_ADMIN',
        'Delivery Failed',
        `Delivery failed for order ${orderId}. ${isColdChain ? 'Cold chain — no reattempt.' : `${newAttempts} failed attempts.`} Reason: ${reason}.`,
        { pharmacyOrderId: orderId, reason, attempts: newAttempts, isColdChain },
      );
    }

    this.logger.log(`Delivery failure for order ${orderId}: ${reason} (attempt ${newAttempts})`);
    return updated;
  }

  /**
   * Update delivery address
   * Spec: Phase 15 Chunk 5 — Only before OUT_FOR_DELIVERY. Patient must own the order.
   */
  async updateDeliveryAddress(orderId: string, patientId: string, newAddress: string, newPincode: string) {
    const order = await this.prisma.pharmacyOrder.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Pharmacy order not found');
    }

    // Must be the patient who owns the order
    if (order.patientId !== patientId) {
      throw new BadRequestException('You can only update your own order address');
    }

    // Only allowed before dispatch
    if (!PRE_DISPATCH_STATUSES.includes(order.status)) {
      throw new BadRequestException('Cannot update address after order has been dispatched');
    }

    const updated = await this.prisma.pharmacyOrder.update({
      where: { id: orderId },
      data: {
        deliveryAddress: newAddress,
        deliveryPincode: newPincode,
      },
    });

    this.logger.log(`Delivery address updated for order ${orderId}`);
    return updated;
  }
}
