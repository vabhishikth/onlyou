import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { UserRole } from '@prisma/client';
import {
  requiresFasting,
  GLP1_PROTOCOL_TESTS,
  PCOS_PROTOCOL_TESTS,
  LAB_SLA_HOURS,
} from './constants';

// Spec: Phase 16 Chunk 3 — Lab Order Creation + Fasting Detection + Protocol Auto-Triggering

export interface CreateLabOrderOptions {
  collectionAddress: string;
  collectionCity: string;
  collectionPincode: string;
  labCost: number;
  collectionMethod?: string;
}

@Injectable()
export class LabOrderCreationService {
  private readonly logger = new Logger(LabOrderCreationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Create a new lab order with automatic fasting detection
   * Spec: Phase 16 Chunk 3 — Doctor orders blood work → auto-detect fasting, check test availability
   */
  async createLabOrder(
    consultationId: string,
    doctorId: string,
    patientId: string,
    testPanel: string[],
    options: CreateLabOrderOptions,
  ) {
    // Detect fasting requirement
    const isFasting = requiresFasting(testPanel);

    // Check test availability across active partner labs
    const activeLabs = await this.prisma.partnerLab.findMany({
      where: { status: 'ACTIVE' },
    });

    const allAvailableTests = new Set<string>();
    for (const lab of activeLabs) {
      for (const test of (lab.testsAvailable as string[]) || []) {
        allAvailableTests.add(test);
      }
    }

    const unavailableTests = testPanel.filter(t => !allAvailableTests.has(t));
    if (unavailableTests.length > 0) {
      // Alert admin about unavailable tests (fire-and-forget)
      const admins = await this.prisma.user.findMany({
        where: { role: UserRole.ADMIN },
        select: { id: true },
      });
      for (const admin of admins) {
        this.notificationService.sendNotification({
          recipientId: admin.id,
          recipientRole: 'ADMIN',
          channel: 'PUSH',
          eventType: 'LAB_TEST_UNAVAILABLE',
          title: 'Lab Test Unavailable',
          body: `Tests not available at any partner lab: ${unavailableTests.join(', ')}`,
        }).catch(err => {
          this.logger.error(`Failed to send test unavailable notification: ${err?.message}`);
        });
      }
    }

    // Check subscription for payment status
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId: patientId, status: 'ACTIVE' },
      include: { plan: true },
    }) as any;

    const bloodWorkIncluded = subscription?.plan?.includesBloodWork ?? false;
    const initialStatus = bloodWorkIncluded ? 'ORDERED' : 'PAYMENT_PENDING';

    // Check for previous lab order for trend tracking
    const previousOrder = await this.prisma.labOrder.findFirst({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });

    const labOrder = await this.prisma.labOrder.create({
      data: {
        consultationId,
        doctorId,
        patientId,
        testPanel,
        requiresFasting: isFasting,
        status: initialStatus,
        collectionAddress: options.collectionAddress,
        collectionCity: options.collectionCity,
        collectionPincode: options.collectionPincode,
        labCost: options.labCost,
        coveredBySubscription: bloodWorkIncluded,
        collectionMethod: options.collectionMethod,
        previousLabOrderId: previousOrder?.id || null,
      },
    });

    this.logger.log(
      `Lab order created: ${labOrder.id} (fasting=${isFasting}, status=${initialStatus})`,
    );
    return labOrder;
  }

  /**
   * Auto-trigger protocol blood work based on health vertical
   * Spec: Phase 16 Chunk 3 — GLP-1 (WEIGHT_MANAGEMENT) and PCOS auto-order
   */
  async autoTriggerProtocolBloodWork(
    consultationId: string,
    vertical: string,
  ) {
    // Only WEIGHT_MANAGEMENT and PCOS have auto-protocols
    let protocolTests: readonly string[];
    if (vertical === 'WEIGHT_MANAGEMENT') {
      protocolTests = GLP1_PROTOCOL_TESTS;
    } else if (vertical === 'PCOS') {
      protocolTests = PCOS_PROTOCOL_TESTS;
    } else {
      return null;
    }

    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        patient: {
          include: { patientProfile: true },
        },
      },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    // Check test availability and alert if any protocol tests unavailable
    const activeLabs = await this.prisma.partnerLab.findMany({
      where: { status: 'ACTIVE' },
    });

    const allAvailableTests = new Set<string>();
    for (const lab of activeLabs) {
      for (const test of (lab.testsAvailable as string[]) || []) {
        allAvailableTests.add(test);
      }
    }

    const unavailableProtocolTests = protocolTests.filter(
      t => !allAvailableTests.has(t),
    );
    if (unavailableProtocolTests.length > 0) {
      const admins = await this.prisma.user.findMany({
        where: { role: UserRole.ADMIN },
        select: { id: true },
      });
      for (const admin of admins) {
        this.notificationService.sendNotification({
          recipientId: admin.id,
          recipientRole: 'ADMIN',
          channel: 'PUSH',
          eventType: 'PROTOCOL_TESTS_UNAVAILABLE',
          title: 'Protocol Tests Unavailable',
          body: `Protocol tests not available at any lab: ${unavailableProtocolTests.join(', ')}. Vertical: ${vertical}`,
        }).catch(err => {
          this.logger.error(`Failed to send protocol unavailable notification: ${err?.message}`);
        });
      }
    }

    const patientProfile = consultation.patient?.patientProfile;
    const address = patientProfile?.addressLine1 || '';
    const city = patientProfile?.city || '';
    const pincode = patientProfile?.pincode || '';

    // Create the protocol lab order
    const labOrder = await this.createLabOrder(
      consultationId,
      consultation.doctorId!,
      consultation.patientId,
      [...protocolTests],
      {
        collectionAddress: address,
        collectionCity: city,
        collectionPincode: pincode,
        labCost: 0, // Protocol blood work — cost handled by subscription or separate billing
      },
    );

    return labOrder;
  }

  /**
   * Auto-trigger follow-up blood work if last order is >3 months ago
   * Spec: Phase 16 Chunk 3 — Follow-up monitoring interval = 3 months
   */
  async autoTriggerFollowUpBloodWork(
    patientId: string,
    vertical: string,
  ) {
    // Find most recent lab order for this patient
    const lastOrder = await this.prisma.labOrder.findFirst({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastOrder) {
      return null;
    }

    // Check if >3 months since last order
    const monthsSinceLastOrder = this.getMonthsDifference(
      lastOrder.createdAt,
      new Date(),
    );

    if (monthsSinceLastOrder < LAB_SLA_HOURS.FOLLOW_UP_MONTHS) {
      return null; // Too recent for follow-up
    }

    // Trigger follow-up via the protocol path
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: lastOrder.consultationId },
      include: {
        patient: {
          include: { patientProfile: true },
        },
      },
    });

    if (!consultation) {
      return null;
    }

    // Determine protocol tests based on vertical
    let protocolTests: readonly string[];
    if (vertical === 'WEIGHT_MANAGEMENT') {
      protocolTests = GLP1_PROTOCOL_TESTS;
    } else if (vertical === 'PCOS') {
      protocolTests = PCOS_PROTOCOL_TESTS;
    } else {
      // For verticals without protocol, re-order the same panel
      protocolTests = lastOrder.testPanel || [];
    }

    const patientProfile = consultation.patient?.patientProfile;
    const address = patientProfile?.addressLine1 || '';
    const city = patientProfile?.city || '';
    const pincode = patientProfile?.pincode || '';

    // Check subscription
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId: patientId, status: 'ACTIVE' },
      include: { plan: true },
    }) as any;

    const bloodWorkIncluded = subscription?.plan?.includesBloodWork ?? false;

    const labOrder = await this.prisma.labOrder.create({
      data: {
        consultationId: consultation.id,
        doctorId: consultation.doctorId!,
        patientId,
        testPanel: [...protocolTests],
        requiresFasting: requiresFasting([...protocolTests]),
        status: bloodWorkIncluded ? 'ORDERED' : 'PAYMENT_PENDING',
        collectionAddress: address,
        collectionCity: city,
        collectionPincode: pincode,
        labCost: 0,
        coveredBySubscription: bloodWorkIncluded,
        isFollowUp: true,
        previousLabOrderId: lastOrder.id,
        isProtocolRequired: vertical === 'WEIGHT_MANAGEMENT' || vertical === 'PCOS',
      },
    });

    this.logger.log(
      `Follow-up blood work triggered for patient ${patientId}: ${labOrder.id}`,
    );
    return labOrder;
  }

  /**
   * Handle patient uploading their own lab results
   * Spec: Phase 16 Chunk 3 — Patient self-upload → RESULTS_UPLOADED status
   */
  async handlePatientUpload(
    labOrderId: string,
    patientId: string,
    fileUrl: string,
  ) {
    const order = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
    });

    if (!order) {
      throw new NotFoundException('Lab order not found');
    }

    if (order.patientId !== patientId) {
      throw new BadRequestException('You can only upload results for your own lab order');
    }

    return this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: {
        patientUploadedResults: true,
        patientUploadedFileUrl: fileUrl,
        status: 'RESULTS_UPLOADED',
      },
    });
  }

  /**
   * Doctor reviews patient-uploaded results (accept or reject)
   * Spec: Phase 16 Chunk 3 — Accept → DOCTOR_REVIEWED, Reject → ORDERED (rebook)
   */
  async doctorReviewUploadedResults(
    labOrderId: string,
    doctorId: string,
    accepted: boolean,
    rejectionReason?: string,
  ) {
    const order = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
    });

    if (!order) {
      throw new NotFoundException('Lab order not found');
    }

    if (accepted) {
      return this.prisma.labOrder.update({
        where: { id: labOrderId },
        data: {
          uploadedResultsAccepted: true,
          uploadedResultsReviewedById: doctorId,
          status: 'DOCTOR_REVIEWED',
          doctorReviewedAt: new Date(),
        },
      });
    } else {
      // Reject — notify patient, reset to ORDERED for rebooking
      this.notificationService.sendNotification({
        recipientId: order.patientId,
        recipientRole: 'PATIENT',
        channel: 'PUSH',
        eventType: 'LAB_UPLOAD_REJECTED',
        title: 'Lab Results Rejected',
        body: rejectionReason
          ? `Your uploaded lab results were rejected: ${rejectionReason}. Please book a blood draw.`
          : 'Your uploaded lab results were rejected. Please book a blood draw.',
      }).catch(err => {
        this.logger.error(`Failed to send upload rejection notification: ${err?.message}`);
      });

      return this.prisma.labOrder.update({
        where: { id: labOrderId },
        data: {
          uploadedResultsAccepted: false,
          uploadedResultsReviewedById: doctorId,
          status: 'ORDERED',
        },
      });
    }
  }

  /**
   * Calculate months difference between two dates
   */
  private getMonthsDifference(from: Date, to: Date): number {
    return (
      (to.getFullYear() - from.getFullYear()) * 12 +
      (to.getMonth() - from.getMonth())
    );
  }
}
