import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionService } from './subscription.service';

// Spec: master spec Section 12 (Payment & Subscription)

// Factory to create Razorpay instance (will use real Razorpay in production)
const razorpayFactory = {
  provide: 'RAZORPAY_INSTANCE',
  useFactory: () => {
    // In production, initialize with real Razorpay SDK
    return {
      subscriptions: {
        create: async (options: any) => ({
          id: `sub_${Date.now()}`,
          ...options,
          status: 'active',
        }),
        cancel: async (id: string) => ({ id, status: 'cancelled' }),
        fetch: async (id: string) => ({
          id,
          status: 'active',
          current_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        }),
      },
      plans: {
        create: async (options: any) => ({
          id: `plan_${Date.now()}`,
          ...options,
        }),
      },
    };
  },
};

@Module({
  imports: [PrismaModule],
  providers: [SubscriptionService, razorpayFactory],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
