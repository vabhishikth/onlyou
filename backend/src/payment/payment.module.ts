import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentService } from './payment.service';
import { PaymentResolver } from './payment.resolver';

// Spec: master spec Section 12 (Payment & Subscription)

// Factory to create Razorpay instance (will use real Razorpay in production)
const razorpayFactory = {
  provide: 'RAZORPAY_INSTANCE',
  useFactory: () => {
    // In production, initialize with real Razorpay SDK:
    // const Razorpay = require('razorpay');
    // return new Razorpay({
    //   key_id: process.env.RAZORPAY_KEY_ID,
    //   key_secret: process.env.RAZORPAY_KEY_SECRET,
    // });
    return {
      orders: {
        create: async (options: any) => ({
          id: `order_${Date.now()}`,
          ...options,
          status: 'created',
        }),
      },
    };
  },
};

@Module({
  imports: [PrismaModule],
  providers: [PaymentService, PaymentResolver, razorpayFactory],
  exports: [PaymentService],
})
export class PaymentModule {}
