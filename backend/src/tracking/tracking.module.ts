import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TrackingService } from './tracking.service';
import { PatientActionsService } from './patient-actions.service';

// Spec: master spec Section 4 (Patient Tracking Screens)

@Module({
  imports: [PrismaModule],
  providers: [TrackingService, PatientActionsService],
  exports: [TrackingService, PatientActionsService],
})
export class TrackingModule {}
