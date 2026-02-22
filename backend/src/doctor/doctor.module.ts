import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { DoctorService } from './doctor.service';

// Spec: Phase 12 — Doctor Onboarding Module

@Module({
  imports: [PrismaModule, NotificationModule],
  providers: [DoctorService],
  exports: [DoctorService],
})
export class DoctorModule {}
