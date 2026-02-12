import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PharmacyPortalService } from './pharmacy-portal.service';
import {
    PharmacyInfo,
    PharmacyTodaySummary,
    PharmacyOrderSummary,
    ReportStockIssueInput,
    PharmacyMutationResponse,
} from './dto/pharmacy-portal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

// Spec: master spec Section 8.1 — Pharmacy Portal (pharmacy.onlyou.life)
// Role: PHARMACY only

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PHARMACY)
export class PharmacyPortalResolver {
    constructor(private readonly pharmacyPortalService: PharmacyPortalService) {}

    /**
     * Get pharmacy info for the current user
     */
    @Query(() => PharmacyInfo)
    async pharmacyInfo(@Context() context: any): Promise<PharmacyInfo> {
        const pharmacyId = this.getPharmacyId(context);
        return this.pharmacyPortalService.getPharmacyInfo(pharmacyId);
    }

    /**
     * Get today's summary stats
     */
    @Query(() => PharmacyTodaySummary)
    async pharmacyTodaySummary(@Context() context: any): Promise<PharmacyTodaySummary> {
        const pharmacyId = this.getPharmacyId(context);
        return this.pharmacyPortalService.getTodaySummary(pharmacyId);
    }

    /**
     * Get new orders (SENT_TO_PHARMACY)
     */
    @Query(() => [PharmacyOrderSummary])
    async pharmacyNewOrders(@Context() context: any): Promise<PharmacyOrderSummary[]> {
        const pharmacyId = this.getPharmacyId(context);
        return this.pharmacyPortalService.getNewOrders(pharmacyId);
    }

    /**
     * Get preparing orders (PHARMACY_PREPARING)
     */
    @Query(() => [PharmacyOrderSummary])
    async pharmacyPreparingOrders(@Context() context: any): Promise<PharmacyOrderSummary[]> {
        const pharmacyId = this.getPharmacyId(context);
        return this.pharmacyPortalService.getPreparingOrders(pharmacyId);
    }

    /**
     * Get ready orders (PHARMACY_READY, PICKUP_ARRANGED)
     */
    @Query(() => [PharmacyOrderSummary])
    async pharmacyReadyOrders(@Context() context: any): Promise<PharmacyOrderSummary[]> {
        const pharmacyId = this.getPharmacyId(context);
        return this.pharmacyPortalService.getReadyOrders(pharmacyId);
    }

    /**
     * Start preparing order
     * Spec: Section 8.2 Step 3 — Pharmacy Preparing
     */
    @Mutation(() => PharmacyOrderSummary)
    async pharmacyStartPreparing(
        @Args('orderId') orderId: string,
        @Context() context: any,
    ): Promise<PharmacyOrderSummary> {
        const pharmacyId = this.getPharmacyId(context);
        return this.pharmacyPortalService.startPreparing(pharmacyId, orderId);
    }

    /**
     * Mark order as ready
     * Spec: Section 8.2 Step 3b — Pharmacy Ready
     */
    @Mutation(() => PharmacyOrderSummary)
    async pharmacyMarkReady(
        @Args('orderId') orderId: string,
        @Context() context: any,
    ): Promise<PharmacyOrderSummary> {
        const pharmacyId = this.getPharmacyId(context);
        return this.pharmacyPortalService.markReady(pharmacyId, orderId);
    }

    /**
     * Report stock issue
     */
    @Mutation(() => PharmacyMutationResponse)
    async pharmacyReportStockIssue(
        @Args('input') input: ReportStockIssueInput,
        @Context() context: any,
    ): Promise<PharmacyMutationResponse> {
        const pharmacyId = this.getPharmacyId(context);
        return this.pharmacyPortalService.reportStockIssue(
            pharmacyId,
            input.orderId,
            input.missingMedications,
        );
    }

    /**
     * Helper: Get pharmacy ID from context
     */
    private getPharmacyId(context: any): string {
        const user = context.req?.user;
        if (!user?.partnerId) {
            throw new Error('User is not associated with a pharmacy');
        }
        return user.partnerId;
    }
}
