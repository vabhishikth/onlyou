import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck, HealthCheckResult } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './indicators/prisma.health';
import { RedisHealthIndicator } from './indicators/redis.health';

// Spec: Phase 10 — Production Readiness (health check endpoints)

@Controller('health')
export class HealthController {
    constructor(
        private readonly health: HealthCheckService,
        private readonly prismaHealth: PrismaHealthIndicator,
        private readonly redisHealth: RedisHealthIndicator,
    ) {}

    @Get()
    @HealthCheck()
    check(): Promise<HealthCheckResult> {
        return this.health.check([
            () => this.prismaHealth.isHealthy('database'),
            () => this.redisHealth.isHealthy('redis'),
        ]);
    }

    @Get('live')
    live(): { status: string } {
        return { status: 'ok' };
    }

    @Get('ready')
    @HealthCheck()
    ready(): Promise<HealthCheckResult> {
        return this.health.check([
            () => this.prismaHealth.isHealthy('database'),
            () => this.redisHealth.isHealthy('redis'),
        ]);
    }
}
