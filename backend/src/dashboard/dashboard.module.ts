import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DashboardService } from './dashboard.service';
import { DashboardResolver } from './dashboard.resolver';

// Spec: master spec Section 5 (Doctor Dashboard)

@Module({
  imports: [PrismaModule],
  providers: [DashboardService, DashboardResolver],
  exports: [DashboardService],
})
export class DashboardModule {}
