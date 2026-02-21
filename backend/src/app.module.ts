import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ScheduleModule } from '@nestjs/schedule';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { IntakeModule } from './intake/intake.module';
import { UploadModule } from './upload/upload.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PrescriptionModule } from './prescription/prescription.module';
import { LabOrderModule } from './lab-order/lab-order.module';
import { AdminModule } from './admin/admin.module';
import { LabPortalModule } from './lab-portal/lab-portal.module';
import { CollectPortalModule } from './collect-portal/collect-portal.module';
import { PharmacyPortalModule } from './pharmacy-portal/pharmacy-portal.module';
import { ConsultationModule } from './consultation/consultation.module';
import { MessagingModule } from './messaging/messaging.module';
import { TrackingModule } from './tracking/tracking.module';
import { OrderModule } from './order/order.module';
import { WalletModule } from './wallet/wallet.module';
import { PaymentModule } from './payment/payment.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { AIModule } from './ai/ai.module';
import { NotificationModule } from './notification/notification.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        GraphQLModule.forRoot<ApolloDriverConfig>({
            driver: ApolloDriver,
            autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
            sortSchema: true,
            playground: process.env.NODE_ENV !== 'production',
            introspection: process.env.NODE_ENV !== 'production',
            context: ({ req, res }: { req: unknown; res: unknown }) => ({ req, res }),
        }),
        ScheduleModule.forRoot(),
        PrismaModule,
        AuthModule,
        UserModule,
        IntakeModule,
        UploadModule,
        DashboardModule,
        PrescriptionModule,
        LabOrderModule,
        AdminModule,
        LabPortalModule,
        CollectPortalModule,
        PharmacyPortalModule,
        ConsultationModule,
        MessagingModule,
        TrackingModule,
        OrderModule,
        WalletModule,
        PaymentModule,
        SubscriptionModule,
        AIModule,
        NotificationModule,
    ],
})
export class AppModule { }

