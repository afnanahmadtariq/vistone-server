import { GraphQLError, GraphQLFormattedError } from 'graphql';

// ─── Custom Error Class for Microservice Errors ─────────────────────────────

/**
 * Structured error thrown by ServiceClient when a downstream microservice
 * returns an HTTP error. Carries the HTTP status code, service name,
 * operation type, and any validation details from the response body.
 */
export class ServiceError extends Error {
  public readonly statusCode: number;
  public readonly service: string;
  public readonly operation: string;
  public readonly details: unknown;
  public readonly serviceMessage: string;

  constructor(
    message: string,
    statusCode: number,
    service: string,
    operation: string,
    details?: unknown,
  ) {
    super(message);
    this.name = 'ServiceError';
    this.statusCode = statusCode;
    this.service = service;
    this.operation = operation;
    this.details = details;
    this.serviceMessage = message;
  }
}

// ─── HTTP Status → GraphQL Error Code Mapping ───────────────────────────────

/**
 * Maps an HTTP status code from a downstream service to a GraphQL
 * error code string that the frontend can switch on.
 */
export function mapHttpStatusToGraphQLCode(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'BAD_USER_INPUT';
    case 401:
      return 'UNAUTHENTICATED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'VALIDATION_ERROR';
    case 429:
      return 'RATE_LIMITED';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    default:
      if (statusCode >= 400 && statusCode < 500) return 'BAD_USER_INPUT';
      return 'INTERNAL_SERVER_ERROR';
  }
}

// ─── Apollo formatError Handler ─────────────────────────────────────────────

/**
 * Apollo Server `formatError` callback.
 *
 * Converts all errors into a consistent shape:
 * ```json
 * {
 *   "message": "Human-readable error description",
 *   "extensions": {
 *     "code": "BAD_USER_INPUT",
 *     "statusCode": 400,
 *     "service": "Auth Service",
 *     "validationErrors": [{ ... }]
 *   }
 * }
 * ```
 */
export function formatGraphQLError(
  formattedError: GraphQLFormattedError,
  error: unknown,
): GraphQLFormattedError {
  // Retrieve the original error that caused this GraphQL error
  const originalError =
    error instanceof GraphQLError ? error.originalError : undefined;

  // ── ServiceError from backendClient ──
  if (originalError instanceof ServiceError) {
    return {
      message: originalError.serviceMessage,
      locations: formattedError.locations,
      path: formattedError.path,
      extensions: {
        code: mapHttpStatusToGraphQLCode(originalError.statusCode),
        statusCode: originalError.statusCode,
        service: originalError.service,
        ...(originalError.details
          ? { validationErrors: originalError.details }
          : {}),
      },
    };
  }

  // ── GraphQLError thrown directly (e.g., from auth helpers or resolvers) ──
  if (error instanceof GraphQLError && error.extensions?.code) {
    return {
      message: formattedError.message,
      locations: formattedError.locations,
      path: formattedError.path,
      extensions: {
        code: error.extensions.code,
        ...(error.extensions.statusCode
          ? { statusCode: error.extensions.statusCode }
          : {}),
        ...(error.extensions.service
          ? { service: error.extensions.service }
          : {}),
        ...(error.extensions.validationErrors
          ? { validationErrors: error.extensions.validationErrors }
          : {}),
      },
    };
  }

  // ── Fallback: classify based on message pattern ──
  const msg = formattedError.message || '';

  if (
    msg === 'Not authenticated' ||
    msg.includes('Not authenticated') ||
    msg.includes('Authentication required')
  ) {
    return {
      ...formattedError,
      extensions: {
        ...(formattedError.extensions || {}),
        code: 'UNAUTHENTICATED',
        statusCode: 401,
      },
    };
  }

  if (msg.includes('Account is paused')) {
    return {
      ...formattedError,
      extensions: {
        ...(formattedError.extensions || {}),
        code: 'FORBIDDEN',
        statusCode: 403,
      },
    };
  }

  if (msg.startsWith('Forbidden') || msg.includes('permission')) {
    return {
      ...formattedError,
      extensions: {
        ...(formattedError.extensions || {}),
        code: 'FORBIDDEN',
        statusCode: 403,
      },
    };
  }

  if (msg.includes('not found') || msg.includes('Not found')) {
    return {
      ...formattedError,
      extensions: {
        ...(formattedError.extensions || {}),
        code: 'NOT_FOUND',
        statusCode: 404,
      },
    };
  }

  if (msg.includes('already exists') || msg.includes('duplicate')) {
    return {
      ...formattedError,
      extensions: {
        ...(formattedError.extensions || {}),
        code: 'CONFLICT',
        statusCode: 409,
      },
    };
  }

  if (msg.includes('Validation failed') || msg.includes('is required')) {
    return {
      ...formattedError,
      extensions: {
        ...(formattedError.extensions || {}),
        code: 'BAD_USER_INPUT',
        statusCode: 400,
      },
    };
  }

  // ── Default: INTERNAL_SERVER_ERROR ──
  return {
    ...formattedError,
    extensions: {
      ...(formattedError.extensions || {}),
      code:
        (formattedError.extensions?.code as string) || 'INTERNAL_SERVER_ERROR',
      statusCode:
        (formattedError.extensions?.statusCode as number) || 500,
    },
  };
}
