import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { LabOnboardingService } from './lab-onboarding.service';
import { PhlebotomistOnboardingService } from './phlebotomist-onboarding.service';

// Spec: Phase 16 — Lab Automation Module

@Module({
  imports: [PrismaModule, NotificationModule],
  providers: [
    LabOnboardingService,
    PhlebotomistOnboardingService,
  ],
  exports: [
    LabOnboardingService,
    PhlebotomistOnboardingService,
  ],
})
export class LabAutomationModule {}
