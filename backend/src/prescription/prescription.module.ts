import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PrescriptionService } from './prescription.service';
import { PrescriptionResolver } from './prescription.resolver';

// Spec: hair-loss spec Section 6 (Prescription Templates)

@Module({
  imports: [PrismaModule],
  providers: [PrescriptionService, PrescriptionResolver],
  exports: [PrescriptionService],
})
export class PrescriptionModule {}
