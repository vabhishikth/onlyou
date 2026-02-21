import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from './rate-limit.guard';
import { RedisService } from '../../redis/redis.service';

// Spec: Phase 10 — Production Readiness (rate limiting)

describe('RateLimitGuard', () => {
    let guard: RateLimitGuard;
    let redisService: jest.Mocked<RedisService>;
    let reflector: jest.Mocked<Reflector>;

    const createMockContext = (ip: string, forwardedFor?: string): ExecutionContext => {
        const req = {
            ip,
            headers: forwardedFor ? { 'x-forwarded-for': forwardedFor } : {},
        };
        return {
            getHandler: jest.fn(),
            getClass: jest.fn(),
            switchToHttp: jest.fn().mockReturnValue({ getRequest: () => req }),
            getType: jest.fn().mockReturnValue('graphql'),
            getArgs: jest.fn().mockReturnValue([null, null, { req }, null]),
        } as unknown as ExecutionContext;
    };

    beforeEach(() => {
        redisService = {
            incr: jest.fn(),
            expire: jest.fn(),
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            keys: jest.fn(),
            ping: jest.fn(),
        } as any;

        reflector = {
            getAllAndOverride: jest.fn(),
        } as any;

        guard = new RateLimitGuard(redisService, reflector);
    });

    it('should allow request when under limit', async () => {
        reflector.getAllAndOverride.mockReturnValue(undefined);
        redisService.incr.mockResolvedValue(1);

        const context = createMockContext('127.0.0.1');
        const result = await guard.canActivate(context);

        expect(result).toBe(true);
    });

    it('should block request when at limit', async () => {
        reflector.getAllAndOverride.mockReturnValue({ limit: 5, windowSeconds: 60 });
        redisService.incr.mockResolvedValue(6);

        const context = createMockContext('127.0.0.1');

        await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    });

    it('should use correct Redis key format', async () => {
        reflector.getAllAndOverride.mockReturnValue(undefined);
        redisService.incr.mockResolvedValue(1);

        const context = createMockContext('192.168.1.1');
        await guard.canActivate(context);

        expect(redisService.incr).toHaveBeenCalledWith(expect.stringContaining('rl:192.168.1.1:'));
    });

    it('should extract IP from X-Forwarded-For header', async () => {
        reflector.getAllAndOverride.mockReturnValue(undefined);
        redisService.incr.mockResolvedValue(1);

        const context = createMockContext('127.0.0.1', '203.0.113.50, 70.41.3.18');
        await guard.canActivate(context);

        expect(redisService.incr).toHaveBeenCalledWith(expect.stringContaining('rl:203.0.113.50:'));
    });

    it('should fall back to req.ip when no forwarded header', async () => {
        reflector.getAllAndOverride.mockReturnValue(undefined);
        redisService.incr.mockResolvedValue(1);

        const context = createMockContext('10.0.0.1');
        await guard.canActivate(context);

        expect(redisService.incr).toHaveBeenCalledWith(expect.stringContaining('rl:10.0.0.1:'));
    });

    it('should use custom limits from @RateLimit decorator', async () => {
        reflector.getAllAndOverride.mockReturnValue({ limit: 3, windowSeconds: 30 });
        redisService.incr.mockResolvedValue(4);

        const context = createMockContext('127.0.0.1');

        await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    });

    it('should use default limits when no decorator', async () => {
        reflector.getAllAndOverride.mockReturnValue(undefined);
        redisService.incr.mockResolvedValue(100); // At default limit

        const context = createMockContext('127.0.0.1');
        const result = await guard.canActivate(context);
        expect(result).toBe(true);

        // 101 should exceed default
        redisService.incr.mockResolvedValue(101);
        await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    });

    it('should allow request when Redis fails (fail-open)', async () => {
        reflector.getAllAndOverride.mockReturnValue(undefined);
        redisService.incr.mockRejectedValue(new Error('Connection refused'));

        const context = createMockContext('127.0.0.1');
        const result = await guard.canActivate(context);

        expect(result).toBe(true);
    });
});
