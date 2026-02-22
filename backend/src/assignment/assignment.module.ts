import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { AssignmentService } from './assignment.service';
import { SlaTimerService } from './sla-timer.service';

// Spec: Phase 12 — Load-Balanced Doctor Auto-Assignment Module

@Module({
  imports: [PrismaModule, NotificationModule],
  providers: [AssignmentService, SlaTimerService],
  exports: [AssignmentService],
})
export class AssignmentModule {}
