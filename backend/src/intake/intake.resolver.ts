import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { IntakeService } from './intake.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { HealthVertical, User } from '@prisma/client';
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
    constructor(private readonly intakeService: IntakeService) { }

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
     */
    @Mutation(() => SubmitIntakeResponse)
    @UseGuards(JwtAuthGuard)
    async submitIntake(
        @CurrentUser() user: User,
        @Args('input') input: SubmitIntakeInput,
    ): Promise<SubmitIntakeResponse> {
        const result = await this.intakeService.submitIntake(user.id, input);
        return result as SubmitIntakeResponse;
    }
}
