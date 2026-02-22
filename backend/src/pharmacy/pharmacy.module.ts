import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { PharmacyOnboardingService } from './pharmacy-onboarding.service';
import { PharmacyAssignmentService } from './pharmacy-assignment.service';
import { PharmacyFulfillmentService } from './pharmacy-fulfillment.service';
import { DeliveryService } from './delivery.service';
import { SlaMonitorService } from './sla-monitor.service';
import { AutoRefillService } from './auto-refill.service';
import { PharmacyResolver } from './pharmacy.resolver';

// Spec: Phase 15 — Pharmacy Module

@Module({
  imports: [PrismaModule, NotificationModule],
  providers: [
    PharmacyResolver,
    PharmacyOnboardingService,
    PharmacyAssignmentService,
    PharmacyFulfillmentService,
    DeliveryService,
    SlaMonitorService,
    AutoRefillService,
  ],
  exports: [
    PharmacyOnboardingService,
    PharmacyAssignmentService,
    PharmacyFulfillmentService,
    DeliveryService,
    SlaMonitorService,
    AutoRefillService,
  ],
})
export class PharmacyModule {}
