import { Module } from '@nestjs/common';
import { IntakeService } from './intake.service';
import { IntakeResolver } from './intake.resolver';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [IntakeService, IntakeResolver],
    exports: [IntakeService],
})
export class IntakeModule { }
