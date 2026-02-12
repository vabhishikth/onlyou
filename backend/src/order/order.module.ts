import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrderService } from './order.service';

// Spec: master spec Section 8 (Medication Delivery)

@Module({
  imports: [PrismaModule],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
