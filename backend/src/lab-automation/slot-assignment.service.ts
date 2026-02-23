import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { UserRole } from '@prisma/client';

// Spec: Phase 16 Chunk 4 — Phlebotomist Slot Booking + Auto-Assignment

// Statuses that allow slot booking
const BOOKABLE_STATUSES = ['ORDERED', 'PAYMENT_COMPLETED', 'COLLECTION_FAILED'];

// Statuses that allow cancellation
const CANCELLABLE_STATUSES = ['SLOT_BOOKED', 'PHLEBOTOMIST_ASSIGNED'];

@Injectable()
export class SlotAssignmentService {
  private readonly logger = new Logger(SlotAssignmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Auto-assign a phlebotomist to a lab order
   * Spec: Phase 16 Chunk 4 — Find eligible LabPhlebotomists, rank by lowest daily load, assign
   */
  async autoAssignPhlebotomist(labOrderId: string) {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    if (labOrder.status !== 'SLOT_BOOKED') {
      throw new BadRequestException(
        `Cannot assign phlebotomist to lab order in ${labOrder.status} status. Must be SLOT_BOOKED.`,
      );
    }

    // Find eligible phlebotomists: PHLEB_ACTIVE, services the pincode, same city
    const eligible = await this.prisma.labPhlebotomist.findMany({
      where: {
        status: 'PHLEB_ACTIVE',
        isActive: true,
        serviceableAreas: { has: labOrder.collectionPincode },
        city: labOrder.collectionCity,
      },
    });

    if (eligible.length === 0) {
      // Alert admin — no phlebotomist available
      const admins = await this.prisma.user.findMany({
        where: { role: UserRole.ADMIN },
        select: { id: true },
      });
      for (const admin of admins) {
        this.notificationService.sendNotification({
          recipientId: admin.id,
          recipientRole: 'ADMIN',
          channel: 'PUSH',
          eventType: 'NO_PHLEBOTOMIST_AVAILABLE',
          title: 'No Phlebotomist Available',
          body: `No eligible phlebotomist found for lab order ${labOrderId} in ${labOrder.collectionCity} (${labOrder.collectionPincode}).`,
        }).catch(err => {
          this.logger.error(`Failed to send no-phlebotomist notification: ${err?.message}`);
        });
      }
      throw new BadRequestException(
        'No eligible phlebotomist available for this area. Admin has been notified.',
      );
    }

    // Rank by lowest daily load (check roster for the booked date)
    const bookedDate = labOrder.bookedDate!;
    const candidates: { phlebotomist: any; load: number }[] = [];

    for (const phleb of eligible) {
      const roster = await this.prisma.phlebotomistDailyRoster.findUnique({
        where: {
          phlebotomistId_date: {
            phlebotomistId: phleb.id,
            date: bookedDate,
          },
        },
      });

      const currentLoad = roster?.totalBookings ?? 0;

      // Skip if at daily capacity
      if (currentLoad >= phleb.maxDailyCapacity) {
        continue;
      }

      candidates.push({ phlebotomist: phleb, load: currentLoad });
    }

    if (candidates.length === 0) {
      const admins = await this.prisma.user.findMany({
        where: { role: UserRole.ADMIN },
        select: { id: true },
      });
      for (const admin of admins) {
        this.notificationService.sendNotification({
          recipientId: admin.id,
          recipientRole: 'ADMIN',
          channel: 'PUSH',
          eventType: 'NO_PHLEBOTOMIST_AVAILABLE',
          title: 'All Phlebotomists at Capacity',
          body: `All phlebotomists at capacity for ${bookedDate} in ${labOrder.collectionCity}.`,
        }).catch(err => {
          this.logger.error(`Failed to send capacity notification: ${err?.message}`);
        });
      }
      throw new BadRequestException(
        'All eligible phlebotomists are at capacity for the booked date. Admin has been notified.',
      );
    }

    // Sort by load ascending (lowest first)
    candidates.sort((a, b) => a.load - b.load);
    const selected = candidates[0].phlebotomist;

    // Update roster
    await this.prisma.phlebotomistDailyRoster.upsert({
      where: {
        phlebotomistId_date: {
          phlebotomistId: selected.id,
          date: bookedDate,
        },
      },
      create: {
        phlebotomistId: selected.id,
        date: bookedDate,
        totalBookings: 1,
      },
      update: {
        totalBookings: { increment: 1 },
      },
    });

    // Assign to lab order
    const updated = await this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: {
        status: 'PHLEBOTOMIST_ASSIGNED',
        labPhlebotomistId: selected.id,
        phlebotomistAssignedAt: new Date(),
      },
    });

    // Notify patient (fire-and-forget)
    this.notificationService.sendNotification({
      recipientId: labOrder.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'LAB_PHLEBOTOMIST_ASSIGNED',
      title: 'Phlebotomist Assigned',
      body: `${selected.name} has been assigned for your blood draw on ${bookedDate}.`,
    }).catch(err => {
      this.logger.error(`Failed to send phlebotomist assignment notification: ${err?.message}`);
    });

