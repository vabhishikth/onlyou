import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletService } from './wallet.service';
import { WalletResolver } from './wallet.resolver';

// Spec: master spec Section 10 (Refund & Wallet)

// Factory to create Razorpay instance (will use real Razorpay in production)
const razorpayFactory = {
  provide: 'RAZORPAY_INSTANCE',
  useFactory: () => {
    // In production, initialize with real Razorpay SDK
    return {
      payments: {
        refund: async (paymentId: string, options: any) => ({
          id: `rfnd_${Date.now()}`,
          payment_id: paymentId,
          amount: options.amount,
          status: 'processed',
        }),
      },
    };
  },
};

@Module({
  imports: [PrismaModule],
  providers: [WalletService, WalletResolver, razorpayFactory],
  exports: [WalletService],
})
export class WalletModule {}
