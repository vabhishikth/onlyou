import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards, Logger } from '@nestjs/common';
import { IntakeService } from './intake.service';
import { AIService } from '../ai/ai.service';
import { ConsultationService } from '../consultation/consultation.service';
import { AssignmentService } from '../assignment/assignment.service';
import { NotificationService } from '../notification/notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { HealthVertical, User, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
    VerticalInfo,
    QuestionnaireTemplateType,
    IntakeResponseType,
    SubmitIntakeResponse,
    SaveDraftResponse,
    SubmitIntakeInput,
    SaveDraftInput,
    GetQuestionnaireInput,
} from './dto/intake.dto';

@Resolver()
export class IntakeResolver {
    private readonly logger = new Logger(IntakeResolver.name);

    constructor(
        private readonly intakeService: IntakeService,
        private readonly aiService: AIService,
        private readonly consultationService: ConsultationService,
        private readonly assignmentService: AssignmentService,
        private readonly notificationService: NotificationService,
        private readonly prisma: PrismaService,
    ) { }

    /**
     * Get all available treatment verticals
     * Public endpoint - no auth required
     */
    @Query(() => [VerticalInfo], { name: 'availableVerticals' })
    getAvailableVerticals(): VerticalInfo[] {
        return this.intakeService.getAvailableVerticals();
    }

    /**
     * Get questionnaire template for a specific vertical
     * Public endpoint - no auth required
     */
    @Query(() => QuestionnaireTemplateType, { name: 'questionnaireTemplate' })
    async getQuestionnaireTemplate(
        @Args('input') input: GetQuestionnaireInput,
    ): Promise<QuestionnaireTemplateType> {
        const template = await this.intakeService.getQuestionnaireTemplate(
            input.vertical,
            input.version,
        );
        return template as QuestionnaireTemplateType;
    }

    /**
     * Get current user's intake responses
     */
    @Query(() => [IntakeResponseType], { name: 'myIntakes' })
    @UseGuards(JwtAuthGuard)
    async getMyIntakes(
        @CurrentUser() user: User,
    ): Promise<IntakeResponseType[]> {
        const intakes = await this.intakeService.getMyIntakes(user.id);
        return intakes as unknown as IntakeResponseType[];
    }

    /**
     * Get intake by vertical for current user
     */
    @Query(() => IntakeResponseType, { name: 'myIntakeByVertical', nullable: true })
    @UseGuards(JwtAuthGuard)
    async getMyIntakeByVertical(
        @CurrentUser() user: User,
        @Args('vertical', { type: () => HealthVertical }) vertical: HealthVertical,
    ): Promise<IntakeResponseType | null> {
        const intake = await this.intakeService.getIntakeByVertical(user.id, vertical);
        return intake as unknown as IntakeResponseType | null;
    }

    /**
     * Save intake draft (can be resumed later)
     */
    @Mutation(() => SaveDraftResponse)
    @UseGuards(JwtAuthGuard)
    async saveIntakeDraft(
        @CurrentUser() user: User,
        @Args('input') input: SaveDraftInput,
    ): Promise<SaveDraftResponse> {
        const result = await this.intakeService.saveIntakeDraft(user.id, input);
        return result as SaveDraftResponse;
    }

    /**
     * Submit intake and create consultation
     * Spec: master spec Section 6 — Fire-and-forget AI assessment after submission
     */
    @Mutation(() => SubmitIntakeResponse)
    @UseGuards(JwtAuthGuard)
    async submitIntake(
        @CurrentUser() user: User,
        @Args('input') input: SubmitIntakeInput,
    ): Promise<SubmitIntakeResponse> {
        const result = await this.intakeService.submitIntake(user.id, input);

        // Fire-and-forget AI assessment + auto-assignment (non-blocking)
        // Spec: Phase 12 — Pipeline: submit → AI → store → assign doctor
        if (result.consultation) {
            const consultationId = result.consultation.id;
            this.aiService.runAssessment(consultationId)
                .then(assessment => {
                    if (assessment) {
                        return this.consultationService.storeAIAssessment(
                            consultationId,
                            assessment,
                        );
                    }
                    this.logger.warn(`AI assessment returned null for consultation ${consultationId}`);
                    return undefined;
                })
                .then(storedConsultation => {
                    if (storedConsultation) {
                        return this.assignmentService.assignDoctor(consultationId);
                    }
                    return undefined;
                })
                .catch(async err => {
                    this.logger.error(
                        `AI assessment failed for consultation ${consultationId}: ${err?.message}`,
                    );
                    // Notify admin on AI failure
                    try {
                        const admin = await this.prisma.user.findFirst({
                            where: { role: UserRole.ADMIN },
                        });
                        if (admin) {
                            await this.notificationService.sendNotification({
                                recipientId: admin.id,
                                recipientRole: 'ADMIN',
                                channel: 'IN_APP',
                                eventType: 'AI_ASSESSMENT_FAILED',
                                title: 'AI Assessment Failed',
                                body: `AI assessment failed for consultation #${consultationId}: ${err?.message}`,
                                data: { consultationId, error: err?.message },
                            });
                        }
                    } catch (notifyErr: any) {
                        this.logger.error(`Failed to send AI failure admin notification: ${notifyErr?.message}`);
                    }
                });
        }

        return result as SubmitIntakeResponse;
    }
}
