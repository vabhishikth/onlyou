import { Test, TestingModule } from '@nestjs/testing';
import { AdminService, SLA_THRESHOLDS, SLAInfo } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { LabOrderStatus, OrderStatus, ConsultationStatus } from '@prisma/client';

// Spec: master spec Section 7.4 — SLA Escalation

describe('AdminService', () => {
    let service: AdminService;
    let prisma: PrismaService;

    // Helper: create a Date offset from now by milliseconds
    const hoursAgo = (hours: number): Date => new Date(Date.now() - hours * 60 * 60 * 1000);
    const daysAgo = (days: number): Date => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const mockPrismaService = {
        labOrder: {
            count: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            groupBy: jest.fn(),
        },
        order: {
            count: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        consultation: {
            count: jest.fn(),
        },
        subscription: {
            count: jest.fn(),
        },
        payment: {
            aggregate: jest.fn(),
        },
        user: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            count: jest.fn(),
        },
        phlebotomist: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
        },
        partnerDiagnosticCentre: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
        },
        partnerPharmacy: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
        },
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AdminService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<AdminService>(AdminService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    // =============================================
    // 1. SLA_THRESHOLDS values correctness
    // =============================================

    describe('SLA_THRESHOLDS', () => {
        it('should define PATIENT_BOOK_REMINDER_3D as 3 days in ms', () => {
            expect(SLA_THRESHOLDS.PATIENT_BOOK_REMINDER_3D).toBe(3 * 24 * 60 * 60 * 1000);
        });

        it('should define PATIENT_BOOK_REMINDER_7D as 7 days in ms', () => {
            expect(SLA_THRESHOLDS.PATIENT_BOOK_REMINDER_7D).toBe(7 * 24 * 60 * 60 * 1000);
        });

        it('should define PATIENT_BOOK_EXPIRED_14D as 14 days in ms', () => {
            expect(SLA_THRESHOLDS.PATIENT_BOOK_EXPIRED_14D).toBe(14 * 24 * 60 * 60 * 1000);
        });

        it('should define COORDINATOR_ASSIGN_2HR as 2 hours in ms', () => {
            expect(SLA_THRESHOLDS.COORDINATOR_ASSIGN_2HR).toBe(2 * 60 * 60 * 1000);
        });

        it('should define LAB_CONFIRM_RECEIPT_4HR as 4 hours in ms', () => {
            expect(SLA_THRESHOLDS.LAB_CONFIRM_RECEIPT_4HR).toBe(4 * 60 * 60 * 1000);
        });

        it('should define LAB_RESULTS_OVERDUE_48HR as 48 hours in ms', () => {
            expect(SLA_THRESHOLDS.LAB_RESULTS_OVERDUE_48HR).toBe(48 * 60 * 60 * 1000);
        });

        it('should define LAB_RESULTS_ESCALATION_72HR as 72 hours in ms', () => {
            expect(SLA_THRESHOLDS.LAB_RESULTS_ESCALATION_72HR).toBe(72 * 60 * 60 * 1000);
        });

        it('should define DOCTOR_REVIEW_REMINDER_24HR as 24 hours in ms', () => {
            expect(SLA_THRESHOLDS.DOCTOR_REVIEW_REMINDER_24HR).toBe(24 * 60 * 60 * 1000);
        });

        it('should define DOCTOR_REVIEW_ESCALATION_48HR as 48 hours in ms', () => {
            expect(SLA_THRESHOLDS.DOCTOR_REVIEW_ESCALATION_48HR).toBe(48 * 60 * 60 * 1000);
        });

        it('should have exactly 9 threshold keys', () => {
            expect(Object.keys(SLA_THRESHOLDS)).toHaveLength(9);
        });
    });

    // =============================================
    // 2. getDashboardStats
    // =============================================

    describe('getDashboardStats', () => {
        it('should aggregate all dashboard stats correctly', async () => {
            // Lab collections today
            mockPrismaService.labOrder.count
                .mockResolvedValueOnce(5)  // scheduled
                .mockResolvedValueOnce(3)  // completed
                .mockResolvedValueOnce(1)  // failed
                // Breach counts (called by countSLABreaches)
                .mockResolvedValueOnce(2)  // expired bookings
                .mockResolvedValueOnce(1)  // unassigned slots
                .mockResolvedValueOnce(0)  // unconfirmed receipts
                .mockResolvedValueOnce(3)  // overdue results
                .mockResolvedValueOnce(1); // unreviewed results

            // Deliveries today
            mockPrismaService.order.count
                .mockResolvedValueOnce(10) // pending
                .mockResolvedValueOnce(4)  // out for delivery
                .mockResolvedValueOnce(8)  // delivered today
                .mockResolvedValueOnce(2); // failed

            // Open cases
            mockPrismaService.consultation.count.mockResolvedValueOnce(7);

            // Active patients
            mockPrismaService.subscription.count.mockResolvedValueOnce(150);

            // Revenue
            mockPrismaService.payment.aggregate.mockResolvedValueOnce({
                _sum: { amountPaise: 5000000 },
            });

            const result = await service.getDashboardStats();

            expect(result.labCollections.scheduled).toBe(5);
            expect(result.labCollections.completed).toBe(3);
            expect(result.labCollections.failed).toBe(1);
            expect(result.deliveries.pending).toBe(10);
            expect(result.deliveries.outForDelivery).toBe(4);
            expect(result.deliveries.delivered).toBe(8);
            expect(result.deliveries.failed).toBe(2);
            expect(result.openCases).toBe(7);
            expect(result.slaBreaches).toBe(7); // 2+1+0+3+1
            expect(result.activePatients).toBe(150);
            expect(result.revenueThisMonthPaise).toBe(5000000);
        });

        it('should return 0 revenue when no payments exist', async () => {
            mockPrismaService.labOrder.count.mockResolvedValue(0);
            mockPrismaService.order.count.mockResolvedValue(0);
            mockPrismaService.consultation.count.mockResolvedValue(0);
            mockPrismaService.subscription.count.mockResolvedValue(0);
            mockPrismaService.payment.aggregate.mockResolvedValueOnce({
                _sum: { amountPaise: null },
            });

            const result = await service.getDashboardStats();

            expect(result.revenueThisMonthPaise).toBe(0);
        });

        it('should query lab collections with today date range', async () => {
            mockPrismaService.labOrder.count.mockResolvedValue(0);
            mockPrismaService.order.count.mockResolvedValue(0);
            mockPrismaService.consultation.count.mockResolvedValue(0);
            mockPrismaService.subscription.count.mockResolvedValue(0);
            mockPrismaService.payment.aggregate.mockResolvedValueOnce({
                _sum: { amountPaise: 0 },
            });

            await service.getDashboardStats();

            // The first labOrder.count call should filter by bookedDate and SLOT_BOOKED/PHLEBOTOMIST_ASSIGNED
            const firstCallArgs = mockPrismaService.labOrder.count.mock.calls[0][0];
            expect(firstCallArgs.where.status).toEqual({
                in: ['SLOT_BOOKED', 'PHLEBOTOMIST_ASSIGNED'],
            });
            expect(firstCallArgs.where.bookedDate).toBeDefined();
        });

        it('should query open cases for consultations without doctor assignment', async () => {
            mockPrismaService.labOrder.count.mockResolvedValue(0);
            mockPrismaService.order.count.mockResolvedValue(0);
            mockPrismaService.consultation.count.mockResolvedValue(3);
            mockPrismaService.subscription.count.mockResolvedValue(0);
            mockPrismaService.payment.aggregate.mockResolvedValueOnce({
                _sum: { amountPaise: 0 },
            });

            await service.getDashboardStats();

            expect(mockPrismaService.consultation.count).toHaveBeenCalledWith({
                where: {
                    doctorId: null,
                    status: {
                        in: [ConsultationStatus.PENDING_ASSESSMENT, ConsultationStatus.AI_REVIEWED],
                    },
                },
            });
        });

        it('should query revenue for current month with COMPLETED payments', async () => {
            mockPrismaService.labOrder.count.mockResolvedValue(0);
            mockPrismaService.order.count.mockResolvedValue(0);
            mockPrismaService.consultation.count.mockResolvedValue(0);
            mockPrismaService.subscription.count.mockResolvedValue(0);
            mockPrismaService.payment.aggregate.mockResolvedValueOnce({
                _sum: { amountPaise: 100000 },
            });

            await service.getDashboardStats();

            const aggregateCall = mockPrismaService.payment.aggregate.mock.calls[0][0];
            expect(aggregateCall.where.status).toBe('COMPLETED');
            expect(aggregateCall._sum).toEqual({ amountPaise: true });
        });
    });

    // =============================================
    // 3. countSLABreaches
    // =============================================

    describe('countSLABreaches', () => {
        it('should count expired bookings (14+ days since ORDERED)', async () => {
            mockPrismaService.labOrder.count
                .mockResolvedValueOnce(3)  // expired bookings
                .mockResolvedValueOnce(0)  // unassigned slots
                .mockResolvedValueOnce(0)  // unconfirmed receipts
                .mockResolvedValueOnce(0)  // overdue results
                .mockResolvedValueOnce(0); // unreviewed results

            const result = await service.countSLABreaches();
            expect(result).toBe(3);

            // Verify first call checks ORDERED status
            const firstCall = mockPrismaService.labOrder.count.mock.calls[0][0];
            expect(firstCall.where.status).toBe(LabOrderStatus.ORDERED);
        });

        it('should count unassigned slots (2+ hours since SLOT_BOOKED)', async () => {
            mockPrismaService.labOrder.count
                .mockResolvedValueOnce(0)  // expired bookings
                .mockResolvedValueOnce(5)  // unassigned slots
                .mockResolvedValueOnce(0)  // unconfirmed receipts
                .mockResolvedValueOnce(0)  // overdue results
                .mockResolvedValueOnce(0); // unreviewed results

            const result = await service.countSLABreaches();
            expect(result).toBe(5);

            const secondCall = mockPrismaService.labOrder.count.mock.calls[1][0];
            expect(secondCall.where.status).toBe(LabOrderStatus.SLOT_BOOKED);
        });

        it('should count unconfirmed lab receipts (4+ hours since DELIVERED_TO_LAB)', async () => {
            mockPrismaService.labOrder.count
                .mockResolvedValueOnce(0)  // expired bookings
                .mockResolvedValueOnce(0)  // unassigned slots
                .mockResolvedValueOnce(4)  // unconfirmed receipts
                .mockResolvedValueOnce(0)  // overdue results
                .mockResolvedValueOnce(0); // unreviewed results

            const result = await service.countSLABreaches();
            expect(result).toBe(4);

            const thirdCall = mockPrismaService.labOrder.count.mock.calls[2][0];
            expect(thirdCall.where.status).toBe(LabOrderStatus.DELIVERED_TO_LAB);
        });

        it('should count overdue lab results (72+ hours since SAMPLE_RECEIVED/PROCESSING)', async () => {
            mockPrismaService.labOrder.count
                .mockResolvedValueOnce(0)  // expired bookings
                .mockResolvedValueOnce(0)  // unassigned slots
                .mockResolvedValueOnce(0)  // unconfirmed receipts
                .mockResolvedValueOnce(6)  // overdue results
                .mockResolvedValueOnce(0); // unreviewed results

            const result = await service.countSLABreaches();
            expect(result).toBe(6);

            const fourthCall = mockPrismaService.labOrder.count.mock.calls[3][0];
            expect(fourthCall.where.status).toEqual({
                in: [LabOrderStatus.SAMPLE_RECEIVED, LabOrderStatus.PROCESSING],
            });
        });

        it('should count unreviewed doctor results (48+ hours since RESULTS_READY/UPLOADED)', async () => {
            mockPrismaService.labOrder.count
                .mockResolvedValueOnce(0)  // expired bookings
                .mockResolvedValueOnce(0)  // unassigned slots
                .mockResolvedValueOnce(0)  // unconfirmed receipts
                .mockResolvedValueOnce(0)  // overdue results
                .mockResolvedValueOnce(2); // unreviewed results

            const result = await service.countSLABreaches();
            expect(result).toBe(2);

            const fifthCall = mockPrismaService.labOrder.count.mock.calls[4][0];
            expect(fifthCall.where.status).toEqual({
                in: [LabOrderStatus.RESULTS_READY, LabOrderStatus.RESULTS_UPLOADED],
            });
        });

        it('should sum all 5 breach types', async () => {
            mockPrismaService.labOrder.count
                .mockResolvedValueOnce(2)  // expired bookings
                .mockResolvedValueOnce(3)  // unassigned slots
                .mockResolvedValueOnce(1)  // unconfirmed receipts
                .mockResolvedValueOnce(4)  // overdue results
                .mockResolvedValueOnce(5); // unreviewed results

            const result = await service.countSLABreaches();
            expect(result).toBe(15); // 2+3+1+4+5
        });

        it('should return 0 when there are no breaches', async () => {
            mockPrismaService.labOrder.count.mockResolvedValue(0);

            const result = await service.countSLABreaches();
            expect(result).toBe(0);
        });
    });

    // =============================================
    // 4. calculateLabOrderSLA
    // =============================================

    describe('calculateLabOrderSLA', () => {
        // --- ORDERED status ---

        describe('ORDERED status', () => {
            it('should return ON_TIME when ordered less than 7 days ago', () => {
                const labOrder = {
                    status: LabOrderStatus.ORDERED,
                    orderedAt: daysAgo(2),
                    slotBookedAt: null,
                    deliveredToLabAt: null,
                    sampleReceivedAt: null,
                    resultsUploadedAt: null,
                };

                const result = service.calculateLabOrderSLA(labOrder);
                expect(result.status).toBe('ON_TIME');
                expect(result.reason).toBeNull();
                expect(result.hoursOverdue).toBeNull();
                expect(result.deadlineAt).toBeNull();
            });

            it('should return APPROACHING when ordered 7-14 days ago', () => {
                const labOrder = {
                    status: LabOrderStatus.ORDERED,
                    orderedAt: daysAgo(10),
                    slotBookedAt: null,
                    deliveredToLabAt: null,
                    sampleReceivedAt: null,
                    resultsUploadedAt: null,
                };

                const result = service.calculateLabOrderSLA(labOrder);
                expect(result.status).toBe('APPROACHING');
                expect(result.reason).toBe('Patient booking overdue (7+ days)');
                expect(result.hoursOverdue).toBeNull();
                expect(result.deadlineAt).toBeDefined();
            });

            it('should return BREACHED when ordered 14+ days ago', () => {
                const labOrder = {
                    status: LabOrderStatus.ORDERED,
                    orderedAt: daysAgo(16),
                    slotBookedAt: null,
                    deliveredToLabAt: null,
                    sampleReceivedAt: null,
                    resultsUploadedAt: null,
                };

                const result = service.calculateLabOrderSLA(labOrder);
                expect(result.status).toBe('BREACHED');
                expect(result.reason).toBe('Patient has not booked slot (14+ days)');
                expect(result.hoursOverdue).toBeGreaterThanOrEqual(0);
                expect(result.deadlineAt).toBeDefined();
            });

            it('should calculate correct hoursOverdue for ORDERED breach', () => {
                // Ordered exactly 15 days ago => 1 day overdue = 24 hours
                const labOrder = {
                    status: LabOrderStatus.ORDERED,
                    orderedAt: daysAgo(15),
                    slotBookedAt: null,
                    deliveredToLabAt: null,
                    sampleReceivedAt: null,
                    resultsUploadedAt: null,
                };

                const result = service.calculateLabOrderSLA(labOrder);
                expect(result.status).toBe('BREACHED');
                expect(result.hoursOverdue).toBe(24);
            });

            it('should set deadlineAt to orderedAt + 14 days for APPROACHING', () => {
                const orderedAt = daysAgo(8);
                const labOrder = {
                    status: LabOrderStatus.ORDERED,
                    orderedAt,
                    slotBookedAt: null,
                    deliveredToLabAt: null,
                    sampleReceivedAt: null,
                    resultsUploadedAt: null,
                };

                const result = service.calculateLabOrderSLA(labOrder);
                const expectedDeadline = new Date(
                    orderedAt.getTime() + SLA_THRESHOLDS.PATIENT_BOOK_EXPIRED_14D,
                );
                expect(result.deadlineAt!.getTime()).toBe(expectedDeadline.getTime());
            });
        });

        // --- SLOT_BOOKED status ---

        describe('SLOT_BOOKED status', () => {
            it('should return ON_TIME when slot booked less than 1 hour ago', () => {
                const labOrder = {
                    status: LabOrderStatus.SLOT_BOOKED,
                    orderedAt: daysAgo(3),
                    slotBookedAt: hoursAgo(0.5),
                    deliveredToLabAt: null,
                    sampleReceivedAt: null,
                    resultsUploadedAt: null,
                };

                const result = service.calculateLabOrderSLA(labOrder);
                expect(result.status).toBe('ON_TIME');
                expect(result.reason).toBeNull();
            });

            it('should return APPROACHING when slot booked 1-2 hours ago', () => {
                const labOrder = {
                    status: LabOrderStatus.SLOT_BOOKED,
                    orderedAt: daysAgo(3),
                    slotBookedAt: hoursAgo(1.5),
                    deliveredToLabAt: null,
                    sampleReceivedAt: null,
                    resultsUploadedAt: null,
                };

                const result = service.calculateLabOrderSLA(labOrder);
                expect(result.status).toBe('APPROACHING');
                expect(result.reason).toBe('Phlebotomist assignment due soon');
            });

            it('should return BREACHED when slot booked 2+ hours ago', () => {
                const labOrder = {
                    status: LabOrderStatus.SLOT_BOOKED,
                    orderedAt: daysAgo(3),
                    slotBookedAt: hoursAgo(3),
                    deliveredToLabAt: null,
                    sampleReceivedAt: null,
                    resultsUploadedAt: null,
                };

                const result = service.calculateLabOrderSLA(labOrder);
                expect(result.status).toBe('BREACHED');
                expect(result.reason).toBe('Phlebotomist not assigned (2+ hours)');
                expect(result.hoursOverdue).toBeGreaterThanOrEqual(1);
            });

            it('should return ON_TIME when slotBookedAt is null', () => {
                const labOrder = {
                    status: LabOrderStatus.SLOT_BOOKED,
                    orderedAt: daysAgo(3),
                    slotBookedAt: null,
                    deliveredToLabAt: null,
                    sampleReceivedAt: null,
                    resultsUploadedAt: null,
                };

                const result = service.calculateLabOrderSLA(labOrder);
                expect(result.status).toBe('ON_TIME');
            });

            it('should set deadlineAt to slotBookedAt + 2 hours for BREACHED', () => {
                const slotBookedAt = hoursAgo(4);
                const labOrder = {
                    status: LabOrderStatus.SLOT_BOOKED,
                    orderedAt: daysAgo(3),
                    slotBookedAt,
                    deliveredToLabAt: null,
                    sampleReceivedAt: null,
                    resultsUploadedAt: null,
                };

                const result = service.calculateLabOrderSLA(labOrder);
                const expectedDeadline = new Date(
                    slotBookedAt.getTime() + SLA_THRESHOLDS.COORDINATOR_ASSIGN_2HR,
                );
                expect(result.deadlineAt!.getTime()).toBe(expectedDeadline.getTime());
            });
        });

        // --- DELIVERED_TO_LAB status ---

        describe('DELIVERED_TO_LAB status', () => {
            it('should return ON_TIME when delivered less than 2 hours ago', () => {
                const labOrder = {
                    status: LabOrderStatus.DELIVERED_TO_LAB,
                    orderedAt: daysAgo(5),
                    slotBookedAt: daysAgo(4),
                    deliveredToLabAt: hoursAgo(1),
                    sampleReceivedAt: null,
                    resultsUploadedAt: null,
                };

                const result = service.calculateLabOrderSLA(labOrder);
                expect(result.status).toBe('ON_TIME');
            });

            it('should return APPROACHING when delivered 2-4 hours ago', () => {
                const labOrder = {
                    status: LabOrderStatus.DELIVERED_TO_LAB,
                    orderedAt: daysAgo(5),
                    slotBookedAt: daysAgo(4),
                    deliveredToLabAt: hoursAgo(3),
                    sampleReceivedAt: null,
                    resultsUploadedAt: null,
                };

                const result = service.calculateLabOrderSLA(labOrder);
                expect(result.status).toBe('APPROACHING');
                expect(result.reason).toBe('Lab receipt confirmation due soon');
            });

            it('should return BREACHED when delivered 4+ hours ago', () => {
                const labOrder = {
                    status: LabOrderStatus.DELIVERED_TO_LAB,
                    orderedAt: daysAgo(5),
                    slotBookedAt: daysAgo(4),
                    deliveredToLabAt: hoursAgo(6),
                    sampleReceivedAt: null,
                    resultsUploadedAt: null,
                };

                const result = service.calculateLabOrderSLA(labOrder);
                expect(result.status).toBe('BREACHED');
                expect(result.reason).toBe('Lab has not confirmed receipt (4+ hours)');
                expect(result.hoursOverdue).toBeGreaterThanOrEqual(2);
            });

            it('should return ON_TIME when deliveredToLabAt is null', () => {
                const labOrder = {
                    status: LabOrderStatus.DELIVERED_TO_LAB,
                    orderedAt: daysAgo(5),
                    slotBookedAt: daysAgo(4),
                    deliveredToLabAt: null,
                    sampleReceivedAt: null,
                    resultsUploadedAt: null,
                };

                const result = service.calculateLabOrderSLA(labOrder);
                expect(result.status).toBe('ON_TIME');
            });
        });

        // --- SAMPLE_RECEIVED / PROCESSING status ---

        describe('SAMPLE_RECEIVED / PROCESSING status', () => {
            it('should return ON_TIME when sample received less than 48 hours ago', () => {
                const labOrder = {
                    status: LabOrderStatus.SAMPLE_RECEIVED,
                    orderedAt: daysAgo(6),
                    slotBookedAt: daysAgo(5),
                    deliveredToLabAt: daysAgo(4),
                    sampleReceivedAt: hoursAgo(24),
                    resultsUploadedAt: null,
                };

                const result = service.calculateLabOrderSLA(labOrder);
                expect(result.status).toBe('ON_TIME');
            });

            it('should return APPROACHING when sample received 48-72 hours ago', () => {
                const labOrder = {
                    status: LabOrderStatus.PROCESSING,
                    orderedAt: daysAgo(7),
                    slotBookedAt: daysAgo(6),
                    deliveredToLabAt: daysAgo(5),
                    sampleReceivedAt: hoursAgo(60),
                    resultsUploadedAt: null,
                };

                const result = service.calculateLabOrderSLA(labOrder);
                expect(result.status).toBe('APPROACHING');
                expect(result.reason).toBe('Lab results approaching deadline (48+ hours)');
            });

            it('should return BREACHED when sample received 72+ hours ago', () => {
                const labOrder = {
                    status: LabOrderStatus.SAMPLE_RECEIVED,
                    orderedAt: daysAgo(8),
                    slotBookedAt: daysAgo(7),
                    deliveredToLabAt: daysAgo(6),
                    sampleReceivedAt: hoursAgo(80),
                    resultsUploadedAt: null,
                };

                const result = service.calculateLabOrderSLA(labOrder);
                expect(result.status).toBe('BREACHED');
                expect(result.reason).toBe('Lab results overdue (72+ hours)');
                expect(result.hoursOverdue).toBeGreaterThanOrEqual(8);
            });

            it('should return ON_TIME when sampleReceivedAt is null for PROCESSING', () => {
                const labOrder = {
                    status: LabOrderStatus.PROCESSING,
                    orderedAt: daysAgo(8),
                    slotBookedAt: daysAgo(7),
                    deliveredToLabAt: daysAgo(6),
                    sampleReceivedAt: null,
                    resultsUploadedAt: null,
                };

                const result = service.calculateLabOrderSLA(labOrder);
                expect(result.status).toBe('ON_TIME');
            });

            it('should set deadlineAt to sampleReceivedAt + 72 hours for APPROACHING', () => {
                const sampleReceivedAt = hoursAgo(50);
                const labOrder = {
                    status: LabOrderStatus.SAMPLE_RECEIVED,
                    orderedAt: daysAgo(8),
                    slotBookedAt: daysAgo(7),
                    deliveredToLabAt: daysAgo(6),
                    sampleReceivedAt,
                    resultsUploadedAt: null,
                };

                const result = service.calculateLabOrderSLA(labOrder);
                const expectedDeadline = new Date(
                    sampleReceivedAt.getTime() + SLA_THRESHOLDS.LAB_RESULTS_ESCALATION_72HR,
                );
                expect(result.deadlineAt!.getTime()).toBe(expectedDeadline.getTime());
            });
        });

        // --- RESULTS_READY / RESULTS_UPLOADED status ---

        describe('RESULTS_READY / RESULTS_UPLOADED status', () => {
            it('should return ON_TIME when results uploaded less than 24 hours ago', () => {
                const labOrder = {
                    status: LabOrderStatus.RESULTS_READY,
                    orderedAt: daysAgo(10),
                    slotBookedAt: daysAgo(9),
                    deliveredToLabAt: daysAgo(8),
                    sampleReceivedAt: daysAgo(7),
                    resultsUploadedAt: hoursAgo(12),
                };

                const result = service.calculateLabOrderSLA(labOrder);
                expect(result.status).toBe('ON_TIME');
            });

            it('should return APPROACHING when results uploaded 24-48 hours ago', () => {
                const labOrder = {
                    status: LabOrderStatus.RESULTS_UPLOADED,
                    orderedAt: daysAgo(10),
                    slotBookedAt: daysAgo(9),
                    deliveredToLabAt: daysAgo(8),
                    sampleReceivedAt: daysAgo(7),
                    resultsUploadedAt: hoursAgo(30),
                };

                const result = service.calculateLabOrderSLA(labOrder);
                expect(result.status).toBe('APPROACHING');
                expect(result.reason).toBe('Doctor review due soon (24+ hours)');
            });

            it('should return BREACHED when results uploaded 48+ hours ago', () => {
                const labOrder = {
                    status: LabOrderStatus.RESULTS_READY,
                    orderedAt: daysAgo(10),
                    slotBookedAt: daysAgo(9),
                    deliveredToLabAt: daysAgo(8),
                    sampleReceivedAt: daysAgo(7),
                    resultsUploadedAt: hoursAgo(60),
                };

                const result = service.calculateLabOrderSLA(labOrder);
                expect(result.status).toBe('BREACHED');
                expect(result.reason).toBe('Doctor review overdue (48+ hours)');
                expect(result.hoursOverdue).toBeGreaterThanOrEqual(12);
            });

            it('should return ON_TIME when resultsUploadedAt is null', () => {
                const labOrder = {
                    status: LabOrderStatus.RESULTS_READY,
                    orderedAt: daysAgo(10),
                    slotBookedAt: daysAgo(9),
                    deliveredToLabAt: daysAgo(8),
                    sampleReceivedAt: daysAgo(7),
                    resultsUploadedAt: null,
                };

                const result = service.calculateLabOrderSLA(labOrder);
                expect(result.status).toBe('ON_TIME');
            });

            it('should set deadlineAt to resultsUploadedAt + 48 hours for BREACHED', () => {
                const resultsUploadedAt = hoursAgo(55);
                const labOrder = {
                    status: LabOrderStatus.RESULTS_UPLOADED,
                    orderedAt: daysAgo(10),
                    slotBookedAt: daysAgo(9),
                    deliveredToLabAt: daysAgo(8),
                    sampleReceivedAt: daysAgo(7),
                    resultsUploadedAt,
                };

                const result = service.calculateLabOrderSLA(labOrder);
                const expectedDeadline = new Date(
                    resultsUploadedAt.getTime() + SLA_THRESHOLDS.DOCTOR_REVIEW_ESCALATION_48HR,
                );
                expect(result.deadlineAt!.getTime()).toBe(expectedDeadline.getTime());
            });
        });

        // --- Default / other statuses ---

        describe('default status handling', () => {
            it('should return ON_TIME for PHLEBOTOMIST_ASSIGNED status', () => {
                const labOrder = {
                    status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
                    orderedAt: daysAgo(5),
                    slotBookedAt: daysAgo(4),
                    deliveredToLabAt: null,
                    sampleReceivedAt: null,
                    resultsUploadedAt: null,
                };

                const result = service.calculateLabOrderSLA(labOrder);
                expect(result.status).toBe('ON_TIME');
                expect(result.reason).toBeNull();
                expect(result.hoursOverdue).toBeNull();
                expect(result.deadlineAt).toBeNull();
            });

            it('should return ON_TIME for CLOSED status', () => {
                const labOrder = {
                    status: LabOrderStatus.CLOSED,
                    orderedAt: daysAgo(20),
                    slotBookedAt: daysAgo(19),
                    deliveredToLabAt: daysAgo(18),
                    sampleReceivedAt: daysAgo(17),
                    resultsUploadedAt: daysAgo(16),
                };

                const result = service.calculateLabOrderSLA(labOrder);
                expect(result.status).toBe('ON_TIME');
            });

            it('should return ON_TIME for CANCELLED status', () => {
                const labOrder = {
                    status: LabOrderStatus.CANCELLED,
                    orderedAt: daysAgo(30),
                    slotBookedAt: null,
                    deliveredToLabAt: null,
                    sampleReceivedAt: null,
                    resultsUploadedAt: null,
                };

                const result = service.calculateLabOrderSLA(labOrder);
                expect(result.status).toBe('ON_TIME');
            });
        });
    });

    // =============================================
    // 5. getAdminLabOrders
    // =============================================

    describe('getAdminLabOrders', () => {
        const mockLabOrder = {
            id: 'lab-order-1',
            status: LabOrderStatus.ORDERED,
            orderedAt: daysAgo(2),
            slotBookedAt: null,
            deliveredToLabAt: null,
            sampleReceivedAt: null,
            resultsUploadedAt: null,
            testPanel: ['CBC', 'TSH'],
            panelName: 'Hair Loss Panel',
            bookedDate: null,
            bookedTimeSlot: null,
            collectionAddress: '123 Main St',
            collectionCity: 'Mumbai',
            collectionPincode: '400001',
            phlebotomistAssignedAt: null,
            sampleCollectedAt: null,
            collectionFailedAt: null,
            processingStartedAt: null,
            doctorReviewedAt: null,
            closedAt: null,
            cancelledAt: null,
            expiredAt: null,
            tubeCount: null,
            collectionFailedReason: null,
            receivedTubeCount: null,
            sampleIssueAt: null,
            sampleIssueReason: null,
            criticalValues: null,
            cancellationReason: null,
            patient: {
                id: 'patient-1',
                name: 'Rahul Sharma',
                phone: '+919876543210',
            },
            consultation: {
                vertical: 'HAIR_LOSS',
            },
            phlebotomist: null,
            diagnosticCentre: null,
        };

        it('should return paginated lab orders with default page/pageSize', async () => {
            mockPrismaService.labOrder.findMany.mockResolvedValueOnce([mockLabOrder]);
            mockPrismaService.labOrder.count.mockResolvedValueOnce(1);

            const result = await service.getAdminLabOrders({});

            expect(result.page).toBe(1);
            expect(result.pageSize).toBe(20);
            expect(result.total).toBe(1);
            expect(result.labOrders).toHaveLength(1);
            expect(result.labOrders[0].id).toBe('lab-order-1');
            expect(result.labOrders[0].patient.name).toBe('Rahul Sharma');
            expect(result.labOrders[0].vertical).toBe('HAIR_LOSS');
        });

        it('should filter by statuses', async () => {
            mockPrismaService.labOrder.findMany.mockResolvedValueOnce([]);
            mockPrismaService.labOrder.count.mockResolvedValueOnce(0);

            await service.getAdminLabOrders({
                statuses: [LabOrderStatus.ORDERED, LabOrderStatus.SLOT_BOOKED],
            });

            const findManyArgs = mockPrismaService.labOrder.findMany.mock.calls[0][0];
            expect(findManyArgs.where.status).toEqual({
                in: [LabOrderStatus.ORDERED, LabOrderStatus.SLOT_BOOKED],
            });
        });

        it('should filter by date range', async () => {
            mockPrismaService.labOrder.findMany.mockResolvedValueOnce([]);
            mockPrismaService.labOrder.count.mockResolvedValueOnce(0);

            const dateFrom = new Date('2026-02-01');
            const dateTo = new Date('2026-02-28');

            await service.getAdminLabOrders({ dateFrom, dateTo });

            const findManyArgs = mockPrismaService.labOrder.findMany.mock.calls[0][0];
            expect(findManyArgs.where.bookedDate.gte).toBe(dateFrom);
            expect(findManyArgs.where.bookedDate.lte).toBe(dateTo);
        });

        it('should filter by phlebotomistId', async () => {
            mockPrismaService.labOrder.findMany.mockResolvedValueOnce([]);
            mockPrismaService.labOrder.count.mockResolvedValueOnce(0);

            await service.getAdminLabOrders({ phlebotomistId: 'phleb-1' });

            const findManyArgs = mockPrismaService.labOrder.findMany.mock.calls[0][0];
            expect(findManyArgs.where.phlebotomistId).toBe('phleb-1');
        });

        it('should filter by labId (diagnosticCentreId)', async () => {
            mockPrismaService.labOrder.findMany.mockResolvedValueOnce([]);
            mockPrismaService.labOrder.count.mockResolvedValueOnce(0);

            await service.getAdminLabOrders({ labId: 'lab-1' });

            const findManyArgs = mockPrismaService.labOrder.findMany.mock.calls[0][0];
            expect(findManyArgs.where.diagnosticCentreId).toBe('lab-1');
        });

        it('should filter by vertical through consultation relation', async () => {
            mockPrismaService.labOrder.findMany.mockResolvedValueOnce([]);
            mockPrismaService.labOrder.count.mockResolvedValueOnce(0);

            await service.getAdminLabOrders({ vertical: 'HAIR_LOSS' });

            const findManyArgs = mockPrismaService.labOrder.findMany.mock.calls[0][0];
            expect(findManyArgs.where.consultation).toEqual({ vertical: 'HAIR_LOSS' });
        });

        it('should filter by search (patient name or phone)', async () => {
            mockPrismaService.labOrder.findMany.mockResolvedValueOnce([]);
            mockPrismaService.labOrder.count.mockResolvedValueOnce(0);

            await service.getAdminLabOrders({ search: 'Rahul' });

            const findManyArgs = mockPrismaService.labOrder.findMany.mock.calls[0][0];
            expect(findManyArgs.where.patient).toEqual({
                OR: [
                    { name: { contains: 'Rahul', mode: 'insensitive' } },
                    { phone: { contains: 'Rahul' } },
                ],
            });
        });

        it('should paginate correctly with custom page and pageSize', async () => {
            mockPrismaService.labOrder.findMany.mockResolvedValueOnce([]);
            mockPrismaService.labOrder.count.mockResolvedValueOnce(50);

            const result = await service.getAdminLabOrders({ page: 3, pageSize: 10 });

            expect(result.page).toBe(3);
            expect(result.pageSize).toBe(10);
            expect(result.total).toBe(50);

            const findManyArgs = mockPrismaService.labOrder.findMany.mock.calls[0][0];
            expect(findManyArgs.skip).toBe(20); // (3-1) * 10
            expect(findManyArgs.take).toBe(10);
        });

        it('should calculate SLA info for each lab order', async () => {
            const orderedLongAgo = {
                ...mockLabOrder,
                orderedAt: daysAgo(16),
            };
            mockPrismaService.labOrder.findMany.mockResolvedValueOnce([orderedLongAgo]);
            mockPrismaService.labOrder.count.mockResolvedValueOnce(1);

            const result = await service.getAdminLabOrders({});
            expect(result.labOrders[0].slaInfo.status).toBe('BREACHED');
        });

        it('should include phlebotomist data when available', async () => {
            const withPhlebotomist = {
                ...mockLabOrder,
                status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
                phlebotomist: {
                    id: 'phleb-1',
                    name: 'Amit Phlebotomist',
                    phone: '+919876543211',
                },
            };
            mockPrismaService.labOrder.findMany.mockResolvedValueOnce([withPhlebotomist]);
            mockPrismaService.labOrder.count.mockResolvedValueOnce(1);

            const result = await service.getAdminLabOrders({});
            expect(result.labOrders[0].phlebotomist).toEqual({
                id: 'phleb-1',
                name: 'Amit Phlebotomist',
                phone: '+919876543211',
            });
        });

        it('should include lab data when available', async () => {
            const withLab = {
                ...mockLabOrder,
                diagnosticCentre: {
                    id: 'lab-1',
                    name: 'City Labs',
                    phone: '+919876543212',
                },
            };
            mockPrismaService.labOrder.findMany.mockResolvedValueOnce([withLab]);
            mockPrismaService.labOrder.count.mockResolvedValueOnce(1);

            const result = await service.getAdminLabOrders({});
            expect(result.labOrders[0].lab).toEqual({
                id: 'lab-1',
                name: 'City Labs',
                phone: '+919876543212',
            });
        });

        it('should build timeline from order timestamps', async () => {
            const withTimeline = {
                ...mockLabOrder,
                orderedAt: daysAgo(5), // earliest timestamp
                status: LabOrderStatus.SAMPLE_COLLECTED,
                slotBookedAt: daysAgo(4),
                bookedTimeSlot: '09:00-10:00',
                phlebotomistAssignedAt: daysAgo(3),
                sampleCollectedAt: daysAgo(2),
                tubeCount: 3,
            };
            mockPrismaService.labOrder.findMany.mockResolvedValueOnce([withTimeline]);
            mockPrismaService.labOrder.count.mockResolvedValueOnce(1);

            const result = await service.getAdminLabOrders({});
            const timeline = result.labOrders[0].timeline;
            expect(timeline.length).toBeGreaterThanOrEqual(4); // ORDERED, SLOT_BOOKED, PHLEBOTOMIST_ASSIGNED, SAMPLE_COLLECTED
            expect(timeline[0].status).toBe('ORDERED');
            expect(timeline[1].status).toBe('SLOT_BOOKED');
            expect(timeline[2].status).toBe('PHLEBOTOMIST_ASSIGNED');
            expect(timeline[3].status).toBe('SAMPLE_COLLECTED');
            expect(timeline[3].details).toBe('3 tubes');
        });
    });

    // =============================================
    // 6. getAdminDeliveries
    // =============================================

    describe('getAdminDeliveries', () => {
        const mockOrder = {
            id: 'order-1',
            status: OrderStatus.SENT_TO_PHARMACY,
            orderedAt: daysAgo(1),
            sentToPharmacyAt: hoursAgo(12),
            pharmacyReadyAt: null,
            outForDeliveryAt: null,
            deliveredAt: null,
            pharmacyIssueReason: null,
            deliveryFailedReason: null,
            pharmacyPartnerId: 'pharmacy-1',
            pharmacyPartnerName: 'HealthPlus Pharmacy',
            pharmacyAddress: '456 MG Road',
            deliveryPersonName: null,
            deliveryPersonPhone: null,
            deliveryMethod: null,
            estimatedDeliveryTime: null,
            deliveryOtp: null,
            deliveryAddress: '789 HSR Layout',
            deliveryCity: 'Bangalore',
            deliveryPincode: '560102',
            totalAmount: 150000,
            isReorder: false,
            patient: {
                id: 'patient-1',
                name: 'Priya Patel',
                phone: '+919876543213',
            },
            prescription: {
                medications: [
                    { name: 'Finasteride', dosage: '1mg', frequency: 'Once daily' },
                    { name: 'Minoxidil', dosage: '5%', frequency: 'Twice daily' },
                ],
            },
        };

        it('should return paginated deliveries with default page/pageSize', async () => {
            mockPrismaService.order.findMany.mockResolvedValueOnce([mockOrder]);
            mockPrismaService.order.count.mockResolvedValueOnce(1);

            const result = await service.getAdminDeliveries({});

            expect(result.page).toBe(1);
            expect(result.pageSize).toBe(20);
            expect(result.total).toBe(1);
            expect(result.deliveries).toHaveLength(1);
            expect(result.deliveries[0].id).toBe('order-1');
            expect(result.deliveries[0].patient.name).toBe('Priya Patel');
        });

        it('should filter by statuses', async () => {
            mockPrismaService.order.findMany.mockResolvedValueOnce([]);
            mockPrismaService.order.count.mockResolvedValueOnce(0);

            await service.getAdminDeliveries({
                statuses: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED],
            });

            const findManyArgs = mockPrismaService.order.findMany.mock.calls[0][0];
            expect(findManyArgs.where.status).toEqual({
                in: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED],
            });
        });

        it('should filter by pharmacyId', async () => {
            mockPrismaService.order.findMany.mockResolvedValueOnce([]);
            mockPrismaService.order.count.mockResolvedValueOnce(0);

            await service.getAdminDeliveries({ pharmacyId: 'pharmacy-1' });

            const findManyArgs = mockPrismaService.order.findMany.mock.calls[0][0];
            expect(findManyArgs.where.pharmacyPartnerId).toBe('pharmacy-1');
        });

        it('should filter by date range', async () => {
            mockPrismaService.order.findMany.mockResolvedValueOnce([]);
            mockPrismaService.order.count.mockResolvedValueOnce(0);

            const dateFrom = new Date('2026-02-01');
            const dateTo = new Date('2026-02-28');

            await service.getAdminDeliveries({ dateFrom, dateTo });

            const findManyArgs = mockPrismaService.order.findMany.mock.calls[0][0];
            expect(findManyArgs.where.orderedAt.gte).toBe(dateFrom);
            expect(findManyArgs.where.orderedAt.lte).toBe(dateTo);
        });

        it('should filter by isReorder', async () => {
            mockPrismaService.order.findMany.mockResolvedValueOnce([]);
            mockPrismaService.order.count.mockResolvedValueOnce(0);

            await service.getAdminDeliveries({ isReorder: true });

            const findManyArgs = mockPrismaService.order.findMany.mock.calls[0][0];
            expect(findManyArgs.where.isReorder).toBe(true);
        });

        it('should filter by search (patient name or phone)', async () => {
            mockPrismaService.order.findMany.mockResolvedValueOnce([]);
            mockPrismaService.order.count.mockResolvedValueOnce(0);

            await service.getAdminDeliveries({ search: 'Priya' });

            const findManyArgs = mockPrismaService.order.findMany.mock.calls[0][0];
            expect(findManyArgs.where.patient).toEqual({
                OR: [
                    { name: { contains: 'Priya', mode: 'insensitive' } },
                    { phone: { contains: 'Priya' } },
                ],
            });
        });

        it('should parse medications from prescription', async () => {
            mockPrismaService.order.findMany.mockResolvedValueOnce([mockOrder]);
            mockPrismaService.order.count.mockResolvedValueOnce(1);

            const result = await service.getAdminDeliveries({});

            expect(result.deliveries[0].medications).toEqual([
                { name: 'Finasteride', dosage: '1mg', frequency: 'Once daily' },
                { name: 'Minoxidil', dosage: '5%', frequency: 'Twice daily' },
            ]);
        });

        it('should handle missing prescription medications gracefully', async () => {
            const orderNoPrescription = {
                ...mockOrder,
                prescription: null,
            };
            mockPrismaService.order.findMany.mockResolvedValueOnce([orderNoPrescription]);
            mockPrismaService.order.count.mockResolvedValueOnce(1);

            const result = await service.getAdminDeliveries({});
            expect(result.deliveries[0].medications).toEqual([]);
        });

        it('should include pharmacy info when pharmacyPartnerId exists', async () => {
            mockPrismaService.order.findMany.mockResolvedValueOnce([mockOrder]);
            mockPrismaService.order.count.mockResolvedValueOnce(1);

            const result = await service.getAdminDeliveries({});
            expect(result.deliveries[0].pharmacy).toEqual({
                id: 'pharmacy-1',
                name: 'HealthPlus Pharmacy',
                address: '456 MG Road',
                phone: null,
            });
        });

        it('should return null pharmacy when pharmacyPartnerId is null', async () => {
            const orderNoPharmacy = {
                ...mockOrder,
                pharmacyPartnerId: null,
            };
            mockPrismaService.order.findMany.mockResolvedValueOnce([orderNoPharmacy]);
            mockPrismaService.order.count.mockResolvedValueOnce(1);

            const result = await service.getAdminDeliveries({});
            expect(result.deliveries[0].pharmacy).toBeNull();
        });

        it('should paginate correctly', async () => {
            mockPrismaService.order.findMany.mockResolvedValueOnce([]);
            mockPrismaService.order.count.mockResolvedValueOnce(100);

            const result = await service.getAdminDeliveries({ page: 5, pageSize: 10 });

            expect(result.page).toBe(5);
            expect(result.pageSize).toBe(10);

            const findManyArgs = mockPrismaService.order.findMany.mock.calls[0][0];
            expect(findManyArgs.skip).toBe(40); // (5-1) * 10
            expect(findManyArgs.take).toBe(10);
        });
    });

    // =============================================
    // 7. getPatients
    // =============================================

    describe('getPatients', () => {
        const mockUser = {
            id: 'user-1',
            phone: '+919876543210',
            name: 'Rahul Sharma',
            email: 'rahul@test.com',
            createdAt: new Date('2026-01-01'),
            updatedAt: new Date('2026-02-15'),
            patientProfile: {
                dateOfBirth: new Date('1990-05-15'),
                gender: 'MALE',
                city: 'Mumbai',
                state: 'Maharashtra',
            },
            consultations: [
                { id: 'consult-1', status: ConsultationStatus.DOCTOR_REVIEWING },
            ],
            labOrders: [
                { id: 'lab-1', status: LabOrderStatus.ORDERED },
            ],
            orders: [
                { id: 'order-1', status: OrderStatus.SENT_TO_PHARMACY },
            ],
        };

        it('should return paginated patients with default page/pageSize', async () => {
            mockPrismaService.user.findMany.mockResolvedValueOnce([mockUser]);
            mockPrismaService.user.count.mockResolvedValueOnce(1);

            const result = await service.getPatients({});

            expect(result.page).toBe(1);
            expect(result.pageSize).toBe(20);
            expect(result.total).toBe(1);
            expect(result.patients).toHaveLength(1);
            expect(result.patients[0].id).toBe('user-1');
            expect(result.patients[0].name).toBe('Rahul Sharma');
            expect(result.patients[0].activeConsultations).toBe(1);
            expect(result.patients[0].pendingLabOrders).toBe(1);
            expect(result.patients[0].pendingDeliveries).toBe(1);
        });

        it('should filter by search term', async () => {
            mockPrismaService.user.findMany.mockResolvedValueOnce([]);
            mockPrismaService.user.count.mockResolvedValueOnce(0);

            await service.getPatients({ search: 'Rahul' });

            const findManyArgs = mockPrismaService.user.findMany.mock.calls[0][0];
            expect(findManyArgs.where.OR).toEqual([
                { phone: { contains: 'Rahul' } },
                { patientProfile: { fullName: { contains: 'Rahul', mode: 'insensitive' } } },
                { email: { contains: 'Rahul', mode: 'insensitive' } },
            ]);
        });

        it('should paginate correctly with custom page and pageSize', async () => {
            mockPrismaService.user.findMany.mockResolvedValueOnce([]);
            mockPrismaService.user.count.mockResolvedValueOnce(200);

            const result = await service.getPatients({ page: 4, pageSize: 25 });

            expect(result.page).toBe(4);
            expect(result.pageSize).toBe(25);
            expect(result.total).toBe(200);

            const findManyArgs = mockPrismaService.user.findMany.mock.calls[0][0];
            expect(findManyArgs.skip).toBe(75); // (4-1) * 25
            expect(findManyArgs.take).toBe(25);
        });

        it('should map patient profile fields correctly', async () => {
            mockPrismaService.user.findMany.mockResolvedValueOnce([mockUser]);
            mockPrismaService.user.count.mockResolvedValueOnce(1);

            const result = await service.getPatients({});

            expect(result.patients[0].dateOfBirth).toEqual(new Date('1990-05-15'));
            expect(result.patients[0].gender).toBe('MALE');
            expect(result.patients[0].city).toBe('Mumbai');
            expect(result.patients[0].state).toBe('Maharashtra');
        });

        it('should handle patients without profile gracefully', async () => {
            const userNoProfile = {
                ...mockUser,
                patientProfile: null,
                consultations: [],
                labOrders: [],
                orders: [],
            };
            mockPrismaService.user.findMany.mockResolvedValueOnce([userNoProfile]);
            mockPrismaService.user.count.mockResolvedValueOnce(1);

            const result = await service.getPatients({});

            expect(result.patients[0].dateOfBirth).toBeNull();
            expect(result.patients[0].gender).toBeNull();
            expect(result.patients[0].city).toBeNull();
            expect(result.patients[0].state).toBeNull();
            expect(result.patients[0].activeConsultations).toBe(0);
            expect(result.patients[0].pendingLabOrders).toBe(0);
            expect(result.patients[0].pendingDeliveries).toBe(0);
        });

        it('should set lastActivityAt from user updatedAt', async () => {
            mockPrismaService.user.findMany.mockResolvedValueOnce([mockUser]);
            mockPrismaService.user.count.mockResolvedValueOnce(1);

            const result = await service.getPatients({});
            expect(result.patients[0].lastActivityAt).toEqual(new Date('2026-02-15'));
        });
    });

    // =============================================
    // 8. getPatientDetail
    // =============================================

    describe('getPatientDetail', () => {
        const mockDetailUser = {
            id: 'user-1',
            phone: '+919876543210',
            name: 'Rahul Sharma',
            email: 'rahul@test.com',
            createdAt: new Date('2026-01-01'),
            patientProfile: {
                dateOfBirth: new Date('1990-05-15'),
                gender: 'MALE',
                addressLine1: '123 Main St, Mumbai',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400001',
            },
            consultations: [
                {
                    id: 'consult-1',
                    vertical: 'HAIR_LOSS',
                    status: ConsultationStatus.DOCTOR_REVIEWING,
                    createdAt: new Date('2026-02-01'),
                    doctor: { name: 'Dr. Singh' },
                },
            ],
            labOrders: [
                {
                    id: 'lab-1',
                    status: LabOrderStatus.ORDERED,
                    bookedDate: null,
                    panelName: 'Hair Loss Panel',
                    createdAt: new Date('2026-02-05'),
                },
            ],
            orders: [
                {
                    id: 'order-1',
                    status: OrderStatus.SENT_TO_PHARMACY,
                    totalAmount: 150000,
                    createdAt: new Date('2026-02-10'),
                },
            ],
        };

        it('should return full patient detail', async () => {
            mockPrismaService.user.findUnique.mockResolvedValueOnce(mockDetailUser);

            const result = await service.getPatientDetail('user-1');

            expect(result).not.toBeNull();
            expect(result!.id).toBe('user-1');
            expect(result!.phone).toBe('+919876543210');
            expect(result!.name).toBe('Rahul Sharma');
            expect(result!.email).toBe('rahul@test.com');
            expect(result!.address).toBe('123 Main St, Mumbai');
            expect(result!.city).toBe('Mumbai');
            expect(result!.state).toBe('Maharashtra');
            expect(result!.pincode).toBe('400001');
        });

        it('should return null when patient not found', async () => {
            mockPrismaService.user.findUnique.mockResolvedValueOnce(null);

            const result = await service.getPatientDetail('nonexistent');
            expect(result).toBeNull();
        });

        it('should map consultations correctly', async () => {
            mockPrismaService.user.findUnique.mockResolvedValueOnce(mockDetailUser);

            const result = await service.getPatientDetail('user-1');

            expect(result!.consultations).toHaveLength(1);
            expect(result!.consultations[0]).toEqual({
                id: 'consult-1',
                vertical: 'HAIR_LOSS',
                status: ConsultationStatus.DOCTOR_REVIEWING,
                createdAt: new Date('2026-02-01'),
                doctorName: 'Dr. Singh',
            });
        });

        it('should map lab orders correctly', async () => {
            mockPrismaService.user.findUnique.mockResolvedValueOnce(mockDetailUser);

            const result = await service.getPatientDetail('user-1');

            expect(result!.labOrders).toHaveLength(1);
            expect(result!.labOrders[0]).toEqual({
                id: 'lab-1',
                status: LabOrderStatus.ORDERED,
                bookedDate: null,
                panelName: 'Hair Loss Panel',
                createdAt: new Date('2026-02-05'),
            });
        });

        it('should map orders correctly with totalAmountPaise', async () => {
            mockPrismaService.user.findUnique.mockResolvedValueOnce(mockDetailUser);

            const result = await service.getPatientDetail('user-1');

            expect(result!.orders).toHaveLength(1);
            expect(result!.orders[0]).toEqual({
                id: 'order-1',
                status: OrderStatus.SENT_TO_PHARMACY,
                totalAmountPaise: 150000,
                createdAt: new Date('2026-02-10'),
            });
        });

        it('should return empty notes array', async () => {
            mockPrismaService.user.findUnique.mockResolvedValueOnce(mockDetailUser);

            const result = await service.getPatientDetail('user-1');
            expect(result!.notes).toEqual([]);
        });

        it('should handle patient without profile', async () => {
            const userNoProfile = {
                ...mockDetailUser,
                name: null,
                email: null,
                patientProfile: null,
                consultations: [],
                labOrders: [],
                orders: [],
            };
            mockPrismaService.user.findUnique.mockResolvedValueOnce(userNoProfile);

            const result = await service.getPatientDetail('user-1');

            expect(result!.name).toBeNull();
            expect(result!.dateOfBirth).toBeNull();
            expect(result!.gender).toBeNull();
            expect(result!.address).toBeNull();
            expect(result!.city).toBeNull();
            expect(result!.state).toBeNull();
            expect(result!.pincode).toBeNull();
            expect(result!.consultations).toEqual([]);
            expect(result!.labOrders).toEqual([]);
            expect(result!.orders).toEqual([]);
        });

        it('should handle consultation without doctor', async () => {
            const userWithNoDoctor = {
                ...mockDetailUser,
                consultations: [
                    {
                        id: 'consult-2',
                        vertical: 'HAIR_LOSS',
                        status: ConsultationStatus.PENDING_ASSESSMENT,
                        createdAt: new Date('2026-02-01'),
                        doctor: null,
                    },
                ],
            };
            mockPrismaService.user.findUnique.mockResolvedValueOnce(userWithNoDoctor);

            const result = await service.getPatientDetail('user-1');
            expect(result!.consultations[0].doctorName).toBeNull();
        });

        it('should query with correct include relations', async () => {
            mockPrismaService.user.findUnique.mockResolvedValueOnce(null);

            await service.getPatientDetail('user-1');

            const callArgs = mockPrismaService.user.findUnique.mock.calls[0][0];
            expect(callArgs.where).toEqual({ id: 'user-1' });
            expect(callArgs.include.patientProfile).toBe(true);
            expect(callArgs.include.consultations).toBeDefined();
            expect(callArgs.include.labOrders).toBeDefined();
            expect(callArgs.include.orders).toBeDefined();
        });
    });

    // =============================================
    // 9. assignPhlebotomist
    // =============================================

    describe('assignPhlebotomist', () => {
        it('should assign phlebotomist to SLOT_BOOKED lab order', async () => {
            mockPrismaService.labOrder.findUnique.mockResolvedValueOnce({
                id: 'lab-1',
                status: LabOrderStatus.SLOT_BOOKED,
            });
            mockPrismaService.phlebotomist.findUnique.mockResolvedValueOnce({
                id: 'phleb-1',
                isActive: true,
            });
            mockPrismaService.labOrder.update.mockResolvedValueOnce({});

            const result = await service.assignPhlebotomist('lab-1', 'phleb-1');
            expect(result.success).toBe(true);
            expect(result.message).toBe('Phlebotomist assigned successfully');
        });

        it('should fail if lab order not found', async () => {
            mockPrismaService.labOrder.findUnique.mockResolvedValueOnce(null);

            const result = await service.assignPhlebotomist('nonexistent', 'phleb-1');
            expect(result.success).toBe(false);
            expect(result.message).toBe('Lab order not found');
        });

        it('should fail if lab order is not SLOT_BOOKED', async () => {
            mockPrismaService.labOrder.findUnique.mockResolvedValueOnce({
                id: 'lab-1',
                status: LabOrderStatus.ORDERED,
            });

            const result = await service.assignPhlebotomist('lab-1', 'phleb-1');
            expect(result.success).toBe(false);
            expect(result.message).toContain('Cannot assign phlebotomist in status');
        });

        it('should fail if phlebotomist not found', async () => {
            mockPrismaService.labOrder.findUnique.mockResolvedValueOnce({
                id: 'lab-1',
                status: LabOrderStatus.SLOT_BOOKED,
            });
            mockPrismaService.phlebotomist.findUnique.mockResolvedValueOnce(null);

            const result = await service.assignPhlebotomist('lab-1', 'nonexistent');
            expect(result.success).toBe(false);
            expect(result.message).toBe('Phlebotomist not found');
        });

        it('should fail if phlebotomist is inactive', async () => {
            mockPrismaService.labOrder.findUnique.mockResolvedValueOnce({
                id: 'lab-1',
                status: LabOrderStatus.SLOT_BOOKED,
            });
            mockPrismaService.phlebotomist.findUnique.mockResolvedValueOnce({
                id: 'phleb-1',
                isActive: false,
            });

            const result = await service.assignPhlebotomist('lab-1', 'phleb-1');
            expect(result.success).toBe(false);
            expect(result.message).toBe('Phlebotomist is not active');
        });

        it('should update lab order status to PHLEBOTOMIST_ASSIGNED', async () => {
            mockPrismaService.labOrder.findUnique.mockResolvedValueOnce({
                id: 'lab-1',
                status: LabOrderStatus.SLOT_BOOKED,
            });
            mockPrismaService.phlebotomist.findUnique.mockResolvedValueOnce({
                id: 'phleb-1',
                isActive: true,
            });
            mockPrismaService.labOrder.update.mockResolvedValueOnce({});

            await service.assignPhlebotomist('lab-1', 'phleb-1');

            const updateArgs = mockPrismaService.labOrder.update.mock.calls[0][0];
            expect(updateArgs.data.status).toBe(LabOrderStatus.PHLEBOTOMIST_ASSIGNED);
            expect(updateArgs.data.phlebotomistId).toBe('phleb-1');
            expect(updateArgs.data.phlebotomistAssignedAt).toBeInstanceOf(Date);
        });
    });

    // =============================================
    // 10. sendToPharmacy
    // =============================================

    describe('sendToPharmacy', () => {
        it('should send order to pharmacy successfully', async () => {
            mockPrismaService.order.findUnique.mockResolvedValueOnce({
                id: 'order-1',
                status: OrderStatus.PRESCRIPTION_CREATED,
            });
            mockPrismaService.partnerPharmacy.findUnique.mockResolvedValueOnce({
                id: 'pharmacy-1',
                name: 'HealthPlus',
                address: '456 MG Road',
                isActive: true,
            });
            mockPrismaService.order.update.mockResolvedValueOnce({});

            const result = await service.sendToPharmacy('order-1', 'pharmacy-1');
            expect(result.success).toBe(true);
            expect(result.message).toBe('Order sent to pharmacy');
        });

        it('should fail if order not found', async () => {
            mockPrismaService.order.findUnique.mockResolvedValueOnce(null);

            const result = await service.sendToPharmacy('nonexistent', 'pharmacy-1');
            expect(result.success).toBe(false);
        });

        it('should fail if order is not PRESCRIPTION_CREATED', async () => {
            mockPrismaService.order.findUnique.mockResolvedValueOnce({
                id: 'order-1',
                status: OrderStatus.OUT_FOR_DELIVERY,
            });

            const result = await service.sendToPharmacy('order-1', 'pharmacy-1');
            expect(result.success).toBe(false);
            expect(result.message).toContain('Cannot send to pharmacy in status');
        });

        it('should fail if pharmacy is inactive', async () => {
            mockPrismaService.order.findUnique.mockResolvedValueOnce({
                id: 'order-1',
                status: OrderStatus.PRESCRIPTION_CREATED,
            });
            mockPrismaService.partnerPharmacy.findUnique.mockResolvedValueOnce({
                id: 'pharmacy-1',
                isActive: false,
            });

            const result = await service.sendToPharmacy('order-1', 'pharmacy-1');
            expect(result.success).toBe(false);
            expect(result.message).toBe('Pharmacy is not active');
        });
    });

    // =============================================
    // 11. arrangeDelivery
    // =============================================

    describe('arrangeDelivery', () => {
        it('should arrange delivery and generate OTP', async () => {
            mockPrismaService.order.findUnique.mockResolvedValueOnce({
                id: 'order-1',
                status: OrderStatus.PHARMACY_READY,
            });
            mockPrismaService.order.update.mockResolvedValueOnce({});

            const result = await service.arrangeDelivery({
                orderId: 'order-1',
                deliveryPersonName: 'Ravi',
                deliveryPersonPhone: '+919876543214',
                deliveryMethod: 'BIKE',
            });

            expect(result.success).toBe(true);
            expect(result.otp).toBeDefined();
            expect(result.otp).toMatch(/^\d{4}$/); // 4-digit OTP
        });

        it('should fail if order is not PHARMACY_READY', async () => {
            mockPrismaService.order.findUnique.mockResolvedValueOnce({
                id: 'order-1',
                status: OrderStatus.SENT_TO_PHARMACY,
            });

            const result = await service.arrangeDelivery({
                orderId: 'order-1',
                deliveryPersonName: 'Ravi',
                deliveryPersonPhone: '+919876543214',
                deliveryMethod: 'BIKE',
            });

            expect(result.success).toBe(false);
            expect(result.message).toContain('Cannot arrange delivery in status');
        });
    });

    // =============================================
    // 12. overrideLabOrderStatus
    // =============================================

    describe('overrideLabOrderStatus', () => {
        it('should override status and set escalation fields', async () => {
            mockPrismaService.labOrder.findUnique.mockResolvedValueOnce({
                id: 'lab-1',
                status: LabOrderStatus.ORDERED,
            });
            mockPrismaService.labOrder.update.mockResolvedValueOnce({});

            const result = await service.overrideLabOrderStatus(
                'lab-1',
                LabOrderStatus.CANCELLED,
                'Patient request',
            );

            expect(result.success).toBe(true);
            expect(result.message).toContain('CANCELLED');

            const updateArgs = mockPrismaService.labOrder.update.mock.calls[0][0];
            expect(updateArgs.data.status).toBe(LabOrderStatus.CANCELLED);
            expect(updateArgs.data.slaEscalatedBy).toBe('ADMIN');
            expect(updateArgs.data.slaEscalationReason).toBe('Patient request');
            expect(updateArgs.data.cancelledAt).toBeInstanceOf(Date);
            expect(updateArgs.data.cancellationReason).toBe('Patient request');
        });

        it('should fail if lab order not found', async () => {
            mockPrismaService.labOrder.findUnique.mockResolvedValueOnce(null);

            const result = await service.overrideLabOrderStatus(
                'nonexistent',
                LabOrderStatus.CANCELLED,
                'reason',
            );
            expect(result.success).toBe(false);
        });

        it('should set correct timestamp for SAMPLE_COLLECTED override', async () => {
            mockPrismaService.labOrder.findUnique.mockResolvedValueOnce({
                id: 'lab-1',
                status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
            });
            mockPrismaService.labOrder.update.mockResolvedValueOnce({});

            await service.overrideLabOrderStatus(
                'lab-1',
                LabOrderStatus.SAMPLE_COLLECTED,
                'Admin override',
            );

            const updateArgs = mockPrismaService.labOrder.update.mock.calls[0][0];
            expect(updateArgs.data.sampleCollectedAt).toBeInstanceOf(Date);
        });
    });

    // =============================================
    // 13. getSLAEscalations
    // =============================================

    describe('getSLAEscalations', () => {
        it('should return escalations sorted by severity (breached first)', async () => {
            const breachedOrder = {
                id: 'lab-breached',
                status: LabOrderStatus.ORDERED,
                orderedAt: daysAgo(16),
                slotBookedAt: null,
                deliveredToLabAt: null,
                sampleReceivedAt: null,
                resultsUploadedAt: null,
                patient: { name: 'Patient A', phone: '+91111' },
                consultation: { vertical: 'HAIR_LOSS' },
                phlebotomist: null,
                diagnosticCentre: null,
            };

            const approachingOrder = {
                id: 'lab-approaching',
                status: LabOrderStatus.ORDERED,
                orderedAt: daysAgo(10),
                slotBookedAt: null,
                deliveredToLabAt: null,
                sampleReceivedAt: null,
                resultsUploadedAt: null,
                patient: { name: 'Patient B', phone: '+91222' },
                consultation: { vertical: 'HAIR_LOSS' },
                phlebotomist: null,
                diagnosticCentre: null,
            };

            const onTimeOrder = {
                id: 'lab-ontime',
                status: LabOrderStatus.ORDERED,
                orderedAt: daysAgo(1),
                slotBookedAt: null,
                deliveredToLabAt: null,
                sampleReceivedAt: null,
                resultsUploadedAt: null,
                patient: { name: 'Patient C', phone: '+91333' },
                consultation: { vertical: 'HAIR_LOSS' },
                phlebotomist: null,
                diagnosticCentre: null,
            };

            mockPrismaService.labOrder.findMany.mockResolvedValueOnce([
                approachingOrder,
                breachedOrder,
                onTimeOrder,
            ]);

            const result = await service.getSLAEscalations();

            // ON_TIME should be excluded, only BREACHED and APPROACHING returned
            expect(result).toHaveLength(2);
            expect(result[0].slaInfo.status).toBe('BREACHED');
            expect(result[1].slaInfo.status).toBe('APPROACHING');
        });

        it('should map responsible party based on status', async () => {
            const slotBookedOrder = {
                id: 'lab-slot',
                status: LabOrderStatus.SLOT_BOOKED,
                orderedAt: daysAgo(5),
                slotBookedAt: hoursAgo(3),
                deliveredToLabAt: null,
                sampleReceivedAt: null,
                resultsUploadedAt: null,
                patient: { name: 'Patient A', phone: '+91111' },
                consultation: { vertical: 'HAIR_LOSS' },
                phlebotomist: null,
                diagnosticCentre: null,
            };

            mockPrismaService.labOrder.findMany.mockResolvedValueOnce([slotBookedOrder]);

            const result = await service.getSLAEscalations();

            expect(result[0].responsibleParty).toBe('Coordinator');
        });

        it('should return empty array when no escalations exist', async () => {
            mockPrismaService.labOrder.findMany.mockResolvedValueOnce([]);

            const result = await service.getSLAEscalations();
            expect(result).toEqual([]);
        });
    });

    // =============================================
    // 14. Partner management methods
    // =============================================

    describe('toggleDiagnosticCentreActive', () => {
        it('should toggle active status', async () => {
            mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValueOnce({
                id: 'lab-1',
                isActive: true,
            });
            mockPrismaService.partnerDiagnosticCentre.update.mockResolvedValueOnce({});

            const result = await service.toggleDiagnosticCentreActive('lab-1');
            expect(result.success).toBe(true);
            expect(result.message).toContain('deactivated');
        });

        it('should fail if centre not found', async () => {
            mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValueOnce(null);

            const result = await service.toggleDiagnosticCentreActive('nonexistent');
            expect(result.success).toBe(false);
        });

        it('should use explicit isActive parameter when provided', async () => {
            mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValueOnce({
                id: 'lab-1',
                isActive: false,
            });
            mockPrismaService.partnerDiagnosticCentre.update.mockResolvedValueOnce({});

            const result = await service.toggleDiagnosticCentreActive('lab-1', true);
            expect(result.success).toBe(true);
            expect(result.message).toContain('activated');

            const updateArgs = mockPrismaService.partnerDiagnosticCentre.update.mock.calls[0][0];
            expect(updateArgs.data.isActive).toBe(true);
        });
    });

    describe('togglePhlebotomistActive', () => {
        it('should toggle phlebotomist active status', async () => {
            mockPrismaService.phlebotomist.findUnique.mockResolvedValueOnce({
                id: 'phleb-1',
                isActive: true,
            });
            mockPrismaService.phlebotomist.update.mockResolvedValueOnce({});

            const result = await service.togglePhlebotomistActive('phleb-1');
            expect(result.success).toBe(true);
            expect(result.message).toContain('deactivated');
        });

        it('should fail if phlebotomist not found', async () => {
            mockPrismaService.phlebotomist.findUnique.mockResolvedValueOnce(null);

            const result = await service.togglePhlebotomistActive('nonexistent');
            expect(result.success).toBe(false);
        });
    });

    describe('togglePharmacyActive', () => {
        it('should toggle pharmacy active status', async () => {
            mockPrismaService.partnerPharmacy.findUnique.mockResolvedValueOnce({
                id: 'pharm-1',
                isActive: false,
            });
            mockPrismaService.partnerPharmacy.update.mockResolvedValueOnce({});

            const result = await service.togglePharmacyActive('pharm-1');
            expect(result.success).toBe(true);
            expect(result.message).toContain('activated');
        });

        it('should fail if pharmacy not found', async () => {
            mockPrismaService.partnerPharmacy.findUnique.mockResolvedValueOnce(null);

            const result = await service.togglePharmacyActive('nonexistent');
            expect(result.success).toBe(false);
        });
    });

    // =============================================
    // 15. markOutForDelivery
    // =============================================

    describe('markOutForDelivery', () => {
        it('should mark order as out for delivery', async () => {
            mockPrismaService.order.findUnique.mockResolvedValueOnce({
                id: 'order-1',
                status: OrderStatus.PICKUP_ARRANGED,
            });
            mockPrismaService.order.update.mockResolvedValueOnce({});

            const result = await service.markOutForDelivery('order-1');
            expect(result.success).toBe(true);
        });

        it('should fail if order is not PICKUP_ARRANGED', async () => {
            mockPrismaService.order.findUnique.mockResolvedValueOnce({
                id: 'order-1',
                status: OrderStatus.DELIVERED,
            });

            const result = await service.markOutForDelivery('order-1');
            expect(result.success).toBe(false);
        });

        it('should fail if order not found', async () => {
            mockPrismaService.order.findUnique.mockResolvedValueOnce(null);

            const result = await service.markOutForDelivery('nonexistent');
            expect(result.success).toBe(false);
        });
    });

    // =============================================
    // 16. regenerateDeliveryOtp
    // =============================================

    describe('regenerateDeliveryOtp', () => {
        it('should regenerate OTP for OUT_FOR_DELIVERY order', async () => {
            mockPrismaService.order.findUnique.mockResolvedValueOnce({
                id: 'order-1',
                status: OrderStatus.OUT_FOR_DELIVERY,
            });
            mockPrismaService.order.update.mockResolvedValueOnce({});

            const result = await service.regenerateDeliveryOtp('order-1');
            expect(result.success).toBe(true);
            expect(result.otp).toMatch(/^\d{4}$/);
        });

        it('should regenerate OTP for PICKUP_ARRANGED order', async () => {
            mockPrismaService.order.findUnique.mockResolvedValueOnce({
                id: 'order-1',
                status: OrderStatus.PICKUP_ARRANGED,
            });
            mockPrismaService.order.update.mockResolvedValueOnce({});

            const result = await service.regenerateDeliveryOtp('order-1');
            expect(result.success).toBe(true);
        });

        it('should fail for orders not in delivery', async () => {
            mockPrismaService.order.findUnique.mockResolvedValueOnce({
                id: 'order-1',
                status: OrderStatus.DELIVERED,
            });

            const result = await service.regenerateDeliveryOtp('order-1');
            expect(result.success).toBe(false);
            expect(result.message).toContain('Can only regenerate OTP');
        });
    });
});
