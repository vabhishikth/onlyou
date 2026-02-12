import { NextRequest, NextResponse } from 'next/server';

/**
 * Subdomain routing middleware for Onlyou portals
 *
 * Routes:
 * - doctor.onlyou.life → /doctor/
 * - admin.onlyou.life → /admin/
 * - lab.onlyou.life → /lab/
 * - collect.onlyou.life → /collect/
 * - pharmacy.onlyou.life → /pharmacy/
 * - onlyou.life (no subdomain) → /landing/
 */

// Portal subdomain mapping
const PORTAL_ROUTES: Record<string, string> = {
    doctor: '/doctor',
    admin: '/admin',
    lab: '/lab',
    collect: '/collect',
    pharmacy: '/pharmacy',
};

// Protected routes that require authentication
const PROTECTED_ROUTES = ['/doctor', '/admin', '/lab', '/collect', '/pharmacy'];

export function middleware(request: NextRequest) {
    const url = request.nextUrl.clone();
    const hostname = request.headers.get('host') || '';

    // Extract subdomain from hostname
    // Handles: doctor.onlyou.life, doctor.localhost:3000, etc.
    const subdomain = getSubdomain(hostname);

    // Skip middleware for static files and API routes
    if (
        url.pathname.startsWith('/_next') ||
        url.pathname.startsWith('/api') ||
        url.pathname.includes('.') // static files
    ) {
        return NextResponse.next();
    }

    // Handle subdomain routing
    if (subdomain && PORTAL_ROUTES[subdomain]) {
        const portalPath = PORTAL_ROUTES[subdomain];

        // If not already on the portal path, rewrite
        if (!url.pathname.startsWith(portalPath)) {
            // Check if trying to access auth routes
            if (url.pathname.startsWith('/login') || url.pathname.startsWith('/auth')) {
                url.pathname = `/login`;
                return NextResponse.rewrite(url);
            }

            // Rewrite to portal path
            url.pathname = `${portalPath}${url.pathname}`;
            return NextResponse.rewrite(url);
        }
    }

    // Check authentication for protected routes
    const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
        url.pathname.startsWith(route)
    );

    if (isProtectedRoute) {
        // Check for auth token in cookies
        const token = request.cookies.get('accessToken')?.value;

        if (!token) {
            // Redirect to login with return URL
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('returnUrl', url.pathname);
            return NextResponse.redirect(loginUrl);
        }

        // Note: Role validation happens on the client/API side
        // The middleware just ensures there's a token present
    }

    // No subdomain or unrecognized subdomain → continue to requested path
    return NextResponse.next();
}

/**
 * Extract subdomain from hostname
 */
function getSubdomain(hostname: string): string | null {
    // Remove port if present
    const host = hostname.split(':')[0] ?? '';

    if (!host) return null;

    // Handle localhost for development
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
        // Check for subdomain-style localhost (e.g., doctor.localhost)
        const parts = host.split('.');
        const firstPart = parts[0];
        if (parts.length > 1 && firstPart && firstPart !== 'localhost' && firstPart !== '127') {
            return firstPart;
        }
        return null;
    }

    // Handle production domains (onlyou.life, onlyou.co.in)
    const parts = host.split('.');

    // Need at least 3 parts for subdomain (sub.domain.tld)
    if (parts.length >= 3) {
        // Check if it's a known domain
        const domain = parts.slice(-2).join('.');
        const firstPart = parts[0];
        if ((domain === 'onlyou.life' || domain === 'onlyou.co.in') && firstPart) {
            return firstPart;
        }

        // Handle co.in TLD (4 parts minimum: sub.domain.co.in)
        if (parts.length >= 4 && parts.slice(-2).join('.') === 'co.in' && firstPart) {
            return firstPart;
        }
    }

    return null;
}

export const config = {
    matcher: [
        /*
         * Match all paths except:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico (favicon)
         * - public files (files in public/)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/).*)',
    ],
};
