import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LabOrderStatus, OrderStatus, ConsultationStatus } from '@prisma/client';

// Spec: master spec Section 7.4 — SLA Escalation
// SLA thresholds in milliseconds
export const SLA_THRESHOLDS = {
    // Patient doesn't book slot
    PATIENT_BOOK_REMINDER_3D: 3 * 24 * 60 * 60 * 1000, // 3 days
    PATIENT_BOOK_REMINDER_7D: 7 * 24 * 60 * 60 * 1000, // 7 days
    PATIENT_BOOK_EXPIRED_14D: 14 * 24 * 60 * 60 * 1000, // 14 days

    // Coordinator doesn't assign phlebotomist
    COORDINATOR_ASSIGN_2HR: 2 * 60 * 60 * 1000, // 2 hours

    // Lab doesn't mark received
    LAB_CONFIRM_RECEIPT_4HR: 4 * 60 * 60 * 1000, // 4 hours

    // Lab results overdue
    LAB_RESULTS_OVERDUE_48HR: 48 * 60 * 60 * 1000, // 48 hours
    LAB_RESULTS_ESCALATION_72HR: 72 * 60 * 60 * 1000, // 72 hours

    // Doctor doesn't review
    DOCTOR_REVIEW_REMINDER_24HR: 24 * 60 * 60 * 1000, // 24 hours
    DOCTOR_REVIEW_ESCALATION_48HR: 48 * 60 * 60 * 1000, // 48 hours
};

export type SLAStatus = 'ON_TIME' | 'APPROACHING' | 'BREACHED';

export interface SLAInfo {
    status: SLAStatus;
    reason: string | null;
    hoursOverdue: number | null;
    deadlineAt: Date | null;
}

