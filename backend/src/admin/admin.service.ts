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

    // =============================================
    // LAB ORDERS MANAGEMENT
    // Spec: master spec Section 7 — Blood Work & Diagnostics
    // =============================================

    /**
     * Get lab orders with filters for admin management
     */
    async getAdminLabOrders(filter: {
        statuses?: LabOrderStatus[];
        dateFrom?: Date;
        dateTo?: Date;
        phlebotomistId?: string;
        labId?: string;
        vertical?: string;
        search?: string;
        page?: number;
        pageSize?: number;
    }): Promise<{
        labOrders: Array<{
            id: string;
            patient: { id: string; name: string | null; phone: string | null };
            vertical: string | null;
            testPanel: string[];
            panelName: string | null;
            status: LabOrderStatus;
            phlebotomist: { id: string; name: string; phone: string } | null;
            lab: { id: string; name: string; phone: string | null } | null;
            bookedDate: Date | null;
            bookedTimeSlot: string | null;
            collectionAddress: string;
            collectionCity: string;
            collectionPincode: string;
            slaInfo: SLAInfo;
            orderedAt: Date;
            timeline: Array<{ status: string; timestamp: Date; details: string | null }>;
        }>;
        total: number;
        page: number;
        pageSize: number;
    }> {
        const page = filter.page || 1;
        const pageSize = filter.pageSize || 20;
        const skip = (page - 1) * pageSize;

        // Build where clause
        const where: Record<string, unknown> = {};

        if (filter.statuses && filter.statuses.length > 0) {
            where.status = { in: filter.statuses };
        }

        if (filter.dateFrom || filter.dateTo) {
            where.bookedDate = {};
            if (filter.dateFrom) {
                (where.bookedDate as Record<string, unknown>).gte = filter.dateFrom;
            }
            if (filter.dateTo) {
                (where.bookedDate as Record<string, unknown>).lte = filter.dateTo;
            }
        }

        if (filter.phlebotomistId) {
            where.phlebotomistId = filter.phlebotomistId;
        }

        if (filter.labId) {
            where.diagnosticCentreId = filter.labId;
        }

        if (filter.vertical) {
            where.consultation = { vertical: filter.vertical };
        }

        if (filter.search) {
            where.patient = {
                OR: [
                    { name: { contains: filter.search, mode: 'insensitive' } },
                    { phone: { contains: filter.search } },
                ],
            };
        }

        const [labOrders, total] = await Promise.all([
            this.prisma.labOrder.findMany({
                where,
                include: {
                    patient: true,
                    consultation: true,
                    phlebotomist: true,
                    diagnosticCentre: true,
                },
                orderBy: [{ slaEscalatedAt: 'desc' }, { orderedAt: 'desc' }],
                skip,
                take: pageSize,
            }),
            this.prisma.labOrder.count({ where }),
        ]);

        const mappedOrders = labOrders.map((order) => {
            const slaInfo = this.calculateLabOrderSLA({
                status: order.status,
                orderedAt: order.orderedAt,
                slotBookedAt: order.slotBookedAt,
                deliveredToLabAt: order.deliveredToLabAt,
                sampleReceivedAt: order.sampleReceivedAt,
                resultsUploadedAt: order.resultsUploadedAt,
            });

            const timeline = this.buildLabOrderTimeline(order);

            return {
                id: order.id,
                patient: {
                    id: order.patient.id,
                    name: order.patient.name,
                    phone: order.patient.phone,
                },
                vertical: order.consultation?.vertical || null,
                testPanel: order.testPanel,
                panelName: order.panelName,
                status: order.status,
                phlebotomist: order.phlebotomist
                    ? {
                          id: order.phlebotomist.id,
                          name: order.phlebotomist.name,
                          phone: order.phlebotomist.phone,
                      }
                    : null,
                lab: order.diagnosticCentre
                    ? {
                          id: order.diagnosticCentre.id,
                          name: order.diagnosticCentre.name,
                          phone: order.diagnosticCentre.phone,
                      }
                    : null,
                bookedDate: order.bookedDate,
                bookedTimeSlot: order.bookedTimeSlot,
                collectionAddress: order.collectionAddress,
                collectionCity: order.collectionCity,
                collectionPincode: order.collectionPincode,
                slaInfo,
                orderedAt: order.orderedAt,
                timeline,
            };
        });

        return {
            labOrders: mappedOrders,
            total,
            page,
            pageSize,
        };
    }

    /**
     * Build timeline of status changes for a lab order
     */
    private buildLabOrderTimeline(
        order: Record<string, unknown>,
    ): Array<{ status: string; timestamp: Date; details: string | null }> {
        const timeline: Array<{ status: string; timestamp: Date; details: string | null }> = [];

        if (order.orderedAt) {
            timeline.push({
                status: 'ORDERED',
                timestamp: order.orderedAt as Date,
                details: null,
            });
        }

        if (order.slotBookedAt) {
            timeline.push({
                status: 'SLOT_BOOKED',
                timestamp: order.slotBookedAt as Date,
                details: order.bookedTimeSlot
                    ? `${order.bookedTimeSlot}`
                    : null,
            });
        }

        if (order.phlebotomistAssignedAt) {
            timeline.push({
                status: 'PHLEBOTOMIST_ASSIGNED',
                timestamp: order.phlebotomistAssignedAt as Date,
                details: null,
            });
        }

        if (order.sampleCollectedAt) {
            timeline.push({
                status: 'SAMPLE_COLLECTED',
                timestamp: order.sampleCollectedAt as Date,
                details: order.tubeCount ? `${order.tubeCount} tubes` : null,
            });
        }

        if (order.collectionFailedAt) {
            timeline.push({
                status: 'COLLECTION_FAILED',
                timestamp: order.collectionFailedAt as Date,
                details: (order.collectionFailedReason as string) || null,
            });
        }

        if (order.deliveredToLabAt) {
            timeline.push({
                status: 'DELIVERED_TO_LAB',
                timestamp: order.deliveredToLabAt as Date,
                details: null,
            });
        }

        if (order.sampleReceivedAt) {
            timeline.push({
                status: 'SAMPLE_RECEIVED',
                timestamp: order.sampleReceivedAt as Date,
                details: order.receivedTubeCount ? `${order.receivedTubeCount} tubes received` : null,
            });
        }

        if (order.sampleIssueAt) {
            timeline.push({
                status: 'SAMPLE_ISSUE',
                timestamp: order.sampleIssueAt as Date,
                details: (order.sampleIssueReason as string) || null,
            });
        }

        if (order.processingStartedAt) {
            timeline.push({
                status: 'PROCESSING',
                timestamp: order.processingStartedAt as Date,
                details: null,
            });
        }

        if (order.resultsUploadedAt) {
            timeline.push({
                status: 'RESULTS_READY',
                timestamp: order.resultsUploadedAt as Date,
                details: order.criticalValues ? 'Critical values detected' : null,
            });
        }

        if (order.doctorReviewedAt) {
            timeline.push({
                status: 'DOCTOR_REVIEWED',
                timestamp: order.doctorReviewedAt as Date,
                details: null,
            });
        }

        if (order.closedAt) {
            timeline.push({
                status: 'CLOSED',
                timestamp: order.closedAt as Date,
                details: null,
            });
        }

        if (order.cancelledAt) {
            timeline.push({
                status: 'CANCELLED',
                timestamp: order.cancelledAt as Date,
                details: (order.cancellationReason as string) || null,
            });
        }

        if (order.expiredAt) {
            timeline.push({
                status: 'EXPIRED',
                timestamp: order.expiredAt as Date,
                details: null,
            });
        }

        // Sort by timestamp
        timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        return timeline;
    }

    /**
     * Get available phlebotomists for assignment
     * Spec: Section 7.2 Step 3 — filtered by patient's pincode + selected date
     */
    async getAvailablePhlebotomists(
        pincode: string,
        date: Date,
    ): Promise<
        Array<{
            id: string;
            name: string;
            phone: string;
            todayAssignments: number;
            maxDailyCollections: number;
            isAvailable: boolean;
        }>
    > {
        const dayOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][
            date.getDay()
        ];

        // Find phlebotomists who:
        // 1. Cover this pincode
        // 2. Are available on this day of week
        // 3. Are active
        const phlebotomists = await this.prisma.phlebotomist.findMany({
            where: {
                isActive: true,
                serviceableAreas: { has: pincode },
                availableDays: { has: dayOfWeek },
            },
        });

        // Get assignment counts for the date
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const assignmentCounts = await this.prisma.labOrder.groupBy({
            by: ['phlebotomistId'],
            where: {
                phlebotomistId: { in: phlebotomists.map((p) => p.id) },
                bookedDate: { gte: startOfDay, lte: endOfDay },
                status: {
                    notIn: [LabOrderStatus.CANCELLED, LabOrderStatus.EXPIRED, LabOrderStatus.COLLECTION_FAILED],
                },
            },
            _count: { id: true },
        });

        const countMap = new Map(
            assignmentCounts.map((c) => [c.phlebotomistId, c._count.id]),
        );

        return phlebotomists.map((p) => {
            const todayAssignments = countMap.get(p.id) || 0;
            return {
                id: p.id,
                name: p.name,
                phone: p.phone,
                todayAssignments,
                maxDailyCollections: p.maxDailyCollections,
                isAvailable: todayAssignments < p.maxDailyCollections,
            };
        });
    }

    /**
     * Get available labs for assignment
     */
    async getAvailableLabs(city: string): Promise<
        Array<{
            id: string;
            name: string;
            address: string;
            city: string;
            avgTurnaroundHours: number;
            testsOffered: string[];
        }>
    > {
        const labs = await this.prisma.partnerDiagnosticCentre.findMany({
            where: {
                isActive: true,
                city: { equals: city, mode: 'insensitive' },
            },
        });

        return labs.map((lab) => ({
            id: lab.id,
            name: lab.name,
            address: lab.address,
            city: lab.city,
            avgTurnaroundHours: lab.avgTurnaroundHours,
            testsOffered: lab.testsOffered,
        }));
    }

    /**
     * Assign phlebotomist to a lab order
     * Spec: Section 7.2 Step 3 — Coordinator Assigns Phlebotomist
     */
    async assignPhlebotomist(
        labOrderId: string,
        phlebotomistId: string,
    ): Promise<{ success: boolean; message: string }> {
        const labOrder = await this.prisma.labOrder.findUnique({
            where: { id: labOrderId },
        });

        if (!labOrder) {
            return { success: false, message: 'Lab order not found' };
        }

        if (labOrder.status !== LabOrderStatus.SLOT_BOOKED) {
            return {
                success: false,
                message: `Cannot assign phlebotomist in status: ${labOrder.status}`,
            };
        }

        const phlebotomist = await this.prisma.phlebotomist.findUnique({
            where: { id: phlebotomistId },
        });

        if (!phlebotomist) {
            return { success: false, message: 'Phlebotomist not found' };
        }

        if (!phlebotomist.isActive) {
            return { success: false, message: 'Phlebotomist is not active' };
        }

        await this.prisma.labOrder.update({
            where: { id: labOrderId },
            data: {
                phlebotomistId,
                phlebotomistAssignedAt: new Date(),
                status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
            },
        });

        return { success: true, message: 'Phlebotomist assigned successfully' };
    }

    /**
     * Bulk assign phlebotomist to multiple lab orders
     */
    async bulkAssignPhlebotomist(
        labOrderIds: string[],
        phlebotomistId: string,
    ): Promise<{ success: boolean; message: string; updatedCount: number; failedIds: string[] }> {
        const phlebotomist = await this.prisma.phlebotomist.findUnique({
            where: { id: phlebotomistId },
        });

        if (!phlebotomist) {
            return {
                success: false,
                message: 'Phlebotomist not found',
                updatedCount: 0,
                failedIds: labOrderIds,
            };
        }

        const failedIds: string[] = [];
        let updatedCount = 0;

        for (const labOrderId of labOrderIds) {
            const result = await this.assignPhlebotomist(labOrderId, phlebotomistId);
            if (result.success) {
                updatedCount++;
            } else {
                failedIds.push(labOrderId);
            }
        }

        return {
            success: failedIds.length === 0,
            message:
                failedIds.length === 0
                    ? `Successfully assigned ${updatedCount} orders`
                    : `Assigned ${updatedCount} orders, ${failedIds.length} failed`,
            updatedCount,
            failedIds,
        };
    }

    /**
     * Assign lab to a lab order
     */
    async assignLab(
        labOrderId: string,
        labId: string,
    ): Promise<{ success: boolean; message: string }> {
        const labOrder = await this.prisma.labOrder.findUnique({
            where: { id: labOrderId },
        });

        if (!labOrder) {
            return { success: false, message: 'Lab order not found' };
        }

        const lab = await this.prisma.partnerDiagnosticCentre.findUnique({
            where: { id: labId },
        });

        if (!lab) {
            return { success: false, message: 'Diagnostic centre not found' };
        }

        if (!lab.isActive) {
            return { success: false, message: 'Diagnostic centre is not active' };
        }

        await this.prisma.labOrder.update({
            where: { id: labOrderId },
            data: { diagnosticCentreId: labId },
        });

        return { success: true, message: 'Lab assigned successfully' };
    }

    /**
     * Override lab order status (admin only, with reason)
     */
    async overrideLabOrderStatus(
        labOrderId: string,
        newStatus: LabOrderStatus,
        reason: string,
    ): Promise<{ success: boolean; message: string }> {
        const labOrder = await this.prisma.labOrder.findUnique({
            where: { id: labOrderId },
        });

        if (!labOrder) {
            return { success: false, message: 'Lab order not found' };
        }

        // Build update data based on new status
        const updateData: Record<string, unknown> = {
            status: newStatus,
            slaEscalatedAt: new Date(),
            slaEscalationReason: reason,
            slaEscalatedBy: 'ADMIN',
        };

        // Set appropriate timestamp for the new status
        switch (newStatus) {
            case LabOrderStatus.SAMPLE_COLLECTED:
                updateData.sampleCollectedAt = new Date();
                break;
            case LabOrderStatus.DELIVERED_TO_LAB:
                updateData.deliveredToLabAt = new Date();
                break;
            case LabOrderStatus.SAMPLE_RECEIVED:
                updateData.sampleReceivedAt = new Date();
                break;
            case LabOrderStatus.PROCESSING:
                updateData.processingStartedAt = new Date();
                break;
            case LabOrderStatus.CANCELLED:
                updateData.cancelledAt = new Date();
                updateData.cancellationReason = reason;
                break;
            case LabOrderStatus.EXPIRED:
                updateData.expiredAt = new Date();
                break;
            case LabOrderStatus.CLOSED:
                updateData.closedAt = new Date();
                break;
        }

        await this.prisma.labOrder.update({
            where: { id: labOrderId },
            data: updateData,
        });

        return { success: true, message: `Status overridden to ${newStatus}` };
    }

    // =============================================
    // DELIVERY MANAGEMENT
    // Spec: master spec Section 8 — Medication Fulfillment & Local Delivery
    // =============================================

    /**
     * Get deliveries with filters for admin management
     */
    async getAdminDeliveries(filter: {
        statuses?: OrderStatus[];
        pharmacyId?: string;
        dateFrom?: Date;
        dateTo?: Date;
        isReorder?: boolean;
        search?: string;
        page?: number;
        pageSize?: number;
    }): Promise<{
        deliveries: Array<{
            id: string;
            patient: { id: string; name: string | null; phone: string | null };
            medications: Array<{ name: string; dosage: string; frequency: string }>;
            status: OrderStatus;
            pharmacy: { id: string; name: string; address: string | null; phone: string | null } | null;
            deliveryPersonName: string | null;
            deliveryPersonPhone: string | null;
            deliveryMethod: string | null;
            estimatedDeliveryTime: string | null;
            deliveryOtp: string | null;
            deliveryAddress: string;
            deliveryCity: string;
            deliveryPincode: string;
            totalAmountPaise: number;
            isReorder: boolean;
            orderedAt: Date;
            sentToPharmacyAt: Date | null;
            pharmacyReadyAt: Date | null;
            outForDeliveryAt: Date | null;
            deliveredAt: Date | null;
            pharmacyIssueReason: string | null;
            deliveryFailedReason: string | null;
        }>;
        total: number;
        page: number;
        pageSize: number;
    }> {
        const page = filter.page || 1;
        const pageSize = filter.pageSize || 20;
        const skip = (page - 1) * pageSize;

        // Build where clause
        const where: Record<string, unknown> = {};

        if (filter.statuses && filter.statuses.length > 0) {
            where.status = { in: filter.statuses };
        }

        if (filter.pharmacyId) {
            where.pharmacyPartnerId = filter.pharmacyId;
        }

        if (filter.dateFrom || filter.dateTo) {
            where.orderedAt = {};
            if (filter.dateFrom) {
                (where.orderedAt as Record<string, unknown>).gte = filter.dateFrom;
            }
            if (filter.dateTo) {
                (where.orderedAt as Record<string, unknown>).lte = filter.dateTo;
            }
        }

        if (filter.isReorder !== undefined) {
            where.isReorder = filter.isReorder;
        }

        if (filter.search) {
            where.patient = {
                OR: [
                    { name: { contains: filter.search, mode: 'insensitive' } },
                    { phone: { contains: filter.search } },
                ],
            };
        }

        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                include: {
                    patient: true,
                    prescription: true,
                },
                orderBy: { orderedAt: 'desc' },
                skip,
                take: pageSize,
            }),
            this.prisma.order.count({ where }),
        ]);

        const mappedDeliveries = orders.map((order) => {
            // Parse medications from prescription
            let medications: Array<{ name: string; dosage: string; frequency: string }> = [];
            try {
                const prescriptionMeds = order.prescription?.medications;
                if (Array.isArray(prescriptionMeds)) {
                    medications = prescriptionMeds.map((m: Record<string, unknown>) => ({
                        name: String(m.name || ''),
                        dosage: String(m.dosage || ''),
                        frequency: String(m.frequency || ''),
                    }));
                }
            } catch {
                // Ignore parsing errors
            }

            return {
                id: order.id,
                patient: {
                    id: order.patient.id,
                    name: order.patient.name,
                    phone: order.patient.phone,
                },
                medications,
                status: order.status,
                pharmacy: order.pharmacyPartnerId
                    ? {
                          id: order.pharmacyPartnerId,
                          name: order.pharmacyPartnerName || 'Unknown',
                          address: order.pharmacyAddress,
                          phone: null,
                      }
                    : null,
                deliveryPersonName: order.deliveryPersonName,
                deliveryPersonPhone: order.deliveryPersonPhone,
                deliveryMethod: order.deliveryMethod,
                estimatedDeliveryTime: order.estimatedDeliveryTime,
                deliveryOtp: order.deliveryOtp,
                deliveryAddress: order.deliveryAddress,
                deliveryCity: order.deliveryCity,
                deliveryPincode: order.deliveryPincode,
                totalAmountPaise: order.totalAmount,
                isReorder: order.isReorder,
                orderedAt: order.orderedAt,
                sentToPharmacyAt: order.sentToPharmacyAt,
                pharmacyReadyAt: order.pharmacyReadyAt,
                outForDeliveryAt: order.outForDeliveryAt,
                deliveredAt: order.deliveredAt,
                pharmacyIssueReason: order.pharmacyIssueReason,
                deliveryFailedReason: order.deliveryFailedReason,
            };
        });

        return {
            deliveries: mappedDeliveries,
            total,
            page,
            pageSize,
        };
    }

    /**
     * Get available pharmacies for assignment
     */
    async getAvailablePharmacies(pincode: string): Promise<
        Array<{
            id: string;
            name: string;
            address: string;
            city: string;
            phone: string;
            serviceableAreas: string[];
            avgPreparationMinutes: number;
        }>
    > {
        const pharmacies = await this.prisma.partnerPharmacy.findMany({
            where: {
                isActive: true,
                serviceableAreas: { has: pincode },
            },
        });

        return pharmacies.map((p) => ({
            id: p.id,
            name: p.name,
            address: p.address,
            city: p.city,
            phone: p.phone,
            serviceableAreas: p.serviceableAreas,
            avgPreparationMinutes: p.avgPreparationMinutes,
        }));
    }

    /**
     * Send order to pharmacy
     * Spec: Section 8.2 Step 2 — Sent to Pharmacy
     */
    async sendToPharmacy(
        orderId: string,
        pharmacyId: string,
    ): Promise<{ success: boolean; message: string }> {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            return { success: false, message: 'Order not found' };
        }

        if (order.status !== OrderStatus.PRESCRIPTION_CREATED) {
            return {
                success: false,
                message: `Cannot send to pharmacy in status: ${order.status}`,
            };
        }

        const pharmacy = await this.prisma.partnerPharmacy.findUnique({
            where: { id: pharmacyId },
        });

        if (!pharmacy) {
            return { success: false, message: 'Pharmacy not found' };
        }

        if (!pharmacy.isActive) {
            return { success: false, message: 'Pharmacy is not active' };
        }

        await this.prisma.order.update({
            where: { id: orderId },
            data: {
                pharmacyPartnerId: pharmacyId,
                pharmacyPartnerName: pharmacy.name,
                pharmacyAddress: pharmacy.address,
                status: OrderStatus.SENT_TO_PHARMACY,
                sentToPharmacyAt: new Date(),
            },
        });

        return { success: true, message: 'Order sent to pharmacy' };
    }

    /**
     * Arrange delivery for an order
     * Spec: Section 8.2 Step 4 — Delivery Arranged
     */
    async arrangeDelivery(input: {
        orderId: string;
        deliveryPersonName: string;
        deliveryPersonPhone: string;
        deliveryMethod: string;
        estimatedDeliveryTime?: string;
    }): Promise<{ success: boolean; message: string; otp?: string }> {
        const order = await this.prisma.order.findUnique({
            where: { id: input.orderId },
        });

        if (!order) {
            return { success: false, message: 'Order not found' };
        }

        if (order.status !== OrderStatus.PHARMACY_READY) {
            return {
                success: false,
                message: `Cannot arrange delivery in status: ${order.status}`,
            };
        }

        // Generate 4-digit OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        await this.prisma.order.update({
            where: { id: input.orderId },
            data: {
                deliveryPersonName: input.deliveryPersonName,
                deliveryPersonPhone: input.deliveryPersonPhone,
                deliveryMethod: input.deliveryMethod,
                estimatedDeliveryTime: input.estimatedDeliveryTime || null,
                deliveryOtp: otp,
                status: OrderStatus.PICKUP_ARRANGED,
                pickupArrangedAt: new Date(),
            },
        });

        return { success: true, message: 'Delivery arranged', otp };
    }

    /**
     * Mark order as out for delivery
     */
    async markOutForDelivery(orderId: string): Promise<{ success: boolean; message: string }> {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            return { success: false, message: 'Order not found' };
        }

        if (order.status !== OrderStatus.PICKUP_ARRANGED) {
            return {
                success: false,
                message: `Cannot mark out for delivery in status: ${order.status}`,
            };
        }

        await this.prisma.order.update({
            where: { id: orderId },
            data: {
                status: OrderStatus.OUT_FOR_DELIVERY,
                outForDeliveryAt: new Date(),
            },
        });

        return { success: true, message: 'Marked as out for delivery' };
    }

    /**
     * Update pharmacy status
     */
    async updatePharmacyStatus(
        orderId: string,
        status: OrderStatus,
        issueReason?: string,
    ): Promise<{ success: boolean; message: string }> {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            return { success: false, message: 'Order not found' };
        }

        const updateData: Record<string, unknown> = { status };

        switch (status) {
            case OrderStatus.PHARMACY_PREPARING:
                updateData.pharmacyPreparingAt = new Date();
                break;
            case OrderStatus.PHARMACY_READY:
                updateData.pharmacyReadyAt = new Date();
                break;
            case OrderStatus.PHARMACY_ISSUE:
                updateData.pharmacyIssueAt = new Date();
                updateData.pharmacyIssueReason = issueReason || null;
                break;
        }

        await this.prisma.order.update({
            where: { id: orderId },
            data: updateData,
        });

        return { success: true, message: `Status updated to ${status}` };
    }

    /**
     * Update delivery status
     */
    async updateDeliveryStatus(
        orderId: string,
        status: OrderStatus,
        failedReason?: string,
    ): Promise<{ success: boolean; message: string }> {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            return { success: false, message: 'Order not found' };
        }

        const updateData: Record<string, unknown> = { status };

        switch (status) {
            case OrderStatus.OUT_FOR_DELIVERY:
                updateData.outForDeliveryAt = new Date();
                break;
            case OrderStatus.DELIVERED:
                updateData.deliveredAt = new Date();
                break;
            case OrderStatus.DELIVERY_FAILED:
                updateData.deliveryFailedAt = new Date();
                updateData.deliveryFailedReason = failedReason || null;
                break;
            case OrderStatus.RESCHEDULED:
                updateData.rescheduledAt = new Date();
                break;
            case OrderStatus.CANCELLED:
                updateData.cancelledAt = new Date();
                updateData.cancellationReason = failedReason || null;
                break;
        }

        await this.prisma.order.update({
            where: { id: orderId },
            data: updateData,
        });

        return { success: true, message: `Delivery status updated to ${status}` };
    }

    /**
     * Regenerate delivery OTP
     */
    async regenerateDeliveryOtp(orderId: string): Promise<{ success: boolean; message: string; otp?: string }> {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            return { success: false, message: 'Order not found' };
        }

        if (order.status !== OrderStatus.OUT_FOR_DELIVERY && order.status !== OrderStatus.PICKUP_ARRANGED) {
            return {
                success: false,
                message: 'Can only regenerate OTP for orders in delivery',
            };
        }

        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        await this.prisma.order.update({
            where: { id: orderId },
            data: { deliveryOtp: otp },
        });

        return { success: true, message: 'OTP regenerated', otp };
    }

    // =============================================
    // PARTNER MANAGEMENT
    // Spec: master spec Section 7.5 — Partner Models
    // =============================================

    // --- Diagnostic Centres ---

    async getDiagnosticCentres(): Promise<{
        centres: Array<{
            id: string;
            name: string;
            address: string;
            city: string;
            state: string;
            pincode: string;
            phone: string;
            email: string | null;
            contactPerson: string | null;
            testsOffered: string[];
            avgTurnaroundHours: number;
            rating: number | null;
            isActive: boolean;
            createdAt: Date;
        }>;
        total: number;
    }> {
        const centres = await this.prisma.partnerDiagnosticCentre.findMany({
            orderBy: { name: 'asc' },
        });

        return {
            centres: centres.map((c) => ({
                id: c.id,
                name: c.name,
                address: c.address,
                city: c.city,
                state: c.state,
                pincode: c.pincode,
                phone: c.phone,
                email: c.email,
                contactPerson: c.contactPerson,
                testsOffered: c.testsOffered,
                avgTurnaroundHours: c.avgTurnaroundHours,
                rating: c.rating,
                isActive: c.isActive,
                createdAt: c.createdAt,
            })),
            total: centres.length,
        };
    }

    async createDiagnosticCentre(input: {
        name: string;
        address: string;
        city: string;
        state: string;
        pincode: string;
        phone: string;
        email?: string;
        contactPerson?: string;
        testsOffered: string[];
        avgTurnaroundHours?: number;
    }): Promise<{ success: boolean; message: string }> {
        await this.prisma.partnerDiagnosticCentre.create({
            data: {
                name: input.name,
                address: input.address,
                city: input.city,
                state: input.state,
                pincode: input.pincode,
                phone: input.phone,
                email: input.email || null,
                contactPerson: input.contactPerson || null,
                testsOffered: input.testsOffered,
                avgTurnaroundHours: input.avgTurnaroundHours || 48,
            },
        });
        return { success: true, message: 'Diagnostic centre created' };
    }

    async updateDiagnosticCentre(input: {
        id: string;
        name?: string;
        address?: string;
        phone?: string;
        email?: string;
        contactPerson?: string;
        testsOffered?: string[];
        avgTurnaroundHours?: number;
    }): Promise<{ success: boolean; message: string }> {
        const centre = await this.prisma.partnerDiagnosticCentre.findUnique({
            where: { id: input.id },
        });
        if (!centre) {
            return { success: false, message: 'Diagnostic centre not found' };
        }

        await this.prisma.partnerDiagnosticCentre.update({
            where: { id: input.id },
            data: {
                name: input.name ?? centre.name,
                address: input.address ?? centre.address,
                phone: input.phone ?? centre.phone,
                email: input.email ?? centre.email,
                contactPerson: input.contactPerson ?? centre.contactPerson,
                testsOffered: input.testsOffered ?? centre.testsOffered,
                avgTurnaroundHours: input.avgTurnaroundHours ?? centre.avgTurnaroundHours,
            },
        });
        return { success: true, message: 'Diagnostic centre updated' };
    }

    async toggleDiagnosticCentreActive(id: string): Promise<{ success: boolean; message: string }> {
        const centre = await this.prisma.partnerDiagnosticCentre.findUnique({
            where: { id },
        });
        if (!centre) {
            return { success: false, message: 'Diagnostic centre not found' };
        }

        await this.prisma.partnerDiagnosticCentre.update({
            where: { id },
            data: { isActive: !centre.isActive },
        });
        return {
            success: true,
            message: centre.isActive ? 'Diagnostic centre deactivated' : 'Diagnostic centre activated',
        };
    }

    // --- Phlebotomists ---

    async getPhlebotomists(): Promise<{
        phlebotomists: Array<{
            id: string;
            name: string;
            phone: string;
            email: string | null;
            certification: string | null;
            availableDays: string[];
            availableTimeStart: string | null;
            availableTimeEnd: string | null;
            maxDailyCollections: number;
            currentCity: string;
            serviceableAreas: string[];
            completedCollections: number;
            failedCollections: number;
            rating: number | null;
            isActive: boolean;
            createdAt: Date;
            todayAssignments: number;
        }>;
        total: number;
    }> {
        const phlebotomists = await this.prisma.phlebotomist.findMany({
            orderBy: { name: 'asc' },
        });

        // Get today's assignments
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const assignmentCounts = await this.prisma.labOrder.groupBy({
            by: ['phlebotomistId'],
            where: {
                phlebotomistId: { in: phlebotomists.map((p) => p.id) },
                bookedDate: { gte: today, lt: tomorrow },
                status: {
                    notIn: [LabOrderStatus.CANCELLED, LabOrderStatus.EXPIRED, LabOrderStatus.COLLECTION_FAILED],
                },
            },
            _count: { id: true },
        });

        const countMap = new Map(assignmentCounts.map((c) => [c.phlebotomistId, c._count.id]));

        return {
            phlebotomists: phlebotomists.map((p) => ({
                id: p.id,
                name: p.name,
                phone: p.phone,
                email: p.email,
                certification: p.certification,
                availableDays: p.availableDays,
                availableTimeStart: p.availableTimeStart,
                availableTimeEnd: p.availableTimeEnd,
                maxDailyCollections: p.maxDailyCollections,
                currentCity: p.currentCity,
                serviceableAreas: p.serviceableAreas,
                completedCollections: p.completedCollections,
                failedCollections: p.failedCollections,
                rating: p.rating,
                isActive: p.isActive,
                createdAt: p.createdAt,
                todayAssignments: countMap.get(p.id) || 0,
            })),
            total: phlebotomists.length,
        };
    }

    async createPhlebotomist(input: {
        name: string;
        phone: string;
        email?: string;
        certification?: string;
        availableDays: string[];
        availableTimeStart?: string;
        availableTimeEnd?: string;
        maxDailyCollections?: number;
        currentCity: string;
        serviceableAreas: string[];
    }): Promise<{ success: boolean; message: string }> {
        await this.prisma.phlebotomist.create({
            data: {
                name: input.name,
                phone: input.phone,
                email: input.email || null,
                certification: input.certification || null,
                availableDays: input.availableDays,
                availableTimeStart: input.availableTimeStart || null,
                availableTimeEnd: input.availableTimeEnd || null,
                maxDailyCollections: input.maxDailyCollections || 10,
                currentCity: input.currentCity,
                serviceableAreas: input.serviceableAreas,
            },
        });
        return { success: true, message: 'Phlebotomist created' };
    }

    async updatePhlebotomist(input: {
        id: string;
        name?: string;
        phone?: string;
        email?: string;
        certification?: string;
        availableDays?: string[];
        availableTimeStart?: string;
        availableTimeEnd?: string;
        maxDailyCollections?: number;
        serviceableAreas?: string[];
    }): Promise<{ success: boolean; message: string }> {
        const phlebotomist = await this.prisma.phlebotomist.findUnique({
            where: { id: input.id },
        });
        if (!phlebotomist) {
            return { success: false, message: 'Phlebotomist not found' };
        }

        await this.prisma.phlebotomist.update({
            where: { id: input.id },
            data: {
                name: input.name ?? phlebotomist.name,
                phone: input.phone ?? phlebotomist.phone,
                email: input.email ?? phlebotomist.email,
                certification: input.certification ?? phlebotomist.certification,
                availableDays: input.availableDays ?? phlebotomist.availableDays,
                availableTimeStart: input.availableTimeStart ?? phlebotomist.availableTimeStart,
                availableTimeEnd: input.availableTimeEnd ?? phlebotomist.availableTimeEnd,
                maxDailyCollections: input.maxDailyCollections ?? phlebotomist.maxDailyCollections,
                serviceableAreas: input.serviceableAreas ?? phlebotomist.serviceableAreas,
            },
        });
        return { success: true, message: 'Phlebotomist updated' };
    }

    async togglePhlebotomistActive(id: string): Promise<{ success: boolean; message: string }> {
        const phlebotomist = await this.prisma.phlebotomist.findUnique({
            where: { id },
        });
        if (!phlebotomist) {
            return { success: false, message: 'Phlebotomist not found' };
        }

        await this.prisma.phlebotomist.update({
            where: { id },
            data: { isActive: !phlebotomist.isActive },
        });
        return {
            success: true,
            message: phlebotomist.isActive ? 'Phlebotomist deactivated' : 'Phlebotomist activated',
        };
    }

    // --- Pharmacies ---

    async getPharmacies(): Promise<{
        pharmacies: Array<{
            id: string;
            name: string;
            address: string;
            city: string;
            state: string;
            pincode: string;
            phone: string;
            email: string | null;
            contactPerson: string | null;
            drugLicenseNumber: string;
            gstNumber: string | null;
            serviceableAreas: string[];
            avgPreparationMinutes: number;
            rating: number | null;
            isActive: boolean;
            createdAt: Date;
        }>;
        total: number;
    }> {
        const pharmacies = await this.prisma.partnerPharmacy.findMany({
            orderBy: { name: 'asc' },
        });

        return {
            pharmacies: pharmacies.map((p) => ({
                id: p.id,
                name: p.name,
                address: p.address,
                city: p.city,
                state: p.state,
                pincode: p.pincode,
                phone: p.phone,
                email: p.email,
                contactPerson: p.contactPerson,
                drugLicenseNumber: p.drugLicenseNumber,
                gstNumber: p.gstNumber,
                serviceableAreas: p.serviceableAreas,
                avgPreparationMinutes: p.avgPreparationMinutes,
                rating: p.rating,
                isActive: p.isActive,
                createdAt: p.createdAt,
            })),
            total: pharmacies.length,
        };
    }

    async createPharmacy(input: {
        name: string;
        address: string;
        city: string;
        state: string;
        pincode: string;
        phone: string;
        email?: string;
        contactPerson?: string;
        drugLicenseNumber: string;
        gstNumber?: string;
        serviceableAreas: string[];
        avgPreparationMinutes?: number;
    }): Promise<{ success: boolean; message: string }> {
        await this.prisma.partnerPharmacy.create({
            data: {
                name: input.name,
                address: input.address,
                city: input.city,
                state: input.state,
                pincode: input.pincode,
                phone: input.phone,
                email: input.email || null,
                contactPerson: input.contactPerson || null,
                drugLicenseNumber: input.drugLicenseNumber,
                gstNumber: input.gstNumber || null,
                serviceableAreas: input.serviceableAreas,
                avgPreparationMinutes: input.avgPreparationMinutes || 30,
            },
        });
        return { success: true, message: 'Pharmacy created' };
    }

    async updatePharmacy(input: {
        id: string;
        name?: string;
        address?: string;
        phone?: string;
        email?: string;
        contactPerson?: string;
        serviceableAreas?: string[];
        avgPreparationMinutes?: number;
    }): Promise<{ success: boolean; message: string }> {
        const pharmacy = await this.prisma.partnerPharmacy.findUnique({
            where: { id: input.id },
        });
        if (!pharmacy) {
            return { success: false, message: 'Pharmacy not found' };
        }

        await this.prisma.partnerPharmacy.update({
            where: { id: input.id },
            data: {
                name: input.name ?? pharmacy.name,
                address: input.address ?? pharmacy.address,
                phone: input.phone ?? pharmacy.phone,
                email: input.email ?? pharmacy.email,
                contactPerson: input.contactPerson ?? pharmacy.contactPerson,
                serviceableAreas: input.serviceableAreas ?? pharmacy.serviceableAreas,
                avgPreparationMinutes: input.avgPreparationMinutes ?? pharmacy.avgPreparationMinutes,
            },
        });
        return { success: true, message: 'Pharmacy updated' };
    }

    async togglePharmacyActive(id: string): Promise<{ success: boolean; message: string }> {
        const pharmacy = await this.prisma.partnerPharmacy.findUnique({
            where: { id },
        });
        if (!pharmacy) {
            return { success: false, message: 'Pharmacy not found' };
        }

        await this.prisma.partnerPharmacy.update({
            where: { id },
            data: { isActive: !pharmacy.isActive },
        });
        return {
            success: true,
            message: pharmacy.isActive ? 'Pharmacy deactivated' : 'Pharmacy activated',
        };
    }

    // =============================================
    // PATIENT MANAGEMENT
    // Spec: master spec Section 3.2 — Patient Profiles
    // =============================================

    async getPatients(params: {
        search?: string;
        vertical?: string;
        page?: number;
        pageSize?: number;
    }): Promise<{
        patients: Array<{
            id: string;
            phone: string;
            name: string | null;
            email: string | null;
            dateOfBirth: Date | null;
            gender: string | null;
            city: string | null;
            state: string | null;
            createdAt: Date;
            activeConsultations: number;
            pendingLabOrders: number;
            pendingDeliveries: number;
            lastActivityAt: Date | null;
        }>;
        total: number;
        page: number;
        pageSize: number;
    }> {
        const page = params.page || 1;
        const pageSize = params.pageSize || 20;
        const skip = (page - 1) * pageSize;

        // Build where clause
        const where: Record<string, unknown> = {};

        if (params.search) {
            where.OR = [
                { phone: { contains: params.search } },
                { patientProfile: { fullName: { contains: params.search, mode: 'insensitive' } } },
                { email: { contains: params.search, mode: 'insensitive' } },
            ];
        }

        // Get patients with profiles
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                include: {
                    patientProfile: true,
                    consultations: {
                        where: {
                            status: { in: ['PENDING', 'ASSIGNED', 'IN_REVIEW'] },
                        },
                    },
                    labOrders: {
                        where: {
                            status: {
                                notIn: ['CLOSED', 'CANCELLED', 'EXPIRED', 'DOCTOR_REVIEWED'],
                            },
                        },
                    },
                    orders: {
                        where: {
                            status: {
                                notIn: ['DELIVERED', 'CANCELLED', 'RETURNED'],
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: pageSize,
            }),
            this.prisma.user.count({ where }),
        ]);

        return {
            patients: users.map((user) => ({
                id: user.id,
                phone: user.phone,
                name: user.patientProfile?.fullName || null,
                email: user.email,
                dateOfBirth: user.patientProfile?.dateOfBirth || null,
                gender: user.patientProfile?.gender || null,
                city: user.patientProfile?.city || null,
                state: user.patientProfile?.state || null,
                createdAt: user.createdAt,
                activeConsultations: user.consultations.length,
                pendingLabOrders: user.labOrders.length,
                pendingDeliveries: user.orders.length,
                lastActivityAt: user.lastLoginAt,
            })),
            total,
            page,
            pageSize,
        };
    }

    async getPatientDetail(patientId: string): Promise<{
        id: string;
        phone: string;
        name: string | null;
        email: string | null;
        dateOfBirth: Date | null;
        gender: string | null;
        address: string | null;
        city: string | null;
        state: string | null;
        pincode: string | null;
        createdAt: Date;
        consultations: Array<{
            id: string;
            vertical: string;
            status: string;
            createdAt: Date;
            doctorName: string | null;
        }>;
        labOrders: Array<{
            id: string;
            status: string;
            bookedDate: Date | null;
            panelName: string | null;
            createdAt: Date;
        }>;
        orders: Array<{
            id: string;
            status: string;
            totalAmountPaise: number;
            createdAt: Date;
        }>;
        notes: Array<{
            id: string;
            content: string;
            createdBy: string;
            createdAt: Date;
        }>;
    } | null> {
        const user = await this.prisma.user.findUnique({
            where: { id: patientId },
            include: {
                patientProfile: true,
                consultations: {
                    include: {
                        doctor: {
                            include: { doctorProfile: true },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
                labOrders: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
                orders: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });

        if (!user) {
            return null;
        }

        // Get admin notes for this patient (stored in a separate table or JSON field)
        // For now, we'll return an empty array as notes would need a separate model
        const notes: Array<{ id: string; content: string; createdBy: string; createdAt: Date }> = [];

        return {
            id: user.id,
            phone: user.phone,
            name: user.patientProfile?.fullName || null,
            email: user.email,
            dateOfBirth: user.patientProfile?.dateOfBirth || null,
            gender: user.patientProfile?.gender || null,
            address: user.patientProfile?.address || null,
            city: user.patientProfile?.city || null,
            state: user.patientProfile?.state || null,
            pincode: user.patientProfile?.pincode || null,
            createdAt: user.createdAt,
            consultations: user.consultations.map((c) => ({
                id: c.id,
                vertical: c.vertical,
                status: c.status,
                createdAt: c.createdAt,
                doctorName: c.doctor?.doctorProfile?.fullName || null,
            })),
            labOrders: user.labOrders.map((lo) => ({
                id: lo.id,
                status: lo.status,
                bookedDate: lo.bookedDate,
                panelName: lo.panelName,
                createdAt: lo.createdAt,
            })),
            orders: user.orders.map((o) => ({
                id: o.id,
                status: o.status,
                totalAmountPaise: o.totalAmountPaise,
                createdAt: o.createdAt,
            })),
            notes,
        };
    }
}
