import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { LabOrderService, LabOrderStatus } from './lab-order.service';
import { HealthVertical } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
    AvailablePanelsResponse,
    CreateLabOrderInput,
    CreateLabOrderResponse,
    LabOrderType,
    ReviewLabResultsInput,
    ReviewLabResultsResponse,
    TEST_PANELS_BY_VERTICAL,
} from './dto/lab-order.dto';

// Spec: master spec Section 7 (Blood Work & Diagnostics)

@Resolver()
export class LabOrderResolver {
    constructor(
        private readonly labOrderService: LabOrderService,
        private readonly prisma: PrismaService,
    ) {}

    /**
     * Get available test panels for a vertical
     */
    @Query(() => AvailablePanelsResponse)
    async availableTestPanels(
        @Args('vertical', { type: () => HealthVertical }) vertical: HealthVertical,
    ): Promise<AvailablePanelsResponse> {
        const panels = TEST_PANELS_BY_VERTICAL[vertical] || [];
        return {
            vertical,
            panels,
        };
    }

    /**
     * Get lab order by ID
     */
    @Query(() => LabOrderType, { nullable: true })
    async labOrder(
        @Args('id') id: string,
    ): Promise<LabOrderType | null> {
        const order = await this.prisma.labOrder.findUnique({
            where: { id },
            include: {
                patient: true,
            },
        });

        if (!order) return null;

        return this.mapToLabOrderType(order);
    }

    /**
     * Get lab orders for a consultation
     */
    @Query(() => [LabOrderType])
    async labOrdersByConsultation(
        @Args('consultationId') consultationId: string,
    ): Promise<LabOrderType[]> {
        const orders = await this.prisma.labOrder.findMany({
            where: { consultationId },
            include: {
                patient: true,
            },
            orderBy: { orderedAt: 'desc' },
        });

        return orders.map(this.mapToLabOrderType);
    }

    /**
     * Get lab orders pending doctor review
     */
    @Query(() => [LabOrderType])
    async labOrdersForReview(
        @Args('doctorId') doctorId: string,
    ): Promise<LabOrderType[]> {
        const orders = await this.prisma.labOrder.findMany({
            where: {
                doctorId,
                status: {
                    in: [LabOrderStatus.RESULTS_READY, LabOrderStatus.RESULTS_UPLOADED],
                },
            },
            include: {
                patient: true,
            },
            orderBy: { resultsUploadedAt: 'asc' },
        });

        return orders.map(this.mapToLabOrderType);
    }

    /**
     * Create a new lab order
     * Spec: Section 7.2 Step 1 — Doctor Orders Blood Work
     */
    @Mutation(() => CreateLabOrderResponse)
    async createLabOrder(
        @Args('input') input: CreateLabOrderInput,
        @Args('doctorId') doctorId: string,
    ): Promise<CreateLabOrderResponse> {
        try {
            const labOrder = await this.labOrderService.createLabOrder({
                consultationId: input.consultationId,
                doctorId,
                testPanel: input.testPanel,
                panelName: input.panelName,
                doctorNotes: input.doctorNotes,
            });

            // Get full order with patient info
            const fullOrder = await this.prisma.labOrder.findUnique({
                where: { id: labOrder.id },
                include: { patient: true },
            });

            return {
                success: true,
                message: 'Lab order created successfully',
                labOrder: fullOrder ? this.mapToLabOrderType(fullOrder) : undefined,
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to create lab order',
                labOrder: undefined,
            };
        }
    }

