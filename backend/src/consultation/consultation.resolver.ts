import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ConsultationService } from './consultation.service';
import { ConsultationStatusResponse } from './dto/consultation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ConsultationStatus } from '@prisma/client';

// Spec: master spec Section 3.7 (Consultation Lifecycle)
// Spec: master spec Section 5 (Doctor Dashboard — status update actions)
// Frontend mutation shapes: web/src/app/doctor/case/[id]/page.tsx lines 44-61

@Resolver()
export class ConsultationResolver {
    constructor(
        private readonly consultationService: ConsultationService,
    ) {}

    /**
     * Update consultation status (approve, reject, request info)
     * Frontend: updateConsultationStatus($consultationId, $status, $doctorNotes?, $rejectionReason?)
     */
    @Mutation(() => ConsultationStatusResponse)
    @UseGuards(JwtAuthGuard)
    async updateConsultationStatus(
        @Args('consultationId') consultationId: string,
        @Args('status') status: string,
        @Args('doctorNotes', { type: () => String, nullable: true }) _doctorNotes: string | undefined,
        @Args('rejectionReason', { type: () => String, nullable: true }) rejectionReason: string | undefined,
        @CurrentUser() user: any,
    ): Promise<ConsultationStatusResponse> {
        const consultationStatus = status as ConsultationStatus;

        const consultation = await this.consultationService.updateStatus(
            consultationId,
            consultationStatus,
            user.id,
            rejectionReason,
        );

        return {
            id: consultation.id,
            status: consultation.status,
            doctorNotes: consultation.doctorNotes ?? undefined,
            rejectionReason: consultation.rejectionReason ?? undefined,
            doctorId: consultation.doctorId ?? undefined,
        };
    }

    /**
     * Doctor requests a video consultation — sets videoRequested flag
     * Patient then picks a time slot from the doctor's available slots
     */
    @Mutation(() => ConsultationStatusResponse)
    @UseGuards(JwtAuthGuard)
    async requestVideoConsultation(
        @Args('consultationId') consultationId: string,
        @CurrentUser() user: any,
    ): Promise<ConsultationStatusResponse> {
        const consultation = await this.consultationService.requestVideo(
            consultationId,
            user.id,
        );

        return {
            id: consultation.id,
            status: consultation.status,
        };
    }

    /**
     * Assign an unassigned case to a doctor (admin action)
     */
    @Mutation(() => ConsultationStatusResponse)
    @UseGuards(JwtAuthGuard)
    async assignCaseToDoctor(
        @Args('consultationId') consultationId: string,
        @Args('doctorId') doctorId: string,
        @CurrentUser() _user: any,
    ): Promise<ConsultationStatusResponse> {
        const consultation = await this.consultationService.assignToDoctor(
            consultationId,
            doctorId,
        );

        return {
            id: consultation.id,
            status: consultation.status,
            doctorId: consultation.doctorId ?? undefined,
        };
    }
}
