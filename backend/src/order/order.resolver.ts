import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  OrderType,
  OrderMutationResponse,
  CreateOrderInput,
  SendToPharmacyInput,
  ArrangePickupInput,
  ConfirmDeliveryInput,
  MarkDeliveryFailedInput,
  RescheduleDeliveryInput,
  CancelOrderInput,
  RateDeliveryInput,
} from './dto/order.dto';

// Spec: master spec Section 8 (Medication Delivery)

/**
 * Map Prisma order to GraphQL OrderType
 */
function mapToOrderType(order: any): OrderType {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    patientId: order.patientId,
    prescriptionId: order.prescriptionId,
    consultationId: order.consultationId ?? undefined,
    status: order.status,
    pharmacyPartnerId: order.pharmacyPartnerId ?? undefined,
    pharmacyPartnerName: order.pharmacyPartnerName ?? undefined,
    pharmacyAddress: order.pharmacyAddress ?? undefined,
    deliveryPersonName: order.deliveryPersonName ?? undefined,
    deliveryPersonPhone: order.deliveryPersonPhone ?? undefined,
    deliveryMethod: order.deliveryMethod ?? undefined,
    deliveryAddress: order.deliveryAddress,
    deliveryCity: order.deliveryCity,
    deliveryPincode: order.deliveryPincode,
    estimatedDeliveryTime: order.estimatedDeliveryTime ?? undefined,
    deliveryOtp: order.deliveryOtp ?? undefined,
    medicationCost: order.medicationCost,
    deliveryCost: order.deliveryCost,
    totalAmount: order.totalAmount,
    isReorder: order.isReorder ?? undefined,
    parentOrderId: order.parentOrderId ?? undefined,
    orderedAt: order.orderedAt,
    sentToPharmacyAt: order.sentToPharmacyAt ?? undefined,
    pharmacyReadyAt: order.pharmacyReadyAt ?? undefined,
    deliveredAt: order.deliveredAt ?? undefined,
    cancelledAt: order.cancelledAt ?? undefined,
    cancellationReason: order.cancellationReason ?? undefined,
    deliveryFailedReason: order.deliveryFailedReason ?? undefined,
    pharmacyIssueReason: order.pharmacyIssueReason ?? undefined,
    deliveryRating: order.deliveryRating ?? undefined,
    patientName: order.patient?.name ?? undefined,
    patientPhone: order.patient?.phone ?? undefined,
  };
}

@Resolver()
export class OrderResolver {
  constructor(private readonly orderService: OrderService) {}

  // ============================================
  // QUERIES
  // ============================================

  /**
   * Get order by ID
   */
  @Query(() => OrderMutationResponse)
  @UseGuards(JwtAuthGuard)
  async order(
    @Args('id') id: string,
  ): Promise<OrderMutationResponse> {
    try {
      const order = await this.orderService.getOrder(id);
      return {
        success: true,
        message: 'Order found',
        order: mapToOrderType(order),
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Order not found',
      };
    }
  }

  /**
   * Get orders for a patient
   */
  @Query(() => [OrderType])
  @UseGuards(JwtAuthGuard)
  async ordersByPatient(
    @Args('patientId') patientId: string,
  ): Promise<OrderType[]> {
    const orders = await this.orderService.getOrdersByPatient(patientId);
    return orders.map(mapToOrderType);
  }

  /**
   * Get pending deliveries (for coordinator)
   */
  @Query(() => [OrderType])
  @UseGuards(JwtAuthGuard)
  async pendingDeliveries(): Promise<OrderType[]> {
    const orders = await this.orderService.getPendingDeliveries();
    return orders.map(mapToOrderType);
  }

  /**
   * Get orders due for monthly reorder
   * Spec: Section 8.5 — Monthly Reorder Flow
   */
  @Query(() => [OrderType])
  @UseGuards(JwtAuthGuard)
  async ordersDueForReorder(): Promise<OrderType[]> {
    const orders = await this.orderService.getOrdersDueForReorder();
    return orders.map(mapToOrderType);
  }

  // ============================================
  // MUTATIONS
  // ============================================

  /**
   * Create a new order from prescription
   * Spec: Section 8.2 Step 1 — Prescription Created
   */
  @Mutation(() => OrderMutationResponse)
  @UseGuards(JwtAuthGuard)
  async createOrder(
    @Args('input') input: CreateOrderInput,
  ): Promise<OrderMutationResponse> {
    try {
      const order = await this.orderService.createOrder(input);
      return {
        success: true,
        message: 'Order created successfully',
        order: mapToOrderType(order),
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create order',
      };
    }
  }

