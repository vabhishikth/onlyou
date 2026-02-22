import { Resolver, Query, Mutation, Args, Int, Float } from '@nestjs/graphql';
import { UseGuards, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GraphQLJSON } from 'graphql-type-json';
import { LabOnboardingService } from './lab-onboarding.service';
import { PhlebotomistOnboardingService } from './phlebotomist-onboarding.service';
import { LabOrderCreationService } from './lab-order-creation.service';
import { SlotAssignmentService } from './slot-assignment.service';
import { CollectionTrackingService } from './collection-tracking.service';
import { LabProcessingService } from './lab-processing.service';
import { BiomarkerDashboardService } from './biomarker-dashboard.service';

// Spec: Phase 16 Chunk 8 — GraphQL API Endpoints for All Portals

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
export class LabAutomationResolver {
  constructor(
    private readonly labOnboarding: LabOnboardingService,
    private readonly phlebOnboarding: PhlebotomistOnboardingService,
    private readonly orderCreation: LabOrderCreationService,
    private readonly slotAssignment: SlotAssignmentService,
    private readonly collectionTracking: CollectionTrackingService,
    private readonly labProcessing: LabProcessingService,
    private readonly biomarkerDashboard: BiomarkerDashboardService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Resolve phlebotomist ID from user context
   */
  private async resolvePhlebotomist(userId: string) {
    const phleb = await this.prisma.labPhlebotomist.findFirst({
      where: { onboardedById: userId },
    });
    if (!phleb) {
      throw new NotFoundException('Phlebotomist profile not found');
    }
    return phleb;
  }

  /**
   * Resolve lab technician ID from user context
   */
  private async resolveLabTech(userId: string) {
    const tech = await this.prisma.labTechnician.findFirst({
      where: { invitedById: userId },
    });
    if (!tech) {
      throw new NotFoundException('Lab technician profile not found');
    }
    return tech;
  }

  // ========================================
  // ADMIN endpoints
  // ========================================

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async registerPartnerLab(
    @CurrentUser() user: any,
    @Args('input', { type: () => GraphQLJSON }) input: any,
  ) {
    return this.labOnboarding.registerLab(user.id, input);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async uploadLabDocuments(
    @CurrentUser() user: any,
    @Args('labId') labId: string,
    @Args('documents', { type: () => GraphQLJSON }) documents: any,
  ) {
    return this.labOnboarding.uploadLabDocuments(labId, user.id, documents);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async reviewPartnerLab(
    @CurrentUser() user: any,
    @Args('labId') labId: string,
    @Args('approved') approved: boolean,
    @Args('notes', { nullable: true }) notes?: string,
  ) {
    return this.labOnboarding.reviewLab(labId, user.id, approved, notes);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async suspendPartnerLab(
    @CurrentUser() user: any,
    @Args('labId') labId: string,
    @Args('reason') reason: string,
  ) {
    return this.labOnboarding.suspendLab(labId, user.id, reason);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async reactivatePartnerLab(
    @CurrentUser() user: any,
    @Args('labId') labId: string,
    @Args('notes', { nullable: true }) notes?: string,
  ) {
    return this.labOnboarding.reactivateLab(labId, user.id, notes);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async deactivatePartnerLab(
    @CurrentUser() user: any,
    @Args('labId') labId: string,
    @Args('reason') reason: string,
  ) {
    return this.labOnboarding.deactivateLab(labId, user.id, reason);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async inviteLabTechnician(
    @CurrentUser() user: any,
    @Args('labId') labId: string,
    @Args('input', { type: () => GraphQLJSON }) input: any,
  ) {
    return this.labOnboarding.inviteLabTechnician(labId, user.id, input);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async registerPhlebotomist(
    @CurrentUser() user: any,
    @Args('input', { type: () => GraphQLJSON }) input: any,
  ) {
    return this.phlebOnboarding.registerPhlebotomist(user.id, input);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async activatePhlebotomist(
    @CurrentUser() user: any,
    @Args('phlebotomistId') phlebotomistId: string,
  ) {
    return this.phlebOnboarding.activatePhlebotomist(phlebotomistId, user.id);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async triggerAutoAssignment(
    @Args('labOrderId') labOrderId: string,
  ) {
    return this.slotAssignment.autoAssignPhlebotomist(labOrderId);
  }

  @Query(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async listPartnerLabs(
    @Args('city', { nullable: true }) city?: string,
    @Args('status', { nullable: true }) status?: string,
  ) {
    return this.labOnboarding.listLabs({ city, status });
  }

  @Query(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async partnerLabById(
    @Args('labId') labId: string,
  ) {
    return this.labOnboarding.getLabById(labId);
  }

  // ========================================
  // DOCTOR endpoints
  // ========================================

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.DOCTOR)
  async createLabOrder(
    @CurrentUser() user: any,
    @Args('consultationId') consultationId: string,
    @Args('patientId') patientId: string,
    @Args('testPanel', { type: () => [String] }) testPanel: string[],
    @Args('options', { type: () => GraphQLJSON }) options: any,
  ) {
    return this.orderCreation.createLabOrder(
      consultationId, user.id, patientId, testPanel, options,
    );
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.DOCTOR)
  async autoTriggerProtocolBloodWork(
    @CurrentUser() user: any,
    @Args('consultationId') consultationId: string,
    @Args('vertical') vertical: string,
  ) {
    return this.orderCreation.autoTriggerProtocolBloodWork(consultationId, vertical);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.DOCTOR)
  async doctorReviewResults(
    @CurrentUser() user: any,
    @Args('labOrderId') labOrderId: string,
    @Args('reviewNotes') reviewNotes: string,
  ) {
    return this.labProcessing.doctorReviewResults(labOrderId, user.id, reviewNotes);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.DOCTOR)
  async reviewUploadedResults(
    @CurrentUser() user: any,
    @Args('labOrderId') labOrderId: string,
    @Args('accepted') accepted: boolean,
    @Args('rejectionReason', { nullable: true }) rejectionReason?: string,
  ) {
    return this.orderCreation.doctorReviewUploadedResults(
      labOrderId, user.id, accepted, rejectionReason,
    );
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.DOCTOR)
  async acknowledgeCriticalValue(
    @CurrentUser() user: any,
    @Args('labOrderId') labOrderId: string,
    @Args('labResultId') labResultId: string,
    @Args('notes') notes: string,
  ) {
    return this.labProcessing.acknowledgeCriticalValue(
      labOrderId, labResultId, user.id, notes,
    );
  }

  @Query(() => GraphQLJSON)
  @Roles(UserRole.DOCTOR)
  async labOrderSummary(
    @Args('labOrderId') labOrderId: string,
  ) {
    return this.biomarkerDashboard.getLabOrderSummary(labOrderId);
  }

  // ========================================
  // PATIENT endpoints
  // ========================================

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.PATIENT)
  async bookLabSlot(
    @CurrentUser() user: any,
    @Args('labOrderId') labOrderId: string,
    @Args('slotId') slotId: string,
  ) {
    return this.slotAssignment.bookSlotForLabOrder(labOrderId, user.id, slotId);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.PATIENT)
  async cancelLabSlotBooking(
    @CurrentUser() user: any,
    @Args('labOrderId') labOrderId: string,
    @Args('reason') reason: string,
  ) {
    return this.slotAssignment.cancelSlotBooking(labOrderId, user.id, reason);
  }

  @Query(() => GraphQLJSON)
  @Roles(UserRole.PATIENT)
  async availableLabSlots(
    @Args('pincode') pincode: string,
    @Args('city') city: string,
    @Args('startDate') startDate: string,
    @Args('endDate') endDate: string,
    @Args('requiresFasting', { nullable: true }) requiresFasting?: boolean,
  ) {
    return this.slotAssignment.getAvailableSlots(
      pincode, city, new Date(startDate), new Date(endDate), requiresFasting,
    );
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.PATIENT)
  async uploadLabResults(
    @CurrentUser() user: any,
    @Args('labOrderId') labOrderId: string,
    @Args('fileUrl') fileUrl: string,
  ) {
    return this.orderCreation.handlePatientUpload(labOrderId, user.id, fileUrl);
  }

  @Query(() => GraphQLJSON)
  @Roles(UserRole.PATIENT)
  async myBiomarkerHistory(@CurrentUser() user: any) {
    return this.biomarkerDashboard.getPatientBiomarkerHistory(user.id);
  }

  @Query(() => GraphQLJSON)
  @Roles(UserRole.PATIENT)
  async myBiomarkerTrend(
    @CurrentUser() user: any,
    @Args('testCode') testCode: string,
  ) {
    return this.biomarkerDashboard.getTestTrend(user.id, testCode);
  }

  @Query(() => GraphQLJSON)
  @Roles(UserRole.PATIENT)
  async myLatestLabResults(@CurrentUser() user: any) {
    return this.biomarkerDashboard.getLatestResults(user.id);
  }

  @Query(() => GraphQLJSON)
  @Roles(UserRole.PATIENT)
  async myCriticalValues(@CurrentUser() user: any) {
    return this.biomarkerDashboard.getCriticalValuesSummary(user.id);
  }

  // ========================================
  // PHLEBOTOMIST endpoints
  // ========================================

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.PHLEBOTOMIST)
  async markEnRoute(
    @CurrentUser() user: any,
    @Args('labOrderId') labOrderId: string,
  ) {
    const phleb = await this.resolvePhlebotomist(user.id);
    return this.collectionTracking.markEnRoute(labOrderId, phleb.id);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.PHLEBOTOMIST)
  async verifyFastingStatus(
    @CurrentUser() user: any,
    @Args('labOrderId') labOrderId: string,
    @Args('patientHasFasted') patientHasFasted: boolean,
  ) {
    const phleb = await this.resolvePhlebotomist(user.id);
    return this.collectionTracking.verifyFastingStatus(
      labOrderId, phleb.id, patientHasFasted,
    );
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.PHLEBOTOMIST)
  async markSampleCollected(
    @CurrentUser() user: any,
    @Args('labOrderId') labOrderId: string,
    @Args('tubeCount', { type: () => Int }) tubeCount: number,
  ) {
    const phleb = await this.resolvePhlebotomist(user.id);
    return this.collectionTracking.markSampleCollected(
      labOrderId, phleb.id, tubeCount,
    );
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.PHLEBOTOMIST)
  async markCollectionFailed(
    @CurrentUser() user: any,
    @Args('labOrderId') labOrderId: string,
    @Args('reason') reason: string,
  ) {
    const phleb = await this.resolvePhlebotomist(user.id);
    return this.collectionTracking.markCollectionFailed(
      labOrderId, phleb.id, reason,
    );
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.PHLEBOTOMIST)
  async markSampleInTransit(
    @CurrentUser() user: any,
    @Args('labOrderId') labOrderId: string,
  ) {
    const phleb = await this.resolvePhlebotomist(user.id);
    return this.collectionTracking.markSampleInTransit(labOrderId, phleb.id);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.PHLEBOTOMIST)
  async markDeliveredToLab(
    @CurrentUser() user: any,
    @Args('labOrderId') labOrderId: string,
    @Args('receivedTubeCount', { type: () => Int }) receivedTubeCount: number,
  ) {
    const phleb = await this.resolvePhlebotomist(user.id);
    return this.collectionTracking.markDeliveredToLab(
      labOrderId, phleb.id, receivedTubeCount,
    );
  }

  @Query(() => GraphQLJSON)
  @Roles(UserRole.PHLEBOTOMIST)
  async myDailyRoster(
    @CurrentUser() user: any,
    @Args('date') date: string,
  ) {
    const phleb = await this.resolvePhlebotomist(user.id);
    return this.slotAssignment.getDailyRoster(phleb.id, new Date(date));
  }

  // ========================================
  // LAB TECHNICIAN endpoints
  // ========================================

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.LAB)
  async markSampleReceived(
    @CurrentUser() user: any,
    @Args('labOrderId') labOrderId: string,
    @Args('receivedTubeCount', { type: () => Int }) receivedTubeCount: number,
  ) {
    const tech = await this.resolveLabTech(user.id);
    return this.collectionTracking.markSampleReceived(
      labOrderId, tech.id, receivedTubeCount,
    );
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.LAB)
  async startLabProcessing(
    @CurrentUser() user: any,
    @Args('labOrderId') labOrderId: string,
  ) {
    const tech = await this.resolveLabTech(user.id);
    return this.labProcessing.startProcessing(labOrderId, tech.id);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.LAB)
  async uploadLabResult(
    @CurrentUser() user: any,
    @Args('labOrderId') labOrderId: string,
    @Args('input', { type: () => GraphQLJSON }) input: any,
  ) {
    const tech = await this.resolveLabTech(user.id);
    return this.labProcessing.uploadResult(labOrderId, tech.id, input);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.LAB)
  async markLabResultsReady(
    @CurrentUser() user: any,
    @Args('labOrderId') labOrderId: string,
  ) {
    const tech = await this.resolveLabTech(user.id);
    return this.labProcessing.markResultsReady(labOrderId, tech.id);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.LAB)
  async reportSampleIssue(
    @CurrentUser() user: any,
    @Args('labOrderId') labOrderId: string,
    @Args('issueType') issueType: string,
  ) {
    const tech = await this.resolveLabTech(user.id);
    return this.labProcessing.reportSampleIssue(labOrderId, tech.id, issueType);
  }
}
