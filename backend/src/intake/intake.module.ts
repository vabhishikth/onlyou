import { Module } from '@nestjs/common';
import { IntakeService } from './intake.service';
import { IntakeResolver } from './intake.resolver';
import { PrismaModule } from '../prisma/prisma.module';
import { AIModule } from '../ai/ai.module';
import { ConsultationModule } from '../consultation/consultation.module';
import { AssignmentModule } from '../assignment/assignment.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
    imports: [PrismaModule, AIModule, ConsultationModule, AssignmentModule, NotificationModule],
    providers: [IntakeService, IntakeResolver],
    exports: [IntakeService],
})
export class IntakeModule { }
