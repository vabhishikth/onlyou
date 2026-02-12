import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
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
        PrismaModule,
        AuthModule,
        UserModule,
        IntakeModule,
        UploadModule,
        DashboardModule,
        PrescriptionModule,
        LabOrderModule,
        AdminModule,
    ],
})
export class AppModule { }

