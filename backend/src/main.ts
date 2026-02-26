import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { SentryInterceptor } from './common/sentry/sentry.interceptor';
import { CsrfGuard } from './common/guards/csrf.guard';

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
        // Try Unix first (Linux/macOS)
        try {
            execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, { stdio: 'ignore' });
        } catch {
            // Try Windows
            try {
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
                        }
                    }
                }
            } catch {
                // Port already free
            }
        }
    } catch {
        // Silently ignore
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

    // Cookie parsing (required for HttpOnly auth cookies)
    app.use(cookieParser());

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

    // CSRF protection for cookie-based auth (requires x-requested-with header)
    app.useGlobalGuards(new CsrfGuard());

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
