import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

// Spec: Phase 10 — Production Readiness (Redis infrastructure)

@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private readonly client: Redis;

    private connectionLogged = false;

    constructor(private readonly config: ConfigService) {
        const url = this.config.get<string>('REDIS_URL') || 'redis://localhost:6379';
        this.client = new Redis(url, {
            maxRetriesPerRequest: 3,
            lazyConnect: true,
            retryStrategy: (times: number) => {
                if (times > 5) return null; // Stop retrying after 5 attempts
                return Math.min(times * 500, 3000);
            },
        });

        this.client.on('error', (err: Error) => {
            if (!this.connectionLogged) {
                this.logger.warn(`Redis unavailable: ${err.message} — running without cache`);
                this.connectionLogged = true;
            }
        });

        this.client.on('connect', () => {
            this.connectionLogged = false;
            this.logger.log('Redis connected');
        });

        // Attempt connection (non-blocking)
        this.client.connect().catch(() => {
            // Handled by 'error' event
        });
    }

    async onModuleDestroy(): Promise<void> {
        await this.client.quit();
    }

    async get(key: string): Promise<string | null> {
        try {
            return await this.client.get(key);
        } catch (err) {
            this.logger.error(`Redis GET error for key "${key}": ${(err as Error).message}`);
            return null;
        }
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        try {
            if (ttlSeconds) {
                await this.client.set(key, value, 'EX', ttlSeconds);
            } else {
                await this.client.set(key, value);
            }
        } catch (err) {
            this.logger.error(`Redis SET error for key "${key}": ${(err as Error).message}`);
        }
    }

    async del(key: string): Promise<void> {
        try {
            await this.client.del(key);
        } catch (err) {
            this.logger.error(`Redis DEL error for key "${key}": ${(err as Error).message}`);
        }
    }

    async incr(key: string): Promise<number> {
        try {
            return await this.client.incr(key);
        } catch (err) {
            this.logger.error(`Redis INCR error for key "${key}": ${(err as Error).message}`);
            return 0;
        }
    }

    async expire(key: string, ttlSeconds: number): Promise<void> {
        try {
            await this.client.expire(key, ttlSeconds);
        } catch (err) {
            this.logger.error(`Redis EXPIRE error for key "${key}": ${(err as Error).message}`);
        }
    }

    /**
     * Find keys matching a pattern using SCAN (not KEYS).
     * SCAN is production-safe: it iterates incrementally instead of blocking
     * Redis while scanning the entire keyspace.
     */
    async keys(pattern: string): Promise<string[]> {
        try {
            const results: string[] = [];
            let cursor = '0';
            do {
                const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
                cursor = nextCursor;
                results.push(...keys);
            } while (cursor !== '0');
            return results;
        } catch (err) {
            this.logger.error(`Redis SCAN error for pattern "${pattern}": ${(err as Error).message}`);
            return [];
        }
    }

    async ping(): Promise<boolean> {
        try {
            const result = await this.client.ping();
            return result === 'PONG';
        } catch {
            return false;
        }
    }
}