  /**
   * Send order to pharmacy
   * Spec: Section 8.2 Step 2 — Sent to Pharmacy
   */
  @Mutation(() => OrderMutationResponse)
  @UseGuards(JwtAuthGuard)
  async sendToPharmacy(
    @Args('input') input: SendToPharmacyInput,
  ): Promise<OrderMutationResponse> {
    try {
      const order = await this.orderService.sendToPharmacy(input);
      return {
        success: true,
        message: 'Order sent to pharmacy',
        order: mapToOrderType(order),
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send to pharmacy',
      };
    }
  }

  /**
   * Arrange pickup and generate delivery OTP
   * Spec: Section 8.2 Step 4 — Delivery Arranged
   */
  @Mutation(() => OrderMutationResponse)
  @UseGuards(JwtAuthGuard)
  async arrangePickup(
    @Args('input') input: ArrangePickupInput,
  ): Promise<OrderMutationResponse> {
    try {
      const order = await this.orderService.arrangePickup(input);
      return {
        success: true,
        message: 'Pickup arranged successfully',
        order: mapToOrderType(order),
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to arrange pickup',
      };
    }
  }

  /**
   * Mark order as out for delivery
   * Spec: Section 8.2 Step 5 — Pickup
   */
  @Mutation(() => OrderMutationResponse)
  @UseGuards(JwtAuthGuard)
  async markOutForDelivery(
    @Args('orderId') orderId: string,
  ): Promise<OrderMutationResponse> {
    try {
      const order = await this.orderService.markOutForDelivery(orderId);
      return {
        success: true,
        message: 'Order out for delivery',
        order: mapToOrderType(order),
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to mark out for delivery',
      };
    }
  }

  /**
   * Confirm delivery with OTP
   * Spec: Section 8.2 Step 6 — Delivery + OTP Confirmation
   */
  @Mutation(() => OrderMutationResponse)
  @UseGuards(JwtAuthGuard)
  async confirmDelivery(
    @Args('input') input: ConfirmDeliveryInput,
  ): Promise<OrderMutationResponse> {
    try {
      const order = await this.orderService.confirmDelivery(input);
      return {
        success: true,
        message: 'Delivery confirmed',
        order: mapToOrderType(order),
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to confirm delivery',
      };
    }
  }

  /**
   * Mark delivery as failed
   */
  @Mutation(() => OrderMutationResponse)
  @UseGuards(JwtAuthGuard)
  async markDeliveryFailed(
    @Args('input') input: MarkDeliveryFailedInput,
  ): Promise<OrderMutationResponse> {
    try {
      const order = await this.orderService.markDeliveryFailed(input);
      return {
        success: true,
        message: 'Delivery marked as failed',
        order: mapToOrderType(order),
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to mark delivery as failed',
      };
    }
  }

  /**
   * Reschedule delivery
   */
  @Mutation(() => OrderMutationResponse)
  @UseGuards(JwtAuthGuard)
  async rescheduleDelivery(
    @Args('input') input: RescheduleDeliveryInput,
  ): Promise<OrderMutationResponse> {
    try {
      const order = await this.orderService.rescheduleDelivery(input);
      return {
        success: true,
        message: 'Delivery rescheduled',
        order: mapToOrderType(order),
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reschedule delivery',
      };
    }
  }

  /**
   * Cancel order
   */
  @Mutation(() => OrderMutationResponse)
  @UseGuards(JwtAuthGuard)
  async cancelOrder(
    @Args('input') input: CancelOrderInput,
  ): Promise<OrderMutationResponse> {
    try {
      const order = await this.orderService.cancelOrder(input);
      return {
        success: true,
        message: 'Order cancelled',
        order: mapToOrderType(order),
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to cancel order',
      };
    }
  }

  /**
   * Create reorder from previous order
   * Spec: Section 8.5 — Monthly Reorder Flow
   */
  @Mutation(() => OrderMutationResponse)
  @UseGuards(JwtAuthGuard)
  async createReorder(
    @Args('originalOrderId') originalOrderId: string,
  ): Promise<OrderMutationResponse> {
    try {
      const order = await this.orderService.createReorder(originalOrderId);
      return {
        success: true,
        message: 'Reorder created successfully',
        order: mapToOrderType(order),
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create reorder',
      };
    }
  }

  /**
   * Rate delivery
   */
  @Mutation(() => OrderMutationResponse)
  @UseGuards(JwtAuthGuard)
  async rateDelivery(
    @Args('input') input: RateDeliveryInput,
  ): Promise<OrderMutationResponse> {
    try {
      const order = await this.orderService.rateDelivery(input);
      return {
        success: true,
        message: 'Delivery rated',
        order: mapToOrderType(order),
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to rate delivery',
      };
    }
  }
}