    /**
     * Review lab results and mark as reviewed
     * Spec: Section 7.2 Step 8 — Doctor Reviews Results
     */
    @Mutation(() => ReviewLabResultsResponse)
    async reviewLabResults(
        @Args('input') input: ReviewLabResultsInput,
        @Args('doctorId') doctorId: string,
    ): Promise<ReviewLabResultsResponse> {
        try {
            const labOrder = await this.prisma.labOrder.findUnique({
                where: { id: input.labOrderId },
            });

            if (!labOrder) {
                return {
                    success: false,
                    message: 'Lab order not found',
                    labOrder: undefined,
                };
            }

            if (labOrder.doctorId !== doctorId) {
                return {
                    success: false,
                    message: 'Not authorized to review this lab order',
                    labOrder: undefined,
                };
            }

            // Verify order is in reviewable state
            const reviewableStates = [LabOrderStatus.RESULTS_READY, LabOrderStatus.RESULTS_UPLOADED];
            if (!reviewableStates.includes(labOrder.status as LabOrderStatus)) {
                return {
                    success: false,
                    message: `Cannot review lab order in status: ${labOrder.status}`,
                    labOrder: undefined,
                };
            }

            // Transition to DOCTOR_REVIEWED
            const updated = await this.prisma.labOrder.update({
                where: { id: input.labOrderId },
                data: {
                    status: LabOrderStatus.DOCTOR_REVIEWED,
                    doctorReviewedAt: new Date(),
                    doctorReviewNotes: input.reviewNotes || null,
                },
                include: { patient: true },
            });

            return {
                success: true,
                message: 'Lab results reviewed successfully',
                labOrder: this.mapToLabOrderType(updated),
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to review lab results',
                labOrder: undefined,
            };
        }
    }

    /**
     * Close a lab order after review
     */
    @Mutation(() => ReviewLabResultsResponse)
    async closeLabOrder(
        @Args('labOrderId') labOrderId: string,
        @Args('doctorId') doctorId: string,
    ): Promise<ReviewLabResultsResponse> {
        try {
            const labOrder = await this.prisma.labOrder.findUnique({
                where: { id: labOrderId },
            });

            if (!labOrder) {
                return {
                    success: false,
                    message: 'Lab order not found',
                    labOrder: undefined,
                };
            }

            // Verify doctor authorization
            if (labOrder.doctorId !== doctorId) {
                return {
                    success: false,
                    message: 'Not authorized to close this lab order',
                    labOrder: undefined,
                };
            }

            if (labOrder.status !== LabOrderStatus.DOCTOR_REVIEWED) {
                return {
                    success: false,
                    message: 'Lab order must be reviewed before closing',
                    labOrder: undefined,
                };
            }

            const updated = await this.prisma.labOrder.update({
                where: { id: labOrderId },
                data: {
                    status: LabOrderStatus.CLOSED,
                    closedAt: new Date(),
                },
                include: { patient: true },
            });

            return {
                success: true,
                message: 'Lab order closed successfully',
                labOrder: this.mapToLabOrderType(updated),
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to close lab order',
                labOrder: undefined,
            };
        }
    }

    /**
     * Map Prisma lab order to GraphQL type
     */
    private mapToLabOrderType(order: any): LabOrderType {
        return {
            id: order.id,
            patientId: order.patientId,
            consultationId: order.consultationId,
            doctorId: order.doctorId,
            testPanel: order.testPanel as string[],
            panelName: order.panelName || undefined,
            doctorNotes: order.doctorNotes || undefined,
            status: order.status as LabOrderStatus,
            bookedDate: order.bookedDate || undefined,
            bookedTimeSlot: order.bookedTimeSlot || undefined,
            collectionAddress: order.collectionAddress,
            collectionCity: order.collectionCity,
            collectionPincode: order.collectionPincode,
            phlebotomistId: order.phlebotomistId || undefined,
            diagnosticCentreId: order.diagnosticCentreId || undefined,
            resultFileUrl: order.resultFileUrl || undefined,
            criticalValues: order.criticalValues || undefined,
            orderedAt: order.orderedAt,
            slotBookedAt: order.slotBookedAt || undefined,
            sampleCollectedAt: order.sampleCollectedAt || undefined,
            resultsUploadedAt: order.resultsUploadedAt || undefined,
            doctorReviewedAt: order.doctorReviewedAt || undefined,
            closedAt: order.closedAt || undefined,
            patientName: order.patient?.name || undefined,
            patientPhone: order.patient?.phone || undefined,
        };
    }
}
