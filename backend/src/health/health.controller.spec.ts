import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, HealthCheckResult } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './indicators/prisma.health';
import { RedisHealthIndicator } from './indicators/redis.health';

// Spec: Phase 10 — Production Readiness (health check endpoints)

describe('HealthController', () => {
    let controller: HealthController;
    let healthCheckService: jest.Mocked<HealthCheckService>;
    let prismaHealth: jest.Mocked<PrismaHealthIndicator>;
    let redisHealth: jest.Mocked<RedisHealthIndicator>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [HealthController],
            providers: [
                {
                    provide: HealthCheckService,
                    useValue: {
                        check: jest.fn(),
                    },
                },
                {
                    provide: PrismaHealthIndicator,
                    useValue: {
                        isHealthy: jest.fn(),
                    },
                },
                {
                    provide: RedisHealthIndicator,
                    useValue: {
                        isHealthy: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<HealthController>(HealthController);
        healthCheckService = module.get(HealthCheckService);
        prismaHealth = module.get(PrismaHealthIndicator);
        redisHealth = module.get(RedisHealthIndicator);
    });

    it('should return 200 when all services are healthy', async () => {
        const healthyResult: HealthCheckResult = {
            status: 'ok',
            info: { database: { status: 'up' }, redis: { status: 'up' } },
            error: {},
            details: { database: { status: 'up' }, redis: { status: 'up' } },
        };
        healthCheckService.check.mockResolvedValue(healthyResult);

        const result = await controller.check();
        expect(result.status).toBe('ok');
    });

    it('should return 503 when database is down', async () => {
        healthCheckService.check.mockRejectedValue({
            status: 'error',
            info: { redis: { status: 'up' } },
            error: { database: { status: 'down' } },
            details: { database: { status: 'down' }, redis: { status: 'up' } },
        });

        await expect(controller.check()).rejects.toMatchObject({
            status: 'error',
        });
    });

    it('should return 503 when Redis is down', async () => {
        healthCheckService.check.mockRejectedValue({
            status: 'error',
            info: { database: { status: 'up' } },
            error: { redis: { status: 'down' } },
            details: { database: { status: 'up' }, redis: { status: 'down' } },
        });

        await expect(controller.check()).rejects.toMatchObject({
            status: 'error',
        });
    });

    it('should always return 200 for liveness probe', async () => {
        const result = controller.live();
        expect(result).toEqual({ status: 'ok' });
    });

    it('should check DB connectivity for readiness probe', async () => {
        const readyResult: HealthCheckResult = {
            status: 'ok',
            info: { database: { status: 'up' }, redis: { status: 'up' } },
            error: {},
            details: { database: { status: 'up' }, redis: { status: 'up' } },
        };
        healthCheckService.check.mockResolvedValue(readyResult);

        const result = await controller.ready();
        expect(result.status).toBe('ok');
        expect(healthCheckService.check).toHaveBeenCalled();
    });

    it('should check Redis connectivity for readiness probe', async () => {
        healthCheckService.check.mockRejectedValue({
            status: 'error',
            error: { redis: { status: 'down' } },
        });

        await expect(controller.ready()).rejects.toMatchObject({
            status: 'error',
        });
    });
});

describe('PrismaHealthIndicator', () => {
    it('should return up when database query succeeds', async () => {
        const mockPrisma = { $queryRawUnsafe: jest.fn().mockResolvedValue([{ 1: 1 }]) };
        const indicator = new PrismaHealthIndicator(mockPrisma as any);

        const result = await indicator.isHealthy('database');
        expect(result).toEqual({ database: { status: 'up' } });
    });

    it('should throw when database query fails', async () => {
        const mockPrisma = { $queryRawUnsafe: jest.fn().mockRejectedValue(new Error('Connection refused')) };
        const indicator = new PrismaHealthIndicator(mockPrisma as any);

        await expect(indicator.isHealthy('database')).rejects.toThrow();
    });
});

describe('RedisHealthIndicator', () => {
    it('should return up when ping succeeds', async () => {
        const mockRedis = { ping: jest.fn().mockResolvedValue(true) };
        const indicator = new RedisHealthIndicator(mockRedis as any);

        const result = await indicator.isHealthy('redis');
        expect(result).toEqual({ redis: { status: 'up' } });
    });

    it('should throw when ping fails', async () => {
        const mockRedis = { ping: jest.fn().mockResolvedValue(false) };
        const indicator = new RedisHealthIndicator(mockRedis as any);

        await expect(indicator.isHealthy('redis')).rejects.toThrow();
    });
});
