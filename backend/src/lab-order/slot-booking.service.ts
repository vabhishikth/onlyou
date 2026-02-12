import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LabOrderStatus } from './lab-order.service';

// Spec: master spec Section 7.2 Steps 2-4 (Slot Booking & Phlebotomist Assignment)

export interface GetAvailableSlotsInput {
  city: string;
  pincode: string;
  startDate: Date;
  endDate: Date;
}

export interface BookSlotInput {
  labOrderId: string;
  slotId: string;
  patientId: string;
  collectionAddress?: string;
}

export interface CancelSlotInput {
  labOrderId: string;
  patientId: string;
  reason: string;
}

export interface RescheduleSlotInput {
  labOrderId: string;
  newSlotId: string;
  patientId: string;
}

export interface AssignPhlebotomistInput {
  labOrderId: string;
  phlebotomistId: string;
  coordinatorId: string;
}

export interface GetAvailablePhlebotomistsInput {
  pincode: string;
  date: Date;
}

export interface MarkRunningLateInput {
  labOrderId: string;
  phlebotomistId: string;
  newETA: string;
}

export interface MarkPatientUnavailableInput {
  labOrderId: string;
  phlebotomistId: string;
  reason: string;
}

export interface CreateSlotInput {
  date: Date;
  startTime: string;
  endTime: string;
  city: string;
  serviceableAreas: string[];
  maxBookings?: number;
  phlebotomistId?: string;
}

// Statuses that allow booking a slot
const BOOKABLE_STATUSES = [LabOrderStatus.ORDERED, LabOrderStatus.COLLECTION_FAILED];

// Statuses that allow cancellation
const CANCELLABLE_STATUSES = [
  LabOrderStatus.SLOT_BOOKED,
  LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
];

