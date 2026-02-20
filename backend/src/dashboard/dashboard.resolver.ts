import { Resolver, Query, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { DashboardService, CaseCard, QueueFilters } from './dashboard.service';
import {
  QueueFiltersInput,
  QueueResponse,
  QueueStatsType,
  CaseDetailType,
  CaseCardType,
  DashboardStatus,
} from './dto/dashboard.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Spec: master spec Section 5 (Doctor Dashboard)

// Helper to map service CaseCard to GraphQL CaseCardType
function mapCaseCard(card: CaseCard): CaseCardType {
  return {
    id: card.id,
    patientName: card.patientName,
    patientAge: card.patientAge ?? undefined,
    patientSex: card.patientSex ?? undefined,
    vertical: card.vertical,
    createdAt: card.createdAt,
    aiAttentionLevel: card.aiAttentionLevel ?? undefined,
    dashboardStatus: card.dashboardStatus as DashboardStatus,
    statusBadge: card.statusBadge,
    isFollowUp: card.isFollowUp,
  };
}

// Helper to build QueueFilters from input
function buildFilters(filters?: QueueFiltersInput): QueueFilters {
  const result: QueueFilters = {};
  if (filters?.vertical) {
    result.vertical = filters.vertical;
  }
  if (filters?.dashboardStatus) {
    result.dashboardStatus = filters.dashboardStatus as any;
  }
  if (filters?.attentionLevel) {
    result.attentionLevel = filters.attentionLevel as 'LOW' | 'MEDIUM' | 'HIGH';
  }
  return result;
}

@Resolver()
export class DashboardResolver {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Get doctor's case queue
   * Spec: master spec Section 5.1 — Case Queue
   */
  @Query(() => QueueResponse)
  @UseGuards(JwtAuthGuard)
  async doctorQueue(
    @Context() context: any,
    @Args('filters', { type: () => QueueFiltersInput, nullable: true })
    filters?: QueueFiltersInput
  ): Promise<QueueResponse> {
    const userId = context.req.user.id;
    const result = await this.dashboardService.getDoctorQueue(userId, buildFilters(filters));

    return {
      cases: result.cases.map(mapCaseCard),
    };
  }

  /**
   * Get admin's full case queue
   */
  @Query(() => QueueResponse)
  @UseGuards(JwtAuthGuard)
  async adminQueue(
    @Context() context: any,
    @Args('filters', { type: () => QueueFiltersInput, nullable: true })
    filters?: QueueFiltersInput
  ): Promise<QueueResponse> {
    const userId = context.req.user.id;
    const result = await this.dashboardService.getAdminQueue(userId, buildFilters(filters));

    return {
      cases: result.cases.map(mapCaseCard),
    };
  }

  /**
   * Get unassigned cases (for admin)
   */
  @Query(() => QueueResponse)
  @UseGuards(JwtAuthGuard)
  async unassignedCases(
    @Context() context: any,
    @Args('filters', { type: () => QueueFiltersInput, nullable: true })
    filters?: QueueFiltersInput
  ): Promise<QueueResponse> {
    const userId = context.req.user.id;
    const result = await this.dashboardService.getUnassignedCases(userId, buildFilters(filters));

    return {
      cases: result.cases.map(mapCaseCard),
    };
  }

  /**
   * Get full case detail
   * Spec: master spec Section 5.2 — Case Review
   */
  @Query(() => CaseDetailType)
  @UseGuards(JwtAuthGuard)
  async caseDetail(
    @Context() context: any,
    @Args('consultationId') consultationId: string
  ): Promise<CaseDetailType> {
    const userId = context.req.user.id;
    const result = await this.dashboardService.getCaseDetail(consultationId, userId);

    const detail: CaseDetailType = {
      consultation: {
        id: result.consultation.id,
        status: result.consultation.status,
        vertical: result.consultation.vertical,
        createdAt: result.consultation.createdAt,
      },
      patient: {
        phone: result.patient.phone,
      },
      questionnaire: {
        responses: result.questionnaire.responses,
        template: result.questionnaire.template,
      },
      photos: result.photos,
      messages: result.messages,
      labOrders: result.labOrders.map((lo) => ({
        id: lo.id,
        testPanel: lo.testPanel,
        panelName: lo.panelName ?? undefined,
        status: lo.status,
        orderedAt: lo.orderedAt,
        resultFileUrl: lo.resultFileUrl ?? undefined,
        criticalValues: lo.criticalValues,
      })),
    };

    // Add optional fields
    if (result.consultation.doctorNotes) {
      detail.consultation.doctorNotes = result.consultation.doctorNotes;
    }
    if (result.patient.name) {
      detail.patient.name = result.patient.name;
    }
    if (result.patient.age !== null) {
      detail.patient.age = result.patient.age;
    }
    if (result.patient.sex) {
      detail.patient.sex = result.patient.sex;
    }
    if (result.patient.city) {
      detail.patient.city = result.patient.city;
    }

    if (result.aiAssessment) {
      detail.aiAssessment = {
        summary: result.aiAssessment.summary,
        riskLevel: result.aiAssessment.riskLevel,
        flags: result.aiAssessment.flags,
        rawResponse: result.aiAssessment.rawResponse,
      };
    }

    if (result.prescription) {
      detail.prescription = {
        id: result.prescription.id,
        medications: result.prescription.medications,
        validUntil: result.prescription.validUntil,
        issuedAt: result.prescription.issuedAt,
      };
      if (result.prescription.pdfUrl) {
        detail.prescription.pdfUrl = result.prescription.pdfUrl;
      }
      if (result.prescription.instructions) {
        detail.prescription.instructions = result.prescription.instructions;
      }
    }

    return detail;
  }

  /**
   * Get queue statistics
   */
  @Query(() => QueueStatsType)
  @UseGuards(JwtAuthGuard)
  async queueStats(@Context() context: any): Promise<QueueStatsType> {
    const userId = context.req.user.id;
    return this.dashboardService.getQueueStats(userId);
  }
}
