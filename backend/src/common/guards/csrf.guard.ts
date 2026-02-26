import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

/**
 * CSRF protection guard for cookie-based auth.
 *
 * Requires requests to include a custom header (x-requested-with).
 * Browsers block custom headers on cross-origin form submissions,
 * so this prevents CSRF attacks without the complexity of token rotation.
 *
 * SameSite=Lax cookies provide the first layer of defense.
 * This guard provides defense-in-depth.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const ctx = GqlExecutionContext.create(context);
        const req = ctx.getContext().req;

        // Skip CSRF check for requests using Authorization header (mobile/API clients)
        const authHeader = req.headers?.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return true;
        }

        // For cookie-based auth, require custom header
        const requestedWith = req.headers?.['x-requested-with'];
        if (!requestedWith) {
            throw new ForbiddenException(
                'Missing x-requested-with header. CSRF protection requires this header for cookie-based auth.',
            );
        }

        return true;
    }
}