@Injectable()
export class SlotBookingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get available slots for a city and date range
   * Spec: Section 7.2 Step 2 — Patient Books Slot
   */
  async getAvailableSlots(input: GetAvailableSlotsInput): Promise<any[]> {
    const slots = await this.prisma.labSlot.findMany({
      where: {
        city: input.city,
        serviceableAreas: { has: input.pincode },
        date: {
          gte: input.startDate,
          lte: input.endDate,
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    // Filter out fully booked slots
    return slots.filter((slot) => slot.currentBookings < slot.maxBookings);
  }

  /**
   * Book a slot for a lab order
   * Spec: Section 7.2 Step 2 — Patient Books Slot
   */
  async bookSlot(input: BookSlotInput): Promise<any> {
    // Verify lab order exists
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: input.labOrderId },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    // Verify patient owns this lab order
    if (labOrder.patientId !== input.patientId) {
      throw new ForbiddenException('You do not have access to this lab order');
    }

    // Verify lab order is in bookable status
    if (!BOOKABLE_STATUSES.includes(labOrder.status as LabOrderStatus)) {
      throw new BadRequestException(
        `Cannot book slot for lab order in ${labOrder.status} status`
      );
    }

    // Verify slot exists
    const slot = await this.prisma.labSlot.findUnique({
      where: { id: input.slotId },
    });

    if (!slot) {
      throw new NotFoundException('Slot not found');
    }

    // Verify slot is not fully booked
    if (slot.currentBookings >= slot.maxBookings) {
      throw new BadRequestException('This slot is fully booked');
    }

    // Verify slot services the patient's pincode
    if (!slot.serviceableAreas.includes(labOrder.collectionPincode)) {
      throw new BadRequestException(
        'This slot does not service your area. Please choose a different slot.'
      );
    }

    // Increment slot bookings
    await this.prisma.labSlot.update({
      where: { id: input.slotId },
      data: { currentBookings: { increment: 1 } },
    });

    // Update lab order with booking details
    const updateData: any = {
      status: LabOrderStatus.SLOT_BOOKED,
      bookedDate: slot.date,
      bookedTimeSlot: `${slot.startTime}-${slot.endTime}`,
      slotBookedAt: new Date(),
    };

    // If rebooking after failure, clear old phlebotomist assignment
    if (labOrder.status === LabOrderStatus.COLLECTION_FAILED) {
      updateData.phlebotomistId = null;
      updateData.phlebotomistAssignedAt = null;
    }

    // Update collection address if provided
    if (input.collectionAddress) {
      updateData.collectionAddress = input.collectionAddress;
    }

    const updatedOrder = await this.prisma.labOrder.update({
      where: { id: input.labOrderId },
      data: updateData,
    });

    return updatedOrder;
  }

  /**
   * Cancel a slot booking
   * Spec: Section 7.2 Step 2b — Patient Cancels
   */
  async cancelSlot(input: CancelSlotInput): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: input.labOrderId },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    // Verify patient owns this lab order
    if (labOrder.patientId !== input.patientId) {
      throw new ForbiddenException('You do not have access to this lab order');
    }

    // Verify lab order is in cancellable status
    if (!CANCELLABLE_STATUSES.includes(labOrder.status as LabOrderStatus)) {
      throw new BadRequestException(
        `Cannot cancel lab order in ${labOrder.status} status`
      );
    }

    // Check 4-hour cutoff for PHLEBOTOMIST_ASSIGNED
    if (labOrder.status === LabOrderStatus.PHLEBOTOMIST_ASSIGNED && labOrder.bookedDate) {
      const now = new Date();
      const bookedTime = new Date(labOrder.bookedDate);
      const hoursUntilSlot = (bookedTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilSlot < 4) {
        throw new BadRequestException(
          'Cannot cancel within 4 hours of scheduled collection. Contact support.'
        );
      }
    }

    // Find and decrement the slot booking count
    if (labOrder.bookedDate && labOrder.bookedTimeSlot) {
      const [startTime, endTime] = labOrder.bookedTimeSlot.split('-');
      const slot = await this.prisma.labSlot.findFirst({
        where: {
          date: labOrder.bookedDate,
          startTime,
          endTime,
          city: labOrder.collectionCity,
        },
      });

      if (slot) {
        await this.prisma.labSlot.update({
          where: { id: slot.id },
          data: { currentBookings: { decrement: 1 } },
        });
      }
    }

    // Update lab order to cancelled
    const updatedOrder = await this.prisma.labOrder.update({
      where: { id: input.labOrderId },
      data: {
        status: LabOrderStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: input.reason,
      },
    });

    return updatedOrder;
  }

  /**
   * Reschedule to a new slot
   * Spec: Section 7.2 Step 2b — Patient Reschedules
   */
  async rescheduleSlot(input: RescheduleSlotInput): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: input.labOrderId },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    // Verify patient owns this lab order
    if (labOrder.patientId !== input.patientId) {
      throw new ForbiddenException('You do not have access to this lab order');
    }

    // Verify can reschedule (same rules as cancel)
    if (!CANCELLABLE_STATUSES.includes(labOrder.status as LabOrderStatus)) {
      throw new BadRequestException(
        `Cannot reschedule lab order in ${labOrder.status} status`
      );
    }

    // Check 4-hour cutoff
    if (labOrder.bookedDate) {
      const now = new Date();
      const bookedTime = new Date(labOrder.bookedDate);
      const hoursUntilSlot = (bookedTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilSlot < 4) {
        throw new BadRequestException(
          'Cannot reschedule within 4 hours of scheduled collection. Contact support.'
        );
      }
    }

    // Find new slot
    const newSlot = await this.prisma.labSlot.findUnique({
      where: { id: input.newSlotId },
    });

    if (!newSlot) {
      throw new NotFoundException('New slot not found');
    }

    // Verify new slot is not fully booked
    if (newSlot.currentBookings >= newSlot.maxBookings) {
      throw new BadRequestException('The new slot is fully booked');
    }

    // Decrement old slot booking count
    if (labOrder.bookedDate && labOrder.bookedTimeSlot) {
      const [startTime, endTime] = labOrder.bookedTimeSlot.split('-');
      const oldSlot = await this.prisma.labSlot.findFirst({
        where: {
          date: labOrder.bookedDate,
          startTime,
          endTime,
          city: labOrder.collectionCity,
        },
      });

      if (oldSlot) {
        await this.prisma.labSlot.update({
          where: { id: oldSlot.id },
          data: { currentBookings: { decrement: 1 } },
        });
      }
    }

    // Increment new slot booking count
    await this.prisma.labSlot.update({
      where: { id: input.newSlotId },
      data: { currentBookings: { increment: 1 } },
    });

    // Update lab order with new slot details
    const updatedOrder = await this.prisma.labOrder.update({
      where: { id: input.labOrderId },
      data: {
        status: LabOrderStatus.SLOT_BOOKED,
        bookedDate: newSlot.date,
        bookedTimeSlot: `${newSlot.startTime}-${newSlot.endTime}`,
        slotBookedAt: new Date(),
        // Clear phlebotomist assignment
        phlebotomistId: null,
        phlebotomistAssignedAt: null,
      },
    });

    return updatedOrder;
  }

  /**
   * Assign a phlebotomist to a lab order
   * Spec: Section 7.2 Step 3 — Coordinator Assigns Phlebotomist
   */
  async assignPhlebotomist(input: AssignPhlebotomistInput): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: input.labOrderId },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    // Verify lab order is in SLOT_BOOKED status
    if (labOrder.status !== LabOrderStatus.SLOT_BOOKED) {
      throw new BadRequestException(
        `Cannot assign phlebotomist to lab order in ${labOrder.status} status`
      );
    }

    // Verify phlebotomist exists
    const phlebotomist = await this.prisma.phlebotomist.findUnique({
      where: { id: input.phlebotomistId },
    });

    if (!phlebotomist) {
      throw new NotFoundException('Phlebotomist not found');
    }

    // Verify phlebotomist is active
    if (!phlebotomist.isActive) {
      throw new BadRequestException('Phlebotomist is not active');
    }

    // Verify phlebotomist services the collection area
    if (!phlebotomist.serviceableAreas.includes(labOrder.collectionPincode)) {
      throw new BadRequestException(
        'Phlebotomist does not service this area'
      );
    }

    // Update lab order with phlebotomist assignment
    const updatedOrder = await this.prisma.labOrder.update({
      where: { id: input.labOrderId },
      data: {
        status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
        phlebotomistId: input.phlebotomistId,
        phlebotomistAssignedAt: new Date(),
      },
    });

    return updatedOrder;
  }

  /**
   * Get available phlebotomists for a pincode and date
   */
  async getAvailablePhlebotomists(input: GetAvailablePhlebotomistsInput): Promise<any[]> {
    const dayOfWeek = input.date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();

    const phlebotomists = await this.prisma.phlebotomist.findMany({
      where: {
        serviceableAreas: { has: input.pincode },
        isActive: true,
        availableDays: { has: dayOfWeek },
      },
      orderBy: [{ rating: 'desc' }, { completedCollections: 'desc' }],
    });

    return phlebotomists;
  }

  /**
   * Mark phlebotomist as running late
   * Spec: Section 7.2 Step 4 — Phlebotomist Running Late
   */
  async markRunningLate(input: MarkRunningLateInput): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: input.labOrderId },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    // Verify this is the assigned phlebotomist
    if (labOrder.phlebotomistId !== input.phlebotomistId) {
      throw new ForbiddenException('You are not assigned to this collection');
    }

    // Verify order is in PHLEBOTOMIST_ASSIGNED status
    if (labOrder.status !== LabOrderStatus.PHLEBOTOMIST_ASSIGNED) {
      throw new BadRequestException(
        `Cannot mark as running late for order in ${labOrder.status} status`
      );
    }

    const updatedOrder = await this.prisma.labOrder.update({
      where: { id: input.labOrderId },
      data: {
        estimatedArrivalTime: input.newETA,
        runningLateAt: new Date(),
      },
    });

    return updatedOrder;
  }

  /**
   * Mark patient as unavailable (collection failed)
   * Spec: Section 7.2 Step 4 — Patient not home
   */
  async markPatientUnavailable(input: MarkPatientUnavailableInput): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: input.labOrderId },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    // Verify this is the assigned phlebotomist
    if (labOrder.phlebotomistId !== input.phlebotomistId) {
      throw new ForbiddenException('You are not assigned to this collection');
    }

    // Verify order is in PHLEBOTOMIST_ASSIGNED status
    if (labOrder.status !== LabOrderStatus.PHLEBOTOMIST_ASSIGNED) {
      throw new BadRequestException(
        `Cannot mark as unavailable for order in ${labOrder.status} status`
      );
    }

    // Increment phlebotomist's failed collections
    await this.prisma.phlebotomist.update({
      where: { id: input.phlebotomistId },
      data: { failedCollections: { increment: 1 } },
    });

    // Update lab order to COLLECTION_FAILED
    const updatedOrder = await this.prisma.labOrder.update({
      where: { id: input.labOrderId },
      data: {
        status: LabOrderStatus.COLLECTION_FAILED,
        collectionFailedAt: new Date(),
        collectionFailedReason: input.reason,
      },
    });

    return updatedOrder;
  }

  /**
   * Create a new lab slot
   */
  async createSlot(input: CreateSlotInput): Promise<any> {
    const slot = await this.prisma.labSlot.create({
      data: {
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        city: input.city,
        serviceableAreas: input.serviceableAreas,
        maxBookings: input.maxBookings || 5,
        currentBookings: 0,
        phlebotomistId: input.phlebotomistId,
      },
    });

    return slot;
  }

  /**
   * Get today's assignments for a phlebotomist
   * Spec: Section 7.5 — Phlebotomist sees only today's assignments
   */
  async getTodaysAssignments(phlebotomistId: string): Promise<any[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const assignments = await this.prisma.labOrder.findMany({
      where: {
        phlebotomistId,
        status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
        bookedDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        consultation: {
          select: {
            vertical: true,
          },
        },
      },
      orderBy: { bookedTimeSlot: 'asc' },
    });

    return assignments;
  }
}
