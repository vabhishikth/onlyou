import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MessagingService } from './messaging.service';

// Spec: master spec Section 5.5 (Messaging)

@Module({
  imports: [PrismaModule],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
