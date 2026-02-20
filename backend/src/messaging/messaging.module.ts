import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MessagingService } from './messaging.service';
import { MessagingResolver } from './messaging.resolver';

// Spec: master spec Section 5.5 (Messaging)

@Module({
  imports: [PrismaModule],
  providers: [MessagingService, MessagingResolver],
  exports: [MessagingService],
})
export class MessagingModule {}
