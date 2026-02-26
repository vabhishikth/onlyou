import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

// Spec: Phase 10 — Production Readiness (Redis infrastructure)
// WHY in-memory fallback: Redis is used for rate limiting, caching, and
// non-critical features. In local dev (no Docker/WSL) or cloud without Redis,
// the app should still function. This fallback uses a Map with TTL support so
// rate limiting and caching still work — just not across server restarts.
// Critical-path data (OTP tokens) are stored in PostgreSQL via Prisma, NOT here.

interface MemoryEntry {
    value: string;
    expiresAt: number | null; // null = no expiry
}

@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private readonly client: Redis;

    private connectionLogged = false;
    private connected = false;

    // In-memory fallback store for when Redis is unavailable
    private readonly memoryStore = new Map<string, MemoryEntry>();
    private cleanupTimer: ReturnType<typeof setInterval> | null = null;

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
            this.connected = false;
            if (!this.connectionLogged) {
                this.logger.warn(`Redis unavailable: ${err.message} — using in-memory fallback`);
                this.connectionLogged = true;
            }
        });

        this.client.on('connect', () => {
            this.connected = true;
            this.connectionLogged = false;
            this.logger.log('Redis connected');
            // Clear memory store when Redis becomes available
            this.memoryStore.clear();
        });

        // Attempt connection (non-blocking)
        this.client.connect().catch(() => {
            // Handled by 'error' event
        });

        // Periodic cleanup of expired memory entries (every 30 seconds)
        this.cleanupTimer = setInterval(() => this.cleanupExpired(), 30_000);
    }

    async onModuleDestroy(): Promise<void> {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        await this.client.quit().catch(() => {});
    }

    async get(key: string): Promise<string | null> {
        if (this.connected) {
            try {
                return await this.client.get(key);
            } catch (err) {
                this.logger.error(`Redis GET error for key "${key}": ${(err as Error).message}`);
            }
        }
        // Fallback to memory
        return this.memoryGet(key);
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
        if (this.connected) {
            try {
                if (ttlSeconds) {
                    await this.client.set(key, value, 'EX', ttlSeconds);
                } else {
                    await this.client.set(key, value);
                }
                return true;
            } catch (err) {
                this.logger.error(`Redis SET error for key "${key}": ${(err as Error).message}`);
            }
        }
        // Fallback to memory
        this.memorySet(key, value, ttlSeconds);
        return true;
    }

    async del(key: string): Promise<void> {
        if (this.connected) {
            try {
                await this.client.del(key);
                return;
            } catch (err) {
                this.logger.error(`Redis DEL error for key "${key}": ${(err as Error).message}`);
            }
        }
        this.memoryStore.delete(key);
    }

    async incr(key: string): Promise<number> {
        if (this.connected) {
            try {
                return await this.client.incr(key);
            } catch (err) {
                this.logger.error(`Redis INCR error for key "${key}": ${(err as Error).message}`);
            }
        }
        // Fallback to memory
        return this.memoryIncr(key);
    }

    async expire(key: string, ttlSeconds: number): Promise<void> {
        if (this.connected) {
            try {
                await this.client.expire(key, ttlSeconds);
                return;
            } catch (err) {
                this.logger.error(`Redis EXPIRE error for key "${key}": ${(err as Error).message}`);
            }
        }
        // Fallback: update TTL in memory
        const entry = this.memoryStore.get(key);
        if (entry) {
            entry.expiresAt = Date.now() + ttlSeconds * 1000;
        }
    }

    /**
     * Find keys matching a pattern using SCAN (not KEYS).
     * SCAN is production-safe: it iterates incrementally instead of blocking
     * Redis while scanning the entire keyspace.
     */
    async keys(pattern: string): Promise<string[]> {
        if (this.connected) {
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
            }
        }
        // Fallback: simple glob match on memory keys
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
        const now = Date.now();
        return Array.from(this.memoryStore.entries())
            .filter(([k, v]) => regex.test(k) && (v.expiresAt === null || v.expiresAt > now))
            .map(([k]) => k);
    }

    async ping(): Promise<boolean> {
        if (this.connected) {
            try {
                const result = await this.client.ping();
                return result === 'PONG';
            } catch {
                return false;
            }
        }
        // Memory fallback always "pongs" to indicate service is functional
        return true;
    }

    // --- In-memory helpers ---

    private memoryGet(key: string): string | null {
        const entry = this.memoryStore.get(key);
        if (!entry) return null;
        if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
            this.memoryStore.delete(key);
            return null;
        }
        return entry.value;
    }

    private memorySet(key: string, value: string, ttlSeconds?: number): void {
        this.memoryStore.set(key, {
            value,
            expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
        });
    }

    private memoryIncr(key: string): number {
        const current = this.memoryGet(key);
        const newVal = (current ? parseInt(current, 10) : 0) + 1;
        const entry = this.memoryStore.get(key);
        this.memoryStore.set(key, {
            value: newVal.toString(),
            expiresAt: entry?.expiresAt ?? null,
        });
        return newVal;
    }

    private cleanupExpired(): void {
        const now = Date.now();
        for (const [key, entry] of this.memoryStore) {
            if (entry.expiresAt !== null && entry.expiresAt <= now) {
                this.memoryStore.delete(key);
            }
        }
    }
}
