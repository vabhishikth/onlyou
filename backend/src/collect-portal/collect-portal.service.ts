import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LabOrderStatus } from '../lab-order/lab-order.service';

// Spec: master spec Section 7.2 — Collection Portal (collect.onlyou.life)
// THE SIMPLEST PORTAL. Used on the road, one hand, between collections.

export interface PhlebotomistInfo {
    id: string;
    name: string;
    phone: string;
    currentCity: string;
    isActive: boolean;
}

export interface TodayAssignment {
    id: string;
    patientFirstName: string;
    patientPhone: string;
    patientArea: string; // City/area only, not full address
    fullAddress: string; // Full address for navigation
    timeWindow: string; // e.g., "8:00-10:00 AM"
    panelName: string;
    testsOrdered: string[];
    status: string;
    tubeCount: number | null;
    collectedAt: Date | null;
    notes: string | null;
}

export interface TodaySummary {
    total: number;
    completed: number;
    pending: number;
    failed: number;
}

@Injectable()
export class CollectPortalService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Get phlebotomist info for the logged-in user
     */
    async getPhlebotomistInfo(phlebotomistId: string): Promise<PhlebotomistInfo> {
        const phlebotomist = await this.prisma.phlebotomist.findUnique({
            where: { id: phlebotomistId },
        });

        if (!phlebotomist) {
            throw new NotFoundException('Phlebotomist not found');
        }

        return {
            id: phlebotomist.id,
            name: phlebotomist.name,
            phone: phlebotomist.phone,
            currentCity: phlebotomist.currentCity,
            isActive: phlebotomist.isActive,
        };
    }

    /**
     * Get today's summary stats
     */
    async getTodaySummary(phlebotomistId: string): Promise<TodaySummary> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get all assignments for today
        const assignments = await this.prisma.labOrder.findMany({
            where: {
                phlebotomistId,
                bookedDate: {
                    gte: today,
                    lt: tomorrow,
                },
            },
            select: { status: true },
        });

        const completed = assignments.filter(
            (a) =>
                a.status === LabOrderStatus.SAMPLE_COLLECTED ||
                a.status === LabOrderStatus.DELIVERED_TO_LAB ||
                a.status === LabOrderStatus.SAMPLE_RECEIVED ||
                a.status === LabOrderStatus.PROCESSING ||
                a.status === LabOrderStatus.RESULTS_READY
        ).length;

        const failed = assignments.filter(
            (a) => a.status === LabOrderStatus.COLLECTION_FAILED
        ).length;

        const pending = assignments.length - completed - failed;

        return {
            total: assignments.length,
            completed,
            pending,
            failed,
        };
    }

    /**
     * Get today's assignments
     * Spec: Section 7.2 — Phlebotomist sees assignment
     */
    async getTodayAssignments(phlebotomistId: string): Promise<TodayAssignment[]> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const orders = await this.prisma.labOrder.findMany({
            where: {
                phlebotomistId,
                bookedDate: {
                    gte: today,
                    lt: tomorrow,
                },
            },
            include: {
                patient: {
                    select: {
                        name: true,
                        phone: true,
                    },
                },
            },
            orderBy: [
                { status: 'asc' }, // Pending first
                { bookedDate: 'asc' },
            ],
        });

        return orders.map((order) => this.mapToAssignment(order));
    }

    /**
     * Mark sample as collected
     * Spec: Section 7.2 Step 4 — Phlebotomist Collects
     */
    async markCollected(
        phlebotomistId: string,
        labOrderId: string,
        tubeCount: number,
    ): Promise<TodayAssignment> {
        const order = await this.getLabOrder(labOrderId, phlebotomistId);

        if (order.status !== LabOrderStatus.PHLEBOTOMIST_ASSIGNED) {
            throw new BadRequestException(
                `Cannot mark as collected: order is in ${order.status} status`,
            );
        }

        if (tubeCount <= 0) {
            throw new BadRequestException('Tube count must be positive');
        }

        // Update order
        const updated = await this.prisma.labOrder.update({
            where: { id: labOrderId },
            data: {
                status: LabOrderStatus.SAMPLE_COLLECTED,
                sampleCollectedAt: new Date(),
                tubeCount,
            },
            include: {
                patient: { select: { name: true, phone: true } },
            },
        });

        // Increment phlebotomist completed collections
        await this.prisma.phlebotomist.update({
            where: { id: phlebotomistId },
            data: { completedCollections: { increment: 1 } },
        });

        return this.mapToAssignment(updated);
    }

    /**
     * Mark patient as unavailable
     * Spec: Section 7.2 — Patient Unavailable
     */
    async markPatientUnavailable(
        phlebotomistId: string,
        labOrderId: string,
        reason: string,
    ): Promise<{ success: boolean; message: string }> {
        const order = await this.getLabOrder(labOrderId, phlebotomistId);

        if (order.status !== LabOrderStatus.PHLEBOTOMIST_ASSIGNED) {
            throw new BadRequestException(
                `Cannot mark as unavailable: order is in ${order.status} status`,
            );
        }

        if (!reason || reason.trim() === '') {
            throw new BadRequestException('Reason is required');
        }

        // Update order to COLLECTION_FAILED
        await this.prisma.labOrder.update({
            where: { id: labOrderId },
            data: {
                status: LabOrderStatus.COLLECTION_FAILED,
                collectionFailedAt: new Date(),
                collectionFailedReason: reason,
            },
        });

        // Increment phlebotomist failed collections
        await this.prisma.phlebotomist.update({
            where: { id: phlebotomistId },
            data: { failedCollections: { increment: 1 } },
        });

        return {
            success: true,
            message: 'Marked as unavailable. Coordinator will reschedule.',
        };
    }

    /**
     * Report running late
     * Spec: Section 7.2 — Running Late
     */
    async reportRunningLate(
        phlebotomistId: string,
        labOrderId: string,
        newEta: string,
    ): Promise<{ success: boolean; message: string }> {
        const order = await this.getLabOrder(labOrderId, phlebotomistId);

        if (order.status !== LabOrderStatus.PHLEBOTOMIST_ASSIGNED) {
            throw new BadRequestException(
                `Cannot update ETA: order is in ${order.status} status`,
            );
        }

        // Update order with new ETA
        await this.prisma.labOrder.update({
            where: { id: labOrderId },
            data: {
                estimatedArrivalTime: newEta,
                runningLateAt: new Date(),
            },
        });

        // TODO: Send notification to patient

        return {
            success: true,
            message: 'Patient will be notified of the new ETA.',
        };
    }

    /**
     * Deliver sample to lab
     * Spec: Section 7.2 Step 5 — Deliver to Lab
     */
    async deliverToLab(
        phlebotomistId: string,
        labOrderId: string,
        labId: string,
    ): Promise<TodayAssignment> {
        const order = await this.getLabOrder(labOrderId, phlebotomistId);

        if (order.status !== LabOrderStatus.SAMPLE_COLLECTED) {
            throw new BadRequestException(
                `Cannot deliver to lab: order is in ${order.status} status`,
            );
        }

        // Verify lab exists and is active
        const lab = await this.prisma.partnerDiagnosticCentre.findUnique({
            where: { id: labId },
        });

        if (!lab) {
            throw new NotFoundException('Lab not found');
        }

        if (!lab.isActive) {
            throw new BadRequestException('Lab is not active');
        }

        const updated = await this.prisma.labOrder.update({
            where: { id: labOrderId },
            data: {
                status: LabOrderStatus.DELIVERED_TO_LAB,
                deliveredToLabAt: new Date(),
                diagnosticCentreId: labId,
            },
            include: {
                patient: { select: { name: true, phone: true } },
            },
        });

        return this.mapToAssignment(updated);
    }

    /**
     * Get nearby labs for delivery
     */
    async getNearbyLabs(phlebotomistId: string): Promise<any[]> {
        const phlebotomist = await this.prisma.phlebotomist.findUnique({
            where: { id: phlebotomistId },
        });

        if (!phlebotomist) {
            throw new NotFoundException('Phlebotomist not found');
        }

        // Get active labs in the phlebotomist's city
        const labs = await this.prisma.partnerDiagnosticCentre.findMany({
            where: {
                isActive: true,
                city: phlebotomist.currentCity,
            },
            select: {
                id: true,
                name: true,
                address: true,
                city: true,
                phone: true,
            },
            orderBy: { name: 'asc' },
        });

        return labs;
    }

    /**
     * Helper: Get lab order with permission check
     */
    private async getLabOrder(labOrderId: string, phlebotomistId: string): Promise<any> {
        const order = await this.prisma.labOrder.findUnique({
            where: { id: labOrderId },
        });

        if (!order) {
            throw new NotFoundException('Lab order not found');
        }

        if (order.phlebotomistId !== phlebotomistId) {
            throw new ForbiddenException('You are not assigned to this collection');
        }

        return order;
    }

    /**
     * Helper: Map order to assignment
     */
    private mapToAssignment(order: any): TodayAssignment {
        // Get patient first name only
        const patientName = order.patient?.name || 'Unknown';
        const firstName = patientName.split(' ')[0] || patientName;

        // Format time window from bookedTimeSlot (e.g., "8:00-10:00")
        let timeWindow = 'Scheduled';
        if (order.bookedTimeSlot) {
            // bookedTimeSlot is already in format "8:00-10:00"
            const formatTime = (time: string) => {
                const [hours, minutes] = time.split(':');
                const hour = parseInt(hours || '0', 10);
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const hour12 = hour % 12 || 12;
                return `${hour12}:${minutes} ${ampm}`;
            };
            const [start, end] = order.bookedTimeSlot.split('-');
            if (start && end) {
                timeWindow = `${formatTime(start)}-${formatTime(end)}`;
            } else {
                timeWindow = order.bookedTimeSlot;
            }
        }

        // Extract area from address
        const fullAddress = order.collectionAddress || '';
        const patientArea = order.collectionCity || 'Unknown area';

        // Parse testPanel
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
            patientFirstName: firstName,
            patientPhone: order.patient?.phone || '',
            patientArea,
            fullAddress,
            timeWindow,
            panelName: order.panelName || 'Standard Panel',
            testsOrdered,
            status: order.status,
            tubeCount: order.tubeCount,
            collectedAt: order.sampleCollectedAt,
            notes: order.estimatedArrivalTime ? `Running late. New ETA: ${order.estimatedArrivalTime}` : null,
        };
    }
}
