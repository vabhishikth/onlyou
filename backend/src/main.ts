import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { SentryInterceptor } from './common/sentry/sentry.interceptor';

// Spec: Phase 10 — Production Readiness (bootstrap with security hardening)

const PRODUCTION_ORIGINS = [
    'https://onlyou.life',
    'https://doctor.onlyou.life',
    'https://admin.onlyou.life',
    'https://lab.onlyou.life',
    'https://collect.onlyou.life',
    'https://pharmacy.onlyou.life',
];

function killPortHolder(port: number | string) {
    try {
        const { execSync } = require('child_process');
        const output = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
            encoding: 'utf8',
        });
        const lines = output.trim().split('\n');
        for (const line of lines) {
            const pidMatch = line.match(/LISTENING\s+(\d+)/);
            if (pidMatch) {
                const pid = Number(pidMatch[1]);
                if (pid !== process.pid) {
                    execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
                    execSync('ping -n 2 127.0.0.1 > NUL', { stdio: 'ignore' });
                }
            }
        }
    } catch {
        // Silently ignore — port may already be free
    }
}

async function bootstrap() {
    const logger = new Logger('Bootstrap');
    const port = process.env.PORT || 4000;
    const isProduction = process.env.NODE_ENV === 'production';

    // Kill any stale process holding the port (development only)
    if (!isProduction) {
        killPortHolder(port);
    }

    const app = await NestFactory.create(AppModule, {
        rawBody: true, // Enables req.rawBody for webhook HMAC signature verification
    });

    // Security headers
    app.use(helmet({
        contentSecurityPolicy: isProduction ? undefined : false,
        crossOriginEmbedderPolicy: false,
    }));

    // CORS configuration
    const corsOrigin = process.env.CORS_ORIGIN;
    app.enableCors({
        origin: isProduction
            ? (corsOrigin ? corsOrigin.split(',') : PRODUCTION_ORIGINS)
            : true,
        credentials: true,
    });

    // Global error tracking interceptor
    app.useGlobalInterceptors(new SentryInterceptor());

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
        }),
    );

    await app.listen(port, '0.0.0.0');

    logger.log(`Onlyou API running at http://localhost:${port}/graphql (${isProduction ? 'production' : 'development'})`);
}

bootstrap();
