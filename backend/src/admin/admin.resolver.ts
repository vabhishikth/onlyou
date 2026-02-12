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
}
