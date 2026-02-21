import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { RedisService } from '../../redis/redis.service';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';

// Spec: Phase 10 — Production Readiness (rate limiting guard)

const DEFAULT_LIMIT = 100;
const DEFAULT_WINDOW_SECONDS = 60;

@Injectable()
export class RateLimitGuard implements CanActivate {
    private readonly logger = new Logger(RateLimitGuard.name);

    constructor(
        private readonly redis: RedisService,
        private readonly reflector: Reflector,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const options = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(
            RATE_LIMIT_KEY,
            [context.getHandler(), context.getClass()],
        );

        const limit = options?.limit ?? DEFAULT_LIMIT;
        const windowSeconds = options?.windowSeconds ?? DEFAULT_WINDOW_SECONDS;

        const req = this.getRequest(context);
        const ip = this.extractIp(req);
        const windowKey = Math.floor(Date.now() / (windowSeconds * 1000));
        const key = `rl:${ip}:${windowKey}`;

        try {
            const count = await this.redis.incr(key);

            // Set expiry on first request in window
            if (count === 1) {
                await this.redis.expire(key, windowSeconds);
            }

            if (count > limit) {
                throw new HttpException(
                    'Too many requests. Please try again later.',
                    HttpStatus.TOO_MANY_REQUESTS,
                );
            }

            return true;
        } catch (error) {
            // Re-throw HTTP exceptions (rate limit exceeded)
            if (error instanceof HttpException) {
                throw error;
            }

            // Fail-open: if Redis is down, allow the request
            this.logger.warn(`Rate limiting failed (Redis error), allowing request: ${(error as Error).message}`);
            return true;
        }
    }

    private getRequest(context: ExecutionContext): any {
        const type = context.getType<string>();
        if (type === 'graphql') {
            const gqlContext = GqlExecutionContext.create(context);
            return gqlContext.getContext().req;
        }
        return context.switchToHttp().getRequest();
    }

    private extractIp(req: any): string {
        const forwarded = req?.headers?.['x-forwarded-for'];
        if (forwarded) {
            return (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim();
        }
        return req?.ip || 'unknown';
    }
}
