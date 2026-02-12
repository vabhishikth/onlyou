import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { AdminService, SLAStatus as ServiceSLAStatus } from './admin.service';
import { AdminDashboardStats, SLAEscalation, SLAStatus } from './dto/admin.dto';
import {
    AdminLabOrdersResponse,
    AdminLabOrdersFilterInput,
    AvailablePhlebotomistsResponse,
    AvailableLabsResponse,
    AssignPhlebotomistInput,
    AssignLabInput,
    BulkAssignPhlebotomistInput,
    OverrideLabOrderStatusInput,
    AdminLabOrderMutationResponse,
    BulkAssignmentResponse,
} from './dto/lab-orders.dto';
import {
    AdminDeliveriesResponse,
    AdminDeliveriesFilterInput,
    AvailablePharmaciesResponse,
    SendToPharmacyInput,
    ArrangeDeliveryInput,
    MarkPharmacyStatusInput,
    MarkDeliveryStatusInput,
    DeliveryMutationResponse,
    GenerateDeliveryOtpResponse,
} from './dto/deliveries.dto';

// Spec: master spec Section 15 — Admin dashboard (unified lab + delivery views)

@Resolver()
export class AdminResolver {
    constructor(private readonly adminService: AdminService) {}

    // =============================================
    // DASHBOARD STATS
    // =============================================

    /**
     * Get admin dashboard statistics
     * Spec: Section 7, Section 8 — Lab collections and deliveries overview
     */
    @Query(() => AdminDashboardStats)
    async adminDashboardStats(): Promise<AdminDashboardStats> {
        const stats = await this.adminService.getDashboardStats();

        return {
            labCollections: stats.labCollections,
            deliveries: stats.deliveries,
            openCases: stats.openCases,
            slaBreaches: stats.slaBreaches,
            activePatients: stats.activePatients,
            revenueThisMonthPaise: stats.revenueThisMonthPaise,
        };
    }

    /**
     * Get all SLA escalations
     * Spec: Section 7.4 — SLA Escalation thresholds
     */
    @Query(() => [SLAEscalation])
    async slaEscalations(): Promise<SLAEscalation[]> {
        const escalations = await this.adminService.getSLAEscalations();

        return escalations.map((e) => ({
            ...e,
            slaInfo: {
                ...e.slaInfo,
                status: e.slaInfo.status as SLAStatus,
            },
        }));
    }

    // =============================================
    // LAB ORDERS MANAGEMENT
    // Spec: master spec Section 7 — Blood Work & Diagnostics
    // =============================================

    /**
     * Get lab orders with filters
     */
    @Query(() => AdminLabOrdersResponse)
    async adminLabOrders(
        @Args('filter', { nullable: true }) filter?: AdminLabOrdersFilterInput,
    ): Promise<AdminLabOrdersResponse> {
        const result = await this.adminService.getAdminLabOrders({
            statuses: filter?.statuses || undefined,
            dateFrom: filter?.dateFrom || undefined,
            dateTo: filter?.dateTo || undefined,
            phlebotomistId: filter?.phlebotomistId || undefined,
            labId: filter?.labId || undefined,
            vertical: filter?.vertical || undefined,
            search: filter?.search || undefined,
            page: filter?.page || undefined,
            pageSize: filter?.pageSize || undefined,
        });

        return {
            labOrders: result.labOrders.map((order) => ({
                ...order,
                slaInfo: {
                    ...order.slaInfo,
                    status: order.slaInfo.status as ServiceSLAStatus,
                },
            })),
            total: result.total,
            page: result.page,
            pageSize: result.pageSize,
        };
    }

    /**
     * Get available phlebotomists for assignment
     * Filtered by patient's pincode + selected date
     */
    @Query(() => AvailablePhlebotomistsResponse)
    async availablePhlebotomists(
        @Args('pincode') pincode: string,
        @Args('date') date: Date,
    ): Promise<AvailablePhlebotomistsResponse> {
        const phlebotomists = await this.adminService.getAvailablePhlebotomists(pincode, date);
        return { phlebotomists };
    }

    /**
     * Get available labs for assignment
     */
    @Query(() => AvailableLabsResponse)
    async availableLabs(@Args('city') city: string): Promise<AvailableLabsResponse> {
        const labs = await this.adminService.getAvailableLabs(city);
        return { labs };
    }

    /**
     * Assign phlebotomist to a lab order
     * Spec: Section 7.2 Step 3 — Coordinator Assigns Phlebotomist
     */
    @Mutation(() => AdminLabOrderMutationResponse)
    async assignPhlebotomist(
        @Args('input') input: AssignPhlebotomistInput,
    ): Promise<AdminLabOrderMutationResponse> {
        const result = await this.adminService.assignPhlebotomist(
            input.labOrderId,
            input.phlebotomistId,
        );

        return {
            success: result.success,
            message: result.message,
        };
    }

    /**
     * Bulk assign phlebotomist to multiple lab orders
     */
    @Mutation(() => BulkAssignmentResponse)
    async bulkAssignPhlebotomist(
        @Args('input') input: BulkAssignPhlebotomistInput,
    ): Promise<BulkAssignmentResponse> {
        return this.adminService.bulkAssignPhlebotomist(
            input.labOrderIds,
            input.phlebotomistId,
        );
    }

