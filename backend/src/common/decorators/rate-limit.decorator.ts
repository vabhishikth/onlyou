import { SetMetadata } from '@nestjs/common';

// Spec: Phase 10 — Production Readiness (rate limiting decorator)

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
    limit: number;
    windowSeconds: number;
}

export const RateLimit = (limit: number, windowSeconds: number) =>
    SetMetadata(RATE_LIMIT_KEY, { limit, windowSeconds } as RateLimitOptions);
