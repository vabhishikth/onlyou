import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { LabOnboardingService } from './lab-onboarding.service';
import { PhlebotomistOnboardingService } from './phlebotomist-onboarding.service';
import { LabOrderCreationService } from './lab-order-creation.service';
import { SlotAssignmentService } from './slot-assignment.service';
import { CollectionTrackingService } from './collection-tracking.service';

// Spec: Phase 16 — Lab Automation Module

@Module({
  imports: [PrismaModule, NotificationModule],
  providers: [
    LabOnboardingService,
    PhlebotomistOnboardingService,
    LabOrderCreationService,
    SlotAssignmentService,
    CollectionTrackingService,
  ],
  exports: [
    LabOnboardingService,
    PhlebotomistOnboardingService,
    LabOrderCreationService,
    SlotAssignmentService,
    CollectionTrackingService,
  ],
})
export class LabAutomationModule {}
