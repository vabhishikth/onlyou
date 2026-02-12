import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminResolver } from './admin.resolver';
import { AdminService } from './admin.service';

// Spec: master spec Section 15 — Admin dashboard (unified lab + delivery views)

@Module({
    imports: [PrismaModule],
    providers: [AdminResolver, AdminService],
    exports: [AdminService],
})
export class AdminModule {}
