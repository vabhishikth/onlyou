import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AIService } from './ai.service';
import { ConsultationService } from '../consultation/consultation.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  AIPreAssessmentType,
  AIAssessmentResultType,
  RunAssessmentInput,
} from './dto/ai.dto';

// Spec: master spec Section 6 (AI Pre-Assessment)

@Resolver()
export class AIResolver {
  constructor(
    private readonly aiService: AIService,
    private readonly consultationService: ConsultationService,
    private readonly prisma: PrismaService,
  ) {}

  // ============================================
  // QUERIES
  // ============================================

  /**
   * Get AI pre-assessment for a consultation
   * Spec: Section 6 — Doctor sees assessment in case review
   */
  @Query(() => AIPreAssessmentType, { nullable: true })
  @UseGuards(JwtAuthGuard)
  async getAssessment(
    @Args('consultationId') consultationId: string,
  ): Promise<AIPreAssessmentType | null> {
    return this.prisma.aIPreAssessment.findUnique({
      where: { consultationId },
    });
  }

  // ============================================
  // MUTATIONS
  // ============================================

  /**
   * Trigger AI assessment for a consultation
   * Spec: Section 6 — Call Claude API → Parse → Store
   */
  @Mutation(() => AIAssessmentResultType)
  @UseGuards(JwtAuthGuard)
  async runAssessment(
    @CurrentUser() _user: any,
    @Args('input') input: RunAssessmentInput,
  ): Promise<AIAssessmentResultType> {
    try {
      const assessment = await this.aiService.runAssessment(input.consultationId);

      if (!assessment) {
        return {
          success: false,
          message: 'AI assessment failed — consultation may not exist or is already assessed',
        };
      }

      await this.consultationService.storeAIAssessment(
        input.consultationId,
        assessment,
      );

      return {
        success: true,
        message: 'AI assessment completed successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'AI assessment failed',
      };
    }
  }

  /**
   * Retry AI assessment (delete existing + re-run)
   * Spec: Section 6 — Admin can retry failed assessments
   */
  @Mutation(() => AIAssessmentResultType)
  @UseGuards(JwtAuthGuard)
  async retryAssessment(
    @CurrentUser() _user: any,
    @Args('consultationId') consultationId: string,
  ): Promise<AIAssessmentResultType> {
    try {
      // Delete existing assessment if any
      const existing = await this.prisma.aIPreAssessment.findUnique({
        where: { consultationId },
      });

      if (existing) {
        await this.prisma.aIPreAssessment.delete({
          where: { consultationId },
        });
      }

      // Reset consultation to PENDING_ASSESSMENT
      await this.prisma.consultation.update({
        where: { id: consultationId },
        data: { status: 'PENDING_ASSESSMENT' },
      });

      // Re-run assessment
      const assessment = await this.aiService.runAssessment(consultationId);

      if (!assessment) {
        return {
          success: false,
          message: 'AI assessment retry failed',
        };
      }

      await this.consultationService.storeAIAssessment(
        consultationId,
        assessment,
      );

      return {
        success: true,
        message: 'AI assessment retried successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'AI assessment retry failed',
      };
    }
  }
}
