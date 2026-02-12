import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationService } from './notification.service';
import { NotificationPreferenceService } from './notification-preference.service';

// Spec: master spec Section 11 (Notification System)

@Module({
  imports: [PrismaModule],
  providers: [NotificationService, NotificationPreferenceService],
  exports: [NotificationService, NotificationPreferenceService],
})
export class NotificationModule {}
