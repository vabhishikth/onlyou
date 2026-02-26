import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Spec: master spec Section 8 (Medication Delivery)
// OrderStatus enum is defined in Prisma schema (prisma/schema.prisma) and imported from @prisma/client.
// Re-export for backward compatibility with existing consumers.
export { OrderStatus } from '@prisma/client';

// Spec: Section 8.3 — Valid status transitions
export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PRESCRIPTION_CREATED]: [OrderStatus.SENT_TO_PHARMACY, OrderStatus.CANCELLED],
  [OrderStatus.SENT_TO_PHARMACY]: [OrderStatus.PHARMACY_PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PHARMACY_PREPARING]: [OrderStatus.PHARMACY_READY, OrderStatus.PHARMACY_ISSUE, OrderStatus.CANCELLED],
  [OrderStatus.PHARMACY_READY]: [OrderStatus.PICKUP_ARRANGED, OrderStatus.CANCELLED],
  [OrderStatus.PHARMACY_ISSUE]: [OrderStatus.PHARMACY_PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PICKUP_ARRANGED]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.DELIVERY_FAILED],
  [OrderStatus.DELIVERED]: [OrderStatus.RETURNED],
  [OrderStatus.DELIVERY_FAILED]: [OrderStatus.RESCHEDULED],
  [OrderStatus.RESCHEDULED]: [OrderStatus.PICKUP_ARRANGED, OrderStatus.CANCELLED],
  [OrderStatus.RETURNED]: [],
  [OrderStatus.CANCELLED]: [],
};

// Input types
export interface CreateOrderInput {
  prescriptionId: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryPincode: string;
  medicationCost: number;
  deliveryCost: number;
}

export interface SendToPharmacyInput {
  orderId: string;
  pharmacyId: string;
}

export interface PharmacyActionInput {
  orderId: string;
  pharmacyId: string;
}

export interface ReportPharmacyIssueInput {
  orderId: string;
  pharmacyId: string;
  reason: string;
}

export interface ArrangePickupInput {
  orderId: string;
  deliveryPersonName: string;
  deliveryPersonPhone: string;
  deliveryMethod: string;
  estimatedDeliveryTime: string;
}

export interface ConfirmDeliveryInput {
  orderId: string;
  otp: string;
}

export interface MarkDeliveryFailedInput {
  orderId: string;
  reason: string;
}

export interface RescheduleDeliveryInput {
  orderId: string;
  newDeliveryDate: string;
}

export interface CancelOrderInput {
  orderId: string;
  reason: string;
}

export interface RateDeliveryInput {
  orderId: string;
  rating: number;
}

