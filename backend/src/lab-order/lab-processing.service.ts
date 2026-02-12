import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LabOrderStatus } from './lab-order.service';

// Spec: master spec Section 7.2 Steps 5-9 (Lab Processing & Results)

export interface MarkSampleReceivedInput {
  labOrderId: string;
  labId: string;
  receivedTubeCount: number;
}

export interface ReportSampleIssueInput {
  labOrderId: string;
  labId: string;
  reason: string;
}

export interface StartProcessingInput {
  labOrderId: string;
  labId: string;
}

export interface UploadResultsInput {
  labOrderId: string;
  labId: string;
  resultFileUrl: string;
  abnormalFlags: Record<string, string>;
}

export interface UploadPatientResultsInput {
  labOrderId: string;
  patientId: string;
  fileUrl: string;
}

export interface DoctorReviewResultsInput {
  labOrderId: string;
  doctorId: string;
  reviewNotes: string;
}

export interface CloseLabOrderInput {
  labOrderId: string;
  doctorId: string;
}

export interface GetLabOrdersForLabInput {
  labId: string;
  status?: LabOrderStatus;
  startDate?: Date;
  endDate?: Date;
}

export interface GetPendingResultsInput {
  doctorId: string;
}

export interface MarkSampleCollectedInput {
  labOrderId: string;
  phlebotomistId: string;
  tubeCount: number;
}

export interface DeliverToLabInput {
  labOrderId: string;
  phlebotomistId: string;
  labId: string;
}

// Statuses that allow sample issue reporting
const SAMPLE_ISSUE_STATUSES = [
  LabOrderStatus.DELIVERED_TO_LAB,
  LabOrderStatus.SAMPLE_RECEIVED,
];

// Statuses that allow patient self-upload
const PATIENT_UPLOAD_STATUSES = [LabOrderStatus.ORDERED];

// Statuses that allow doctor review
const DOCTOR_REVIEW_STATUSES = [
  LabOrderStatus.RESULTS_READY,
  LabOrderStatus.RESULTS_UPLOADED,
];

