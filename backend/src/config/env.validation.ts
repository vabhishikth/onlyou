// Spec: Phase 10 — Production Readiness (environment validation)

const VALID_NODE_ENVS = ['development', 'production', 'test'];

interface EnvironmentVariables {
    DATABASE_URL: string;
    JWT_ACCESS_SECRET: string;
    JWT_REFRESH_SECRET: string;
    REDIS_URL: string;
    NODE_ENV: string;
    PORT: number;
    SENTRY_DSN?: string;
    [key: string]: unknown;
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
    const errors: string[] = [];

    // Required fields
    if (!config.DATABASE_URL) {
        errors.push('DATABASE_URL is required');
    }
    if (!config.JWT_ACCESS_SECRET) {
        errors.push('JWT_ACCESS_SECRET is required');
    }
    if (!config.JWT_REFRESH_SECRET) {
        errors.push('JWT_REFRESH_SECRET is required');
    }

    // Defaults
    const redisUrl = (config.REDIS_URL as string) || 'redis://localhost:6379';
    const nodeEnv = (config.NODE_ENV as string) || 'development';
    const port = parseInt(config.PORT as string, 10) || 4000;

    // NODE_ENV validation
    if (!VALID_NODE_ENVS.includes(nodeEnv)) {
        errors.push(`NODE_ENV must be one of: ${VALID_NODE_ENVS.join(', ')} (got "${nodeEnv}")`);
    }

    // Spec: Phase 10 — Production-only required variables
    // These are only required in production; in dev/test they can be optional
    if (nodeEnv === 'production') {
        const productionRequired: string[] = [
            'RAZORPAY_KEY_ID',
            'RAZORPAY_KEY_SECRET',
            'AWS_ACCESS_KEY_ID',
            'AWS_SECRET_ACCESS_KEY',
            'MSG91_AUTH_KEY',
            'ANTHROPIC_API_KEY',
        ];
        for (const key of productionRequired) {
            if (!config[key]) {
                errors.push(`${key} is required in production`);
            }
        }
    }

    if (errors.length > 0) {
        throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
    }

    return {
        ...config,
        DATABASE_URL: config.DATABASE_URL as string,
        JWT_ACCESS_SECRET: config.JWT_ACCESS_SECRET as string,
        JWT_REFRESH_SECRET: config.JWT_REFRESH_SECRET as string,
        REDIS_URL: redisUrl,
        NODE_ENV: nodeEnv,
        PORT: port,
        SENTRY_DSN: config.SENTRY_DSN as string | undefined,
    };
}
