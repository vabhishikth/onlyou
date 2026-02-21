import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { RedisService } from '../../redis/redis.service';

// Spec: Phase 10 — Production Readiness (Redis health indicator)

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
    constructor(private readonly redis: RedisService) {
        super();
    }

    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        const isUp = await this.redis.ping();
        if (isUp) {
            return this.getStatus(key, true);
        }
        throw new HealthCheckError(
            'Redis check failed',
            this.getStatus(key, false, { message: 'Redis ping failed' }),
        );
    }
}
