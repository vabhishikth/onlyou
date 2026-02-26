import { validate } from './env.validation';

// Spec: Phase 10 — Production Readiness (environment validation)

const validEnv = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/onlyou',
    JWT_ACCESS_SECRET: 'test-access-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    REDIS_URL: 'redis://localhost:6379',
    NODE_ENV: 'development',
    PORT: '4000',
};

describe('Environment Validation', () => {
    it('should pass with valid configuration', () => {
        const result = validate(validEnv);
        expect(result.DATABASE_URL).toBe(validEnv.DATABASE_URL);
        expect(result.JWT_ACCESS_SECRET).toBe(validEnv.JWT_ACCESS_SECRET);
    });

    it('should throw when DATABASE_URL is missing', () => {
        const { DATABASE_URL, ...rest } = validEnv;
        expect(() => validate(rest)).toThrow(/DATABASE_URL/);
    });

    it('should throw when JWT_ACCESS_SECRET is missing', () => {
        const { JWT_ACCESS_SECRET, ...rest } = validEnv;
        expect(() => validate(rest)).toThrow(/JWT_ACCESS_SECRET/);
    });

    it('should default REDIS_URL to localhost when not provided', () => {
        const { REDIS_URL, ...rest } = validEnv;
        const result = validate(rest);
        expect(result.REDIS_URL).toBe('redis://localhost:6379');
    });

    it('should throw for invalid NODE_ENV value', () => {
        expect(() => validate({ ...validEnv, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
    });

    describe('production-only required variables', () => {
        const productionEnv = {
            ...validEnv,
            NODE_ENV: 'production',
            RAZORPAY_KEY_ID: 'rzp_live_test123',
            RAZORPAY_KEY_SECRET: 'secret123',
            AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
            AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            MSG91_AUTH_KEY: 'msg91-key-123',
            ANTHROPIC_API_KEY: 'sk-ant-api-key-123',
        };

        it('should pass in production with all required vars', () => {
            expect(() => validate(productionEnv)).not.toThrow();
        });

        it('should throw in production when RAZORPAY_KEY_ID is missing', () => {
            const { RAZORPAY_KEY_ID, ...rest } = productionEnv;
            expect(() => validate(rest)).toThrow(/RAZORPAY_KEY_ID/);
        });

        it('should throw in production when RAZORPAY_KEY_SECRET is missing', () => {
            const { RAZORPAY_KEY_SECRET, ...rest } = productionEnv;
            expect(() => validate(rest)).toThrow(/RAZORPAY_KEY_SECRET/);
        });

        it('should throw in production when AWS_ACCESS_KEY_ID is missing', () => {
            const { AWS_ACCESS_KEY_ID, ...rest } = productionEnv;
            expect(() => validate(rest)).toThrow(/AWS_ACCESS_KEY_ID/);
        });

        it('should throw in production when AWS_SECRET_ACCESS_KEY is missing', () => {
            const { AWS_SECRET_ACCESS_KEY, ...rest } = productionEnv;
            expect(() => validate(rest)).toThrow(/AWS_SECRET_ACCESS_KEY/);
        });

        it('should throw in production when MSG91_AUTH_KEY is missing', () => {
            const { MSG91_AUTH_KEY, ...rest } = productionEnv;
            expect(() => validate(rest)).toThrow(/MSG91_AUTH_KEY/);
        });

        it('should throw in production when ANTHROPIC_API_KEY is missing', () => {
            const { ANTHROPIC_API_KEY, ...rest } = productionEnv;
            expect(() => validate(rest)).toThrow(/ANTHROPIC_API_KEY/);
        });

        it('should NOT require production vars in development', () => {
            // validEnv has NODE_ENV=development and none of the production-only vars
            expect(() => validate(validEnv)).not.toThrow();
        });

        it('should NOT require production vars in test', () => {
            const testEnv = { ...validEnv, NODE_ENV: 'test' };
            expect(() => validate(testEnv)).not.toThrow();
        });
    });
});
