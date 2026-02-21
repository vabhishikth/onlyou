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
});
