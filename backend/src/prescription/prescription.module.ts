import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PrescriptionService } from './prescription.service';

// Spec: hair-loss spec Section 6 (Prescription Templates)

@Module({
  imports: [PrismaModule],
  providers: [PrescriptionService],
  exports: [PrescriptionService],
})
export class PrescriptionModule {}
