import * as OpenApiValidator from 'express-openapi-validator';
import type { RequestHandler } from 'express';
import type { OpenAPIObject } from 'openapi3-ts/oas30';

// ============================================================
// OpenAPI Validator Middleware
// ============================================================

/**
 * Create express-openapi-validator middleware from an OpenAPI document.
 * Validates requests against the spec; validation errors become
 * structured errors that errorHandlerMiddleware handles.
 */
export function createOpenApiValidatorMiddleware(apiDoc: OpenAPIObject): RequestHandler[] {
  return OpenApiValidator.middleware({
    apiSpec: apiDoc as Parameters<typeof OpenApiValidator.middleware>[0]['apiSpec'],
    validateRequests: true,
    validateResponses: false,
  });
}
