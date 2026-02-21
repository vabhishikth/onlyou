import { GraphQLError, GraphQLFormattedError } from 'graphql';
import { formatGraphQLError } from './graphql-error-formatter';

// Spec: Phase 10 — Production Readiness (GraphQL error formatting)

describe('formatGraphQLError', () => {
    it('should strip stack trace in production', () => {
        const error = new GraphQLError('Something went wrong', {
            extensions: {
                code: 'INTERNAL_SERVER_ERROR',
                stacktrace: ['Error: Something went wrong', '    at Object.<anonymous>'],
            },
        });

        const formatted = formatGraphQLError(error, 'production');

        expect(formatted.extensions?.stacktrace).toBeUndefined();
    });

    it('should preserve message for validation errors', () => {
        const error = new GraphQLError('Invalid input: phone number is required', {
            extensions: { code: 'BAD_USER_INPUT' },
        });

        const formatted = formatGraphQLError(error, 'production');

        expect(formatted.message).toBe('Invalid input: phone number is required');
    });

    it('should return generic message for unexpected errors in production', () => {
        const error = new GraphQLError('Prisma query failed: connection timeout', {
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });

        const formatted = formatGraphQLError(error, 'production');

        expect(formatted.message).toBe('Internal server error');
    });

    it('should pass full error details in development', () => {
        const error = new GraphQLError('Prisma query failed: connection timeout', {
            extensions: {
                code: 'INTERNAL_SERVER_ERROR',
                stacktrace: ['Error: Prisma query failed'],
            },
        });

        const formatted = formatGraphQLError(error, 'development');

        expect(formatted.message).toBe('Prisma query failed: connection timeout');
        expect(formatted.extensions?.stacktrace).toBeDefined();
    });

    it('should include error code in extensions', () => {
        const error = new GraphQLError('Not authorized', {
            extensions: { code: 'UNAUTHENTICATED' },
        });

        const formatted = formatGraphQLError(error, 'production');

        expect(formatted.extensions?.code).toBe('UNAUTHENTICATED');
    });
});
