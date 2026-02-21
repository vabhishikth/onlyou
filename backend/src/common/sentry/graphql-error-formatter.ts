import { GraphQLFormattedError } from 'graphql';

// Spec: Phase 10 — Production Readiness (GraphQL error formatting)

const CLIENT_SAFE_CODES = [
    'BAD_USER_INPUT',
    'UNAUTHENTICATED',
    'FORBIDDEN',
    'GRAPHQL_VALIDATION_FAILED',
];

export function formatGraphQLError(
    error: GraphQLFormattedError,
    nodeEnv?: string,
): GraphQLFormattedError {
    const isProduction = nodeEnv === 'production';
    const code = (error.extensions?.code as string) || 'INTERNAL_SERVER_ERROR';

    // Development: pass through full error details
    if (!isProduction) {
        return {
            message: error.message,
            locations: error.locations,
            path: error.path,
            extensions: error.extensions,
        };
    }

    // Production: strip sensitive details
    const formatted: GraphQLFormattedError = {
        message: CLIENT_SAFE_CODES.includes(code)
            ? error.message
            : 'Internal server error',
        locations: error.locations,
        path: error.path,
        extensions: {
            code,
        },
    };

    return formatted;
}
