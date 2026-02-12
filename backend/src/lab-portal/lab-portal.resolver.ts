import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { LabPortalService } from './lab-portal.service';
import {
    LabInfo,
    LabTodaySummary,
    LabSampleSummary,
    MarkSampleReceivedInput,
    ReportSampleIssueInput,
    UploadResultsInput,
    LabPortalMutationResponse,
} from './dto/lab-portal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

// Spec: master spec Section 7.1 — Lab Portal (lab.onlyou.life)
// Role: LAB only — Diagnostic centre staff

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.LAB)
export class LabPortalResolver {
    constructor(private readonly labPortalService: LabPortalService) {}

    /**
     * Get lab info for the current user's diagnostic centre
     */
    @Query(() => LabInfo)
    async labInfo(@Context() context: any): Promise<LabInfo> {
        const labId = this.getLabId(context);
        return this.labPortalService.getLabInfo(labId);
    }

    /**
     * Get today's summary stats
     */
    @Query(() => LabTodaySummary)
    async labTodaySummary(@Context() context: any): Promise<LabTodaySummary> {
        const labId = this.getLabId(context);
        return this.labPortalService.getTodaySummary(labId);
    }

    /**
     * Get incoming samples awaiting acknowledgement
     */
    @Query(() => [LabSampleSummary])
    async labIncomingSamples(@Context() context: any): Promise<LabSampleSummary[]> {
        const labId = this.getLabId(context);
        return this.labPortalService.getIncomingSamples(labId);
    }

    /**
     * Get samples in progress (received + processing)
     */
    @Query(() => [LabSampleSummary])
    async labInProgressSamples(@Context() context: any): Promise<LabSampleSummary[]> {
        const labId = this.getLabId(context);
        return this.labPortalService.getInProgressSamples(labId);
    }

    /**
     * Get completed samples from today
     */
    @Query(() => [LabSampleSummary])
    async labCompletedSamples(@Context() context: any): Promise<LabSampleSummary[]> {
        const labId = this.getLabId(context);
        return this.labPortalService.getCompletedSamples(labId);
    }

    /**
     * Mark sample as received
     * Spec: Section 7.2 Step 5 — Lab Receives Sample
     */
    @Mutation(() => LabSampleSummary)
    async labMarkSampleReceived(
        @Args('input') input: MarkSampleReceivedInput,
        @Context() context: any,
    ): Promise<LabSampleSummary> {
        const labId = this.getLabId(context);
        return this.labPortalService.markSampleReceived(
            labId,
            input.labOrderId,
            input.tubeCount,
        );
    }

    /**
     * Report sample issue
     * Spec: Section 7.2 Step 5b — Lab Reports Issue
     */
    @Mutation(() => LabPortalMutationResponse)
    async labReportSampleIssue(
        @Args('input') input: ReportSampleIssueInput,
        @Context() context: any,
    ): Promise<LabPortalMutationResponse> {
        const labId = this.getLabId(context);
        return this.labPortalService.reportSampleIssue(
            labId,
            input.labOrderId,
            input.reason,
        );
    }

    /**
     * Start processing sample
     * Spec: Section 7.2 Step 6 — Lab Starts Processing
     */
    @Mutation(() => LabSampleSummary)
    async labStartProcessing(
        @Args('labOrderId') labOrderId: string,
        @Context() context: any,
    ): Promise<LabSampleSummary> {
        const labId = this.getLabId(context);
        return this.labPortalService.startProcessing(labId, labOrderId);
    }

    /**
     * Upload results
     * Spec: Section 7.2 Step 7 — Lab Uploads Results
     */
    @Mutation(() => LabSampleSummary)
    async labUploadResults(
        @Args('input') input: UploadResultsInput,
        @Context() context: any,
    ): Promise<LabSampleSummary> {
        const labId = this.getLabId(context);
        return this.labPortalService.uploadResults(
            labId,
            input.labOrderId,
            input.resultFileUrl,
            input.abnormalFlags,
        );
    }

    /**
     * Helper: Get lab ID from context
     * The user's partnerId links to their diagnostic centre
     */
    private getLabId(context: any): string {
        const user = context.req?.user;
        if (!user?.partnerId) {
            throw new Error('User is not associated with a diagnostic centre');
        }
        return user.partnerId;
    }
}
