import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { PharmacyAssignmentService } from './pharmacy-assignment.service';

// Spec: Phase 15 Chunk 7 — Auto-Refill for Subscriptions

@Injectable()
export class AutoRefillService {
  private readonly logger = new Logger(AutoRefillService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly assignmentService: PharmacyAssignmentService,
  ) {}

  /**
   * Check if prescription is still valid
   */
  private isPrescriptionValid(prescription: { validUntil: Date }): boolean {
    return new Date(prescription.validUntil) > new Date();
  }

  /**
   * Process upcoming refills
   * Spec: Phase 15 Chunk 7 — @Cron daily at 10 AM. 5 days before next refill,
   * check prescription validity, auto-create PharmacyOrder if valid.
   */
  @Cron('0 10 * * *')
  async processUpcomingRefills() {
    this.logger.log('Processing upcoming auto-refills...');

    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

    // Find active configs with nextRefillDate within 5 days
    const configs = await this.prisma.autoRefillConfig.findMany({
      where: {
        isActive: true,
        nextRefillDate: { lte: fiveDaysFromNow },
      },
    });

    let processed = 0;
    let failed = 0;

    for (const config of configs) {
      try {
        // Check prescription validity
        const prescription = await this.prisma.prescription.findUnique({
          where: { id: config.prescriptionId },
        });

        if (!prescription) {
          this.logger.warn(`Prescription ${config.prescriptionId} not found for auto-refill ${config.id}`);
          failed++;
          continue;
        }

        if (!this.isPrescriptionValid(prescription)) {
          // Expired — notify patient and doctor, do NOT create order
          this.notificationService.sendNotification({
            recipientId: config.patientId,
            recipientRole: 'PATIENT',
            channel: 'PUSH',
            eventType: 'PRESCRIPTION_EXPIRED_FOR_REFILL',
            title: 'Prescription Expired',
            body: 'Your auto-refill prescription has expired. Please consult your doctor for a renewal.',
            data: { prescriptionId: config.prescriptionId, autoRefillConfigId: config.id },
          }).catch(err => {
            this.logger.error(`Failed to notify patient: ${err?.message}`);
          });

          this.logger.warn(`Prescription ${config.prescriptionId} expired for auto-refill ${config.id}`);
          continue;
        }

        // Valid — auto-create pharmacy order
        const result = await this.assignmentService.assignPharmacy(config.prescriptionId);

        if (result.assigned) {
          // Update config: bump refill counter, set next date, track order
          const nextRefillDate = new Date(config.nextRefillDate);
          nextRefillDate.setDate(nextRefillDate.getDate() + config.intervalDays);

          await this.prisma.autoRefillConfig.update({
            where: { id: config.id },
            data: {
              totalRefillsCreated: config.totalRefillsCreated + 1,
              lastPharmacyOrderId: result.pharmacyOrderId,
              nextRefillDate,
            },
          });

          // Notify patient about auto-refill
          this.notificationService.sendNotification({
            recipientId: config.patientId,
            recipientRole: 'PATIENT',
            channel: 'PUSH',
            eventType: 'AUTO_REFILL_CREATED',
            title: 'Auto-Refill Ordered',
            body: 'Your medication refill has been automatically ordered and will be delivered soon.',
            data: { prescriptionId: config.prescriptionId, pharmacyOrderId: result.pharmacyOrderId },
          }).catch(err => {
            this.logger.error(`Failed to notify patient: ${err?.message}`);
          });

          processed++;
        } else {
          this.logger.warn(`Auto-refill assignment failed for config ${config.id}`);
          failed++;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to process auto-refill ${config.id}: ${message}`);
        failed++;
      }
    }

    this.logger.log(`Auto-refill processing complete. Processed: ${processed}, Failed: ${failed}, Total: ${configs.length}`);
  }

  /**
   * Create a new refill subscription
   * Spec: Phase 15 Chunk 7 — Patient creates, validates prescription validity
   */
  async createRefillSubscription(patientId: string, prescriptionId: string, intervalDays: number) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    if (!this.isPrescriptionValid(prescription)) {
      throw new BadRequestException('Prescription has expired. Cannot create refill subscription.');
    }

    const nextRefillDate = new Date();
    nextRefillDate.setDate(nextRefillDate.getDate() + intervalDays);

    const config = await this.prisma.autoRefillConfig.create({
      data: {
        patientId,
        prescriptionId,
        intervalDays,
        nextRefillDate,
        isActive: true,
      },
    });

    this.logger.log(`Auto-refill subscription created for patient ${patientId}, prescription ${prescriptionId}`);
    return config;
  }

  /**
   * Cancel a refill subscription
   * Spec: Phase 15 Chunk 7 — Patient-only action
   */
  async cancelRefillSubscription(configId: string, patientId: string) {
    const config = await this.prisma.autoRefillConfig.findUnique({
      where: { id: configId },
    });

    if (!config) {
      throw new NotFoundException('Auto-refill subscription not found');
    }

    if (config.patientId !== patientId) {
      throw new BadRequestException('You can only cancel your own refill subscription');
    }

    const updated = await this.prisma.autoRefillConfig.update({
      where: { id: configId },
      data: {
        isActive: false,
        pausedAt: new Date(),
        pauseReason: 'Cancelled by patient',
      },
    });

    this.logger.log(`Auto-refill subscription ${configId} cancelled by patient ${patientId}`);
    return updated;
  }
}
