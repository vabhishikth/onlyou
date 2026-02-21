import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';
import { PrescriptionService } from './prescription.service';
import { PrescriptionResolver } from './prescription.resolver';

// Spec: hair-loss spec Section 6 (Prescription Templates)
// Spec: master spec Section 5.4 (PDF generated and stored)

@Module({
  imports: [PrismaModule, UploadModule],
  providers: [PrescriptionService, PrescriptionResolver],
  exports: [PrescriptionService],
})
export class PrescriptionModule {}