    this.logger.log(
      `Phlebotomist ${selected.name} (${selected.id}) assigned to lab order ${labOrderId}`,
    );
    return updated;
  }

  /**
   * Book a collection slot for a lab order
   * Spec: Phase 16 Chunk 4 — Patient books slot → SLOT_BOOKED
   */
  async bookSlotForLabOrder(
    labOrderId: string,
    patientId: string,
    slotId: string,
  ) {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    if (labOrder.patientId !== patientId) {
      throw new BadRequestException('You can only book slots for your own lab orders');
    }

    if (!BOOKABLE_STATUSES.includes(labOrder.status)) {
      throw new BadRequestException(
        `Cannot book slot for lab order in ${labOrder.status} status`,
      );
    }

    const slot = await this.prisma.labSlot.findUnique({
      where: { id: slotId },
    });

    if (!slot) {
      throw new NotFoundException('Slot not found');
    }

    if (slot.currentBookings >= slot.maxBookings) {
      throw new BadRequestException('This slot is fully booked');
    }

    if (!slot.serviceableAreas.includes(labOrder.collectionPincode)) {
      throw new BadRequestException(
        'This slot does not service your area. Please choose a different slot.',
      );
    }

    // Increment slot bookings
    await this.prisma.labSlot.update({
      where: { id: slotId },
      data: { currentBookings: { increment: 1 } },
    });

    // Build update data
    const updateData: any = {
      status: 'SLOT_BOOKED',
      bookedDate: slot.date,
      bookedTimeSlot: `${slot.startTime}-${slot.endTime}`,
      slotBookedAt: new Date(),
    };

    // If rebooking after failure, clear old phlebotomist assignment
    if (labOrder.status === 'COLLECTION_FAILED') {
      updateData.labPhlebotomistId = null;
      updateData.phlebotomistAssignedAt = null;
    }

    return this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: updateData,
    });
  }

  /**
   * Get available collection slots for a pincode/city
   * Spec: Phase 16 Chunk 4 — Filter by capacity, pincode. Fasting → morning only.
   */
  async getAvailableSlots(
    pincode: string,
    city: string,
    startDate: Date,
    endDate: Date,
    requiresFastingSlot = false,
  ) {
    const slots = await this.prisma.labSlot.findMany({
      where: {
        city,
        serviceableAreas: { has: pincode },
        date: { gte: startDate, lte: endDate },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    // Filter out fully booked slots
    let available = slots.filter(
      (slot: any) => slot.currentBookings < slot.maxBookings,
    );

    // For fasting, only return morning slots (before 10:00)
    if (requiresFastingSlot) {
      available = available.filter((slot: any) => {
        const hour = parseInt(slot.startTime.split(':')[0], 10);
        return hour < 10;
      });
    }

    return available;
  }

  /**
   * Get daily roster for a phlebotomist
   * Spec: Phase 16 Chunk 4 — Daily schedule with route order
   */
  async getDailyRoster(phlebotomistId: string, date: Date) {
    return this.prisma.phlebotomistDailyRoster.findUnique({
      where: {
        phlebotomistId_date: {
          phlebotomistId,
          date,
        },
      },
    });
  }

  /**
   * Cancel a slot booking
   * Spec: Phase 16 Chunk 4 — Decrement slot, decrement roster if phlebotomist assigned
   */
  async cancelSlotBooking(
    labOrderId: string,
    patientId: string,
    reason: string,
  ) {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    if (labOrder.patientId !== patientId) {
      throw new BadRequestException('You can only cancel your own lab orders');
    }

    if (!CANCELLABLE_STATUSES.includes(labOrder.status)) {
      throw new BadRequestException(
        `Cannot cancel lab order in ${labOrder.status} status`,
      );
    }

    // Decrement slot booking count
    if (labOrder.bookedDate && labOrder.bookedTimeSlot) {
      const [startTime, endTime] = labOrder.bookedTimeSlot.split('-');
      const matchingSlots = await this.prisma.labSlot.findMany({
        where: {
          date: labOrder.bookedDate,
          startTime,
          endTime,
          city: labOrder.collectionCity,
        },
      });

      if (matchingSlots.length > 0) {
        await this.prisma.labSlot.update({
          where: { id: matchingSlots[0].id },
          data: { currentBookings: { decrement: 1 } },
        });
      }
    }

    // If phlebotomist was assigned, decrement their roster
    if (labOrder.labPhlebotomistId && labOrder.bookedDate) {
      const roster = await this.prisma.phlebotomistDailyRoster.findUnique({
        where: {
          phlebotomistId_date: {
            phlebotomistId: labOrder.labPhlebotomistId,
            date: labOrder.bookedDate,
          },
        },
      });

      if (roster) {
        await this.prisma.phlebotomistDailyRoster.update({
          where: {
            phlebotomistId_date: {
              phlebotomistId: labOrder.labPhlebotomistId,
              date: labOrder.bookedDate,
            },
          },
          data: { totalBookings: { decrement: 1 } },
        });
      }
    }

    return this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    });
  }
}
