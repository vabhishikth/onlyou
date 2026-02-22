import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { PharmacyOnboardingService } from './pharmacy-onboarding.service';
import { PharmacyAssignmentService } from './pharmacy-assignment.service';
import { PharmacyFulfillmentService } from './pharmacy-fulfillment.service';
import { DeliveryService } from './delivery.service';

// Spec: Phase 15 — Pharmacy Module
// Additional services will be added in subsequent chunks

@Module({
  imports: [PrismaModule, NotificationModule],
  providers: [PharmacyOnboardingService, PharmacyAssignmentService, PharmacyFulfillmentService, DeliveryService],
  exports: [PharmacyOnboardingService, PharmacyAssignmentService, PharmacyFulfillmentService, DeliveryService],
})
export class PharmacyModule {}
