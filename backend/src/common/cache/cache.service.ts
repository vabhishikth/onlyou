import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

// Spec: Phase 10 — Production Readiness (Redis cache-aside service)

@Injectable()
export class CacheService {
    private readonly logger = new Logger(CacheService.name);

    constructor(private readonly redis: RedisService) {}

    async getOrSet<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
        try {
            const cached = await this.redis.get(key);
            if (cached !== null) {
                return JSON.parse(cached) as T;
            }
        } catch (err) {
            this.logger.warn(`Cache read failed for "${key}": ${(err as Error).message}`);
        }

        // Cache miss or Redis error — call factory
        const result = await factory();

        // Store in cache (non-blocking, don't fail if Redis is down)
        try {
            await this.redis.set(key, JSON.stringify(result), ttlSeconds);
        } catch (err) {
            this.logger.warn(`Cache write failed for "${key}": ${(err as Error).message}`);
        }

        return result;
    }

    async invalidate(key: string): Promise<void> {
        await this.redis.del(key);
    }

    async invalidatePattern(pattern: string): Promise<void> {
        const keys = await this.redis.keys(pattern);
        for (const key of keys) {
            await this.redis.del(key);
        }
    }
}
