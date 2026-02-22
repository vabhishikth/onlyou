import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookedSlotStatus, ConsultationStatus, VideoSessionStatus } from '@prisma/client';

// Spec: Phase 13 — Slot Booking Service
// Handles slot booking, cancellation, rescheduling, and no-show tracking

export const CONNECTIVITY_WARNING =
  "Video consultation requires a stable internet connection. If you're in an area with poor connectivity, consider booking a later slot when you'll have better access, or your doctor can do an audio-only phone call.";

export interface BookSlotInput {
  consultationId: string;
  patientId: string;
  slotDate: Date;
  startTime: string; // "10:00" (IST, 24hr)
}

export interface BookingResponse {
  bookedSlot: any;
  videoSession: any;
  connectivityWarning: string;
}

export interface NoShowResult {
  status: VideoSessionStatus;
  noShowMarkedBy: string;
  adminAlert: boolean;
}

@Injectable()
export class SlotBookingService {
  constructor(private readonly prisma: PrismaService) {}

  async bookSlot(input: BookSlotInput): Promise<BookingResponse> {
    const { consultationId, patientId, slotDate, startTime } = input;

    // Validate consultation exists
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    // Validate consultation is in DOCTOR_REVIEWING status
    if (consultation.status !== ConsultationStatus.DOCTOR_REVIEWING) {
      throw new BadRequestException(
        'Consultation must be in DOCTOR_REVIEWING status to book a video slot',
      );
    }

    // Validate patient is the consultation owner
    if (consultation.patientId !== patientId) {
      throw new BadRequestException('You are not the patient for this consultation');
    }

    // Validate doctor is assigned
    if (!consultation.doctorId) {
      throw new BadRequestException('No doctor assigned to this consultation');
    }

    // Validate slot is in the future
    const slotDateTime = this.buildSlotDateTime(slotDate, startTime);
    if (slotDateTime <= new Date()) {
      throw new BadRequestException('Cannot book a slot in the past');
    }

    const doctorId = consultation.doctorId;
    const endTime = this.addMinutes(startTime, 15);
    const slotEndDateTime = this.buildSlotDateTime(slotDate, endTime);

    // Atomic transaction: create VideoSession + BookedSlot + update Consultation
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Create VideoSession
        const videoSession = await tx.videoSession.create({
          data: {
            consultationId,
            doctorId,
            patientId,
            status: VideoSessionStatus.SCHEDULED,
            scheduledStartTime: slotDateTime,
            scheduledEndTime: slotEndDateTime,
          },
        });

        // Create BookedSlot (unique constraint prevents double-booking)
        const bookedSlot = await tx.bookedSlot.create({
          data: {
            videoSessionId: videoSession.id,
            doctorId,
            patientId,
            consultationId,
            slotDate,
            startTime: slotDateTime,
            endTime: slotEndDateTime,
            status: BookedSlotStatus.BOOKED,
          },
        });

        // Transition consultation to VIDEO_SCHEDULED
        await tx.consultation.update({
          where: { id: consultationId },
          data: { status: ConsultationStatus.VIDEO_SCHEDULED },
        });

        return {
          bookedSlot,
          videoSession,
          connectivityWarning: CONNECTIVITY_WARNING,
        };
      });
    } catch (error: any) {
      // Prisma P2002 = unique constraint violation (double-booking)
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'Slot no longer available. Please select a different time.',
        );
      }
      throw error;
    }
  }

  async cancelBooking(
    bookedSlotId: string,
    cancelledBy: string,
    reason: string,
  ): Promise<any> {
    const bookedSlot = await this.prisma.bookedSlot.findUnique({
      where: { id: bookedSlotId },
      include: { videoSession: true },
    });

    if (!bookedSlot) {
      throw new NotFoundException('Booked slot not found');
    }

    if (bookedSlot.status !== BookedSlotStatus.BOOKED) {
      throw new BadRequestException('This booking has already been cancelled or completed');
    }

    // Check 2-hour rule (log as late cancellation but still allow)
    const hoursUntilSlot =
      (bookedSlot.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
    const isLateCancellation = hoursUntilSlot < 2;

    return this.prisma.$transaction(async (tx) => {
      // Update BookedSlot
      const updatedSlot = await tx.bookedSlot.update({
        where: { id: bookedSlotId },
        data: {
          status: BookedSlotStatus.CANCELLED,
        },
      });

      // Update VideoSession
      await tx.videoSession.update({
        where: { id: bookedSlot.videoSessionId },
        data: {
          status: VideoSessionStatus.CANCELLED,
          cancelledBy,
          cancellationReason: reason,
          cancelledAt: new Date(),
        },
      });

      // Transition consultation back to DOCTOR_REVIEWING
      await tx.consultation.update({
        where: { id: bookedSlot.videoSession.consultationId },
        data: { status: ConsultationStatus.DOCTOR_REVIEWING },
      });

      return updatedSlot;
    });
  }

  async rescheduleBooking(
    bookedSlotId: string,
    newSlotDate: Date,
    newStartTime: string,
    rescheduledBy: string,
  ): Promise<BookingResponse> {
    const existingSlot = await this.prisma.bookedSlot.findUnique({
      where: { id: bookedSlotId },
      include: { videoSession: true },
    });

    if (!existingSlot) {
      throw new NotFoundException('Booked slot not found');
    }

    const doctorId = existingSlot.doctorId;
    const patientId = existingSlot.patientId;
    const consultationId = existingSlot.consultationId;

    const newSlotDateTime = this.buildSlotDateTime(newSlotDate, newStartTime);
    const newEndTime = this.addMinutes(newStartTime, 15);
    const newSlotEndDateTime = this.buildSlotDateTime(newSlotDate, newEndTime);

    // Cancel old + book new in single transaction
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Cancel old booking
        await tx.bookedSlot.update({
          where: { id: bookedSlotId },
          data: { status: BookedSlotStatus.CANCELLED },
        });

        // Cancel old video session
        await tx.videoSession.update({
          where: { id: existingSlot.videoSessionId },
          data: {
            status: VideoSessionStatus.CANCELLED,
            cancelledBy: rescheduledBy,
            cancellationReason: 'Rescheduled',
            cancelledAt: new Date(),
          },
        });

        // Create new VideoSession
        const videoSession = await tx.videoSession.create({
          data: {
            consultationId,
            doctorId,
            patientId,
            status: VideoSessionStatus.SCHEDULED,
            scheduledStartTime: newSlotDateTime,
            scheduledEndTime: newSlotEndDateTime,
          },
        });

        // Create new BookedSlot
        const bookedSlot = await tx.bookedSlot.create({
          data: {
            videoSessionId: videoSession.id,
            doctorId,
            patientId,
            consultationId,
            slotDate: newSlotDate,
            startTime: newSlotDateTime,
            endTime: newSlotEndDateTime,
            status: BookedSlotStatus.BOOKED,
          },
        });

        // Ensure consultation remains VIDEO_SCHEDULED
        await tx.consultation.update({
          where: { id: consultationId },
          data: { status: ConsultationStatus.VIDEO_SCHEDULED },
        });

        return {
          bookedSlot,
          videoSession,
          connectivityWarning: CONNECTIVITY_WARNING,
        };
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'New slot is no longer available. Please select a different time.',
        );
      }
      throw error;
    }
  }

  async getUpcomingBookings(
    userId: string,
    role: 'PATIENT' | 'DOCTOR',
  ): Promise<any[]> {
    const where: any = {
      status: BookedSlotStatus.BOOKED,
      startTime: { gte: new Date() },
    };

    if (role === 'PATIENT') {
      where.patientId = userId;
    } else {
      where.doctorId = userId;
    }

    return this.prisma.bookedSlot.findMany({
      where,
      include: {
        videoSession: true,
        doctor: true,
        patient: true,
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async handleNoShow(
    videoSessionId: string,
    noShowParty: 'PATIENT' | 'DOCTOR',
    markedBy: string,
  ): Promise<NoShowResult> {
    const session = await this.prisma.videoSession.findUnique({
      where: { id: videoSessionId },
    });

    if (!session) {
      throw new NotFoundException('Video session not found');
    }

    const newStatus =
      noShowParty === 'PATIENT'
        ? VideoSessionStatus.NO_SHOW_PATIENT
        : VideoSessionStatus.NO_SHOW_DOCTOR;

    const updated = await this.prisma.videoSession.update({
      where: { id: videoSessionId },
      data: {
        status: newStatus,
        noShowMarkedBy: markedBy,
      },
    });

    // Check if patient has >= 2 no-shows (admin alert threshold)
    let adminAlert = false;
    if (noShowParty === 'PATIENT') {
      const noShowCount = await this.prisma.videoSession.count({
        where: {
          patientId: session.patientId,
          status: VideoSessionStatus.NO_SHOW_PATIENT,
        },
      });
      adminAlert = noShowCount >= 2;
    }

    return {
      status: updated.status,
      noShowMarkedBy: updated.noShowMarkedBy!,
      adminAlert,
    };
  }

  // ============================================
  // Private helpers
  // ============================================

  private buildSlotDateTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const dt = new Date(date);
    dt.setHours(hours, minutes, 0, 0);
    return dt;
  }

  private addMinutes(time: string, minutes: number): string {
    const [h, m] = time.split(':').map(Number);
    const totalMinutes = h * 60 + m + minutes;
    const newH = Math.floor(totalMinutes / 60);
    const newM = totalMinutes % 60;
    return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
  }
}