// Statuses that allow cancellation
const CANCELLABLE_STATUSES = [
  OrderStatus.PRESCRIPTION_CREATED,
  OrderStatus.SENT_TO_PHARMACY,
  OrderStatus.PHARMACY_PREPARING,
  OrderStatus.PHARMACY_READY,
  OrderStatus.PHARMACY_ISSUE,
  OrderStatus.PICKUP_ARRANGED,
  OrderStatus.RESCHEDULED,
];

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if a status transition is valid
   */
  isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
    return VALID_ORDER_TRANSITIONS[from]?.includes(to) || false;
  }

  /**
   * Generate 4-digit delivery OTP
   * Security: uses crypto.randomInt for cryptographically secure randomness
   */
  private generateDeliveryOtp(): string {
    return randomInt(1000, 10000).toString();
  }

  /**
   * Create a new order from prescription
   */
  async createOrder(input: CreateOrderInput): Promise<any> {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: input.prescriptionId },
      include: { consultation: { select: { patientId: true } } },
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    // Generate unique order number
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    return this.prisma.order.create({
      data: {
        orderNumber,
        patientId: prescription.consultation.patientId,
        prescriptionId: input.prescriptionId,
        consultationId: prescription.consultationId,
        status: OrderStatus.PRESCRIPTION_CREATED,
        deliveryAddress: input.deliveryAddress,
        deliveryCity: input.deliveryCity,
        deliveryPincode: input.deliveryPincode,
        medicationCost: input.medicationCost,
        deliveryCost: input.deliveryCost,
        totalAmount: input.medicationCost + input.deliveryCost,
        orderedAt: new Date(),
      },
    });
  }

  /**
   * Get order by ID
   */
  async getOrder(id: string): Promise<any> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        prescription: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  /**
   * Send order to pharmacy
   * Spec: Section 8.2 Step 2 — Sent to Pharmacy
   */
  async sendToPharmacy(input: SendToPharmacyInput): Promise<any> {
    const order = await this.getOrder(input.orderId);

    if (order.status !== OrderStatus.PRESCRIPTION_CREATED) {
      throw new BadRequestException(
        `Cannot send to pharmacy for order in ${order.status} status`
      );
    }

    const pharmacy = await this.prisma.partnerPharmacy.findUnique({
      where: { id: input.pharmacyId },
    });

    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }

    if (!pharmacy.isActive) {
      throw new BadRequestException('Pharmacy is not active');
    }

    return this.prisma.order.update({
      where: { id: input.orderId },
      data: {
        status: OrderStatus.SENT_TO_PHARMACY,
        pharmacyPartnerId: pharmacy.id,
        pharmacyPartnerName: pharmacy.name,
        pharmacyAddress: pharmacy.address,
        sentToPharmacyAt: new Date(),
      },
    });
  }

  /**
   * Pharmacy starts preparing
   * Spec: Section 8.2 Step 3 — Pharmacy Prepares
   */
  async startPharmacyPreparing(input: PharmacyActionInput): Promise<any> {
    const order = await this.getOrder(input.orderId);

    if (order.pharmacyPartnerId !== input.pharmacyId) {
      throw new ForbiddenException('You are not assigned to this order');
    }

    // Allow preparing from SENT_TO_PHARMACY or PHARMACY_ISSUE (restart after issue)
    if (
      order.status !== OrderStatus.SENT_TO_PHARMACY &&
      order.status !== OrderStatus.PHARMACY_ISSUE
    ) {
      throw new BadRequestException(
        `Cannot start preparing for order in ${order.status} status`
      );
    }

    return this.prisma.order.update({
      where: { id: input.orderId },
      data: {
        status: OrderStatus.PHARMACY_PREPARING,
        pharmacyPreparingAt: new Date(),
      },
    });
  }

  /**
   * Mark pharmacy ready
   */
  async markPharmacyReady(input: PharmacyActionInput): Promise<any> {
    const order = await this.getOrder(input.orderId);

    if (order.pharmacyPartnerId !== input.pharmacyId) {
      throw new ForbiddenException('You are not assigned to this order');
    }

    if (order.status !== OrderStatus.PHARMACY_PREPARING) {
      throw new BadRequestException(
        `Cannot mark ready for order in ${order.status} status`
      );
    }

    return this.prisma.order.update({
      where: { id: input.orderId },
      data: {
        status: OrderStatus.PHARMACY_READY,
        pharmacyReadyAt: new Date(),
      },
    });
  }

  /**
   * Report pharmacy issue
   */
  async reportPharmacyIssue(input: ReportPharmacyIssueInput): Promise<any> {
    const order = await this.getOrder(input.orderId);

    if (order.pharmacyPartnerId !== input.pharmacyId) {
      throw new ForbiddenException('You are not assigned to this order');
    }

    if (order.status !== OrderStatus.PHARMACY_PREPARING) {
      throw new BadRequestException(
        `Cannot report issue for order in ${order.status} status`
      );
    }

    return this.prisma.order.update({
      where: { id: input.orderId },
      data: {
        status: OrderStatus.PHARMACY_ISSUE,
        pharmacyIssueAt: new Date(),
        pharmacyIssueReason: input.reason,
      },
    });
  }

  /**
   * Arrange pickup and generate delivery OTP
   * Spec: Section 8.2 Step 4 — Delivery Arranged
   */
  async arrangePickup(input: ArrangePickupInput): Promise<any> {
    const order = await this.getOrder(input.orderId);

    // Allow from PHARMACY_READY or RESCHEDULED
    if (
      order.status !== OrderStatus.PHARMACY_READY &&
      order.status !== OrderStatus.RESCHEDULED
    ) {
      throw new BadRequestException(
        `Cannot arrange pickup for order in ${order.status} status`
      );
    }

    const deliveryOtp = this.generateDeliveryOtp();

    return this.prisma.order.update({
      where: { id: input.orderId },
      data: {
        status: OrderStatus.PICKUP_ARRANGED,
        deliveryPersonName: input.deliveryPersonName,
        deliveryPersonPhone: input.deliveryPersonPhone,
        deliveryMethod: input.deliveryMethod,
        estimatedDeliveryTime: input.estimatedDeliveryTime,
        deliveryOtp,
        pickupArrangedAt: new Date(),
      },
    });
  }

  /**
   * Mark out for delivery
   * Spec: Section 8.2 Step 5 — Pickup
   */
  async markOutForDelivery(orderId: string): Promise<any> {
    const order = await this.getOrder(orderId);

    if (order.status !== OrderStatus.PICKUP_ARRANGED) {
      throw new BadRequestException(
        `Cannot mark out for delivery for order in ${order.status} status`
      );
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.OUT_FOR_DELIVERY,
        outForDeliveryAt: new Date(),
      },
    });
  }

  /**
   * Confirm delivery with OTP
   * Spec: Section 8.2 Step 6 — Delivery + OTP Confirmation
   */
  async confirmDelivery(input: ConfirmDeliveryInput): Promise<any> {
    const order = await this.getOrder(input.orderId);

    if (order.status !== OrderStatus.OUT_FOR_DELIVERY) {
      throw new BadRequestException(
        `Cannot confirm delivery for order in ${order.status} status`
      );
    }

    if (order.deliveryOtp !== input.otp) {
      throw new BadRequestException('Invalid delivery OTP');
    }

    return this.prisma.order.update({
      where: { id: input.orderId },
      data: {
        status: OrderStatus.DELIVERED,
        deliveredAt: new Date(),
      },
    });
  }

  /**
   * Mark delivery as failed
   */
  async markDeliveryFailed(input: MarkDeliveryFailedInput): Promise<any> {
    const order = await this.getOrder(input.orderId);

    if (order.status !== OrderStatus.OUT_FOR_DELIVERY) {
      throw new BadRequestException(
        `Cannot mark as failed for order in ${order.status} status`
      );
    }

    return this.prisma.order.update({
      where: { id: input.orderId },
      data: {
        status: OrderStatus.DELIVERY_FAILED,
        deliveryFailedAt: new Date(),
        deliveryFailedReason: input.reason,
      },
    });
  }

  /**
   * Reschedule delivery
   */
  async rescheduleDelivery(input: RescheduleDeliveryInput): Promise<any> {
    const order = await this.getOrder(input.orderId);

    if (order.status !== OrderStatus.DELIVERY_FAILED) {
      throw new BadRequestException(
        `Cannot reschedule order in ${order.status} status`
      );
    }

    return this.prisma.order.update({
      where: { id: input.orderId },
      data: {
        status: OrderStatus.RESCHEDULED,
        rescheduledAt: new Date(),
        // Clear old delivery details
        deliveryPersonName: null,
        deliveryPersonPhone: null,
        deliveryOtp: null,
        estimatedDeliveryTime: input.newDeliveryDate,
      },
    });
  }

  /**
   * Cancel order
   */
  async cancelOrder(input: CancelOrderInput): Promise<any> {
    const order = await this.getOrder(input.orderId);

    if (!CANCELLABLE_STATUSES.includes(order.status as OrderStatus)) {
      throw new BadRequestException(
        `Cannot cancel order in ${order.status} status`
      );
    }

    return this.prisma.order.update({
      where: { id: input.orderId },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: input.reason,
      },
    });
  }

  /**
   * Get orders for a patient
   */
  async getOrdersByPatient(patientId: string): Promise<any[]> {
    return this.prisma.order.findMany({
      where: { patientId },
      orderBy: { orderedAt: 'desc' },
      include: {
        prescription: true,
      },
    });
  }

  /**
   * Get orders for a pharmacy
   */
  async getOrdersByPharmacy(pharmacyId: string, status?: OrderStatus): Promise<any[]> {
    const where: any = { pharmacyPartnerId: pharmacyId };
    if (status) {
      where.status = status;
    }

    return this.prisma.order.findMany({
      where,
      orderBy: { sentToPharmacyAt: 'desc' },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        prescription: true,
      },
    });
  }

  /**
   * Get pending deliveries (for coordinator)
   */
  async getPendingDeliveries(): Promise<any[]> {
    return this.prisma.order.findMany({
      where: {
        status: {
          in: [
            OrderStatus.PHARMACY_READY,
            OrderStatus.PICKUP_ARRANGED,
            OrderStatus.RESCHEDULED,
          ],
        },
      },
      orderBy: { pharmacyReadyAt: 'asc' },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        prescription: true,
      },
    });
  }

  /**
   * Create reorder from previous order
   * Spec: Section 8.5 — Monthly Reorder Flow
   */
  async createReorder(originalOrderId: string): Promise<any> {
    const originalOrder = await this.getOrder(originalOrderId);

    if (originalOrder.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        'Can only create reorder from delivered order'
      );
    }

    // Generate unique order number
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    return this.prisma.order.create({
      data: {
        orderNumber,
        patientId: originalOrder.patientId,
        prescriptionId: originalOrder.prescriptionId,
        consultationId: originalOrder.consultationId,
        status: OrderStatus.PRESCRIPTION_CREATED,
        deliveryAddress: originalOrder.deliveryAddress,
        deliveryCity: originalOrder.deliveryCity,
        deliveryPincode: originalOrder.deliveryPincode,
        medicationCost: originalOrder.medicationCost,
        deliveryCost: originalOrder.deliveryCost,
        totalAmount: originalOrder.totalAmount,
        parentOrderId: originalOrderId,
        isReorder: true,
        orderedAt: new Date(),
        items: originalOrder.items || [],
      },
    });
  }

  /**
   * Get orders due for monthly reorder
   */
  async getOrdersDueForReorder(): Promise<any[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.prisma.order.findMany({
      where: {
        status: OrderStatus.DELIVERED,
        deliveredAt: { lte: thirtyDaysAgo },
        // Only get orders that haven't been reordered yet
        isReorder: false,
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        prescription: true,
      },
    });
  }

  /**
   * Rate delivery
   */
  async rateDelivery(input: RateDeliveryInput): Promise<any> {
    if (input.rating < 1 || input.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const order = await this.getOrder(input.orderId);

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Can only rate delivered orders');
    }

    return this.prisma.order.update({
      where: { id: input.orderId },
      data: { deliveryRating: input.rating },
    });
  }
}
