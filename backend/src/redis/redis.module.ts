import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

// Spec: Phase 10 — Production Readiness (Redis infrastructure)

@Global()
@Module({
    providers: [RedisService],
    exports: [RedisService],
})
export class RedisModule {}