@Injectable()
export class AdminService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Get dashboard stats for admin home
     */
    async getDashboardStats(): Promise<{
        labCollections: {
            scheduled: number;
            completed: number;
            failed: number;
        };
        deliveries: {
            pending: number;
            outForDelivery: number;
            delivered: number;
            failed: number;
        };
        openCases: number;
        slaBreaches: number;
        activePatients: number;
        revenueThisMonthPaise: number;
    }> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // Lab collections today
        const [scheduledLabs, completedLabs, failedLabs] = await Promise.all([
            this.prisma.labOrder.count({
                where: {
                    bookedDate: { gte: today, lt: tomorrow },
                    status: { in: ['SLOT_BOOKED', 'PHLEBOTOMIST_ASSIGNED'] },
                },
            }),
            this.prisma.labOrder.count({
                where: {
                    sampleCollectedAt: { gte: today, lt: tomorrow },
                },
            }),
            this.prisma.labOrder.count({
                where: {
                    collectionFailedAt: { gte: today, lt: tomorrow },
                },
            }),
        ]);

        // Deliveries today
        const [pendingDeliveries, outForDelivery, deliveredToday, failedDeliveries] =
            await Promise.all([
                this.prisma.order.count({
                    where: {
                        status: {
                            in: [
                                OrderStatus.PRESCRIPTION_CREATED,
                                OrderStatus.SENT_TO_PHARMACY,
                                OrderStatus.PHARMACY_PREPARING,
                                OrderStatus.PHARMACY_READY,
                                OrderStatus.PICKUP_ARRANGED,
                            ],
                        },
                    },
                }),
                this.prisma.order.count({
                    where: { status: OrderStatus.OUT_FOR_DELIVERY },
                }),
                this.prisma.order.count({
                    where: { deliveredAt: { gte: today, lt: tomorrow } },
                }),
                this.prisma.order.count({
                    where: { deliveryFailedAt: { gte: today, lt: tomorrow } },
                }),
            ]);

        // Open cases awaiting assignment (no doctor assigned yet)
        const openCases = await this.prisma.consultation.count({
            where: {
                doctorId: null,
                status: {
                    in: [ConsultationStatus.PENDING_ASSESSMENT, ConsultationStatus.AI_REVIEWED],
                },
            },
        });

        // SLA breaches count
        const slaBreaches = await this.countSLABreaches();

        // Active patients (patients with active subscriptions)
        const activePatients = await this.prisma.subscription.count({
            where: { status: 'ACTIVE' },
        });

        // Revenue this month
        const revenueResult = await this.prisma.payment.aggregate({
            where: {
                status: 'COMPLETED',
                createdAt: { gte: startOfMonth },
            },
            _sum: { amountPaise: true },
        });

        return {
            labCollections: {
                scheduled: scheduledLabs,
                completed: completedLabs,
                failed: failedLabs,
            },
            deliveries: {
                pending: pendingDeliveries,
                outForDelivery: outForDelivery,
                delivered: deliveredToday,
                failed: failedDeliveries,
            },
            openCases,
            slaBreaches,
            activePatients,
            revenueThisMonthPaise: revenueResult._sum.amountPaise || 0,
        };
    }

    /**
     * Count current SLA breaches
     */
    async countSLABreaches(): Promise<number> {
        const now = Date.now();
        let breachCount = 0;

        // 1. Patient hasn't booked slot (14+ days since ORDERED)
        const expiredBookings = await this.prisma.labOrder.count({
            where: {
                status: LabOrderStatus.ORDERED,
                orderedAt: { lt: new Date(now - SLA_THRESHOLDS.PATIENT_BOOK_EXPIRED_14D) },
            },
        });
        breachCount += expiredBookings;

        // 2. Coordinator hasn't assigned phlebotomist (2+ hours since SLOT_BOOKED)
        const unassignedSlots = await this.prisma.labOrder.count({
            where: {
                status: LabOrderStatus.SLOT_BOOKED,
                slotBookedAt: { lt: new Date(now - SLA_THRESHOLDS.COORDINATOR_ASSIGN_2HR) },
            },
        });
        breachCount += unassignedSlots;

        // 3. Lab hasn't confirmed receipt (4+ hours since DELIVERED_TO_LAB)
        const unconfirmedReceipts = await this.prisma.labOrder.count({
            where: {
                status: LabOrderStatus.DELIVERED_TO_LAB,
                deliveredToLabAt: { lt: new Date(now - SLA_THRESHOLDS.LAB_CONFIRM_RECEIPT_4HR) },
            },
        });
        breachCount += unconfirmedReceipts;

        // 4. Lab results overdue (72+ hours since SAMPLE_RECEIVED)
        const overdueResults = await this.prisma.labOrder.count({
            where: {
                status: { in: [LabOrderStatus.SAMPLE_RECEIVED, LabOrderStatus.PROCESSING] },
                sampleReceivedAt: { lt: new Date(now - SLA_THRESHOLDS.LAB_RESULTS_ESCALATION_72HR) },
            },
        });
        breachCount += overdueResults;

        // 5. Doctor hasn't reviewed (48+ hours since RESULTS_READY)
        const unreviewedResults = await this.prisma.labOrder.count({
            where: {
                status: { in: [LabOrderStatus.RESULTS_READY, LabOrderStatus.RESULTS_UPLOADED] },
                resultsUploadedAt: {
                    lt: new Date(now - SLA_THRESHOLDS.DOCTOR_REVIEW_ESCALATION_48HR),
                },
            },
        });
        breachCount += unreviewedResults;

        return breachCount;
    }

    /**
     * Calculate SLA status for a lab order
     */
    calculateLabOrderSLA(labOrder: {
        status: LabOrderStatus;
        orderedAt: Date;
        slotBookedAt: Date | null;
        deliveredToLabAt: Date | null;
        sampleReceivedAt: Date | null;
        resultsUploadedAt: Date | null;
    }): SLAInfo {
        const now = Date.now();
        const status = labOrder.status;

        // Check based on current status
        switch (status) {
            case LabOrderStatus.ORDERED: {
                const elapsed = now - new Date(labOrder.orderedAt).getTime();
                if (elapsed >= SLA_THRESHOLDS.PATIENT_BOOK_EXPIRED_14D) {
                    return {
                        status: 'BREACHED',
                        reason: 'Patient has not booked slot (14+ days)',
                        hoursOverdue: Math.floor(
                            (elapsed - SLA_THRESHOLDS.PATIENT_BOOK_EXPIRED_14D) / (60 * 60 * 1000),
                        ),
                        deadlineAt: new Date(
                            new Date(labOrder.orderedAt).getTime() +
                                SLA_THRESHOLDS.PATIENT_BOOK_EXPIRED_14D,
                        ),
                    };
                }
                if (elapsed >= SLA_THRESHOLDS.PATIENT_BOOK_REMINDER_7D) {
                    return {
                        status: 'APPROACHING',
                        reason: 'Patient booking overdue (7+ days)',
                        hoursOverdue: null,
                        deadlineAt: new Date(
                            new Date(labOrder.orderedAt).getTime() +
                                SLA_THRESHOLDS.PATIENT_BOOK_EXPIRED_14D,
                        ),
                    };
                }
                return { status: 'ON_TIME', reason: null, hoursOverdue: null, deadlineAt: null };
            }

            case LabOrderStatus.SLOT_BOOKED: {
                if (!labOrder.slotBookedAt)
                    return { status: 'ON_TIME', reason: null, hoursOverdue: null, deadlineAt: null };
                const elapsed = now - new Date(labOrder.slotBookedAt).getTime();
                if (elapsed >= SLA_THRESHOLDS.COORDINATOR_ASSIGN_2HR) {
                    return {
                        status: 'BREACHED',
                        reason: 'Phlebotomist not assigned (2+ hours)',
                        hoursOverdue: Math.floor(
                            (elapsed - SLA_THRESHOLDS.COORDINATOR_ASSIGN_2HR) / (60 * 60 * 1000),
                        ),
                        deadlineAt: new Date(
                            new Date(labOrder.slotBookedAt).getTime() +
                                SLA_THRESHOLDS.COORDINATOR_ASSIGN_2HR,
                        ),
                    };
                }
                // Approaching at 1 hour
                if (elapsed >= SLA_THRESHOLDS.COORDINATOR_ASSIGN_2HR / 2) {
                    return {
                        status: 'APPROACHING',
                        reason: 'Phlebotomist assignment due soon',
                        hoursOverdue: null,
                        deadlineAt: new Date(
                            new Date(labOrder.slotBookedAt).getTime() +
                                SLA_THRESHOLDS.COORDINATOR_ASSIGN_2HR,
                        ),
                    };
                }
                return { status: 'ON_TIME', reason: null, hoursOverdue: null, deadlineAt: null };
            }

            case LabOrderStatus.DELIVERED_TO_LAB: {
                if (!labOrder.deliveredToLabAt)
                    return { status: 'ON_TIME', reason: null, hoursOverdue: null, deadlineAt: null };
                const elapsed = now - new Date(labOrder.deliveredToLabAt).getTime();
                if (elapsed >= SLA_THRESHOLDS.LAB_CONFIRM_RECEIPT_4HR) {
                    return {
                        status: 'BREACHED',
                        reason: 'Lab has not confirmed receipt (4+ hours)',
                        hoursOverdue: Math.floor(
                            (elapsed - SLA_THRESHOLDS.LAB_CONFIRM_RECEIPT_4HR) / (60 * 60 * 1000),
                        ),
                        deadlineAt: new Date(
                            new Date(labOrder.deliveredToLabAt).getTime() +
                                SLA_THRESHOLDS.LAB_CONFIRM_RECEIPT_4HR,
                        ),
                    };
                }
                // Approaching at 2 hours
                if (elapsed >= SLA_THRESHOLDS.LAB_CONFIRM_RECEIPT_4HR / 2) {
                    return {
                        status: 'APPROACHING',
                        reason: 'Lab receipt confirmation due soon',
                        hoursOverdue: null,
                        deadlineAt: new Date(
                            new Date(labOrder.deliveredToLabAt).getTime() +
                                SLA_THRESHOLDS.LAB_CONFIRM_RECEIPT_4HR,
                        ),
                    };
                }
                return { status: 'ON_TIME', reason: null, hoursOverdue: null, deadlineAt: null };
            }

            case LabOrderStatus.SAMPLE_RECEIVED:
            case LabOrderStatus.PROCESSING: {
                if (!labOrder.sampleReceivedAt)
                    return { status: 'ON_TIME', reason: null, hoursOverdue: null, deadlineAt: null };
                const elapsed = now - new Date(labOrder.sampleReceivedAt).getTime();
                if (elapsed >= SLA_THRESHOLDS.LAB_RESULTS_ESCALATION_72HR) {
                    return {
                        status: 'BREACHED',
                        reason: 'Lab results overdue (72+ hours)',
                        hoursOverdue: Math.floor(
                            (elapsed - SLA_THRESHOLDS.LAB_RESULTS_ESCALATION_72HR) /
                                (60 * 60 * 1000),
                        ),
                        deadlineAt: new Date(
                            new Date(labOrder.sampleReceivedAt).getTime() +
                                SLA_THRESHOLDS.LAB_RESULTS_ESCALATION_72HR,
                        ),
                    };
                }
                if (elapsed >= SLA_THRESHOLDS.LAB_RESULTS_OVERDUE_48HR) {
                    return {
                        status: 'APPROACHING',
                        reason: 'Lab results approaching deadline (48+ hours)',
                        hoursOverdue: null,
                        deadlineAt: new Date(
                            new Date(labOrder.sampleReceivedAt).getTime() +
                                SLA_THRESHOLDS.LAB_RESULTS_ESCALATION_72HR,
                        ),
                    };
                }
                return { status: 'ON_TIME', reason: null, hoursOverdue: null, deadlineAt: null };
            }

            case LabOrderStatus.RESULTS_READY:
            case LabOrderStatus.RESULTS_UPLOADED: {
                if (!labOrder.resultsUploadedAt)
                    return { status: 'ON_TIME', reason: null, hoursOverdue: null, deadlineAt: null };
                const elapsed = now - new Date(labOrder.resultsUploadedAt).getTime();
                if (elapsed >= SLA_THRESHOLDS.DOCTOR_REVIEW_ESCALATION_48HR) {
                    return {
                        status: 'BREACHED',
                        reason: 'Doctor review overdue (48+ hours)',
                        hoursOverdue: Math.floor(
                            (elapsed - SLA_THRESHOLDS.DOCTOR_REVIEW_ESCALATION_48HR) /
                                (60 * 60 * 1000),
                        ),
                        deadlineAt: new Date(
                            new Date(labOrder.resultsUploadedAt).getTime() +
                                SLA_THRESHOLDS.DOCTOR_REVIEW_ESCALATION_48HR,
                        ),
                    };
                }
                if (elapsed >= SLA_THRESHOLDS.DOCTOR_REVIEW_REMINDER_24HR) {
                    return {
                        status: 'APPROACHING',
                        reason: 'Doctor review due soon (24+ hours)',
                        hoursOverdue: null,
                        deadlineAt: new Date(
                            new Date(labOrder.resultsUploadedAt).getTime() +
                                SLA_THRESHOLDS.DOCTOR_REVIEW_ESCALATION_48HR,
                        ),
                    };
                }
                return { status: 'ON_TIME', reason: null, hoursOverdue: null, deadlineAt: null };
            }

            default:
                return { status: 'ON_TIME', reason: null, hoursOverdue: null, deadlineAt: null };
        }
    }

    /**
     * Get all current SLA escalations
     */
    async getSLAEscalations(): Promise<
        Array<{
            id: string;
            type: 'LAB_ORDER' | 'DELIVERY';
            resourceId: string;
            slaInfo: SLAInfo;
            patientName: string | null;
            vertical: string | null;
            responsibleParty: string;
            responsibleContact: string | null;
            createdAt: Date;
        }>
    > {
        const escalations: Array<{
            id: string;
            type: 'LAB_ORDER' | 'DELIVERY';
            resourceId: string;
            slaInfo: SLAInfo;
            patientName: string | null;
            vertical: string | null;
            responsibleParty: string;
            responsibleContact: string | null;
            createdAt: Date;
        }> = [];

        // Get lab orders with potential SLA issues
        const labOrders = await this.prisma.labOrder.findMany({
            where: {
                status: {
                    in: [
                        LabOrderStatus.ORDERED,
                        LabOrderStatus.SLOT_BOOKED,
                        LabOrderStatus.DELIVERED_TO_LAB,
                        LabOrderStatus.SAMPLE_RECEIVED,
                        LabOrderStatus.PROCESSING,
                        LabOrderStatus.RESULTS_READY,
                        LabOrderStatus.RESULTS_UPLOADED,
                    ],
                },
            },
            include: {
                patient: true,
                consultation: true,
                phlebotomist: true,
                diagnosticCentre: true,
            },
        });

        for (const order of labOrders) {
            const slaInfo = this.calculateLabOrderSLA({
                status: order.status,
                orderedAt: order.orderedAt,
                slotBookedAt: order.slotBookedAt,
                deliveredToLabAt: order.deliveredToLabAt,
                sampleReceivedAt: order.sampleReceivedAt,
                resultsUploadedAt: order.resultsUploadedAt,
            });

            if (slaInfo.status !== 'ON_TIME') {
                let responsibleParty = 'Unknown';
                let responsibleContact: string | null = null;

                switch (order.status) {
                    case LabOrderStatus.ORDERED:
                        responsibleParty = order.patient?.name || 'Patient';
                        responsibleContact = order.patient?.phone || null;
                        break;
                    case LabOrderStatus.SLOT_BOOKED:
                        responsibleParty = 'Coordinator';
                        break;
                    case LabOrderStatus.DELIVERED_TO_LAB:
                    case LabOrderStatus.SAMPLE_RECEIVED:
                    case LabOrderStatus.PROCESSING:
                        responsibleParty = order.diagnosticCentre?.name || 'Lab';
                        responsibleContact = order.diagnosticCentre?.phone || null;
                        break;
                    case LabOrderStatus.RESULTS_READY:
                    case LabOrderStatus.RESULTS_UPLOADED:
                        responsibleParty = 'Doctor';
                        break;
                }

                escalations.push({
                    id: `lab-${order.id}`,
                    type: 'LAB_ORDER',
                    resourceId: order.id,
                    slaInfo,
                    patientName: order.patient?.name || null,
                    vertical: order.consultation?.vertical || null,
                    responsibleParty,
                    responsibleContact,
                    createdAt: order.orderedAt,
                });
            }
        }

        // Sort by severity (breached first, then by hours overdue)
        escalations.sort((a, b) => {
            if (a.slaInfo.status === 'BREACHED' && b.slaInfo.status !== 'BREACHED') return -1;
            if (a.slaInfo.status !== 'BREACHED' && b.slaInfo.status === 'BREACHED') return 1;
            return (b.slaInfo.hoursOverdue || 0) - (a.slaInfo.hoursOverdue || 0);
        });

        return escalations;
    }
}
