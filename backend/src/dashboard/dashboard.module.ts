import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DashboardService } from './dashboard.service';

// Spec: master spec Section 5 (Doctor Dashboard)

@Module({
  imports: [PrismaModule],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