    /**
     * Assign lab to a lab order
     */
    @Mutation(() => AdminLabOrderMutationResponse)
    async assignLab(@Args('input') input: AssignLabInput): Promise<AdminLabOrderMutationResponse> {
        const result = await this.adminService.assignLab(input.labOrderId, input.labId);

        return {
            success: result.success,
            message: result.message,
        };
    }

    /**
     * Override lab order status (admin only)
     */
    @Mutation(() => AdminLabOrderMutationResponse)
    async overrideLabOrderStatus(
        @Args('input') input: OverrideLabOrderStatusInput,
    ): Promise<AdminLabOrderMutationResponse> {
        const result = await this.adminService.overrideLabOrderStatus(
            input.labOrderId,
            input.newStatus,
            input.reason,
        );

        return {
            success: result.success,
            message: result.message,
        };
    }

    // =============================================
    // DELIVERY MANAGEMENT
    // Spec: master spec Section 8 — Medication Fulfillment & Local Delivery
    // =============================================

    /**
     * Get deliveries with filters
     */
    @Query(() => AdminDeliveriesResponse)
    async adminDeliveries(
        @Args('filter', { nullable: true }) filter?: AdminDeliveriesFilterInput,
    ): Promise<AdminDeliveriesResponse> {
        const result = await this.adminService.getAdminDeliveries({
            statuses: filter?.statuses || undefined,
            pharmacyId: filter?.pharmacyId || undefined,
            dateFrom: filter?.dateFrom || undefined,
            dateTo: filter?.dateTo || undefined,
            isReorder: filter?.isReorder,
            search: filter?.search || undefined,
            page: filter?.page || undefined,
            pageSize: filter?.pageSize || undefined,
        });

        return {
            deliveries: result.deliveries,
            total: result.total,
            page: result.page,
            pageSize: result.pageSize,
        };
    }

    /**
     * Get available pharmacies for assignment
     */
    @Query(() => AvailablePharmaciesResponse)
    async availablePharmacies(@Args('pincode') pincode: string): Promise<AvailablePharmaciesResponse> {
        const pharmacies = await this.adminService.getAvailablePharmacies(pincode);
        return { pharmacies };
    }

    /**
     * Send order to pharmacy
     * Spec: Section 8.2 Step 2 — Sent to Pharmacy
     */
    @Mutation(() => DeliveryMutationResponse)
    async sendToPharmacy(@Args('input') input: SendToPharmacyInput): Promise<DeliveryMutationResponse> {
        const result = await this.adminService.sendToPharmacy(input.orderId, input.pharmacyId);
        return {
            success: result.success,
            message: result.message,
        };
    }

    /**
     * Arrange delivery for an order
     * Spec: Section 8.2 Step 4 — Delivery Arranged
     */
    @Mutation(() => GenerateDeliveryOtpResponse)
    async arrangeDelivery(@Args('input') input: ArrangeDeliveryInput): Promise<GenerateDeliveryOtpResponse> {
        const result = await this.adminService.arrangeDelivery({
            orderId: input.orderId,
            deliveryPersonName: input.deliveryPersonName,
            deliveryPersonPhone: input.deliveryPersonPhone,
            deliveryMethod: input.deliveryMethod,
            estimatedDeliveryTime: input.estimatedDeliveryTime || undefined,
        });
        return {
            success: result.success,
            message: result.message,
            otp: result.otp,
        };
    }

    /**
     * Mark order as out for delivery
     */
    @Mutation(() => DeliveryMutationResponse)
    async markOutForDelivery(@Args('orderId') orderId: string): Promise<DeliveryMutationResponse> {
        const result = await this.adminService.markOutForDelivery(orderId);
        return {
            success: result.success,
            message: result.message,
        };
    }

    /**
     * Update pharmacy status
     */
    @Mutation(() => DeliveryMutationResponse)
    async updatePharmacyStatus(@Args('input') input: MarkPharmacyStatusInput): Promise<DeliveryMutationResponse> {
        const result = await this.adminService.updatePharmacyStatus(
            input.orderId,
            input.status,
            input.issueReason || undefined,
        );
        return {
            success: result.success,
            message: result.message,
        };
    }

    /**
     * Update delivery status
     */
    @Mutation(() => DeliveryMutationResponse)
    async updateDeliveryStatus(@Args('input') input: MarkDeliveryStatusInput): Promise<DeliveryMutationResponse> {
        const result = await this.adminService.updateDeliveryStatus(
            input.orderId,
            input.status,
            input.failedReason || undefined,
        );
        return {
            success: result.success,
            message: result.message,
        };
    }

    /**
     * Regenerate delivery OTP
     */
    @Mutation(() => GenerateDeliveryOtpResponse)
    async regenerateDeliveryOtp(@Args('orderId') orderId: string): Promise<GenerateDeliveryOtpResponse> {
        const result = await this.adminService.regenerateDeliveryOtp(orderId);
        return {
            success: result.success,
            message: result.message,
            otp: result.otp,
        };
    }
}
