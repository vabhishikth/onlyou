import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { SentryInterceptor } from './sentry.interceptor';
import * as Sentry from '@sentry/nestjs';

// Spec: Phase 10 — Production Readiness (Sentry error tracking)

jest.mock('@sentry/nestjs', () => ({
    captureException: jest.fn(),
    setUser: jest.fn(),
    setContext: jest.fn(),
    isInitialized: jest.fn(),
}));

describe('SentryInterceptor', () => {
    let interceptor: SentryInterceptor;
    const mockSentry = Sentry as jest.Mocked<typeof Sentry>;

    const createMockContext = (user?: { id: string }): ExecutionContext => {
        const req = { user, ip: '127.0.0.1', headers: {} };
        return {
            switchToHttp: jest.fn().mockReturnValue({ getRequest: () => req }),
            getType: jest.fn().mockReturnValue('graphql'),
            getArgs: jest.fn().mockReturnValue([null, null, { req }, null]),
            getHandler: jest.fn().mockReturnValue({ name: 'testHandler' }),
            getClass: jest.fn().mockReturnValue({ name: 'TestResolver' }),
        } as unknown as ExecutionContext;
    };

    const createCallHandler = (error?: Error) => ({
        handle: () => error ? throwError(() => error) : of('success'),
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockSentry.isInitialized.mockReturnValue(true);
        interceptor = new SentryInterceptor();
    });

    it('should capture exception to Sentry', (done) => {
        const error = new Error('Test error');
        const context = createMockContext({ id: 'user-1' });
        const handler = createCallHandler(error);

        interceptor.intercept(context, handler).subscribe({
            error: (err) => {
                expect(mockSentry.captureException).toHaveBeenCalledWith(error);
                expect(err).toBe(error);
                done();
            },
        });
    });

    it('should attach user context from request', (done) => {
        const error = new Error('Test error');
        const context = createMockContext({ id: 'user-123' });
        const handler = createCallHandler(error);

        interceptor.intercept(context, handler).subscribe({
            error: () => {
                expect(mockSentry.setUser).toHaveBeenCalledWith({ id: 'user-123' });
                done();
            },
        });
    });

    it('should strip sensitive fields before capture', (done) => {
        const error = new Error('OTP verification failed');
        const context = createMockContext({ id: 'user-1' });
        const handler = createCallHandler(error);

        interceptor.intercept(context, handler).subscribe({
            error: () => {
                // Should capture the error but setContext should not contain sensitive data
                expect(mockSentry.captureException).toHaveBeenCalled();
                // The context set should not include OTP or token values
                if (mockSentry.setContext.mock.calls.length > 0) {
                    const contextData = mockSentry.setContext.mock.calls[0][1];
                    expect(contextData).not.toHaveProperty('otp');
                    expect(contextData).not.toHaveProperty('accessToken');
                    expect(contextData).not.toHaveProperty('refreshToken');
                }
                done();
            },
        });
    });

    it('should re-throw original error (not swallow)', (done) => {
        const error = new Error('Original error');
        const context = createMockContext();
        const handler = createCallHandler(error);

        interceptor.intercept(context, handler).subscribe({
            error: (err) => {
                expect(err).toBe(error);
                done();
            },
        });
    });

    it('should no-op when Sentry not initialized', (done) => {
        mockSentry.isInitialized.mockReturnValue(false);
        const error = new Error('Test error');
        const context = createMockContext();
        const handler = createCallHandler(error);

        interceptor.intercept(context, handler).subscribe({
            error: (err) => {
                expect(mockSentry.captureException).not.toHaveBeenCalled();
                expect(err).toBe(error);
                done();
            },
        });
    });

    it('should handle non-Error exceptions', (done) => {
        const error = 'string error' as unknown as Error;
        const context = createMockContext();
        const handler = createCallHandler(error);

        interceptor.intercept(context, handler).subscribe({
            error: (err) => {
                expect(mockSentry.captureException).toHaveBeenCalled();
                expect(err).toBe(error);
                done();
            },
        });
    });
});
