import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DayOfWeek, DoctorAvailabilitySlot } from '@prisma/client';

// Spec: Phase 13 — Doctor Availability Management

export interface SetSlotInput {
  dayOfWeek: DayOfWeek;
  startTime: string; // "18:00" (IST, 24hr)
  endTime: string;   // "20:00"
}

export interface AvailableSlotWindow {
  date: string;      // "2026-02-23"
  startTime: string; // "09:00"
  endTime: string;   // "09:15"
}

export interface DoctorSlotResponse {
  doctorId: string;
  slots: AvailableSlotWindow[];
}

const TIME_FORMAT_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const DAY_OF_WEEK_MAP: Record<number, DayOfWeek> = {
  0: DayOfWeek.SUNDAY,
  1: DayOfWeek.MONDAY,
  2: DayOfWeek.TUESDAY,
  3: DayOfWeek.WEDNESDAY,
  4: DayOfWeek.THURSDAY,
  5: DayOfWeek.FRIDAY,
  6: DayOfWeek.SATURDAY,
};

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async setRecurringAvailability(
    doctorId: string,
    slots: SetSlotInput[],
  ): Promise<DoctorAvailabilitySlot[]> {
    // Validate all slots
    for (const slot of slots) {
      this.validateSlot(slot);
    }

    // Get unique days being set
    const days = [...new Set(slots.map((s) => s.dayOfWeek))];

    return this.prisma.$transaction(async (tx) => {
      // Delete existing slots for these days
      await tx.doctorAvailabilitySlot.deleteMany({
        where: {
          doctorId,
          dayOfWeek: { in: days },
        },
      });

      // Create new slots
      const records = slots.map((slot) => ({
        doctorId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        slotDurationMinutes: 15,
      }));

      await tx.doctorAvailabilitySlot.createMany({ data: records });

      // Return the created slots
      return tx.doctorAvailabilitySlot.findMany({
        where: { doctorId, dayOfWeek: { in: days } },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
    });
  }

  async getAvailability(doctorId: string): Promise<DoctorAvailabilitySlot[]> {
    return this.prisma.doctorAvailabilitySlot.findMany({
      where: { doctorId, isActive: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async getAvailableSlots(
    doctorId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<AvailableSlotWindow[]> {
    // Get active recurring slots for this doctor
    const recurringSlots = await this.prisma.doctorAvailabilitySlot.findMany({
      where: { doctorId, isActive: true },
    });

    if (recurringSlots.length === 0) return [];

    // Get already-booked slots in the date range
    const bookedSlots = await this.prisma.bookedSlot.findMany({
      where: {
        doctorId,
        slotDate: { gte: fromDate, lte: toDate },
        status: 'BOOKED',
      },
    });

    // Build set of booked time keys for fast lookup: "YYYY-MM-DD|HH:MM"
    const bookedKeys = new Set<string>();
    for (const booked of bookedSlots) {
      const dateStr = this.formatDate(booked.slotDate);
      const timeStr = this.formatTime(booked.startTime);
      bookedKeys.add(`${dateStr}|${timeStr}`);
    }

    // Generate concrete available windows
    const available: AvailableSlotWindow[] = [];
    const current = new Date(fromDate);

    while (current <= toDate) {
      const dayOfWeek = DAY_OF_WEEK_MAP[current.getDay()];
      const dateStr = this.formatDate(current);

      // Find recurring slots matching this day of week
      const matchingSlots = recurringSlots.filter((s) => s.dayOfWeek === dayOfWeek);

      for (const slot of matchingSlots) {
        const windows = this.generate15MinWindows(slot.startTime, slot.endTime);

        for (const window of windows) {
          const key = `${dateStr}|${window.start}`;
          if (!bookedKeys.has(key)) {
            available.push({
              date: dateStr,
              startTime: window.start,
              endTime: window.end,
            });
          }
        }
      }

      // Next day
      current.setDate(current.getDate() + 1);
    }

    return available;
  }

  async deactivateSlot(slotId: string, doctorId: string): Promise<void> {
    const slot = await this.prisma.doctorAvailabilitySlot.findFirst({
      where: { id: slotId, doctorId },
    });

    if (!slot) {
      throw new NotFoundException('Availability slot not found');
    }

    await this.prisma.doctorAvailabilitySlot.update({
      where: { id: slotId },
      data: { isActive: false },
    });
  }

  async getAvailableDoctorSlots(consultationId: string): Promise<DoctorSlotResponse> {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    if (!consultation.doctorId) {
      throw new BadRequestException('No doctor assigned to this consultation');
    }

    // Get next 7 days of available slots
    const fromDate = new Date();
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 7);

    const slots = await this.getAvailableSlots(consultation.doctorId, fromDate, toDate);

    return {
      doctorId: consultation.doctorId,
      slots,
    };
  }

  private validateSlot(slot: SetSlotInput): void {
    if (!TIME_FORMAT_REGEX.test(slot.startTime)) {
      throw new BadRequestException(`Invalid start time format: ${slot.startTime}. Use HH:MM (24hr)`);
    }
    if (!TIME_FORMAT_REGEX.test(slot.endTime)) {
      throw new BadRequestException(`Invalid end time format: ${slot.endTime}. Use HH:MM (24hr)`);
    }

    const startMinutes = this.timeToMinutes(slot.startTime);
    const endMinutes = this.timeToMinutes(slot.endTime);

    if (startMinutes >= endMinutes) {
      throw new BadRequestException(`Start time ${slot.startTime} must be before end time ${slot.endTime}`);
    }

    if (endMinutes - startMinutes < 15) {
      throw new BadRequestException('Slot duration must be at least 15 minutes');
    }
  }

  private generate15MinWindows(startTime: string, endTime: string): { start: string; end: string }[] {
    const windows: { start: string; end: string }[] = [];
    let currentMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);

    while (currentMinutes + 15 <= endMinutes) {
      windows.push({
        start: this.minutesToTime(currentMinutes),
        end: this.minutesToTime(currentMinutes + 15),
      });
      currentMinutes += 15;
    }

    return windows;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatTime(dateTime: Date): string {
    const hours = dateTime.getHours().toString().padStart(2, '0');
    const minutes = dateTime.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}
