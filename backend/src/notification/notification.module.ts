import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LabOrderModule } from '../lab-order/lab-order.module';
import { NotificationService } from './notification.service';
import { NotificationPreferenceService } from './notification-preference.service';
import { DeviceTokenService } from './device-token.service';
import { NotificationResolver } from './notification.resolver';
import { NotificationSchedulerService } from './notification-scheduler.service';

// Spec: master spec Section 11 (Notification System)

@Module({
  imports: [PrismaModule, LabOrderModule],
  providers: [
    NotificationService,
    NotificationPreferenceService,
    DeviceTokenService,
    NotificationResolver,
    NotificationSchedulerService,
  ],
  exports: [NotificationService, NotificationPreferenceService, DeviceTokenService],
})
export class NotificationModule {}
