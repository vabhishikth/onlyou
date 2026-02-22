import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { LabOnboardingService } from './lab-onboarding.service';
import { PhlebotomistOnboardingService } from './phlebotomist-onboarding.service';
import { LabOrderCreationService } from './lab-order-creation.service';
import { SlotAssignmentService } from './slot-assignment.service';
import { CollectionTrackingService } from './collection-tracking.service';
import { LabProcessingService } from './lab-processing.service';
import { BiomarkerDashboardService } from './biomarker-dashboard.service';
import { LabAutomationResolver } from './lab-automation.resolver';

// Spec: Phase 16 — Lab Automation Module

@Module({
  imports: [PrismaModule, NotificationModule],
  providers: [
    LabOnboardingService,
    PhlebotomistOnboardingService,
    LabOrderCreationService,
    SlotAssignmentService,
    CollectionTrackingService,
    LabProcessingService,
    BiomarkerDashboardService,
    LabAutomationResolver,
  ],
  exports: [
    LabOnboardingService,
    PhlebotomistOnboardingService,
    LabOrderCreationService,
    SlotAssignmentService,
    CollectionTrackingService,
    LabProcessingService,
    BiomarkerDashboardService,
  ],
})
export class LabAutomationModule {}
