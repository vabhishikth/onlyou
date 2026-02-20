import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TrackingService } from './tracking.service';
import { PatientActionsService } from './patient-actions.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  ActiveTrackingResponse,
  ProgressResponse,
  HomeBannerResponse,
  BookSlotInput,
  RescheduleLabInput,
  CancelLabInput,
  ConfirmDeliveryOTPInput,
  RateDeliveryInput,
  TrackingMutationResponse,
  ConfirmOTPResponse,
} from './dto/tracking.dto';

// Spec: master spec Section 4 (Patient Tracking Screens)

// Completed statuses — not shown in active tracking
const COMPLETED_LAB_STATUSES = ['CLOSED', 'CANCELLED', 'EXPIRED'];
const COMPLETED_DELIVERY_STATUSES = ['CANCELLED', 'RETURNED'];

@Resolver()
export class TrackingResolver {
  constructor(
    private readonly trackingService: TrackingService,
    private readonly patientActionsService: PatientActionsService,
    private readonly prisma: PrismaService,
  ) {}

  // ============================================
  // QUERIES
  // ============================================

  /**
   * Get active lab orders and delivery orders for patient
   * Returns raw data matching mobile's GET_ACTIVE_TRACKING query shape
   * Spec: Section 4.1 — Active Items
   */
  @Query(() => ActiveTrackingResponse)
  @UseGuards(JwtAuthGuard)
  async activeTracking(
    @CurrentUser() user: any,
  ): Promise<ActiveTrackingResponse> {
    const patientId = user.id;

    const [labOrders, deliveryOrders] = await Promise.all([
      this.prisma.labOrder.findMany({
        where: {
          patientId,
          status: { notIn: COMPLETED_LAB_STATUSES as any },
        },
        include: { phlebotomist: true },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.order.findMany({
        where: {
          patientId,
          status: { notIn: COMPLETED_DELIVERY_STATUSES as any },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return {
      labOrders: labOrders.map((lab: any) => ({
        id: lab.id,
        status: lab.status,
        testPanel: lab.testPanel,
        panelName: lab.panelName ?? null,
        bookedDate: lab.bookedDate ? lab.bookedDate.toISOString().split('T')[0] : null,
        bookedTimeSlot: lab.bookedTimeSlot ?? null,
        collectionAddress: lab.collectionAddress ?? null,
        phlebotomistName: lab.phlebotomist?.name ?? null,
        phlebotomistPhone: lab.phlebotomist?.phone ?? null,
        resultFileUrl: lab.resultFileUrl ?? null,
        abnormalFlags: lab.abnormalFlags ? JSON.stringify(lab.abnormalFlags) : null,
        criticalValues: lab.criticalValues ?? false,
        orderedAt: lab.orderedAt,
        slotBookedAt: lab.slotBookedAt ?? null,
        phlebotomistAssignedAt: lab.phlebotomistAssignedAt ?? null,
        sampleCollectedAt: lab.sampleCollectedAt ?? null,
        collectionFailedAt: lab.collectionFailedAt ?? null,
        collectionFailedReason: lab.collectionFailedReason ?? null,
        deliveredToLabAt: lab.deliveredToLabAt ?? null,
        sampleReceivedAt: lab.sampleReceivedAt ?? null,
        processingStartedAt: lab.processingStartedAt ?? null,
        resultsUploadedAt: lab.resultsUploadedAt ?? null,
        doctorReviewedAt: lab.doctorReviewedAt ?? null,
        doctorNote: lab.doctorNote ?? null,
      })),
      deliveryOrders: deliveryOrders.map((order: any) => ({
        id: order.id,
        status: order.status,
        prescriptionId: order.prescriptionId ?? null,
        deliveryPersonName: order.deliveryPersonName ?? null,
        deliveryPersonPhone: order.deliveryPersonPhone ?? null,
        estimatedDeliveryTime: order.estimatedDeliveryTime ?? null,
        deliveryOtp: order.deliveryOtp ?? null,
        prescriptionCreatedAt: order.orderedAt ?? null,
        sentToPharmacyAt: order.sentToPharmacyAt ?? null,
        pharmacyPreparingAt: order.pharmacyPreparingAt ?? null,
        pharmacyReadyAt: order.pharmacyReadyAt ?? null,
        pickupArrangedAt: order.pickupArrangedAt ?? null,
        outForDeliveryAt: order.outForDeliveryAt ?? null,
        deliveredAt: order.deliveredAt ?? null,
        deliveryFailedAt: order.deliveryFailedAt ?? null,
        rescheduledAt: order.rescheduledAt ?? null,
      })),
    };
  }

  /**
   * Get progress stepper data for a lab order
   * Spec: Section 4.2 — Blood Work Tracking — Patient View
   */
  @Query(() => ProgressResponse)
  @UseGuards(JwtAuthGuard)
  async labOrderProgress(
    @CurrentUser() user: any,
    @Args('labOrderId') labOrderId: string,
  ): Promise<ProgressResponse> {
    return this.trackingService.getLabOrderProgress(user.id, labOrderId);
  }

  /**
   * Get progress stepper data for a delivery order
   * Spec: Section 4.3 — Medication Delivery Tracking — Patient View
   */
  @Query(() => ProgressResponse)
  @UseGuards(JwtAuthGuard)
  async deliveryOrderProgress(
    @CurrentUser() user: any,
    @Args('orderId') orderId: string,
  ): Promise<ProgressResponse> {
    return this.trackingService.getDeliveryOrderProgress(user.id, orderId);
  }

  /**
   * Get home screen tracking banner
   * Spec: Section 3.3 — Active Tracking Banner
   */
  @Query(() => HomeBannerResponse)
  @UseGuards(JwtAuthGuard)
  async trackingHomeBanner(
    @CurrentUser() user: any,
  ): Promise<HomeBannerResponse> {
    return this.trackingService.getHomeBanner(user.id);
  }

  /**
   * Get available actions for a patient on an item
   * Spec: Section 4.4 — Patient Actions Per Status
   */
  @Query(() => [String])
  @UseGuards(JwtAuthGuard)
  async availableActions(
    @CurrentUser() user: any,
    @Args('itemId') itemId: string,
    @Args('type') type: string,
  ): Promise<string[]> {
    return this.patientActionsService.getAvailableActions(
      user.id,
      itemId,
      type as 'lab' | 'delivery',
    );
  }

  // ============================================
  // MUTATIONS
  // ============================================

  /**
   * Book a lab collection slot
   * Spec: Section 4.4 — book_slot action
   */
  @Mutation(() => TrackingMutationResponse)
  @UseGuards(JwtAuthGuard)
  async bookLabSlot(
    @CurrentUser() user: any,
    @Args('input') input: BookSlotInput,
  ): Promise<TrackingMutationResponse> {
    try {
      await this.patientActionsService.bookSlot(
        user.id,
        input.labOrderId,
        input.slotId,
      );
      return {
        success: true,
        message: 'Slot booked successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to book slot',
      };
    }
  }

  /**
   * Reschedule a lab collection slot
   * Spec: Section 4.4 — reschedule action
   */
  @Mutation(() => TrackingMutationResponse)
  @UseGuards(JwtAuthGuard)
  async rescheduleLabSlot(
    @CurrentUser() user: any,
    @Args('input') input: RescheduleLabInput,
  ): Promise<TrackingMutationResponse> {
    try {
      await this.patientActionsService.rescheduleLabOrder(
        user.id,
        input.labOrderId,
        input.newSlotId,
      );
      return {
        success: true,
        message: 'Lab order rescheduled successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reschedule',
      };
    }
  }

  /**
   * Cancel a lab order
   * Spec: Section 4.4 — cancel action
   */
  @Mutation(() => TrackingMutationResponse)
  @UseGuards(JwtAuthGuard)
  async cancelLabOrder(
    @CurrentUser() user: any,
    @Args('input') input: CancelLabInput,
  ): Promise<TrackingMutationResponse> {
    try {
      await this.patientActionsService.cancelLabOrder(
        user.id,
        input.labOrderId,
        input.reason,
      );
      return {
        success: true,
        message: 'Lab order cancelled successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to cancel lab order',
      };
    }
  }

  /**
   * Confirm delivery OTP
   * Spec: Section 8.2 Step 6 — Patient shows OTP to delivery person
   */
  @Mutation(() => ConfirmOTPResponse)
  @UseGuards(JwtAuthGuard)
  async confirmDeliveryOTP(
    @CurrentUser() user: any,
    @Args('input') input: ConfirmDeliveryOTPInput,
  ): Promise<ConfirmOTPResponse> {
    try {
      const result = await this.patientActionsService.confirmDeliveryOTP(
        user.id,
        input.orderId,
        input.otp,
      );
      return {
        success: true,
        verified: result.verified,
      };
    } catch (error) {
      return {
        success: false,
        verified: false,
        message: error instanceof Error ? error.message : 'Failed to verify OTP',
      };
    }
  }

  /**
   * Rate a delivery (1-5 stars)
   */
  @Mutation(() => TrackingMutationResponse)
  @UseGuards(JwtAuthGuard)
  async rateDelivery(
    @CurrentUser() user: any,
    @Args('input') input: RateDeliveryInput,
  ): Promise<TrackingMutationResponse> {
    try {
      await this.patientActionsService.rateDelivery(
        user.id,
        input.orderId,
        input.rating,
      );
      return {
        success: true,
        message: 'Delivery rated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to rate delivery',
      };
    }
  }
}
