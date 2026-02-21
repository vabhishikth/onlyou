import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Spec: master spec Section 7 (Blood Work & Diagnostics)
// Spec: master spec Section 7.3 (Lab Order Status Enum)

/**
 * LabOrderStatus — all 15 statuses per spec
 * Main flow: ORDERED → SLOT_BOOKED → PHLEBOTOMIST_ASSIGNED → SAMPLE_COLLECTED →
 *            DELIVERED_TO_LAB → SAMPLE_RECEIVED → PROCESSING → RESULTS_READY →
 *            DOCTOR_REVIEWED → CLOSED
 *
 * Branches:
 * - COLLECTION_FAILED → patient rebooks → SLOT_BOOKED
 * - SAMPLE_ISSUE → auto-new-order → ORDERED
 * - RESULTS_UPLOADED → DOCTOR_REVIEWED → CLOSED (patient self-upload)
 * - CANCELLED (patient cancelled)
 * - EXPIRED (no booking within 14 days)
 */
export enum LabOrderStatus {
  ORDERED = 'ORDERED',
  SLOT_BOOKED = 'SLOT_BOOKED',
  PHLEBOTOMIST_ASSIGNED = 'PHLEBOTOMIST_ASSIGNED',
  SAMPLE_COLLECTED = 'SAMPLE_COLLECTED',
  COLLECTION_FAILED = 'COLLECTION_FAILED',
  DELIVERED_TO_LAB = 'DELIVERED_TO_LAB',
  SAMPLE_RECEIVED = 'SAMPLE_RECEIVED',
  SAMPLE_ISSUE = 'SAMPLE_ISSUE',
  PROCESSING = 'PROCESSING',
  RESULTS_READY = 'RESULTS_READY',
  RESULTS_UPLOADED = 'RESULTS_UPLOADED',
  DOCTOR_REVIEWED = 'DOCTOR_REVIEWED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

/**
 * Valid status transitions per spec Section 7.3
 */
export const VALID_LAB_ORDER_TRANSITIONS: Record<LabOrderStatus, LabOrderStatus[]> = {
  [LabOrderStatus.ORDERED]: [
    LabOrderStatus.SLOT_BOOKED,
    LabOrderStatus.RESULTS_UPLOADED, // Patient self-upload path
    LabOrderStatus.CANCELLED,
    LabOrderStatus.EXPIRED,
  ],
  [LabOrderStatus.SLOT_BOOKED]: [
    LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
    LabOrderStatus.CANCELLED,
  ],
  [LabOrderStatus.PHLEBOTOMIST_ASSIGNED]: [
    LabOrderStatus.SAMPLE_COLLECTED,
    LabOrderStatus.COLLECTION_FAILED,
    LabOrderStatus.CANCELLED, // with ≥4hr notice
  ],
  [LabOrderStatus.SAMPLE_COLLECTED]: [LabOrderStatus.DELIVERED_TO_LAB],
  [LabOrderStatus.COLLECTION_FAILED]: [
    LabOrderStatus.SLOT_BOOKED, // Patient rebooks
  ],
  [LabOrderStatus.DELIVERED_TO_LAB]: [LabOrderStatus.SAMPLE_RECEIVED],
  [LabOrderStatus.SAMPLE_RECEIVED]: [
    LabOrderStatus.PROCESSING,
    LabOrderStatus.SAMPLE_ISSUE,
  ],
  [LabOrderStatus.SAMPLE_ISSUE]: [], // Terminal for this order (new order created)
  [LabOrderStatus.PROCESSING]: [LabOrderStatus.RESULTS_READY],
  [LabOrderStatus.RESULTS_READY]: [LabOrderStatus.DOCTOR_REVIEWED],
  [LabOrderStatus.RESULTS_UPLOADED]: [LabOrderStatus.DOCTOR_REVIEWED],
  [LabOrderStatus.DOCTOR_REVIEWED]: [LabOrderStatus.CLOSED],
  [LabOrderStatus.CLOSED]: [], // Terminal
  [LabOrderStatus.CANCELLED]: [], // Terminal
  [LabOrderStatus.EXPIRED]: [], // Terminal
};

// Status-specific timestamp field mapping
const STATUS_TIMESTAMP_MAP: Record<LabOrderStatus, string> = {
  [LabOrderStatus.ORDERED]: 'orderedAt',
  [LabOrderStatus.SLOT_BOOKED]: 'slotBookedAt',
  [LabOrderStatus.PHLEBOTOMIST_ASSIGNED]: 'phlebotomistAssignedAt',
  [LabOrderStatus.SAMPLE_COLLECTED]: 'sampleCollectedAt',
  [LabOrderStatus.COLLECTION_FAILED]: 'collectionFailedAt',
  [LabOrderStatus.DELIVERED_TO_LAB]: 'deliveredToLabAt',
  [LabOrderStatus.SAMPLE_RECEIVED]: 'sampleReceivedAt',
  [LabOrderStatus.SAMPLE_ISSUE]: 'sampleIssueAt',
  [LabOrderStatus.PROCESSING]: 'processingStartedAt',
  [LabOrderStatus.RESULTS_READY]: 'resultsUploadedAt',
  [LabOrderStatus.RESULTS_UPLOADED]: 'resultsUploadedAt',
  [LabOrderStatus.DOCTOR_REVIEWED]: 'doctorReviewedAt',
  [LabOrderStatus.CLOSED]: 'closedAt',
  [LabOrderStatus.CANCELLED]: 'cancelledAt',
  [LabOrderStatus.EXPIRED]: 'expiredAt',
};

export interface CreateLabOrderInput {
  consultationId: string;
  doctorId: string;
  testPanel: string[];
  panelName?: string | undefined;
  doctorNotes?: string | undefined;
}

export interface TransitionOptions {
  bookedDate?: Date;
  bookedTimeSlot?: string;
  phlebotomistId?: string;
  tubeCount?: number;
  receivedTubeCount?: number;
  diagnosticCentreId?: string;
  reason?: string;
  resultFileUrl?: string;
  abnormalFlags?: Record<string, string>;
  criticalValues?: boolean;
}

export interface UploadPatientResultsInput {
  fileUrl: string;
  patientId: string;
}

export interface CancelLabOrderInput {
  reason: string;
  checkCutoff?: boolean;
  currentTime?: Date;
}

@Injectable()
export class LabOrderService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all lab orders for a doctor
   * Spec: master spec Section 7 — Doctor lab order list
   */
  async getDoctorLabOrders(
    doctorId: string,
    filters?: { status?: string; vertical?: string; search?: string },
  ): Promise<any[]> {
    const where: any = {
      doctorId,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.vertical
        ? { consultation: { vertical: filters.vertical } }
        : {}),
      ...(filters?.search
        ? { patient: { name: { contains: filters.search, mode: 'insensitive' } } }
        : {}),
    };

