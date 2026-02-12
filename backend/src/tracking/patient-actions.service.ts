import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Spec: master spec Section 4.4 (Patient Actions Per Status)

// Action types available to patients
export type LabAction =
  | 'book_slot'
  | 'upload_results'
  | 'reschedule'
  | 'cancel'
  | 'rebook'
  | 'view_pdf'
  | 'download'
  | 'view_tracking'
  | 'contact_support';

export type DeliveryAction =
  | 'view_prescription'
  | 'view_tracking'
  | 'call_delivery_person'
  | 'enter_otp'
  | 'rate_delivery'
  | 'contact_support';

// Lab statuses where cancellation/reschedule is allowed
const CANCELLABLE_LAB_STATUSES = ['SLOT_BOOKED', 'PHLEBOTOMIST_ASSIGNED'];

// Cutoff time in hours before slot for reschedule/cancel
const CUTOFF_HOURS = 4;

@Injectable()
export class PatientActionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get available actions for a patient based on item type and status
   * Spec: Section 4.4 — Patient Actions Per Status
   */
  async getAvailableActions(
    patientId: string,
    itemId: string,
    type: 'lab' | 'delivery',
  ): Promise<string[]> {
    if (type === 'lab') {
      return this.getLabOrderActions(patientId, itemId);
    } else {
      return this.getDeliveryOrderActions(patientId, itemId);
    }
  }

  /**
   * Get available actions for a lab order
   */
  private async getLabOrderActions(
    patientId: string,
    labOrderId: string,
  ): Promise<LabAction[]> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    if (labOrder.patientId !== patientId) {
      throw new ForbiddenException('Not authorized');
    }

    const actions: LabAction[] = [];

    switch (labOrder.status) {
      case 'ORDERED':
        // Patient can book slot OR upload own results
        actions.push('book_slot', 'upload_results');
        break;

      case 'SLOT_BOOKED':
      case 'PHLEBOTOMIST_ASSIGNED':
        // Patient can reschedule or cancel (with 4hr+ notice)
        if (this.isWithinCutoffWindow(labOrder)) {
          actions.push('contact_support'); // Too late, contact support
        } else {
          actions.push('reschedule', 'cancel');
        }
        actions.push('view_tracking');
        break;

      case 'COLLECTION_FAILED':
        // Patient can rebook
        actions.push('rebook');
        actions.push('view_tracking');
        break;

      case 'RESULTS_READY':
        // Patient can view and download PDF
        if (labOrder.resultFileUrl) {
          actions.push('view_pdf', 'download');
        }
        actions.push('view_tracking');
        break;

      case 'RESULTS_UPLOADED':
        // Patient uploaded own results, waiting for doctor review
        actions.push('view_tracking');
        break;

      default:
        // View-only for other statuses (SAMPLE_COLLECTED onwards)
        actions.push('view_tracking');
        break;
    }

    return actions;
  }

  /**
   * Get available actions for a delivery order
   */
  private async getDeliveryOrderActions(
    patientId: string,
    orderId: string,
  ): Promise<DeliveryAction[]> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.patientId !== patientId) {
      throw new ForbiddenException('Not authorized');
    }

    const actions: DeliveryAction[] = [];

    switch (order.status) {
      case 'PRESCRIPTION_CREATED':
      case 'SENT_TO_PHARMACY':
      case 'PHARMACY_PREPARING':
      case 'PHARMACY_READY':
      case 'PHARMACY_ISSUE':
      case 'PICKUP_ARRANGED':
        // Patient can view prescription and contact support
        actions.push('view_prescription', 'contact_support');
        actions.push('view_tracking');
        break;

      case 'OUT_FOR_DELIVERY':
        // Patient can see and call delivery person
        if (order.deliveryPersonPhone) {
          actions.push('call_delivery_person');
        }
        actions.push('view_tracking');
        break;

      case 'DELIVERED':
        // Patient can enter OTP and rate delivery
        actions.push('enter_otp', 'rate_delivery');
        break;

      case 'DELIVERY_FAILED':
        // System auto-reschedules, patient can contact support
        actions.push('contact_support', 'view_tracking');
        break;

      default:
        actions.push('view_tracking');
        break;
    }

    return actions;
  }

  /**
   * Book a slot for a lab order
   */
  async bookSlot(
    patientId: string,
    labOrderId: string,
    slotId: string,
  ): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    if (labOrder.patientId !== patientId) {
      throw new ForbiddenException('Not authorized');
    }

    if (labOrder.status !== 'ORDERED') {
      throw new BadRequestException('Can only book slot for ORDERED status');
    }

    // Get the slot
    const slots = await this.prisma.labSlot.findMany({
      where: { id: slotId },
    });

    if (slots.length === 0) {
      throw new NotFoundException('Slot not found');
    }

    const slot = slots[0];

    if (slot.currentBookings >= slot.maxBookings) {
      throw new BadRequestException('Slot is fully booked');
    }

    // Increment slot bookings
    await this.prisma.labSlot.update({
      where: { id: slotId },
      data: { currentBookings: slot.currentBookings + 1 },
    });

    // Update lab order
    const updatedLabOrder = await this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: {
        status: 'SLOT_BOOKED',
        bookedDate: slot.date,
        bookedTimeSlot: `${slot.startTime}-${slot.endTime}`,
        slotBookedAt: new Date(),
      },
    });

    return updatedLabOrder;
  }

  /**
   * Reschedule a lab order
   */
  async rescheduleLabOrder(
    patientId: string,
    labOrderId: string,
    newSlotId: string,
  ): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    if (labOrder.patientId !== patientId) {
      throw new ForbiddenException('Not authorized');
    }

    if (!CANCELLABLE_LAB_STATUSES.includes(labOrder.status)) {
      throw new BadRequestException('Cannot reschedule at this status');
    }

    if (this.isWithinCutoffWindow(labOrder)) {
      throw new BadRequestException(
        'Cannot reschedule within 4 hours of scheduled time. Please contact support.',
      );
    }

    // Get the new slot
    const slots = await this.prisma.labSlot.findMany({
      where: { id: newSlotId },
    });

    if (slots.length === 0) {
      throw new NotFoundException('Slot not found');
    }

    const slot = slots[0];

    if (slot.currentBookings >= slot.maxBookings) {
      throw new BadRequestException('Slot is fully booked');
    }

    // Increment new slot bookings
    await this.prisma.labSlot.update({
      where: { id: newSlotId },
      data: { currentBookings: slot.currentBookings + 1 },
    });

    // Update lab order with new slot
    const updatedLabOrder = await this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: {
        bookedDate: slot.date,
        bookedTimeSlot: `${slot.startTime}-${slot.endTime}`,
        // Keep status as SLOT_BOOKED (phlebotomist needs to be reassigned)
        status: 'SLOT_BOOKED',
        phlebotomistId: null,
        phlebotomistAssignedAt: null,
      },
    });

    return updatedLabOrder;
  }

  /**
   * Cancel a lab order
   */
  async cancelLabOrder(
    patientId: string,
    labOrderId: string,
    reason?: string,
  ): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    if (labOrder.patientId !== patientId) {
      throw new ForbiddenException('Not authorized');
    }

    if (!CANCELLABLE_LAB_STATUSES.includes(labOrder.status)) {
      throw new BadRequestException('Cannot cancel at this status');
    }

    if (this.isWithinCutoffWindow(labOrder)) {
      throw new BadRequestException(
        'Cannot cancel within 4 hours of scheduled time. Please contact support.',
      );
    }

    const updatedLabOrder = await this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason || 'Patient requested',
      },
    });

    return updatedLabOrder;
  }

  /**
   * Upload own results for a lab order
   */
  async uploadOwnResults(
    patientId: string,
    labOrderId: string,
    fileUrl: string,
  ): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    if (labOrder.patientId !== patientId) {
      throw new ForbiddenException('Not authorized');
    }

    if (labOrder.status !== 'ORDERED') {
      throw new BadRequestException('Can only upload results for ORDERED status');
    }

    const updatedLabOrder = await this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: {
        status: 'RESULTS_UPLOADED',
        patientUploadedResults: true,
        patientUploadedFileUrl: fileUrl,
        resultsUploadedAt: new Date(),
      },
    });

    return updatedLabOrder;
  }

  /**
   * Rebook a lab order after collection failed
   */
  async rebookLabOrder(
    patientId: string,
    labOrderId: string,
    slotId: string,
  ): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    if (labOrder.patientId !== patientId) {
      throw new ForbiddenException('Not authorized');
    }

    if (labOrder.status !== 'COLLECTION_FAILED') {
      throw new BadRequestException('Can only rebook after collection failed');
    }

    // Get the slot
    const slots = await this.prisma.labSlot.findMany({
      where: { id: slotId },
    });

    if (slots.length === 0) {
      throw new NotFoundException('Slot not found');
    }

    const slot = slots[0];

    if (slot.currentBookings >= slot.maxBookings) {
      throw new BadRequestException('Slot is fully booked');
    }

    // Increment slot bookings
    await this.prisma.labSlot.update({
      where: { id: slotId },
      data: { currentBookings: slot.currentBookings + 1 },
    });

    // Update lab order
    const updatedLabOrder = await this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: {
        status: 'SLOT_BOOKED',
        bookedDate: slot.date,
        bookedTimeSlot: `${slot.startTime}-${slot.endTime}`,
        slotBookedAt: new Date(),
        // Clear failure data
        collectionFailedAt: null,
        collectionFailedReason: null,
      },
    });

    return updatedLabOrder;
  }

  /**
   * Confirm delivery with OTP
   */
  async confirmDeliveryOTP(
    patientId: string,
    orderId: string,
    otp: string,
  ): Promise<{ verified: boolean }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.patientId !== patientId) {
      throw new ForbiddenException('Not authorized');
    }

    if (order.status !== 'DELIVERED') {
      throw new BadRequestException('Order not in DELIVERED status');
    }

    if (order.deliveryOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    // Mark OTP as verified (update the order)
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        // We don't have deliveryOTPVerified field, so we'll just keep the order as is
        // In a real implementation, we'd mark it as verified
      },
    });

    return { verified: true };
  }

  /**
   * Rate delivery (1-5)
   */
  async rateDelivery(
    patientId: string,
    orderId: string,
    rating: number,
  ): Promise<any> {
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.patientId !== patientId) {
      throw new ForbiddenException('Not authorized');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { deliveryRating: rating },
    });

    return updatedOrder;
  }

  /**
   * Get delivery person details
   */
  async getDeliveryPersonDetails(
    patientId: string,
    orderId: string,
  ): Promise<{ name: string; phone: string; eta: string } | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.patientId !== patientId) {
      throw new ForbiddenException('Not authorized');
    }

    if (order.status !== 'OUT_FOR_DELIVERY') {
      return null;
    }

    return {
      name: order.deliveryPersonName || '',
      phone: order.deliveryPersonPhone || '',
      eta: order.estimatedDeliveryTime || '',
    };
  }

  /**
   * Check if current time is within cutoff window (4 hours before slot)
   */
  private isWithinCutoffWindow(labOrder: any): boolean {
    if (!labOrder.bookedDate || !labOrder.bookedTimeSlot) {
      return false;
    }

    // Parse the slot start time
    const [startTime] = labOrder.bookedTimeSlot.split('-');
    const [hours, minutes] = startTime.split(':').map(Number);

    // Create full slot datetime
    const slotDateTime = new Date(labOrder.bookedDate);
    slotDateTime.setHours(hours, minutes, 0, 0);

    // Calculate cutoff time (4 hours before slot)
    const cutoffTime = new Date(slotDateTime.getTime() - CUTOFF_HOURS * 60 * 60 * 1000);

    // Check if current time is past cutoff
    return Date.now() >= cutoffTime.getTime();
  }
}
