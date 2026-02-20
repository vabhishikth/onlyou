import { Test, TestingModule } from '@nestjs/testing';
import {
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { CollectPortalService } from './collect-portal.service';
import { PrismaService } from '../prisma/prisma.service';
import { LabOrderStatus } from '../lab-order/lab-order.service';

// Spec: master spec Section 7.2 — Collection Portal

describe('CollectPortalService', () => {
    let service: CollectPortalService;
    let mockPrismaService: any;

    const mockPhlebotomist = {
        id: 'phlebotomist-1',
        name: 'Rajesh Kumar',
        phone: '+919876543210',
        currentCity: 'Mumbai',
        isActive: true,
        completedCollections: 10,
        failedCollections: 2,
    };

    const mockPatient = {
        name: 'Priya Sharma',
        phone: '+911234567890',
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const mockLabOrder = {
        id: 'lab-order-1',
        patientId: 'patient-1',
        phlebotomistId: 'phlebotomist-1',
        status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
        bookedDate: new Date(),
        bookedTimeSlot: '8:00-10:00',
        collectionAddress: '42 MG Road, Andheri West',
        collectionCity: 'Mumbai',
        panelName: 'Hair Loss Basic Panel',
        testPanel: ['TSH', 'CBC', 'Ferritin'],
        tubeCount: null,
        sampleCollectedAt: null,
        estimatedArrivalTime: null,
        patient: mockPatient,
    };

    beforeEach(async () => {
        mockPrismaService = {
            phlebotomist: {
                findUnique: jest.fn(),
                update: jest.fn(),
            },
            labOrder: {
                findMany: jest.fn(),
                findUnique: jest.fn(),
                update: jest.fn(),
            },
            partnerDiagnosticCentre: {
                findUnique: jest.fn(),
                findMany: jest.fn(),
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CollectPortalService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<CollectPortalService>(CollectPortalService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ---------------------------------------------------------------
    // getPhlebotomistInfo
    // ---------------------------------------------------------------
    describe('getPhlebotomistInfo', () => {
        it('should return phlebotomist info for a valid id', async () => {
            mockPrismaService.phlebotomist.findUnique.mockResolvedValue(mockPhlebotomist);

            const result = await service.getPhlebotomistInfo('phlebotomist-1');

            expect(result).toEqual({
                id: 'phlebotomist-1',
                name: 'Rajesh Kumar',
                phone: '+919876543210',
                currentCity: 'Mumbai',
                isActive: true,
            });
            expect(mockPrismaService.phlebotomist.findUnique).toHaveBeenCalledWith({
                where: { id: 'phlebotomist-1' },
            });
        });

        it('should throw NotFoundException when phlebotomist does not exist', async () => {
            mockPrismaService.phlebotomist.findUnique.mockResolvedValue(null);

            await expect(
                service.getPhlebotomistInfo('nonexistent-id'),
            ).rejects.toThrow(NotFoundException);

            await expect(
                service.getPhlebotomistInfo('nonexistent-id'),
            ).rejects.toThrow('Phlebotomist not found');
        });

        it('should not expose completedCollections or failedCollections fields', async () => {
            mockPrismaService.phlebotomist.findUnique.mockResolvedValue(mockPhlebotomist);

            const result = await service.getPhlebotomistInfo('phlebotomist-1');

            expect(result).not.toHaveProperty('completedCollections');
            expect(result).not.toHaveProperty('failedCollections');
        });
    });

    // ---------------------------------------------------------------
    // getTodaySummary
    // ---------------------------------------------------------------
    describe('getTodaySummary', () => {
        it('should return correct summary with all zeroes when no assignments', async () => {
            mockPrismaService.labOrder.findMany.mockResolvedValue([]);

            const result = await service.getTodaySummary('phlebotomist-1');

            expect(result).toEqual({
                total: 0,
                completed: 0,
                pending: 0,
                failed: 0,
            });
        });

        it('should count completed assignments across all completed statuses', async () => {
            const assignments = [
                { status: LabOrderStatus.SAMPLE_COLLECTED },
                { status: LabOrderStatus.DELIVERED_TO_LAB },
                { status: LabOrderStatus.SAMPLE_RECEIVED },
                { status: LabOrderStatus.PROCESSING },
                { status: LabOrderStatus.RESULTS_READY },
            ];
            mockPrismaService.labOrder.findMany.mockResolvedValue(assignments);

            const result = await service.getTodaySummary('phlebotomist-1');

            expect(result).toEqual({
                total: 5,
                completed: 5,
                pending: 0,
                failed: 0,
            });
        });

        it('should count COLLECTION_FAILED as failed', async () => {
            const assignments = [
                { status: LabOrderStatus.COLLECTION_FAILED },
                { status: LabOrderStatus.COLLECTION_FAILED },
            ];
            mockPrismaService.labOrder.findMany.mockResolvedValue(assignments);

            const result = await service.getTodaySummary('phlebotomist-1');

            expect(result).toEqual({
                total: 2,
                completed: 0,
                pending: 0,
                failed: 2,
            });
        });

        it('should count PHLEBOTOMIST_ASSIGNED as pending', async () => {
            const assignments = [
                { status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED },
                { status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED },
            ];
            mockPrismaService.labOrder.findMany.mockResolvedValue(assignments);

            const result = await service.getTodaySummary('phlebotomist-1');

            expect(result).toEqual({
                total: 2,
                completed: 0,
                pending: 2,
                failed: 0,
            });
        });

        it('should return correct mixed summary', async () => {
            const assignments = [
                { status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED },
                { status: LabOrderStatus.SAMPLE_COLLECTED },
                { status: LabOrderStatus.COLLECTION_FAILED },
                { status: LabOrderStatus.DELIVERED_TO_LAB },
                { status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED },
            ];
            mockPrismaService.labOrder.findMany.mockResolvedValue(assignments);

            const result = await service.getTodaySummary('phlebotomist-1');

            expect(result).toEqual({
                total: 5,
                completed: 2,
                pending: 2,
                failed: 1,
            });
        });

        it('should filter by today\'s bookedDate range', async () => {
            mockPrismaService.labOrder.findMany.mockResolvedValue([]);

            await service.getTodaySummary('phlebotomist-1');

            const callArgs = mockPrismaService.labOrder.findMany.mock.calls[0][0];
            expect(callArgs.where.phlebotomistId).toBe('phlebotomist-1');
            expect(callArgs.where.bookedDate).toBeDefined();
            expect(callArgs.where.bookedDate.gte).toBeInstanceOf(Date);
            expect(callArgs.where.bookedDate.lt).toBeInstanceOf(Date);

            // lt should be exactly one day after gte
            const gte = callArgs.where.bookedDate.gte as Date;
            const lt = callArgs.where.bookedDate.lt as Date;
            expect(lt.getTime() - gte.getTime()).toBe(24 * 60 * 60 * 1000);
        });
    });

    // ---------------------------------------------------------------
    // getTodayAssignments
    // ---------------------------------------------------------------
    describe('getTodayAssignments', () => {
        it('should return empty array when no assignments for today', async () => {
            mockPrismaService.labOrder.findMany.mockResolvedValue([]);

            const result = await service.getTodayAssignments('phlebotomist-1');

            expect(result).toEqual([]);
        });

        it('should return mapped assignments with patient data', async () => {
            mockPrismaService.labOrder.findMany.mockResolvedValue([mockLabOrder]);

            const result = await service.getTodayAssignments('phlebotomist-1');

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(
                expect.objectContaining({
                    id: 'lab-order-1',
                    patientFirstName: 'Priya',
                    patientPhone: '+911234567890',
                    patientArea: 'Mumbai',
                    fullAddress: '42 MG Road, Andheri West',
                    panelName: 'Hair Loss Basic Panel',
                    status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
                }),
            );
        });

        it('should only include first name of patient', async () => {
            mockPrismaService.labOrder.findMany.mockResolvedValue([mockLabOrder]);

            const result = await service.getTodayAssignments('phlebotomist-1');

            expect(result[0].patientFirstName).toBe('Priya');
        });

        it('should format time window from bookedTimeSlot', async () => {
            mockPrismaService.labOrder.findMany.mockResolvedValue([mockLabOrder]);

            const result = await service.getTodayAssignments('phlebotomist-1');

            expect(result[0].timeWindow).toBe('8:00 AM-10:00 AM');
        });

        it('should format PM time window correctly', async () => {
            const pmOrder = {
                ...mockLabOrder,
                bookedTimeSlot: '14:00-16:00',
            };
            mockPrismaService.labOrder.findMany.mockResolvedValue([pmOrder]);

            const result = await service.getTodayAssignments('phlebotomist-1');

            expect(result[0].timeWindow).toBe('2:00 PM-4:00 PM');
        });

        it('should handle missing bookedTimeSlot', async () => {
            const noSlotOrder = {
                ...mockLabOrder,
                bookedTimeSlot: null,
            };
            mockPrismaService.labOrder.findMany.mockResolvedValue([noSlotOrder]);

            const result = await service.getTodayAssignments('phlebotomist-1');

            expect(result[0].timeWindow).toBe('Scheduled');
        });

        it('should parse testPanel array correctly', async () => {
            mockPrismaService.labOrder.findMany.mockResolvedValue([mockLabOrder]);

            const result = await service.getTodayAssignments('phlebotomist-1');

            expect(result[0].testsOrdered).toEqual(['TSH', 'CBC', 'Ferritin']);
        });

        it('should parse testPanel object by extracting keys', async () => {
            const objectPanelOrder = {
                ...mockLabOrder,
                testPanel: { TSH: true, CBC: true },
            };
            mockPrismaService.labOrder.findMany.mockResolvedValue([objectPanelOrder]);

            const result = await service.getTodayAssignments('phlebotomist-1');

            expect(result[0].testsOrdered).toEqual(['TSH', 'CBC']);
        });

        it('should handle null testPanel', async () => {
            const nullPanelOrder = {
                ...mockLabOrder,
                testPanel: null,
            };
            mockPrismaService.labOrder.findMany.mockResolvedValue([nullPanelOrder]);

            const result = await service.getTodayAssignments('phlebotomist-1');

            expect(result[0].testsOrdered).toEqual([]);
        });

        it('should include patient info via prisma include', async () => {
            mockPrismaService.labOrder.findMany.mockResolvedValue([]);

            await service.getTodayAssignments('phlebotomist-1');

            const callArgs = mockPrismaService.labOrder.findMany.mock.calls[0][0];
            expect(callArgs.include).toBeDefined();
            expect(callArgs.include.patient).toBeDefined();
            expect(callArgs.include.patient.select).toEqual({
                name: true,
                phone: true,
            });
        });

        it('should handle patient with single name (no space)', async () => {
            const singleNameOrder = {
                ...mockLabOrder,
                patient: { name: 'Priya', phone: '+911234567890' },
            };
            mockPrismaService.labOrder.findMany.mockResolvedValue([singleNameOrder]);

            const result = await service.getTodayAssignments('phlebotomist-1');

            expect(result[0].patientFirstName).toBe('Priya');
        });

        it('should handle missing patient gracefully', async () => {
            const noPatientOrder = {
                ...mockLabOrder,
                patient: null,
            };
            mockPrismaService.labOrder.findMany.mockResolvedValue([noPatientOrder]);

            const result = await service.getTodayAssignments('phlebotomist-1');

            expect(result[0].patientFirstName).toBe('Unknown');
            expect(result[0].patientPhone).toBe('');
        });

        it('should show running late note when estimatedArrivalTime is set', async () => {
            const lateOrder = {
                ...mockLabOrder,
                estimatedArrivalTime: '9:30 AM',
            };
            mockPrismaService.labOrder.findMany.mockResolvedValue([lateOrder]);

            const result = await service.getTodayAssignments('phlebotomist-1');

            expect(result[0].notes).toBe('Running late. New ETA: 9:30 AM');
        });

        it('should have null notes when not running late', async () => {
            mockPrismaService.labOrder.findMany.mockResolvedValue([mockLabOrder]);

            const result = await service.getTodayAssignments('phlebotomist-1');

            expect(result[0].notes).toBeNull();
        });

        it('should default panelName to Standard Panel when not set', async () => {
            const noPanelOrder = {
                ...mockLabOrder,
                panelName: null,
            };
            mockPrismaService.labOrder.findMany.mockResolvedValue([noPanelOrder]);

            const result = await service.getTodayAssignments('phlebotomist-1');

            expect(result[0].panelName).toBe('Standard Panel');
        });
    });

    // ---------------------------------------------------------------
    // markCollected
    // ---------------------------------------------------------------
    describe('markCollected', () => {
        it('should transition PHLEBOTOMIST_ASSIGNED to SAMPLE_COLLECTED', async () => {
            const assignedOrder = { ...mockLabOrder, status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED };
            mockPrismaService.labOrder.findUnique.mockResolvedValue(assignedOrder);

            const updatedOrder = {
                ...assignedOrder,
                status: LabOrderStatus.SAMPLE_COLLECTED,
                tubeCount: 3,
                sampleCollectedAt: new Date(),
            };
            mockPrismaService.labOrder.update.mockResolvedValue(updatedOrder);
            mockPrismaService.phlebotomist.update.mockResolvedValue(mockPhlebotomist);

            const result = await service.markCollected('phlebotomist-1', 'lab-order-1', 3);

            expect(result.id).toBe('lab-order-1');
            expect(result.status).toBe(LabOrderStatus.SAMPLE_COLLECTED);

            // Verify labOrder.update was called with correct data
            expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'lab-order-1' },
                    data: expect.objectContaining({
                        status: LabOrderStatus.SAMPLE_COLLECTED,
                        tubeCount: 3,
                        sampleCollectedAt: expect.any(Date),
                    }),
                }),
            );
        });

        it('should increment phlebotomist completedCollections', async () => {
            const assignedOrder = { ...mockLabOrder, status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED };
            mockPrismaService.labOrder.findUnique.mockResolvedValue(assignedOrder);
            mockPrismaService.labOrder.update.mockResolvedValue({
                ...assignedOrder,
                status: LabOrderStatus.SAMPLE_COLLECTED,
                tubeCount: 2,
            });
            mockPrismaService.phlebotomist.update.mockResolvedValue(mockPhlebotomist);

            await service.markCollected('phlebotomist-1', 'lab-order-1', 2);

            expect(mockPrismaService.phlebotomist.update).toHaveBeenCalledWith({
                where: { id: 'phlebotomist-1' },
                data: { completedCollections: { increment: 1 } },
            });
        });

        it('should throw BadRequestException for tubeCount of 0', async () => {
            const assignedOrder = { ...mockLabOrder, status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED };
            mockPrismaService.labOrder.findUnique.mockResolvedValue(assignedOrder);

            await expect(
                service.markCollected('phlebotomist-1', 'lab-order-1', 0),
            ).rejects.toThrow(BadRequestException);

            await expect(
                service.markCollected('phlebotomist-1', 'lab-order-1', 0),
            ).rejects.toThrow('Tube count must be positive');
        });

        it('should throw BadRequestException for negative tubeCount', async () => {
            const assignedOrder = { ...mockLabOrder, status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED };
            mockPrismaService.labOrder.findUnique.mockResolvedValue(assignedOrder);

            await expect(
                service.markCollected('phlebotomist-1', 'lab-order-1', -1),
            ).rejects.toThrow(BadRequestException);

            await expect(
                service.markCollected('phlebotomist-1', 'lab-order-1', -5),
            ).rejects.toThrow('Tube count must be positive');
        });

        it('should throw BadRequestException when order is not in PHLEBOTOMIST_ASSIGNED status', async () => {
            const collectedOrder = {
                ...mockLabOrder,
                status: LabOrderStatus.SAMPLE_COLLECTED,
            };
            mockPrismaService.labOrder.findUnique.mockResolvedValue(collectedOrder);

            await expect(
                service.markCollected('phlebotomist-1', 'lab-order-1', 3),
            ).rejects.toThrow(BadRequestException);

            await expect(
                service.markCollected('phlebotomist-1', 'lab-order-1', 3),
            ).rejects.toThrow(/Cannot mark as collected/);
        });

        it('should throw BadRequestException for ORDERED status', async () => {
            const orderedOrder = {
                ...mockLabOrder,
                status: LabOrderStatus.ORDERED,
            };
            mockPrismaService.labOrder.findUnique.mockResolvedValue(orderedOrder);

            await expect(
                service.markCollected('phlebotomist-1', 'lab-order-1', 2),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException for COLLECTION_FAILED status', async () => {
            const failedOrder = {
                ...mockLabOrder,
                status: LabOrderStatus.COLLECTION_FAILED,
            };
            mockPrismaService.labOrder.findUnique.mockResolvedValue(failedOrder);

            await expect(
                service.markCollected('phlebotomist-1', 'lab-order-1', 2),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw NotFoundException when lab order does not exist', async () => {
            mockPrismaService.labOrder.findUnique.mockResolvedValue(null);

            await expect(
                service.markCollected('phlebotomist-1', 'nonexistent-order', 3),
            ).rejects.toThrow(NotFoundException);

            await expect(
                service.markCollected('phlebotomist-1', 'nonexistent-order', 3),
            ).rejects.toThrow('Lab order not found');
        });

        it('should throw ForbiddenException when phlebotomist is not assigned to the order', async () => {
            const otherOrder = {
                ...mockLabOrder,
                phlebotomistId: 'other-phlebotomist',
            };
            mockPrismaService.labOrder.findUnique.mockResolvedValue(otherOrder);

            await expect(
                service.markCollected('phlebotomist-1', 'lab-order-1', 3),
            ).rejects.toThrow(ForbiddenException);

            await expect(
                service.markCollected('phlebotomist-1', 'lab-order-1', 3),
            ).rejects.toThrow('You are not assigned to this collection');
        });
    });

    // ---------------------------------------------------------------
    // markPatientUnavailable
    // ---------------------------------------------------------------
    describe('markPatientUnavailable', () => {
        it('should transition PHLEBOTOMIST_ASSIGNED to COLLECTION_FAILED', async () => {
            const assignedOrder = { ...mockLabOrder, status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED };
            mockPrismaService.labOrder.findUnique.mockResolvedValue(assignedOrder);
            mockPrismaService.labOrder.update.mockResolvedValue({
                ...assignedOrder,
                status: LabOrderStatus.COLLECTION_FAILED,
            });
            mockPrismaService.phlebotomist.update.mockResolvedValue(mockPhlebotomist);

            const result = await service.markPatientUnavailable(
                'phlebotomist-1',
                'lab-order-1',
                'Patient not home',
            );

            expect(result).toEqual({
                success: true,
                message: 'Marked as unavailable. Coordinator will reschedule.',
            });

            expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith({
                where: { id: 'lab-order-1' },
                data: expect.objectContaining({
                    status: LabOrderStatus.COLLECTION_FAILED,
                    collectionFailedAt: expect.any(Date),
                    collectionFailedReason: 'Patient not home',
                }),
            });
        });

        it('should increment phlebotomist failedCollections', async () => {
            const assignedOrder = { ...mockLabOrder, status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED };
            mockPrismaService.labOrder.findUnique.mockResolvedValue(assignedOrder);
            mockPrismaService.labOrder.update.mockResolvedValue({
                ...assignedOrder,
                status: LabOrderStatus.COLLECTION_FAILED,
            });
            mockPrismaService.phlebotomist.update.mockResolvedValue(mockPhlebotomist);

            await service.markPatientUnavailable(
                'phlebotomist-1',
                'lab-order-1',
                'Door locked',
            );

            expect(mockPrismaService.phlebotomist.update).toHaveBeenCalledWith({
                where: { id: 'phlebotomist-1' },
                data: { failedCollections: { increment: 1 } },
            });
        });

        it('should throw BadRequestException for empty reason', async () => {
            const assignedOrder = { ...mockLabOrder, status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED };
            mockPrismaService.labOrder.findUnique.mockResolvedValue(assignedOrder);

            await expect(
                service.markPatientUnavailable('phlebotomist-1', 'lab-order-1', ''),
            ).rejects.toThrow(BadRequestException);

            await expect(
                service.markPatientUnavailable('phlebotomist-1', 'lab-order-1', ''),
            ).rejects.toThrow('Reason is required');
        });

        it('should throw BadRequestException for whitespace-only reason', async () => {
            const assignedOrder = { ...mockLabOrder, status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED };
            mockPrismaService.labOrder.findUnique.mockResolvedValue(assignedOrder);

            await expect(
                service.markPatientUnavailable('phlebotomist-1', 'lab-order-1', '   '),
            ).rejects.toThrow(BadRequestException);

            await expect(
                service.markPatientUnavailable('phlebotomist-1', 'lab-order-1', '   '),
            ).rejects.toThrow('Reason is required');
        });

        it('should throw BadRequestException when order is not in PHLEBOTOMIST_ASSIGNED status', async () => {
            const collectedOrder = {
                ...mockLabOrder,
                status: LabOrderStatus.SAMPLE_COLLECTED,
            };
            mockPrismaService.labOrder.findUnique.mockResolvedValue(collectedOrder);

            await expect(
                service.markPatientUnavailable('phlebotomist-1', 'lab-order-1', 'Patient not home'),
            ).rejects.toThrow(BadRequestException);

            await expect(
                service.markPatientUnavailable('phlebotomist-1', 'lab-order-1', 'Patient not home'),
            ).rejects.toThrow(/Cannot mark as unavailable/);
        });

        it('should throw BadRequestException for DELIVERED_TO_LAB status', async () => {
            const deliveredOrder = {
                ...mockLabOrder,
                status: LabOrderStatus.DELIVERED_TO_LAB,
            };
            mockPrismaService.labOrder.findUnique.mockResolvedValue(deliveredOrder);

            await expect(
                service.markPatientUnavailable('phlebotomist-1', 'lab-order-1', 'Late'),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw NotFoundException when lab order does not exist', async () => {
            mockPrismaService.labOrder.findUnique.mockResolvedValue(null);

            await expect(
                service.markPatientUnavailable('phlebotomist-1', 'nonexistent', 'reason'),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw ForbiddenException when phlebotomist is not assigned', async () => {
            const otherOrder = {
                ...mockLabOrder,
                phlebotomistId: 'other-phlebotomist',
            };
            mockPrismaService.labOrder.findUnique.mockResolvedValue(otherOrder);

            await expect(
                service.markPatientUnavailable('phlebotomist-1', 'lab-order-1', 'reason'),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    // ---------------------------------------------------------------
    // reportRunningLate
    // ---------------------------------------------------------------
    describe('reportRunningLate', () => {
        it('should update estimatedArrivalTime and runningLateAt', async () => {
            const assignedOrder = { ...mockLabOrder, status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED };
            mockPrismaService.labOrder.findUnique.mockResolvedValue(assignedOrder);
            mockPrismaService.labOrder.update.mockResolvedValue({
                ...assignedOrder,
                estimatedArrivalTime: '9:30 AM',
                runningLateAt: new Date(),
            });

            const result = await service.reportRunningLate(
                'phlebotomist-1',
                'lab-order-1',
                '9:30 AM',
            );

            expect(result).toEqual({
                success: true,
                message: 'Patient will be notified of the new ETA.',
            });

            expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith({
                where: { id: 'lab-order-1' },
                data: {
                    estimatedArrivalTime: '9:30 AM',
                    runningLateAt: expect.any(Date),
                },
            });
        });

        it('should throw BadRequestException when order is not in PHLEBOTOMIST_ASSIGNED status', async () => {
            const collectedOrder = {
                ...mockLabOrder,
                status: LabOrderStatus.SAMPLE_COLLECTED,
            };
            mockPrismaService.labOrder.findUnique.mockResolvedValue(collectedOrder);

            await expect(
                service.reportRunningLate('phlebotomist-1', 'lab-order-1', '10:00 AM'),
            ).rejects.toThrow(BadRequestException);

            await expect(
                service.reportRunningLate('phlebotomist-1', 'lab-order-1', '10:00 AM'),
            ).rejects.toThrow(/Cannot update ETA/);
        });

        it('should throw BadRequestException for COLLECTION_FAILED status', async () => {
            const failedOrder = {
                ...mockLabOrder,
                status: LabOrderStatus.COLLECTION_FAILED,
            };
            mockPrismaService.labOrder.findUnique.mockResolvedValue(failedOrder);

            await expect(
                service.reportRunningLate('phlebotomist-1', 'lab-order-1', '10:00 AM'),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw NotFoundException when lab order does not exist', async () => {
            mockPrismaService.labOrder.findUnique.mockResolvedValue(null);

            await expect(
                service.reportRunningLate('phlebotomist-1', 'nonexistent', '10:00 AM'),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw ForbiddenException when phlebotomist is not assigned', async () => {
            const otherOrder = {
                ...mockLabOrder,
                phlebotomistId: 'other-phlebotomist',
            };
            mockPrismaService.labOrder.findUnique.mockResolvedValue(otherOrder);

            await expect(
                service.reportRunningLate('phlebotomist-1', 'lab-order-1', '10:00 AM'),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    // ---------------------------------------------------------------
    // deliverToLab
    // ---------------------------------------------------------------
    describe('deliverToLab', () => {
        const mockLab = {
            id: 'lab-1',
            name: 'Metropolis Lab Mumbai',
            isActive: true,
            city: 'Mumbai',
            address: '100 Lab Road, Bandra',
            phone: '+912233445566',
        };

        it('should transition SAMPLE_COLLECTED to DELIVERED_TO_LAB', async () => {
            const collectedOrder = {
                ...mockLabOrder,
                status: LabOrderStatus.SAMPLE_COLLECTED,
            };
            mockPrismaService.labOrder.findUnique.mockResolvedValue(collectedOrder);
            mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValue(mockLab);

            const updatedOrder = {
                ...collectedOrder,
                status: LabOrderStatus.DELIVERED_TO_LAB,
                deliveredToLabAt: new Date(),
                diagnosticCentreId: 'lab-1',
            };
            mockPrismaService.labOrder.update.mockResolvedValue(updatedOrder);

            const result = await service.deliverToLab('phlebotomist-1', 'lab-order-1', 'lab-1');

            expect(result.id).toBe('lab-order-1');
            expect(result.status).toBe(LabOrderStatus.DELIVERED_TO_LAB);

            expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'lab-order-1' },
                    data: expect.objectContaining({
                        status: LabOrderStatus.DELIVERED_TO_LAB,
                        deliveredToLabAt: expect.any(Date),
                        diagnosticCentreId: 'lab-1',
                    }),
                }),
            );
        });

        it('should throw BadRequestException when order is not SAMPLE_COLLECTED', async () => {
            const assignedOrder = {
                ...mockLabOrder,
                status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
            };
            mockPrismaService.labOrder.findUnique.mockResolvedValue(assignedOrder);

            await expect(
                service.deliverToLab('phlebotomist-1', 'lab-order-1', 'lab-1'),
            ).rejects.toThrow(BadRequestException);

            await expect(
                service.deliverToLab('phlebotomist-1', 'lab-order-1', 'lab-1'),
            ).rejects.toThrow(/Cannot deliver to lab/);
        });

        it('should throw BadRequestException for DELIVERED_TO_LAB status (already delivered)', async () => {
            const deliveredOrder = {
                ...mockLabOrder,
                status: LabOrderStatus.DELIVERED_TO_LAB,
            };
            mockPrismaService.labOrder.findUnique.mockResolvedValue(deliveredOrder);

            await expect(
                service.deliverToLab('phlebotomist-1', 'lab-order-1', 'lab-1'),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw NotFoundException when lab does not exist', async () => {
            const collectedOrder = {
                ...mockLabOrder,
                status: LabOrderStatus.SAMPLE_COLLECTED,
            };
            mockPrismaService.labOrder.findUnique.mockResolvedValue(collectedOrder);
            mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValue(null);

            await expect(
                service.deliverToLab('phlebotomist-1', 'lab-order-1', 'nonexistent-lab'),
            ).rejects.toThrow(NotFoundException);

            await expect(
                service.deliverToLab('phlebotomist-1', 'lab-order-1', 'nonexistent-lab'),
            ).rejects.toThrow('Lab not found');
        });

        it('should throw BadRequestException when lab is not active', async () => {
            const collectedOrder = {
                ...mockLabOrder,
                status: LabOrderStatus.SAMPLE_COLLECTED,
            };
            mockPrismaService.labOrder.findUnique.mockResolvedValue(collectedOrder);

            const inactiveLab = { ...mockLab, isActive: false };
            mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValue(inactiveLab);

            await expect(
                service.deliverToLab('phlebotomist-1', 'lab-order-1', 'lab-1'),
            ).rejects.toThrow(BadRequestException);

            await expect(
                service.deliverToLab('phlebotomist-1', 'lab-order-1', 'lab-1'),
            ).rejects.toThrow('Lab is not active');
        });

        it('should throw NotFoundException when lab order does not exist', async () => {
            mockPrismaService.labOrder.findUnique.mockResolvedValue(null);

            await expect(
                service.deliverToLab('phlebotomist-1', 'nonexistent', 'lab-1'),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw ForbiddenException when phlebotomist is not assigned', async () => {
            const otherOrder = {
                ...mockLabOrder,
                phlebotomistId: 'other-phlebotomist',
                status: LabOrderStatus.SAMPLE_COLLECTED,
            };
            mockPrismaService.labOrder.findUnique.mockResolvedValue(otherOrder);

            await expect(
                service.deliverToLab('phlebotomist-1', 'lab-order-1', 'lab-1'),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    // ---------------------------------------------------------------
    // getNearbyLabs
    // ---------------------------------------------------------------
    describe('getNearbyLabs', () => {
        it('should return active labs in the same city as the phlebotomist', async () => {
            mockPrismaService.phlebotomist.findUnique.mockResolvedValue(mockPhlebotomist);

            const mockLabs = [
                { id: 'lab-1', name: 'Alpha Lab', address: '1 Alpha Rd', city: 'Mumbai', phone: '+911111111111' },
                { id: 'lab-2', name: 'Beta Lab', address: '2 Beta Rd', city: 'Mumbai', phone: '+912222222222' },
            ];
            mockPrismaService.partnerDiagnosticCentre.findMany.mockResolvedValue(mockLabs);

            const result = await service.getNearbyLabs('phlebotomist-1');

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('Alpha Lab');
            expect(result[1].name).toBe('Beta Lab');

            expect(mockPrismaService.partnerDiagnosticCentre.findMany).toHaveBeenCalledWith({
                where: {
                    isActive: true,
                    city: 'Mumbai',
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
        });

        it('should return empty array when no active labs in city', async () => {
            mockPrismaService.phlebotomist.findUnique.mockResolvedValue(mockPhlebotomist);
            mockPrismaService.partnerDiagnosticCentre.findMany.mockResolvedValue([]);

            const result = await service.getNearbyLabs('phlebotomist-1');

            expect(result).toEqual([]);
        });

        it('should throw NotFoundException when phlebotomist does not exist', async () => {
            mockPrismaService.phlebotomist.findUnique.mockResolvedValue(null);

            await expect(
                service.getNearbyLabs('nonexistent-id'),
            ).rejects.toThrow(NotFoundException);

            await expect(
                service.getNearbyLabs('nonexistent-id'),
            ).rejects.toThrow('Phlebotomist not found');
        });

        it('should filter by phlebotomist currentCity', async () => {
            const delhiPhlebotomist = { ...mockPhlebotomist, currentCity: 'Delhi' };
            mockPrismaService.phlebotomist.findUnique.mockResolvedValue(delhiPhlebotomist);
            mockPrismaService.partnerDiagnosticCentre.findMany.mockResolvedValue([]);

            await service.getNearbyLabs('phlebotomist-1');

            const callArgs = mockPrismaService.partnerDiagnosticCentre.findMany.mock.calls[0][0];
            expect(callArgs.where.city).toBe('Delhi');
        });

        it('should only return active labs (isActive: true)', async () => {
            mockPrismaService.phlebotomist.findUnique.mockResolvedValue(mockPhlebotomist);
            mockPrismaService.partnerDiagnosticCentre.findMany.mockResolvedValue([]);

            await service.getNearbyLabs('phlebotomist-1');

            const callArgs = mockPrismaService.partnerDiagnosticCentre.findMany.mock.calls[0][0];
            expect(callArgs.where.isActive).toBe(true);
        });

        it('should order labs by name ascending', async () => {
            mockPrismaService.phlebotomist.findUnique.mockResolvedValue(mockPhlebotomist);
            mockPrismaService.partnerDiagnosticCentre.findMany.mockResolvedValue([]);

            await service.getNearbyLabs('phlebotomist-1');

            const callArgs = mockPrismaService.partnerDiagnosticCentre.findMany.mock.calls[0][0];
            expect(callArgs.orderBy).toEqual({ name: 'asc' });
        });
    });

    // ---------------------------------------------------------------
    // Private helper: getLabOrder (tested indirectly)
    // ---------------------------------------------------------------
    describe('getLabOrder (permission check, tested via public methods)', () => {
        it('should throw NotFoundException for nonexistent order across all action methods', async () => {
            mockPrismaService.labOrder.findUnique.mockResolvedValue(null);

            // Each public method that uses getLabOrder should throw NotFoundException
            await expect(
                service.markCollected('phlebotomist-1', 'bad-id', 2),
            ).rejects.toThrow(NotFoundException);

            await expect(
                service.markPatientUnavailable('phlebotomist-1', 'bad-id', 'reason'),
            ).rejects.toThrow(NotFoundException);

            await expect(
                service.reportRunningLate('phlebotomist-1', 'bad-id', '10:00 AM'),
            ).rejects.toThrow(NotFoundException);

            await expect(
                service.deliverToLab('phlebotomist-1', 'bad-id', 'lab-1'),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw ForbiddenException for mismatched phlebotomist across all action methods', async () => {
            const otherOrder = {
                ...mockLabOrder,
                phlebotomistId: 'someone-else',
                status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
            };
            mockPrismaService.labOrder.findUnique.mockResolvedValue(otherOrder);

            await expect(
                service.markCollected('phlebotomist-1', 'lab-order-1', 2),
            ).rejects.toThrow(ForbiddenException);

            await expect(
                service.markPatientUnavailable('phlebotomist-1', 'lab-order-1', 'reason'),
            ).rejects.toThrow(ForbiddenException);

            await expect(
                service.reportRunningLate('phlebotomist-1', 'lab-order-1', '10:00 AM'),
            ).rejects.toThrow(ForbiddenException);

            await expect(
                service.deliverToLab('phlebotomist-1', 'lab-order-1', 'lab-1'),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    // ---------------------------------------------------------------
    // Edge cases: mapToAssignment (tested via getTodayAssignments)
    // ---------------------------------------------------------------
    describe('mapToAssignment edge cases', () => {
        it('should handle midnight time slot (0:00-6:00)', async () => {
            const midnightOrder = {
                ...mockLabOrder,
                bookedTimeSlot: '0:00-6:00',
            };
            mockPrismaService.labOrder.findMany.mockResolvedValue([midnightOrder]);

            const result = await service.getTodayAssignments('phlebotomist-1');

            expect(result[0].timeWindow).toBe('12:00 AM-6:00 AM');
        });

        it('should handle noon time slot (12:00-14:00)', async () => {
            const noonOrder = {
                ...mockLabOrder,
                bookedTimeSlot: '12:00-14:00',
            };
            mockPrismaService.labOrder.findMany.mockResolvedValue([noonOrder]);

            const result = await service.getTodayAssignments('phlebotomist-1');

            expect(result[0].timeWindow).toBe('12:00 PM-2:00 PM');
        });

        it('should handle missing collectionAddress', async () => {
            const noAddressOrder = {
                ...mockLabOrder,
                collectionAddress: null,
                collectionCity: null,
            };
            mockPrismaService.labOrder.findMany.mockResolvedValue([noAddressOrder]);

            const result = await service.getTodayAssignments('phlebotomist-1');

            expect(result[0].fullAddress).toBe('');
            expect(result[0].patientArea).toBe('Unknown area');
        });

        it('should handle bookedTimeSlot with no dash separator', async () => {
            const badSlotOrder = {
                ...mockLabOrder,
                bookedTimeSlot: '8:00',
            };
            mockPrismaService.labOrder.findMany.mockResolvedValue([badSlotOrder]);

            const result = await service.getTodayAssignments('phlebotomist-1');

            // When there's no dash, start exists but end is undefined
            // The code checks `if (start && end)` — end is falsy so it falls through
            expect(result[0].timeWindow).toBe('8:00');
        });
    });
});
