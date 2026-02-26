import { Response } from 'express';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'lax' as const,
    path: '/',
};

export function setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
) {
    // Access token: short-lived (matches JWT expiry, typically 15m-1h)
    res.cookie('accessToken', accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 60 * 60 * 1000, // 1 hour
    });

    // Refresh token: long-lived (7 days)
    res.cookie('refreshToken', refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
}

export function clearAuthCookies(res: Response) {
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
}
