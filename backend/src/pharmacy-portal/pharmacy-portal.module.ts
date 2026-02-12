import { Module } from '@nestjs/common';
import { PharmacyPortalService } from './pharmacy-portal.service';
import { PharmacyPortalResolver } from './pharmacy-portal.resolver';
import { PrismaModule } from '../prisma/prisma.module';

// Spec: master spec Section 8.1 — Pharmacy Portal (pharmacy.onlyou.life)
// Portal for pharmacy partners — PHARMACY role only

@Module({
    imports: [PrismaModule],
    providers: [PharmacyPortalService, PharmacyPortalResolver],
    exports: [PharmacyPortalService],
})
export class PharmacyPortalModule {}
