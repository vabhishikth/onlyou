import { Module } from '@nestjs/common';
import { CollectPortalService } from './collect-portal.service';
import { CollectPortalResolver } from './collect-portal.resolver';
import { PrismaModule } from '../prisma/prisma.module';

// Spec: master spec Section 7.2 — Collection Portal (collect.onlyou.life)
// Portal for phlebotomists — PHLEBOTOMIST role only
// THE SIMPLEST PORTAL. Used on the road, one hand, between collections.

@Module({
    imports: [PrismaModule],
    providers: [CollectPortalService, CollectPortalResolver],
    exports: [CollectPortalService],
})
export class CollectPortalModule {}
