import { Global, Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/nestjs';

// Spec: Phase 10 — Production Readiness (Sentry module)

@Global()
@Module({})
export class SentryModule implements OnModuleInit {
    private readonly logger = new Logger(SentryModule.name);

    constructor(private readonly config: ConfigService) {}

    onModuleInit() {
        const dsn = this.config.get<string>('SENTRY_DSN');
        if (!dsn) {
            this.logger.log('SENTRY_DSN not set — error tracking disabled');
            return;
        }

        Sentry.init({
            dsn,
            environment: this.config.get<string>('NODE_ENV') || 'development',
            tracesSampleRate: this.config.get<string>('NODE_ENV') === 'production' ? 0.1 : 1.0,
        });

        this.logger.log('Sentry initialized for error tracking');
    }
}
