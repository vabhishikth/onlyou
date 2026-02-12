import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PartnerService } from './partner.service';

// Spec: master spec Section 7.5, Section 13 (Partner Management)

@Module({
  imports: [PrismaModule],
  providers: [PartnerService],
  exports: [PartnerService],
})
export class PartnerModule {}
