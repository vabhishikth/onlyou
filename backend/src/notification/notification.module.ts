import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationService } from './notification.service';
import { NotificationPreferenceService } from './notification-preference.service';
import { NotificationResolver } from './notification.resolver';

// Spec: master spec Section 11 (Notification System)

@Module({
  imports: [PrismaModule],
  providers: [NotificationService, NotificationPreferenceService, NotificationResolver],
  exports: [NotificationService, NotificationPreferenceService],
})
export class NotificationModule {}
