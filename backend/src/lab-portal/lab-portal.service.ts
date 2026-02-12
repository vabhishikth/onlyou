import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LabOrderStatus } from '../lab-order/lab-order.service';

// Spec: master spec Section 7.1 — Lab Portal (lab.onlyou.life)
// Simple operations for diagnostic centre staff

export interface LabSampleSummary {
    id: string;
    sampleId: string;
    panelName: string;
    testsOrdered: string[];
    deliveredBy: string | null; // Phlebotomist name
    deliveredAt: Date | null;
    status: string;
    tubeCount: number | null;
    patientInitials: string; // First letters only, anonymized
    createdAt: Date;
}

export interface LabTodaySummary {
    incoming: number; // DELIVERED_TO_LAB
    inProgress: number; // SAMPLE_RECEIVED + PROCESSING
    completed: number; // RESULTS_READY (today)
}

@Injectable()
export class LabPortalService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Get lab info for the logged-in diagnostic centre
     */
    async getLabInfo(labId: string): Promise<any> {
        const lab = await this.prisma.partnerDiagnosticCentre.findUnique({
            where: { id: labId },
        });

        if (!lab) {
            throw new NotFoundException('Lab not found');
        }

        return {
            id: lab.id,
            name: lab.name,
            city: lab.city,
            isActive: lab.isActive,
        };
    }

    /**
     * Get today's summary stats for the lab
     */
    async getTodaySummary(labId: string): Promise<LabTodaySummary> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Count incoming (DELIVERED_TO_LAB)
        const incoming = await this.prisma.labOrder.count({
            where: {
                diagnosticCentreId: labId,
                status: LabOrderStatus.DELIVERED_TO_LAB,
            },
        });

        // Count in progress (SAMPLE_RECEIVED + PROCESSING)
        const inProgress = await this.prisma.labOrder.count({
            where: {
                diagnosticCentreId: labId,
                status: {
                    in: [LabOrderStatus.SAMPLE_RECEIVED, LabOrderStatus.PROCESSING],
                },
            },
        });

        // Count completed today (RESULTS_READY with resultsUploadedAt today)
        const completed = await this.prisma.labOrder.count({
            where: {
                diagnosticCentreId: labId,
                status: LabOrderStatus.RESULTS_READY,
                resultsUploadedAt: {
                    gte: today,
                    lt: tomorrow,
                },
            },
        });

        return { incoming, inProgress, completed };
    }

    /**
     * Get incoming samples awaiting acknowledgement
     * Spec: Section 7.2 Step 5 — Lab Receives Sample
     */
    async getIncomingSamples(labId: string): Promise<LabSampleSummary[]> {
        const orders = await this.prisma.labOrder.findMany({
            where: {
                diagnosticCentreId: labId,
                status: LabOrderStatus.DELIVERED_TO_LAB,
            },
            include: {
                patient: {
                    select: { name: true },
                },
                phlebotomist: {
                    select: { name: true },
                },
            },
            orderBy: { deliveredToLabAt: 'asc' }, // Oldest first
        });

        return orders.map((order) => this.mapToSampleSummary(order));
    }

    /**
     * Get samples in progress (received + processing)
     */
    async getInProgressSamples(labId: string): Promise<LabSampleSummary[]> {
        const orders = await this.prisma.labOrder.findMany({
            where: {
                diagnosticCentreId: labId,
                status: {
                    in: [LabOrderStatus.SAMPLE_RECEIVED, LabOrderStatus.PROCESSING],
                },
            },
            include: {
                patient: {
                    select: { name: true },
                },
                phlebotomist: {
                    select: { name: true },
                },
            },
            orderBy: { sampleReceivedAt: 'asc' }, // Oldest first
        });

        return orders.map((order) => this.mapToSampleSummary(order));
    }

    /**
     * Get completed samples from today
     */
    async getCompletedSamples(labId: string): Promise<LabSampleSummary[]> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const orders = await this.prisma.labOrder.findMany({
            where: {
                diagnosticCentreId: labId,
                status: LabOrderStatus.RESULTS_READY,
                resultsUploadedAt: {
                    gte: today,
                    lt: tomorrow,
                },
            },
            include: {
                patient: {
                    select: { name: true },
                },
                phlebotomist: {
                    select: { name: true },
                },
            },
            orderBy: { resultsUploadedAt: 'desc' }, // Most recent first
        });

        return orders.map((order) => this.mapToSampleSummary(order));
    }

    /**
     * Mark sample as received
     * Spec: Section 7.2 Step 5 — Lab Receives Sample
     */
    async markSampleReceived(
        labId: string,
        labOrderId: string,
        tubeCount: number,
    ): Promise<LabSampleSummary> {
        const order = await this.getLabOrder(labOrderId, labId);

        if (order.status !== LabOrderStatus.DELIVERED_TO_LAB) {
            throw new BadRequestException(
                `Cannot mark as received: order is in ${order.status} status`,
            );
        }

        if (tubeCount <= 0) {
            throw new BadRequestException('Tube count must be positive');
        }

        const tubeCountMismatch =
            order.tubeCount !== null && order.tubeCount !== tubeCount;

        const updated = await this.prisma.labOrder.update({
            where: { id: labOrderId },
            data: {
                status: LabOrderStatus.SAMPLE_RECEIVED,
                sampleReceivedAt: new Date(),
                receivedTubeCount: tubeCount,
                tubeCountMismatch,
            },
            include: {
                patient: { select: { name: true } },
                phlebotomist: { select: { name: true } },
            },
        });

        return this.mapToSampleSummary(updated);
    }

    /**
     * Report sample issue
     * Spec: Section 7.2 Step 5b — Lab Reports Issue
     */
    async reportSampleIssue(
        labId: string,
        labOrderId: string,
        reason: string,
    ): Promise<{ success: boolean; message: string }> {
        const order = await this.getLabOrder(labOrderId, labId);

        const validStatuses = [
            LabOrderStatus.DELIVERED_TO_LAB,
            LabOrderStatus.SAMPLE_RECEIVED,
        ];

        if (!validStatuses.includes(order.status as LabOrderStatus)) {
            throw new BadRequestException(
                `Cannot report issue: order is in ${order.status} status`,
            );
        }

        if (!reason || reason.trim() === '') {
            throw new BadRequestException('Issue reason is required');
        }

        // Update order to SAMPLE_ISSUE
        await this.prisma.labOrder.update({
            where: { id: labOrderId },
            data: {
                status: LabOrderStatus.SAMPLE_ISSUE,
                sampleIssueAt: new Date(),
                sampleIssueReason: reason,
            },
        });

        // Auto-create free recollection order
        await this.prisma.labOrder.create({
            data: {
                parentLabOrderId: order.id,
                isFreeRecollection: true,
                patientId: order.patientId,
                consultationId: order.consultationId,
                doctorId: order.doctorId,
                testPanel: order.testPanel,
                panelName: order.panelName,
                collectionAddress: order.collectionAddress,
                collectionCity: order.collectionCity,
                collectionPincode: order.collectionPincode,
                labCost: order.labCost,
                patientCharge: 0,
                coveredBySubscription: order.coveredBySubscription,
                status: LabOrderStatus.ORDERED,
            },
        });

        return {
            success: true,
            message: 'Issue reported. Free recollection has been scheduled.',
        };
    }

    /**
     * Start processing sample
     * Spec: Section 7.2 Step 6 — Lab Starts Processing
     */
    async startProcessing(
        labId: string,
        labOrderId: string,
    ): Promise<LabSampleSummary> {
        const order = await this.getLabOrder(labOrderId, labId);

        if (order.status !== LabOrderStatus.SAMPLE_RECEIVED) {
            throw new BadRequestException(
                `Cannot start processing: order is in ${order.status} status`,
            );
        }

        const updated = await this.prisma.labOrder.update({
            where: { id: labOrderId },
            data: {
                status: LabOrderStatus.PROCESSING,
                processingStartedAt: new Date(),
            },
            include: {
                patient: { select: { name: true } },
                phlebotomist: { select: { name: true } },
            },
        });

        return this.mapToSampleSummary(updated);
    }

    /**
     * Upload results with abnormal flags
     * Spec: Section 7.2 Step 7 — Lab Uploads Results
     */
    async uploadResults(
        labId: string,
        labOrderId: string,
        resultFileUrl: string,
        abnormalFlags: Record<string, string>,
    ): Promise<LabSampleSummary> {
        const order = await this.getLabOrder(labOrderId, labId);

        if (order.status !== LabOrderStatus.PROCESSING) {
            throw new BadRequestException(
                `Cannot upload results: order is in ${order.status} status`,
            );
        }

        if (!resultFileUrl || resultFileUrl.trim() === '') {
            throw new BadRequestException('Result file URL is required');
        }

        if (!abnormalFlags || Object.keys(abnormalFlags).length === 0) {
            throw new BadRequestException(
                'Abnormal flags are required (mark each test as NORMAL, ABNORMAL, or CRITICAL)',
            );
        }

        // Check for critical values
        const hasCriticalValues = Object.values(abnormalFlags).some(
            (flag) => flag === 'CRITICAL',
        );

        const updated = await this.prisma.labOrder.update({
            where: { id: labOrderId },
            data: {
                status: LabOrderStatus.RESULTS_READY,
                resultFileUrl,
                abnormalFlags,
                criticalValues: hasCriticalValues,
                resultsUploadedAt: new Date(),
            },
            include: {
                patient: { select: { name: true } },
                phlebotomist: { select: { name: true } },
            },
        });

        // TODO: Trigger notifications if critical values
        // - Notify doctor immediately
        // - Notify patient

        return this.mapToSampleSummary(updated);
    }

    /**
     * Helper: Get lab order with permission check
     */
    private async getLabOrder(labOrderId: string, labId: string): Promise<any> {
        const order = await this.prisma.labOrder.findUnique({
            where: { id: labOrderId },
        });

        if (!order) {
            throw new NotFoundException('Lab order not found');
        }

        if (order.diagnosticCentreId !== labId) {
            throw new ForbiddenException('You do not have access to this sample');
        }

        return order;
    }

    /**
     * Helper: Map order to sample summary (anonymized patient info)
     */
    private mapToSampleSummary(order: any): LabSampleSummary {
        // Generate patient initials (anonymized)
        const patientName = order.patient?.name || 'Unknown';
        const initials = patientName
            .split(' ')
            .map((part: string) => part.charAt(0).toUpperCase())
            .join('');

        // Parse testPanel JSON if needed
        let testsOrdered: string[] = [];
        if (order.testPanel) {
            if (Array.isArray(order.testPanel)) {
                testsOrdered = order.testPanel;
            } else if (typeof order.testPanel === 'object') {
                testsOrdered = Object.keys(order.testPanel);
            }
        }

        return {
            id: order.id,
            sampleId: order.id.slice(-8).toUpperCase(), // Last 8 chars for display
            panelName: order.panelName || 'Standard Panel',
            testsOrdered,
            deliveredBy: order.phlebotomist?.name || null,
            deliveredAt: order.deliveredToLabAt,
            status: order.status,
            tubeCount: order.tubeCount || order.receivedTubeCount,
            patientInitials: initials,
            createdAt: order.createdAt,
        };
    }
}
