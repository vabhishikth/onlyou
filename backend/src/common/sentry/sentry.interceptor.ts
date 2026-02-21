import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable, tap } from 'rxjs';
import * as Sentry from '@sentry/nestjs';

// Spec: Phase 10 — Production Readiness (Sentry error interceptor)

@Injectable()
export class SentryInterceptor implements NestInterceptor {
    private readonly logger = new Logger(SentryInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        return next.handle().pipe(
            tap({
                error: (error) => {
                    if (!Sentry.isInitialized()) {
                        return;
                    }

                    try {
                        const req = this.getRequest(context);

                        // Set user context
                        if (req?.user?.id) {
                            Sentry.setUser({ id: req.user.id });
                        }

                        // Set request context (strip sensitive fields)
                        const safeContext = this.stripSensitiveFields({
                            handler: context.getHandler()?.name,
                            class: context.getClass()?.name,
                            ip: req?.ip,
                        });
                        Sentry.setContext('request', safeContext);

                        Sentry.captureException(error);
                    } catch (sentryError) {
                        this.logger.warn(`Failed to capture exception in Sentry: ${(sentryError as Error).message}`);
                    }
                },
            }),
        );
    }

    private getRequest(context: ExecutionContext): any {
        try {
            const type = context.getType<string>();
            if (type === 'graphql') {
                const gqlContext = GqlExecutionContext.create(context);
                return gqlContext.getContext().req;
            }
            return context.switchToHttp().getRequest();
        } catch {
            return null;
        }
    }

    private stripSensitiveFields(data: Record<string, unknown>): Record<string, unknown> {
        const sensitiveKeys = ['otp', 'accessToken', 'refreshToken', 'password', 'secret'];
        const stripped = { ...data };
        for (const key of sensitiveKeys) {
            delete stripped[key];
        }
        return stripped;
    }
}
