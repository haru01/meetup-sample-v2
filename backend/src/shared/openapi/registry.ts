import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import type { OpenAPIObject } from 'openapi3-ts/oas30';
import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

// ============================================================
// OpenAPI Registry (shared)
// ============================================================
export const registry = new OpenAPIRegistry();

// ============================================================
// Common Schemas
// ============================================================

export const UuidSchema = z.string().uuid().openapi({
  description: 'UUID format identifier',
  example: '550e8400-e29b-41d4-a716-446655440000',
});

export const ErrorResponseSchema = z
  .object({
    code: z.string().openapi({ example: 'NOT_FOUND' }),
    message: z.string().openapi({ example: 'Resource not found' }),
  })
  .openapi('ErrorResponse');

registry.register('ErrorResponse', ErrorResponseSchema);

// ============================================================
// Generate OpenAPI Document
// ============================================================

/**
 * Generate OpenAPI document
 */
export function generateOpenAPIDocument(): OpenAPIObject {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'Meetup Community Management API',
      description: 'Backend API for meetup community management',
      version: '0.1.0',
    },
    servers: [{ url: 'http://localhost:3000', description: 'Development server' }],
    tags: [
      { name: 'Auth', description: 'Authentication' },
      { name: 'Communities', description: 'Community management' },
      { name: 'Members', description: 'Community member management' },
      { name: 'Events', description: 'Event management' },
      { name: 'System', description: 'System' },
    ],
  });
}

// ============================================================
// Health Check Path
// ============================================================
registry.registerPath({
  method: 'get',
  path: '/health',
  tags: ['System'],
  summary: 'Health check',
  description: 'Check application health status.',
  responses: {
    200: {
      description: 'Application is running',
      content: {
        'application/json': {
          schema: z.object({
            status: z.literal('ok'),
          }),
        },
      },
    },
  },
});
