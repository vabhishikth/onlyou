import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AIModule } from '../ai/ai.module';
import { ConsultationService } from './consultation.service';

@Module({
  imports: [PrismaModule, AIModule],
  providers: [ConsultationService],
  exports: [ConsultationService],
})
export class ConsultationModule {}