@Injectable()
export class LabProcessingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lab marks sample as received with tube count confirmation
   * Spec: Section 7.2 Step 5 — Lab Receives Sample
   */
  async markSampleReceived(input: MarkSampleReceivedInput): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: input.labOrderId },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    // Verify lab is assigned to this order
    if (labOrder.diagnosticCentreId !== input.labId) {
      throw new BadRequestException('Lab is not assigned to this order');
    }

    // Verify order is in DELIVERED_TO_LAB status
    if (labOrder.status !== LabOrderStatus.DELIVERED_TO_LAB) {
      throw new BadRequestException(
        `Cannot mark as received for order in ${labOrder.status} status`
      );
    }

    // Check for tube count mismatch
    const tubeCountMismatch =
      labOrder.tubeCount !== null && labOrder.tubeCount !== input.receivedTubeCount;

    const updatedOrder = await this.prisma.labOrder.update({
      where: { id: input.labOrderId },
      data: {
        status: LabOrderStatus.SAMPLE_RECEIVED,
        sampleReceivedAt: new Date(),
        receivedTubeCount: input.receivedTubeCount,
        tubeCountMismatch,
      },
    });

    return updatedOrder;
  }

  /**
   * Lab reports sample issue and auto-creates recollection order
   * Spec: Section 7.2 Step 5b — Lab Reports Issue
   */
  async reportSampleIssue(input: ReportSampleIssueInput): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: input.labOrderId },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    // Verify lab is assigned to this order
    if (labOrder.diagnosticCentreId !== input.labId) {
      throw new BadRequestException('Lab is not assigned to this order');
    }

    // Verify order is in valid status for issue reporting
    if (!SAMPLE_ISSUE_STATUSES.includes(labOrder.status as LabOrderStatus)) {
      throw new BadRequestException(
        `Cannot report sample issue for order in ${labOrder.status} status`
      );
    }

    // Update lab order to SAMPLE_ISSUE
    const updatedOrder = await this.prisma.labOrder.update({
      where: { id: input.labOrderId },
      data: {
        status: LabOrderStatus.SAMPLE_ISSUE,
        sampleIssueAt: new Date(),
        sampleIssueReason: input.reason,
      },
    });

    // Auto-create free recollection order
    const recollectionOrder = await this.prisma.labOrder.create({
      data: {
        parentLabOrderId: labOrder.id,
        isFreeRecollection: true,
        patientId: labOrder.patientId,
        consultationId: labOrder.consultationId,
        doctorId: labOrder.doctorId,
        testPanel: labOrder.testPanel,
        panelName: labOrder.panelName,
        collectionAddress: labOrder.collectionAddress,
        collectionCity: labOrder.collectionCity,
        collectionPincode: labOrder.collectionPincode,
        labCost: labOrder.labCost,
        patientCharge: 0, // Free recollection
        coveredBySubscription: labOrder.coveredBySubscription,
        status: LabOrderStatus.ORDERED,
      },
    });

    return {
      ...updatedOrder,
      recollectionOrderId: recollectionOrder.id,
    };
  }

  /**
   * Lab starts processing the sample
   * Spec: Section 7.2 Step 6 — Lab Starts Processing
   */
  async startProcessing(input: StartProcessingInput): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: input.labOrderId },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    // Verify lab is assigned to this order
    if (labOrder.diagnosticCentreId !== input.labId) {
      throw new BadRequestException('Lab is not assigned to this order');
    }

    // Verify order is in SAMPLE_RECEIVED status
    if (labOrder.status !== LabOrderStatus.SAMPLE_RECEIVED) {
      throw new BadRequestException(
        `Cannot start processing for order in ${labOrder.status} status`
      );
    }

    const updatedOrder = await this.prisma.labOrder.update({
      where: { id: input.labOrderId },
      data: {
        status: LabOrderStatus.PROCESSING,
        processingStartedAt: new Date(),
      },
    });

    return updatedOrder;
  }

  /**
   * Lab uploads results with abnormal flags
   * Spec: Section 7.2 Step 7 — Lab Uploads Results
   */
  async uploadResults(input: UploadResultsInput): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: input.labOrderId },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    // Verify lab is assigned to this order
    if (labOrder.diagnosticCentreId !== input.labId) {
      throw new BadRequestException('Lab is not assigned to this order');
    }

    // Verify order is in PROCESSING status
    if (labOrder.status !== LabOrderStatus.PROCESSING) {
      throw new BadRequestException(
        `Cannot upload results for order in ${labOrder.status} status`
      );
    }

    // Validate result file URL
    if (!input.resultFileUrl || input.resultFileUrl.trim() === '') {
      throw new BadRequestException('Result file URL is required');
    }

    // Validate abnormal flags
    if (!input.abnormalFlags || Object.keys(input.abnormalFlags).length === 0) {
      throw new BadRequestException('Abnormal flags are required');
    }

    // Check for critical values (any flag marked as CRITICAL)
    const hasCriticalValues = Object.values(input.abnormalFlags).some(
      (flag) => flag === 'CRITICAL'
    );

    const updatedOrder = await this.prisma.labOrder.update({
      where: { id: input.labOrderId },
      data: {
        status: LabOrderStatus.RESULTS_READY,
        resultFileUrl: input.resultFileUrl,
        abnormalFlags: input.abnormalFlags,
        criticalValues: hasCriticalValues,
        resultsUploadedAt: new Date(),
      },
    });

    return updatedOrder;
  }

  /**
   * Patient uploads their own results
   * Spec: Section 7.2 — Patient Self-Upload Path
   */
  async uploadPatientResults(input: UploadPatientResultsInput): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: input.labOrderId },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    // Verify patient owns this order
    if (labOrder.patientId !== input.patientId) {
      throw new BadRequestException('You do not have access to this lab order');
    }

    // Verify order is in uploadable status
    if (!PATIENT_UPLOAD_STATUSES.includes(labOrder.status as LabOrderStatus)) {
      throw new BadRequestException(
        `Cannot upload results for order in ${labOrder.status} status`
      );
    }

    const updatedOrder = await this.prisma.labOrder.update({
      where: { id: input.labOrderId },
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
   * Doctor reviews results
   * Spec: Section 7.2 Step 8 — Doctor Reviews Results
   */
  async doctorReviewResults(input: DoctorReviewResultsInput): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: input.labOrderId },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    // Verify doctor is assigned to this consultation
    if (labOrder.doctorId !== input.doctorId) {
      throw new BadRequestException(
        'You are not the assigned doctor for this order'
      );
    }

    // Verify order is in reviewable status
    if (!DOCTOR_REVIEW_STATUSES.includes(labOrder.status as LabOrderStatus)) {
      throw new BadRequestException(
        `Cannot review results for order in ${labOrder.status} status`
      );
    }

    const updatedOrder = await this.prisma.labOrder.update({
      where: { id: input.labOrderId },
      data: {
        status: LabOrderStatus.DOCTOR_REVIEWED,
        doctorReviewedAt: new Date(),
        doctorReviewNotes: input.reviewNotes,
      },
    });

    return updatedOrder;
  }

  /**
   * Close lab order after doctor review
   * Spec: Section 7.2 Step 9 — Close Lab Order
   */
  async closeLabOrder(input: CloseLabOrderInput): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: input.labOrderId },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    // Verify doctor is assigned to this consultation
    if (labOrder.doctorId !== input.doctorId) {
      throw new BadRequestException(
        'You are not the assigned doctor for this order'
      );
    }

    // Verify order is in DOCTOR_REVIEWED status
    if (labOrder.status !== LabOrderStatus.DOCTOR_REVIEWED) {
      throw new BadRequestException(
        `Cannot close order in ${labOrder.status} status`
      );
    }

    const updatedOrder = await this.prisma.labOrder.update({
      where: { id: input.labOrderId },
      data: {
        status: LabOrderStatus.CLOSED,
        closedAt: new Date(),
      },
    });

    return updatedOrder;
  }

  /**
   * Get lab orders for a diagnostic centre
   */
  async getLabOrdersForLab(input: GetLabOrdersForLabInput): Promise<any[]> {
    const where: any = { diagnosticCentreId: input.labId };

    if (input.status) {
      where.status = input.status;
    }

    if (input.startDate || input.endDate) {
      where.orderedAt = {};
      if (input.startDate) {
        where.orderedAt.gte = input.startDate;
      }
      if (input.endDate) {
        where.orderedAt.lte = input.endDate;
      }
    }

    const orders = await this.prisma.labOrder.findMany({
      where,
      orderBy: { orderedAt: 'desc' },
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
    });

    return orders;
  }

  /**
   * Get pending results for doctor to review
   */
  async getPendingResults(input: GetPendingResultsInput): Promise<any[]> {
    const orders = await this.prisma.labOrder.findMany({
      where: {
        doctorId: input.doctorId,
        status: {
          in: DOCTOR_REVIEW_STATUSES,
        },
      },
      orderBy: [
        { criticalValues: 'desc' }, // Critical first
        { resultsUploadedAt: 'asc' }, // Oldest first
      ],
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
    });

    return orders;
  }

  /**
   * Phlebotomist marks sample as collected
   * Spec: Section 7.2 Step 4 — Sample Collection
   */
  async markSampleCollected(input: MarkSampleCollectedInput): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: input.labOrderId },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    // Verify phlebotomist is assigned to this order
    if (labOrder.phlebotomistId !== input.phlebotomistId) {
      throw new BadRequestException(
        'You are not assigned to this collection'
      );
    }

    // Verify order is in PHLEBOTOMIST_ASSIGNED status
    if (labOrder.status !== LabOrderStatus.PHLEBOTOMIST_ASSIGNED) {
      throw new BadRequestException(
        `Cannot mark as collected for order in ${labOrder.status} status`
      );
    }

    // Validate tube count
    if (input.tubeCount <= 0) {
      throw new BadRequestException('Tube count must be positive');
    }

    // Increment phlebotomist completed collections
    await this.prisma.phlebotomist.update({
      where: { id: input.phlebotomistId },
      data: { completedCollections: { increment: 1 } },
    });

    const updatedOrder = await this.prisma.labOrder.update({
      where: { id: input.labOrderId },
      data: {
        status: LabOrderStatus.SAMPLE_COLLECTED,
        sampleCollectedAt: new Date(),
        tubeCount: input.tubeCount,
      },
    });

    return updatedOrder;
  }

  /**
   * Phlebotomist delivers sample to lab
   * Spec: Section 7.2 Step 5 — Deliver to Lab
   */
  async deliverToLab(input: DeliverToLabInput): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: input.labOrderId },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    // Verify phlebotomist is assigned to this order
    if (labOrder.phlebotomistId !== input.phlebotomistId) {
      throw new BadRequestException(
        'You are not assigned to this collection'
      );
    }

    // Verify order is in SAMPLE_COLLECTED status
    if (labOrder.status !== LabOrderStatus.SAMPLE_COLLECTED) {
      throw new BadRequestException(
        `Cannot deliver to lab for order in ${labOrder.status} status`
      );
    }

    // Verify lab exists and is active
    const lab = await this.prisma.partnerDiagnosticCentre.findUnique({
      where: { id: input.labId },
    });

    if (!lab) {
      throw new NotFoundException('Lab not found');
    }

    if (!lab.isActive) {
      throw new BadRequestException('Lab is not active');
    }

    const updatedOrder = await this.prisma.labOrder.update({
      where: { id: input.labOrderId },
      data: {
        status: LabOrderStatus.DELIVERED_TO_LAB,
        deliveredToLabAt: new Date(),
        diagnosticCentreId: input.labId,
      },
    });

    return updatedOrder;
  }
}
