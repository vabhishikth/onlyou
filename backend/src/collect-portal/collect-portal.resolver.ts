import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CollectPortalService } from './collect-portal.service';
import {
    PhlebotomistInfo,
    CollectTodaySummary,
    TodayAssignment,
    NearbyLab,
    MarkCollectedInput,
    MarkUnavailableInput,
    ReportLateInput,
    DeliverToLabInput,
    CollectMutationResponse,
} from './dto/collect-portal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

// Spec: master spec Section 7.2 — Collection Portal (collect.onlyou.life)
// Role: PHLEBOTOMIST only — THE SIMPLEST PORTAL

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PHLEBOTOMIST)
export class CollectPortalResolver {
    constructor(private readonly collectPortalService: CollectPortalService) {}

    /**
     * Get phlebotomist info for the current user
     */
    @Query(() => PhlebotomistInfo)
    async phlebotomistInfo(@Context() context: any): Promise<PhlebotomistInfo> {
        const phlebotomistId = this.getPhlebotomistId(context);
        return this.collectPortalService.getPhlebotomistInfo(phlebotomistId);
    }

    /**
     * Get today's summary stats
     */
    @Query(() => CollectTodaySummary)
    async collectTodaySummary(@Context() context: any): Promise<CollectTodaySummary> {
        const phlebotomistId = this.getPhlebotomistId(context);
        return this.collectPortalService.getTodaySummary(phlebotomistId);
    }

    /**
     * Get today's assignments
     */
    @Query(() => [TodayAssignment])
    async todayAssignments(@Context() context: any): Promise<TodayAssignment[]> {
        const phlebotomistId = this.getPhlebotomistId(context);
        return this.collectPortalService.getTodayAssignments(phlebotomistId);
    }

    /**
     * Get nearby labs for delivery
     */
    @Query(() => [NearbyLab])
    async nearbyLabs(@Context() context: any): Promise<NearbyLab[]> {
        const phlebotomistId = this.getPhlebotomistId(context);
        return this.collectPortalService.getNearbyLabs(phlebotomistId);
    }

    /**
     * Mark sample as collected
     * Spec: Section 7.2 Step 4 — Phlebotomist Collects
     */
    @Mutation(() => TodayAssignment)
    async collectMarkCollected(
        @Args('input') input: MarkCollectedInput,
        @Context() context: any,
    ): Promise<TodayAssignment> {
        const phlebotomistId = this.getPhlebotomistId(context);
        return this.collectPortalService.markCollected(
            phlebotomistId,
            input.labOrderId,
            input.tubeCount,
        );
    }

    /**
     * Mark patient as unavailable
     */
    @Mutation(() => CollectMutationResponse)
    async collectMarkUnavailable(
        @Args('input') input: MarkUnavailableInput,
        @Context() context: any,
    ): Promise<CollectMutationResponse> {
        const phlebotomistId = this.getPhlebotomistId(context);
        return this.collectPortalService.markPatientUnavailable(
            phlebotomistId,
            input.labOrderId,
            input.reason,
        );
    }

    /**
     * Report running late
     */
    @Mutation(() => CollectMutationResponse)
    async collectReportLate(
        @Args('input') input: ReportLateInput,
        @Context() context: any,
    ): Promise<CollectMutationResponse> {
        const phlebotomistId = this.getPhlebotomistId(context);
        return this.collectPortalService.reportRunningLate(
            phlebotomistId,
            input.labOrderId,
            input.newEta,
        );
    }

    /**
     * Deliver sample to lab
     * Spec: Section 7.2 Step 5 — Deliver to Lab
     */
    @Mutation(() => TodayAssignment)
    async collectDeliverToLab(
        @Args('input') input: DeliverToLabInput,
        @Context() context: any,
    ): Promise<TodayAssignment> {
        const phlebotomistId = this.getPhlebotomistId(context);
        return this.collectPortalService.deliverToLab(
            phlebotomistId,
            input.labOrderId,
            input.labId,
        );
    }

    /**
     * Helper: Get phlebotomist ID from context
     * The user's partnerId links to their phlebotomist record
     */
    private getPhlebotomistId(context: any): string {
        const user = context.req?.user;
        if (!user?.partnerId) {
            throw new Error('User is not associated with a phlebotomist record');
        }
        return user.partnerId;
    }
}
