import { Module } from '@nestjs/common';
import { IntakeService } from './intake.service';
import { IntakeResolver } from './intake.resolver';
import { PrismaModule } from '../prisma/prisma.module';
import { AIModule } from '../ai/ai.module';
import { ConsultationModule } from '../consultation/consultation.module';

@Module({
    imports: [PrismaModule, AIModule, ConsultationModule],
    providers: [IntakeService, IntakeResolver],
    exports: [IntakeService],
})
export class IntakeModule { }
