import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LabOrderService } from './lab-order.service';
import { SlotBookingService } from './slot-booking.service';
import { LabProcessingService } from './lab-processing.service';
import { SlaEscalationService } from './sla-escalation.service';

// Spec: master spec Section 7 (Blood Work & Diagnostics)

@Module({
  imports: [PrismaModule],
  providers: [LabOrderService, SlotBookingService, LabProcessingService, SlaEscalationService],
  exports: [LabOrderService, SlotBookingService, LabProcessingService, SlaEscalationService],
})
export class LabOrderModule {}
