import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { UploadModule } from '../upload/upload.module';
import { AvailabilityService } from './availability.service';
import { SlotBookingService } from './slot-booking.service';
import { HmsService } from './hms.service';
import { VideoSchedulerService } from './video-scheduler.service';
import { VideoNotificationService } from './video-notification.service';
import { VideoResolver } from './video.resolver';
import { VideoWebhookController } from './video-webhook.controller';

// Spec: Phase 13 plan — Chunk 7
// Video consultation module

@Module({
  imports: [PrismaModule, NotificationModule, UploadModule, ConfigModule],
  controllers: [VideoWebhookController],
  providers: [
    AvailabilityService,
    SlotBookingService,
    HmsService,
    VideoSchedulerService,
    VideoNotificationService,
    VideoResolver,
  ],
  exports: [AvailabilityService, SlotBookingService, HmsService],
})
export class VideoModule {}
