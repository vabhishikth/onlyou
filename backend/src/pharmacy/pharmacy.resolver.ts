import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PharmacyOnboardingService } from './pharmacy-onboarding.service';
import { PharmacyAssignmentService } from './pharmacy-assignment.service';
import { PharmacyFulfillmentService } from './pharmacy-fulfillment.service';
import { DeliveryService } from './delivery.service';
import { SlaMonitorService } from './sla-monitor.service';
import { AutoRefillService } from './auto-refill.service';
import { ReturnsService } from './returns.service';
import { GraphQLJSON } from 'graphql-type-json';

// Spec: Phase 15 Chunks 8-9 — GraphQL API Endpoints

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PharmacyResolver {
  constructor(
    private readonly onboardingService: PharmacyOnboardingService,
    private readonly assignmentService: PharmacyAssignmentService,
    private readonly fulfillmentService: PharmacyFulfillmentService,
    private readonly deliveryService: DeliveryService,
    private readonly slaService: SlaMonitorService,
    private readonly refillService: AutoRefillService,
    private readonly returnsService: ReturnsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Resolve pharmacy staff context from current user
   */
  private async resolveStaff(userId: string) {
    const staff = await this.prisma.pharmacyStaff.findFirst({
      where: { userId, isActive: true },
    });
    if (!staff) {
      throw new NotFoundException('Pharmacy staff profile not found');
    }
    return staff;
  }

  // ========================================
  // ADMIN endpoints
  // ========================================

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async registerPharmacy(
    @CurrentUser() user: any,
    @Args('input', { type: () => GraphQLJSON }) input: any,
  ) {
    return this.onboardingService.registerPharmacy(user.id, input);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async uploadPharmacyDocuments(
    @CurrentUser() user: any,
    @Args('pharmacyId') pharmacyId: string,
    @Args('documents', { type: () => GraphQLJSON }) documents: any,
  ) {
    return this.onboardingService.uploadPharmacyDocuments(pharmacyId, user.id, documents);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async reviewPharmacy(
    @CurrentUser() user: any,
    @Args('pharmacyId') pharmacyId: string,
    @Args('approved') approved: boolean,
    @Args('notes', { nullable: true }) notes?: string,
  ) {
    return this.onboardingService.reviewPharmacy(pharmacyId, user.id, approved, notes);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async suspendPharmacy(
    @CurrentUser() user: any,
    @Args('pharmacyId') pharmacyId: string,
    @Args('reason') reason: string,
  ) {
    return this.onboardingService.suspendPharmacy(pharmacyId, user.id, reason);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async reactivatePharmacy(
    @CurrentUser() user: any,
    @Args('pharmacyId') pharmacyId: string,
    @Args('notes', { nullable: true }) notes?: string,
  ) {
    return this.onboardingService.reactivatePharmacy(pharmacyId, user.id, notes);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async deactivatePharmacy(
    @CurrentUser() user: any,
    @Args('pharmacyId') pharmacyId: string,
    @Args('reason') reason: string,
  ) {
    return this.onboardingService.deactivatePharmacy(pharmacyId, user.id, reason);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async invitePharmacyStaff(
    @CurrentUser() user: any,
    @Args('pharmacyId') pharmacyId: string,
    @Args('input', { type: () => GraphQLJSON }) input: any,
  ) {
    return this.onboardingService.invitePharmacyStaff(pharmacyId, user.id, input);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async updatePharmacyStaffPermissions(
    @CurrentUser() user: any,
    @Args('staffId') staffId: string,
    @Args('permissions', { type: () => GraphQLJSON }) permissions: any,
  ) {
    return this.onboardingService.updatePharmacyStaffPermissions(staffId, user.id, permissions);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async deactivatePharmacyStaff(
    @CurrentUser() user: any,
    @Args('staffId') staffId: string,
  ) {
    return this.onboardingService.deactivatePharmacyStaff(staffId, user.id);
  }

  @Query(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async pharmacies(
    @CurrentUser() _user: any,
    @Args('city', { nullable: true }) city?: string,
    @Args('status', { nullable: true }) status?: string,
  ) {
    return this.onboardingService.listPharmacies({ city, status });
  }

  @Query(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async pharmacyById(
    @CurrentUser() _user: any,
    @Args('id') id: string,
  ) {
    return this.onboardingService.getPharmacyById(id);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async triggerAssignment(
    @CurrentUser() _user: any,
    @Args('prescriptionId') prescriptionId: string,
  ) {
    return this.assignmentService.assignPharmacy(prescriptionId);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async manualReassign(
    @CurrentUser() _user: any,
    @Args('pharmacyOrderId') pharmacyOrderId: string,
    @Args('reason') reason: string,
  ) {
    return this.assignmentService.reassignPharmacy(pharmacyOrderId, reason);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async dispatchOrder(
    @CurrentUser() _user: any,
    @Args('pharmacyOrderId') pharmacyOrderId: string,
    @Args('deliveryPersonName') deliveryPersonName: string,
    @Args('deliveryPersonPhone') deliveryPersonPhone: string,
  ) {
    return this.deliveryService.dispatchOrder(pharmacyOrderId, deliveryPersonName, deliveryPersonPhone);
  }

  @Query(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async slaBreaches(
    @CurrentUser() _user: any,
    @Args('pharmacyOrderId') pharmacyOrderId: string,
  ) {
    return this.slaService.getSlaStatus(pharmacyOrderId);
  }

  @Query(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async pharmacyPerformance(
    @CurrentUser() _user: any,
    @Args('pharmacyId') pharmacyId: string,
  ) {
    // Default to last 30 days
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return this.slaService.getPharmacyPerformanceReport(pharmacyId, { start, end: new Date() });
  }

  @Query(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async allPharmacyOrders(@CurrentUser() _user: any) {
    return this.prisma.pharmacyOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // ========================================
  // PHARMACY STAFF endpoints
  // ========================================

  @Query(() => GraphQLJSON)
  @Roles(UserRole.PHARMACY)
  async myPharmacyOrders(@CurrentUser() user: any) {
    const staff = await this.resolveStaff(user.id);
    return this.prisma.pharmacyOrder.findMany({
      where: { pharmacyId: staff.pharmacyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Query(() => GraphQLJSON)
  @Roles(UserRole.PHARMACY)
  async myPharmacyDetails(@CurrentUser() user: any) {
    const staff = await this.resolveStaff(user.id);
    return this.onboardingService.getPharmacyById(staff.pharmacyId);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.PHARMACY)
  async acceptOrder(
    @CurrentUser() user: any,
    @Args('pharmacyOrderId') pharmacyOrderId: string,
  ) {
    const staff = await this.resolveStaff(user.id);
    return this.fulfillmentService.acceptOrder(pharmacyOrderId, staff.id);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.PHARMACY)
  async rejectOrder(
    @CurrentUser() user: any,
    @Args('pharmacyOrderId') pharmacyOrderId: string,
    @Args('reason') reason: string,
  ) {
    const staff = await this.resolveStaff(user.id);
    return this.fulfillmentService.rejectOrder(pharmacyOrderId, staff.id, reason);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.PHARMACY)
  async reportStockIssue(
    @CurrentUser() user: any,
    @Args('pharmacyOrderId') pharmacyOrderId: string,
    @Args('missingItems', { type: () => [String] }) missingItems: string[],
  ) {
    const staff = await this.resolveStaff(user.id);
    return this.fulfillmentService.reportStockIssue(pharmacyOrderId, staff.id, missingItems);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.PHARMACY)
  async proposeSubstitution(
    @CurrentUser() user: any,
    @Args('pharmacyOrderId') pharmacyOrderId: string,
    @Args('substitutionDetails', { type: () => GraphQLJSON }) substitutionDetails: any,
  ) {
    const staff = await this.resolveStaff(user.id);
    return this.fulfillmentService.proposeSubstitution(pharmacyOrderId, staff.id, substitutionDetails);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.PHARMACY)
  async confirmDiscreetPackaging(
    @CurrentUser() user: any,
    @Args('pharmacyOrderId') pharmacyOrderId: string,
  ) {
    const staff = await this.resolveStaff(user.id);
    return this.fulfillmentService.confirmDiscreetPackaging(pharmacyOrderId, staff.id);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.PHARMACY)
  async markReadyForPickup(
    @CurrentUser() user: any,
    @Args('pharmacyOrderId') pharmacyOrderId: string,
  ) {
    const staff = await this.resolveStaff(user.id);
    return this.fulfillmentService.markReadyForPickup(pharmacyOrderId, staff.id);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.PHARMACY)
  async updateInventory(
    @CurrentUser() user: any,
    @Args('updates', { type: () => GraphQLJSON }) updates: any[],
  ) {
    const staff = await this.resolveStaff(user.id);
    await this.fulfillmentService.updateInventory(staff.pharmacyId, staff.id, updates);
    return { success: true };
  }

  // ========================================
  // DOCTOR endpoints
  // ========================================

  @Query(() => GraphQLJSON)
  @Roles(UserRole.DOCTOR)
  async pendingSubstitutionApprovals(@CurrentUser() _user: any) {
    return this.prisma.pharmacyOrder.findMany({
      where: { status: 'AWAITING_SUBSTITUTION_APPROVAL' },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.DOCTOR)
  async approveSubstitution(
    @CurrentUser() user: any,
    @Args('pharmacyOrderId') pharmacyOrderId: string,
  ) {
    return this.fulfillmentService.approveSubstitution(pharmacyOrderId, user.id);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.DOCTOR)
  async rejectSubstitution(
    @CurrentUser() user: any,
    @Args('pharmacyOrderId') pharmacyOrderId: string,
    @Args('reason') reason: string,
  ) {
    return this.fulfillmentService.rejectSubstitution(pharmacyOrderId, user.id, reason);
  }

  // ========================================
  // PATIENT endpoints
  // ========================================

  @Query(() => GraphQLJSON)
  @Roles(UserRole.PATIENT)
  async myPharmacyOrderStatus(
    @CurrentUser() user: any,
    @Args('pharmacyOrderId') pharmacyOrderId: string,
  ) {
    const order = await this.prisma.pharmacyOrder.findUnique({
      where: { id: pharmacyOrderId },
    });
    if (!order || order.patientId !== user.id) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  @Query(() => GraphQLJSON)
  @Roles(UserRole.PATIENT)
  async myActivePharmacyOrders(@CurrentUser() user: any) {
    return this.prisma.pharmacyOrder.findMany({
      where: {
        patientId: user.id,
        status: { notIn: ['DELIVERED', 'CANCELLED', 'DELIVERY_FAILED'] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.PATIENT)
  async updateDeliveryAddress(
    @CurrentUser() user: any,
    @Args('pharmacyOrderId') pharmacyOrderId: string,
    @Args('newAddress') newAddress: string,
    @Args('newPincode') newPincode: string,
  ) {
    return this.deliveryService.updateDeliveryAddress(pharmacyOrderId, user.id, newAddress, newPincode);
  }

  @Query(() => GraphQLJSON)
  @Roles(UserRole.PATIENT)
  async myAutoRefills(@CurrentUser() user: any) {
    return this.prisma.autoRefillConfig.findMany({
      where: { patientId: user.id, isActive: true },
      orderBy: { nextRefillDate: 'asc' },
    });
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.PATIENT)
  async createAutoRefill(
    @CurrentUser() user: any,
    @Args('prescriptionId') prescriptionId: string,
    @Args('intervalDays', { type: () => Int, defaultValue: 30 }) intervalDays: number,
  ) {
    return this.refillService.createRefillSubscription(user.id, prescriptionId, intervalDays);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.PATIENT)
  async cancelAutoRefill(
    @CurrentUser() user: any,
    @Args('autoRefillConfigId') autoRefillConfigId: string,
  ) {
    return this.refillService.cancelRefillSubscription(autoRefillConfigId, user.id);
  }

  // ========================================
  // DELIVERY endpoints
  // ========================================

  @Query(() => GraphQLJSON)
  @Roles(UserRole.DELIVERY)
  async myActiveDeliveries(@CurrentUser() _user: any) {
    return this.prisma.pharmacyOrder.findMany({
      where: { status: 'OUT_FOR_DELIVERY' },
      select: {
        id: true,
        status: true,
        deliveryAddress: true,
        deliveryPincode: true,
        deliveryCity: true,
        isDiscreetPackagingConfirmed: true,
        requiresColdChain: true,
        dispatchedAt: true,
        // NO medication names (privacy)
      },
      orderBy: { dispatchedAt: 'asc' },
    });
  }

  @Query(() => GraphQLJSON)
  @Roles(UserRole.DELIVERY)
  async deliveryOrderDetail(
    @CurrentUser() _user: any,
    @Args('pharmacyOrderId') pharmacyOrderId: string,
  ) {
    const order = await this.prisma.pharmacyOrder.findUnique({
      where: { id: pharmacyOrderId },
      select: {
        id: true,
        status: true,
        deliveryAddress: true,
        deliveryPincode: true,
        deliveryCity: true,
        isDiscreetPackagingConfirmed: true,
        requiresColdChain: true,
        dispatchedAt: true,
        deliveryAttempts: true,
        patientId: true,
        // NO medication names, NO prescriptionId exposed (privacy)
      },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.DELIVERY)
  async confirmDelivery(
    @CurrentUser() _user: any,
    @Args('pharmacyOrderId') pharmacyOrderId: string,
    @Args('otp') otp: string,
  ) {
    return this.deliveryService.confirmDelivery(pharmacyOrderId, otp);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.DELIVERY)
  async reportDeliveryFailure(
    @CurrentUser() _user: any,
    @Args('pharmacyOrderId') pharmacyOrderId: string,
    @Args('reason') reason: string,
  ) {
    return this.deliveryService.reportDeliveryFailure(pharmacyOrderId, reason);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.DELIVERY)
  async updateDeliveryStatus(
    @CurrentUser() _user: any,
    @Args('pharmacyOrderId') pharmacyOrderId: string,
    @Args('newStatus') newStatus: string,
    @Args('notes', { nullable: true }) notes?: string,
  ) {
    return this.deliveryService.updateDeliveryStatus(pharmacyOrderId, newStatus, notes);
  }

  // ========================================
  // RETURNS + PAYMENT endpoints (Chunk 9)
  // ========================================

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.PATIENT)
  async reportDamagedOrder(
    @CurrentUser() user: any,
    @Args('pharmacyOrderId') pharmacyOrderId: string,
    @Args('photos', { type: () => [String] }) photos: string[],
    @Args('description') description: string,
  ) {
    return this.returnsService.reportDamagedOrder(pharmacyOrderId, user.id, photos, description);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.PATIENT)
  async processReturn(
    @CurrentUser() user: any,
    @Args('pharmacyOrderId') pharmacyOrderId: string,
    @Args('reason') reason: string,
  ) {
    return this.returnsService.processReturn(pharmacyOrderId, user.id, reason);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async approveDamageReport(
    @CurrentUser() user: any,
    @Args('pharmacyOrderId') pharmacyOrderId: string,
  ) {
    return this.returnsService.approveDamageReport(pharmacyOrderId, user.id);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async handleColdChainBreach(
    @CurrentUser() _user: any,
    @Args('pharmacyOrderId') pharmacyOrderId: string,
  ) {
    await this.returnsService.handleColdChainBreach(pharmacyOrderId);
    return { success: true };
  }

  @Query(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async validatePaymentBeforeOrder(
    @CurrentUser() _user: any,
    @Args('patientId') patientId: string,
    @Args('consultationId') consultationId: string,
  ) {
    return this.returnsService.validatePaymentBeforeOrder(patientId, consultationId);
  }

  @Query(() => GraphQLJSON)
  @Roles(UserRole.ADMIN)
  async checkBloodWorkPayment(
    @CurrentUser() _user: any,
    @Args('patientId') patientId: string,
    @Args('labOrderId') labOrderId: string,
  ) {
    return this.returnsService.handlePaymentForBloodWork(patientId, labOrderId);
  }
}
