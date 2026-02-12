import { Module } from '@nestjs/common';
import { LabPortalService } from './lab-portal.service';
import { LabPortalResolver } from './lab-portal.resolver';
import { PrismaModule } from '../prisma/prisma.module';
import { LabProcessingService } from '../lab-order/lab-processing.service';

// Spec: master spec Section 7.1 — Lab Portal (lab.onlyou.life)
// Portal for diagnostic centre staff — LAB role only

@Module({
    imports: [PrismaModule],
    providers: [LabPortalService, LabPortalResolver, LabProcessingService],
    exports: [LabPortalService],
})
export class LabPortalModule {}
