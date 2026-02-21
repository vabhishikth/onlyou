import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';

// Spec: Phase 10 — Production Readiness (cache module)

@Global()
@Module({
    providers: [CacheService],
    exports: [CacheService],
})
export class CacheModule {}