    const orders = await this.prisma.labOrder.findMany({
      where,
      include: {
        patient: { select: { name: true, phone: true } },
        consultation: { select: { vertical: true } },
      },
      orderBy: { orderedAt: 'desc' },
    });

    return orders.map((order) => ({
      id: order.id,
      consultationId: order.consultationId,
      patientName: order.patient?.name || undefined,
      vertical: order.consultation?.vertical,
      testPanel: order.testPanel,
      panelName: order.panelName || undefined,
      status: order.status,
      criticalValues: order.criticalValues || false,
      orderedAt: order.orderedAt,
      resultFileUrl: order.resultFileUrl || undefined,
    }));
  }

  /**
   * Check if a status transition is valid
   */
  isValidTransition(from: LabOrderStatus, to: LabOrderStatus): boolean {
    const validTargets = VALID_LAB_ORDER_TRANSITIONS[from];
    return validTargets.includes(to);
  }

  /**
   * Create a new lab order
   * Spec: Section 7.2 Step 1 — Doctor Orders
   */
  async createLabOrder(input: CreateLabOrderInput): Promise<any> {
    // Verify consultation exists
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: input.consultationId },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    // Get patient details for collection address
    const patient = await this.prisma.user.findUnique({
      where: { id: consultation.patientId },
      include: { patientProfile: true },
    });

    const labOrder = await this.prisma.labOrder.create({
      data: {
        patientId: consultation.patientId,
        consultationId: input.consultationId,
        doctorId: input.doctorId,
        testPanel: input.testPanel,
        panelName: input.panelName || null,
        doctorNotes: input.doctorNotes || null,
        status: LabOrderStatus.ORDERED,
        orderedAt: new Date(),
        collectionAddress: patient?.patientProfile?.addressLine1 || '',
        collectionCity: patient?.patientProfile?.city || '',
        collectionPincode: patient?.patientProfile?.pincode || '',
        labCost: 99900, // Default cost in paise
        patientCharge: 0,
        coveredBySubscription: true,
        criticalValues: false,
        patientUploadedResults: false,
      },
    });

    return labOrder;
  }

  /**
   * Transition a lab order to a new status
   * Spec: Section 7.3 — Status transitions with timestamps
   */
  async transitionStatus(
    labOrderId: string,
    newStatus: LabOrderStatus,
    options: TransitionOptions = {}
  ): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    const currentStatus = labOrder.status as LabOrderStatus;

    if (!this.isValidTransition(currentStatus, newStatus)) {
      throw new BadRequestException(
        `Invalid transition from ${currentStatus} to ${newStatus}`
      );
    }

    // Build update data with the appropriate timestamp
    const timestampField = STATUS_TIMESTAMP_MAP[newStatus];
    const updateData: Record<string, any> = {
      status: newStatus,
      [timestampField]: new Date(),
    };

    // Add status-specific data
    switch (newStatus) {
      case LabOrderStatus.SLOT_BOOKED:
        if (options.bookedDate) updateData.bookedDate = options.bookedDate;
        if (options.bookedTimeSlot) updateData.bookedTimeSlot = options.bookedTimeSlot;
        // Reset phlebotomist if rebooking after failure
        if (currentStatus === LabOrderStatus.COLLECTION_FAILED) {
          updateData.phlebotomistId = null;
          updateData.phlebotomistAssignedAt = null;
        }
        break;

      case LabOrderStatus.PHLEBOTOMIST_ASSIGNED:
        if (options.phlebotomistId) updateData.phlebotomistId = options.phlebotomistId;
        break;

      case LabOrderStatus.SAMPLE_COLLECTED:
        if (options.tubeCount) updateData.tubeCount = options.tubeCount;
        break;

      case LabOrderStatus.COLLECTION_FAILED:
        if (options.reason) updateData.collectionFailedReason = options.reason;
        break;

      case LabOrderStatus.DELIVERED_TO_LAB:
        if (options.diagnosticCentreId) updateData.diagnosticCentreId = options.diagnosticCentreId;
        break;

      case LabOrderStatus.SAMPLE_RECEIVED:
        if (options.receivedTubeCount) updateData.receivedTubeCount = options.receivedTubeCount;
        break;

      case LabOrderStatus.SAMPLE_ISSUE:
        if (options.reason) updateData.sampleIssueReason = options.reason;
        break;

      case LabOrderStatus.RESULTS_READY:
        if (options.resultFileUrl) updateData.resultFileUrl = options.resultFileUrl;
        if (options.abnormalFlags) {
          updateData.abnormalFlags = options.abnormalFlags;
          // Auto-detect critical values
          const hasCritical = Object.values(options.abnormalFlags).some(
            (flag) => flag === 'CRITICAL'
          );
          updateData.criticalValues = options.criticalValues || hasCritical;
        }
        break;
    }

    const updatedOrder = await this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: updateData,
    });

    return updatedOrder;
  }

  /**
   * Create a recollection order after sample issue
   * Spec: Section 7.3 — SAMPLE_ISSUE → auto-new-order → ORDERED
   */
  async createRecollectionOrder(originalOrderId: string): Promise<any> {
    const originalOrder = await this.prisma.labOrder.findUnique({
      where: { id: originalOrderId },
    });

    if (!originalOrder) {
      throw new NotFoundException('Original lab order not found');
    }

    if (originalOrder.status !== LabOrderStatus.SAMPLE_ISSUE) {
      throw new BadRequestException(
        'Can only create recollection order for orders with SAMPLE_ISSUE status'
      );
    }

    const recollectionOrder = await this.prisma.labOrder.create({
      data: {
        patientId: originalOrder.patientId,
        consultationId: originalOrder.consultationId,
        doctorId: originalOrder.doctorId,
        testPanel: originalOrder.testPanel as string[],
        panelName: originalOrder.panelName,
        doctorNotes: originalOrder.doctorNotes,
        status: LabOrderStatus.ORDERED,
        orderedAt: new Date(),
        collectionAddress: originalOrder.collectionAddress,
        collectionCity: originalOrder.collectionCity,
        collectionPincode: originalOrder.collectionPincode,
        parentLabOrderId: originalOrderId,
        isFreeRecollection: true,
        labCost: 0, // Free recollection
        patientCharge: 0,
        coveredBySubscription: true,
        criticalValues: false,
        patientUploadedResults: false,
      },
    });

    return recollectionOrder;
  }

  /**
   * Patient uploads their own results
   * Spec: Section 7.2 Step 2 — Alt: patient uploads own results
   */
  async uploadPatientResults(
    labOrderId: string,
    input: UploadPatientResultsInput
  ): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    // Only the patient can upload their own results
    if (labOrder.patientId !== input.patientId) {
      throw new ForbiddenException('Only the patient can upload their own results');
    }

    // Can only upload from ORDERED status
    if (labOrder.status !== LabOrderStatus.ORDERED) {
      throw new BadRequestException(
        'Can only upload results when order is in ORDERED status'
      );
    }

    const updatedOrder = await this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: {
        status: LabOrderStatus.RESULTS_UPLOADED,
        patientUploadedResults: true,
        patientUploadedFileUrl: input.fileUrl,
        resultsUploadedAt: new Date(),
      },
    });

    return updatedOrder;
  }

  /**
   * Cancel a lab order
   * Spec: Section 7.2 Step 2b — Patient Cancels
   */
  async cancelLabOrder(
    labOrderId: string,
    input: CancelLabOrderInput
  ): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    const currentStatus = labOrder.status as LabOrderStatus;

    // Check if cancellation is allowed from current status
    const cancellableStatuses = [
      LabOrderStatus.ORDERED,
      LabOrderStatus.SLOT_BOOKED,
      LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
    ];

    if (!cancellableStatuses.includes(currentStatus)) {
      throw new BadRequestException(
        `Cannot cancel lab order in ${currentStatus} status`
      );
    }

    // Check 4-hour cutoff for PHLEBOTOMIST_ASSIGNED
    if (
      currentStatus === LabOrderStatus.PHLEBOTOMIST_ASSIGNED &&
      input.checkCutoff &&
      labOrder.bookedDate
    ) {
      const currentTime = input.currentTime || new Date();
      const bookedTime = new Date(labOrder.bookedDate);
      const hoursUntilSlot =
        (bookedTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60);

      if (hoursUntilSlot < 4) {
        throw new BadRequestException(
          'Cannot cancel within 4 hours of scheduled collection. Contact support.'
        );
      }
    }

    const updatedOrder = await this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: {
        status: LabOrderStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: input.reason,
      },
    });

    return updatedOrder;
  }

  /**
   * Expire stale orders
   * Spec: Section 7.4 — 14 days without booking → EXPIRED
   */
  async expireStaleOrders(): Promise<{ expiredCount: number }> {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const staleOrders = await this.prisma.labOrder.findMany({
      where: {
        status: LabOrderStatus.ORDERED,
        orderedAt: {
          lt: fourteenDaysAgo,
        },
      },
    });

    for (const order of staleOrders) {
      await this.prisma.labOrder.update({
        where: { id: order.id },
        data: {
          status: LabOrderStatus.EXPIRED,
          expiredAt: new Date(),
        },
      });
    }

    return { expiredCount: staleOrders.length };
  }

  /**
   * Get a lab order by ID
   */
  async getLabOrder(labOrderId: string): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
      include: {
        patient: true,
        consultation: true,
        phlebotomist: true,
        diagnosticCentre: true,
      },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    return labOrder;
  }

  /**
   * Get all lab orders for a patient
   */
  async getPatientLabOrders(patientId: string): Promise<any[]> {
    const labOrders = await this.prisma.labOrder.findMany({
      where: { patientId },
      orderBy: { orderedAt: 'desc' },
      include: {
        consultation: true,
      },
    });

    return labOrders;
  }

  /**
   * Get lab orders by status
   */
  async getLabOrdersByStatus(status: LabOrderStatus): Promise<any[]> {
    const labOrders = await this.prisma.labOrder.findMany({
      where: { status },
      orderBy: { orderedAt: 'desc' },
      include: {
        patient: true,
        consultation: true,
      },
    });

    return labOrders;
  }
}
