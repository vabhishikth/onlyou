import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { ConsultationModule } from '../consultation/consultation.module';
import { AssignmentModule } from '../assignment/assignment.module';
import { AIService } from './ai.service';
import { AIResolver } from './ai.resolver';

@Module({
  imports: [ConfigModule, PrismaModule, forwardRef(() => ConsultationModule), AssignmentModule],
  providers: [AIService, AIResolver],
  exports: [AIService],
})
export class AIModule {}
