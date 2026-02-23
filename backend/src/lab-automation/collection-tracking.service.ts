import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { UserRole } from '@prisma/client';

// Spec: Phase 16 Chunk 5 — Collection Day Logistics + Sample Tracking

@Injectable()
export class CollectionTrackingService {
  private readonly logger = new Logger(CollectionTrackingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Mark phlebotomist en route to patient
   * Spec: Phase 16 Chunk 5 — PHLEBOTOMIST_ASSIGNED → PHLEBOTOMIST_EN_ROUTE
   */
  async markEnRoute(labOrderId: string, phlebotomistId: string) {
    const order = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
    });

    if (!order) {
      throw new NotFoundException('Lab order not found');
    }

    if (order.labPhlebotomistId !== phlebotomistId) {
      throw new BadRequestException('You are not assigned to this collection');
    }

    if (order.status !== 'PHLEBOTOMIST_ASSIGNED') {
      throw new BadRequestException(
        `Cannot mark en route from ${order.status}. Must be PHLEBOTOMIST_ASSIGNED.`,
      );
    }

    const updated = await this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: {
        status: 'PHLEBOTOMIST_EN_ROUTE',
        phlebotomistEnRouteAt: new Date(),
      },
    });

    // Notify patient (fire-and-forget)
    this.notificationService.sendNotification({
      recipientId: order.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'PHLEBOTOMIST_EN_ROUTE',
      title: 'Phlebotomist On the Way',
      body: 'Your phlebotomist is on the way for your blood draw.',
    }).catch(err => {
      this.logger.error(`Failed to send en-route notification: ${err?.message}`);
    });

    return updated;
  }

  /**
   * Verify patient fasting status before collection
   * Spec: Phase 16 Chunk 5 — If requiresFasting=true, phlebotomist must verify
   */
  async verifyFastingStatus(
    labOrderId: string,
    _phlebotomistId: string,
    patientHasFasted: boolean,
  ) {
    const order = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
    });

    if (!order) {
      throw new NotFoundException('Lab order not found');
    }

    // Skip if order doesn't require fasting
    if (!order.requiresFasting) {
      return null;
    }

    if (!patientHasFasted) {
      // Patient broke fast — flag and alert doctor
      const updated = await this.prisma.labOrder.update({
        where: { id: labOrderId },
        data: { patientNotFasting: true },
      });

      this.notificationService.sendNotification({
        recipientId: order.doctorId,
        recipientRole: 'DOCTOR',
        channel: 'PUSH',
        eventType: 'PATIENT_NOT_FASTING',
        title: 'Patient Did Not Fast',
        body: `Patient did not fast before fasting-required blood work (Order: ${labOrderId}). Results may be affected.`,
      }).catch(err => {
        this.logger.error(`Failed to send fasting alert: ${err?.message}`);
      });

      return updated;
    }

    // Patient fasted properly
    return this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: { patientNotFasting: false },
    });
  }

  /**
   * Mark sample collected
   * Spec: Phase 16 Chunk 5 — PHLEBOTOMIST_EN_ROUTE → SAMPLE_COLLECTED
   */
  async markSampleCollected(
    labOrderId: string,
    phlebotomistId: string,
    tubeCount: number,
  ) {
    if (tubeCount <= 0) {
      throw new BadRequestException('Tube count must be at least 1');
    }

    const order = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
    });

    if (!order) {
      throw new NotFoundException('Lab order not found');
    }

    if (order.labPhlebotomistId !== phlebotomistId) {
      throw new BadRequestException('You are not assigned to this collection');
    }

    if (order.status !== 'PHLEBOTOMIST_EN_ROUTE') {
      throw new BadRequestException(
        `Cannot mark sample collected from ${order.status}. Must be PHLEBOTOMIST_EN_ROUTE.`,
      );
    }

    const updated = await this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: {
        status: 'SAMPLE_COLLECTED',
        sampleCollectedAt: new Date(),
        tubeCount,
        collectionCompletedByPhlebotomistId: phlebotomistId,
      },
    });

    // Update roster completed count
    if (order.bookedDate) {
      const roster = await this.prisma.phlebotomistDailyRoster.findUnique({
        where: {
          phlebotomistId_date: {
            phlebotomistId,
            date: order.bookedDate,
          },
        },
      });

      if (roster) {
        await this.prisma.phlebotomistDailyRoster.update({
          where: {
            phlebotomistId_date: {
              phlebotomistId,
              date: order.bookedDate,
            },
          },
          data: { completedCollections: { increment: 1 } },
        });
      }
    }

    this.logger.log(`Sample collected for order ${labOrderId}: ${tubeCount} tubes`);
    return updated;
  }

  /**
   * Mark collection failed
   * Spec: Phase 16 Chunk 5 — PHLEBOTOMIST_EN_ROUTE → COLLECTION_FAILED
   */
  async markCollectionFailed(
    labOrderId: string,
    phlebotomistId: string,
    reason: string,
  ) {
    const order = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
    });

    if (!order) {
      throw new NotFoundException('Lab order not found');
    }

    if (order.labPhlebotomistId !== phlebotomistId) {
      throw new BadRequestException('You are not assigned to this collection');
    }

    const newAttempts = (order.collectionAttempts || 0) + 1;

    const updated = await this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: {
        status: 'COLLECTION_FAILED',
        collectionFailedAt: new Date(),
        collectionFailedReason: reason,
        collectionAttempts: newAttempts,
      },
    });

    // Update roster failed count
    if (order.bookedDate) {
      const roster = await this.prisma.phlebotomistDailyRoster.findUnique({
        where: {
          phlebotomistId_date: {
            phlebotomistId,
            date: order.bookedDate,
          },
        },
      });

      if (roster) {
        await this.prisma.phlebotomistDailyRoster.update({
          where: {
            phlebotomistId_date: {
              phlebotomistId,
              date: order.bookedDate,
            },
          },
          data: { failedCollections: { increment: 1 } },
        });
      }
    }

    // Notify patient
    this.notificationService.sendNotification({
      recipientId: order.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'LAB_COLLECTION_FAILED',
      title: 'Blood Collection Could Not Be Completed',
      body: `Your blood collection could not be completed: ${reason}. Please rebook a slot.`,
    }).catch(err => {
      this.logger.error(`Failed to send collection failure notification: ${err?.message}`);
    });

    // Alert admin after 2+ failed attempts
    if (newAttempts >= 2) {
      const admins = await this.prisma.user.findMany({
        where: { role: UserRole.ADMIN },
        select: { id: true },
      });
      for (const admin of admins) {
        this.notificationService.sendNotification({
          recipientId: admin.id,
          recipientRole: 'ADMIN',
          channel: 'PUSH',
          eventType: 'COLLECTION_FAILED_MULTIPLE',
          title: 'Multiple Collection Failures',
          body: `Lab order ${labOrderId} has ${newAttempts} failed collection attempts. Manual intervention may be needed.`,
        }).catch(err => {
          this.logger.error(`Failed to send admin collection failure alert: ${err?.message}`);
        });
      }
    }

    return updated;
  }

  /**
   * Mark sample in transit to lab
   * Spec: Phase 16 Chunk 5 — SAMPLE_COLLECTED → SAMPLE_IN_TRANSIT
   */
  async markSampleInTransit(labOrderId: string, phlebotomistId: string) {
    const order = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
    });

    if (!order) {
      throw new NotFoundException('Lab order not found');
    }

    if (order.labPhlebotomistId !== phlebotomistId) {
      throw new BadRequestException('You are not assigned to this collection');
    }

    if (order.status !== 'SAMPLE_COLLECTED') {
      throw new BadRequestException(
        `Cannot mark in transit from ${order.status}. Must be SAMPLE_COLLECTED.`,
      );
    }

    return this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: {
        status: 'SAMPLE_IN_TRANSIT',
        sampleInTransitAt: new Date(),
      },
    });
  }

  /**
   * Mark sample delivered to lab
   * Spec: Phase 16 Chunk 5 — SAMPLE_IN_TRANSIT or SAMPLE_COLLECTED → DELIVERED_TO_LAB
   * Detects tube count mismatch and alerts admin
   */
  async markDeliveredToLab(
    labOrderId: string,
    phlebotomistId: string,
    receivedTubeCount: number,
  ) {
    const order = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
    });

    if (!order) {
      throw new NotFoundException('Lab order not found');
    }

    if (order.labPhlebotomistId !== phlebotomistId) {
      throw new BadRequestException('You are not assigned to this collection');
    }

    // Allow from SAMPLE_IN_TRANSIT or SAMPLE_COLLECTED (direct handoff)
    if (order.status !== 'SAMPLE_IN_TRANSIT' && order.status !== 'SAMPLE_COLLECTED') {
      throw new BadRequestException(
        `Cannot mark delivered from ${order.status}. Must be SAMPLE_IN_TRANSIT or SAMPLE_COLLECTED.`,
      );
    }

    const hasMismatch = order.tubeCount != null && receivedTubeCount !== order.tubeCount;

    const updated = await this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: {
        status: 'DELIVERED_TO_LAB',
        deliveredToLabAt: new Date(),
        receivedTubeCount,
        tubeCountMismatch: hasMismatch,
      },
    });

    // Alert admin if tube count mismatch
    if (hasMismatch) {
      const admins = await this.prisma.user.findMany({
        where: { role: UserRole.ADMIN },
        select: { id: true },
      });
      for (const admin of admins) {
        this.notificationService.sendNotification({
          recipientId: admin.id,
          recipientRole: 'ADMIN',
          channel: 'PUSH',
          eventType: 'TUBE_COUNT_MISMATCH',
          title: 'Tube Count Mismatch',
          body: `Lab order ${labOrderId}: collected ${order.tubeCount} tubes but received ${receivedTubeCount}.`,
        }).catch(err => {
          this.logger.error(`Failed to send tube mismatch alert: ${err?.message}`);
        });
      }
    }

    return updated;
  }

  /**
   * Mark sample received by lab technician
   * Spec: Phase 16 Chunk 5 — DELIVERED_TO_LAB → SAMPLE_RECEIVED
   */
  async markSampleReceived(
    labOrderId: string,
    labTechId: string,
    receivedTubeCount: number,
  ) {
    const order = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
    });

    if (!order) {
      throw new NotFoundException('Lab order not found');
    }

    if (order.status !== 'DELIVERED_TO_LAB') {
      throw new BadRequestException(
        `Cannot mark sample received from ${order.status}. Must be DELIVERED_TO_LAB.`,
      );
    }

    return this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: {
        status: 'SAMPLE_RECEIVED',
        sampleReceivedAt: new Date(),
        sampleReceivedByLabTechId: labTechId,
        receivedTubeCount,
      },
    });
  }
}
