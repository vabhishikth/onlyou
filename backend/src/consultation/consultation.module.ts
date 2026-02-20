import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AIModule } from '../ai/ai.module';
import { ConsultationService } from './consultation.service';
import { ConsultationResolver } from './consultation.resolver';

@Module({
  imports: [PrismaModule, AIModule],
  providers: [ConsultationService, ConsultationResolver],
  exports: [ConsultationService],
})
export class ConsultationModule {}
