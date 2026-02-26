import { Injectable } from '@nestjs/common';
import { NotificationService } from '../notification/notification.service';
import { PrismaService } from '../prisma/prisma.service';

// Spec: Phase 13 — Dedicated video consultation notification methods

@Injectable()
export class VideoNotificationService {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
  ) {}

  async notifySlotBooked(bookedSlotId: string): Promise<void> {
    const slot = await this.prisma.bookedSlot.findUnique({
      where: { id: bookedSlotId },
      include: { doctor: true, patient: true },
    });
    if (!slot) return;

    await this.notificationService.sendNotification({
      recipientId: slot.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'VIDEO_BOOKING_CONFIRMED',
      title: 'Video Consultation Booked',
      body: `Your video consultation is scheduled for ${slot.slotDate.toLocaleDateString('en-IN')}`,
    });

    await this.notificationService.sendNotification({
      recipientId: slot.doctorId,
      recipientRole: 'DOCTOR',
      channel: 'IN_APP',
      eventType: 'VIDEO_BOOKING_CONFIRMED',
      title: 'New Video Consultation',
      body: `Video consultation scheduled for ${slot.slotDate.toLocaleDateString('en-IN')}`,
    });
  }

  async notify24HourReminder(videoSessionId: string): Promise<void> {
    const session = await this.prisma.videoSession.findUnique({
      where: { id: videoSessionId },
    });
    if (!session) return;

    await this.notificationService.sendNotification({
      recipientId: session.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'VIDEO_24HR_REMINDER',
      title: 'Video Consultation Tomorrow',
      body: `Your video consultation is tomorrow at ${session.scheduledStartTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
    });
  }

  async notify1HourReminder(videoSessionId: string): Promise<void> {
    const session = await this.prisma.videoSession.findUnique({
      where: { id: videoSessionId },
    });
    if (!session) return;

    await this.notificationService.sendNotification({
      recipientId: session.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'VIDEO_1HR_REMINDER',
      title: 'Video Consultation in 1 Hour',
      body: 'Your video consultation starts in about 1 hour. Make sure you have a stable internet connection.',
    });

    await this.notificationService.sendNotification({
      recipientId: session.doctorId,
      recipientRole: 'DOCTOR',
      channel: 'PUSH',
      eventType: 'VIDEO_1HR_REMINDER',
      title: 'Video Consultation in 1 Hour',
      body: 'You have a video consultation starting in about 1 hour.',
    });
  }

  async notifyRoomReady(videoSessionId: string): Promise<void> {
    const session = await this.prisma.videoSession.findUnique({
      where: { id: videoSessionId },
    });
    if (!session) return;

    await this.notificationService.sendNotification({
      recipientId: session.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'VIDEO_SESSION_STARTED',
      title: 'Join Your Video Consultation',
      body: 'Your doctor is ready. Tap to join the video consultation now.',
    });

    await this.notificationService.sendNotification({
      recipientId: session.doctorId,
      recipientRole: 'DOCTOR',
      channel: 'PUSH',
      eventType: 'VIDEO_SESSION_STARTED',
      title: 'Join Video Consultation',
      body: 'The consultation room is ready. Your patient has been notified.',
    });
  }

  async notifyVideoCompleted(videoSessionId: string): Promise<void> {
    const session = await this.prisma.videoSession.findUnique({
      where: { id: videoSessionId },
    });
    if (!session) return;

    await this.notificationService.sendNotification({
      recipientId: session.doctorId,
      recipientRole: 'DOCTOR',
      channel: 'IN_APP',
      eventType: 'VIDEO_COMPLETED',
      title: 'Video Consultation Completed',
      body: 'Video consultation completed. Please review and write prescription.',
    });

    await this.notificationService.sendNotification({
      recipientId: session.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'VIDEO_COMPLETED',
      title: 'Consultation Complete',
      body: 'Your video consultation is complete. Your doctor is now reviewing your case.',
    });
  }

  async notifyDoctorNoShowAdmin(videoSessionId: string, minutesLate: number): Promise<void> {
    const session = await this.prisma.videoSession.findUnique({
      where: { id: videoSessionId },
    });
    if (!session) return;

    const admins = await this.prisma.user.findMany({ where: { role: 'ADMIN' } });
    for (const admin of admins) {
      await this.notificationService.sendNotification({
        recipientId: admin.id,
        recipientRole: 'ADMIN',
        channel: 'IN_APP',
        eventType: 'VIDEO_NO_SHOW_DOCTOR',
        title: `URGENT: Doctor No-Show (${minutesLate} min)`,
        body: `Doctor has not joined video session. Patient is waiting.`,
      });
    }
  }

  async notifyPatientApology(videoSessionId: string): Promise<void> {
    const session = await this.prisma.videoSession.findUnique({
      where: { id: videoSessionId },
    });
    if (!session) return;

    await this.notificationService.sendNotification({
      recipientId: session.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'VIDEO_NO_SHOW_DOCTOR',
      title: 'We Apologize',
      body: 'Your doctor was unable to join. We are arranging a new consultation for you.',
    });
  }

  async notifyCancellation(bookedSlotId: string): Promise<void> {
    const slot = await this.prisma.bookedSlot.findUnique({
      where: { id: bookedSlotId },
      include: { doctor: true, patient: true },
    });
    if (!slot) return;

    await this.notificationService.sendNotification({
      recipientId: slot.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'VIDEO_BOOKING_CANCELLED',
      title: 'Video Consultation Cancelled',
      body: 'Your video consultation has been cancelled. You can rebook a new slot.',
    });
  }

  async notifyReschedule(bookedSlotId: string, newSlotDate: Date): Promise<void> {
    const slot = await this.prisma.bookedSlot.findUnique({
      where: { id: bookedSlotId },
      include: { doctor: true, patient: true },
    });
    if (!slot) return;

    await this.notificationService.sendNotification({
      recipientId: slot.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'VIDEO_RESCHEDULED',
      title: 'Video Consultation Rescheduled',
      body: `Your video consultation has been rescheduled to ${newSlotDate.toLocaleDateString('en-IN')}`,
    });
  }

  async notifyRejoin(videoSessionId: string, newRoomId: string): Promise<void> {
    const session = await this.prisma.videoSession.findUnique({
      where: { id: videoSessionId },
    });
    if (!session) return;

    await this.notificationService.sendNotification({
      recipientId: session.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'VIDEO_RECONNECT_NEEDED',
      title: 'Rejoin Video Consultation',
      body: 'Connection was interrupted. Tap to rejoin the consultation.',
      data: { newRoomId },
    });

    await this.notificationService.sendNotification({
      recipientId: session.doctorId,
      recipientRole: 'DOCTOR',
      channel: 'PUSH',
      eventType: 'VIDEO_RECONNECT_NEEDED',
      title: 'Rejoin Video Consultation',
      body: 'Connection was interrupted. A new room has been created.',
      data: { newRoomId },
    });
  }
}
