import swaggerUi from 'swagger-ui-express';
import type { Application } from 'express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'POS Multitenant — Auth Service API',
    version: '1.0.0',
    description: 'Authentication & identity service for POS Multitenant.\n\nHandles registration, login, token refresh, password reset, and tenant switching.',
    contact: { name: 'POS Team' },
  },
  servers: [
    { url: 'http://localhost:8080/api/auth', description: 'Gateway (Nginx)' },
    { url: 'http://localhost:3001/api/auth', description: 'Direct (Auth Service)' },
  ],
  tags: [
    { name: 'Auth', description: 'Authentication endpoints' },
    { name: 'User', description: 'Current user management' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token. Prefix with `Bearer ` in Authorization header.',
      },
    },
    schemas: {
      RegisterRequest: {
        type: 'object',
        required: ['full_name', 'email', 'password', 'business_name'],
        properties: {
          full_name: { type: 'string', example: 'John Doe', minLength: 2, maxLength: 100 },
          email: { type: 'string', format: 'email', example: 'john@example.com' },
          password: { type: 'string', example: 'secret123', minLength: 8, maxLength: 100 },
          phone: { type: 'string', example: '+6281234567890' },
          business_name: { type: 'string', example: 'Toko ABC', minLength: 2, maxLength: 100 },
          business_slug: { type: 'string', example: 'toko-abc', pattern: '^[a-z0-9-]+$', minLength: 2, maxLength: 100 },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'john@example.com' },
          password: { type: 'string', example: 'secret123' },
        },
      },
      RefreshRequest: {
        type: 'object',
        required: ['refresh_token'],
        properties: {
          refresh_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...', minLength: 10 },
        },
      },
      ForgotRequest: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email', example: 'john@example.com' },
        },
      },
      ResetRequest: {
        type: 'object',
        required: ['token', 'new_password'],
        properties: {
          token: { type: 'string', example: 'a1b2c3...', minLength: 10 },
          new_password: { type: 'string', example: 'newSecret123', minLength: 8, maxLength: 100 },
        },
      },
      SwitchTenantRequest: {
        type: 'object',
        required: ['tenant_id'],
        properties: {
          tenant_id: { type: 'string', format: 'uuid', example: 'a1b2c3d4-...' },
          outlet_id: { type: 'string', format: 'uuid', example: 'e5f6g7h8-...' },
        },
      },
      Tokens: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
        },
      },
      TenantMembership: {
        type: 'object',
        properties: {
          tenant_id: { type: 'string', format: 'uuid' },
          tenant_name: { type: 'string' },
          schema: { type: 'string' },
          role: { type: 'string', enum: ['owner', 'manager', 'cashier'] },
          outlet_id: { type: 'string', format: 'uuid', nullable: true },
        },
      },
      ApiSuccess: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {},
          message: { type: 'string', nullable: true },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'UNAUTHORIZED' },
              message: { type: 'string', example: 'Invalid or expired token' },
              details: {},
            },
          },
        },
      },
    },
  },
  paths: {
    '/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register new business owner + create tenant',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Registered successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiSuccess' }],
                  example: {
                    success: true,
                    data: {
                      user: { id: 'uuid', email: 'john@example.com', full_name: 'John Doe' },
                      tenant: { id: 'uuid', name: 'Toko ABC', slug: 'toko-abc', schema_name: 'tenant_a1b2c3d4e5f6' },
                      accessToken: 'eyJ...',
                      refreshToken: 'eyJ...',
                    },
                    message: 'Registered',
                  },
                },
              },
            },
          },
          '409': { description: 'Email or slug already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email + password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Logged in',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiSuccess' }],
                },
              },
            },
          },
          '401': { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token (token rotation)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'New tokens issued',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiSuccess' }],
                  example: { success: true, data: { accessToken: 'eyJ...', refreshToken: 'eyJ...' }, message: 'Token refreshed' },
                },
              },
            },
          },
          '401': { description: 'Invalid or revoked refresh token', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout (revoke refresh token)',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refresh_token: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Logged out', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } } } },
        },
      },
    },
    '/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset email',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ForgotRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Reset email sent (or silently ignored if email not found)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } } } },
        },
      },
    },
    '/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password with token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ResetRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Password reset successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } } } },
          '400': { description: 'Invalid or expired token', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/me': {
      get: {
        tags: ['User'],
        summary: 'Get current user profile & tenant memberships',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Current user',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiSuccess' }],
                  example: {
                    success: true,
                    data: {
                      user: { id: 'uuid', email: 'john@example.com', full_name: 'John Doe' },
                      tenants: [{ tenant_id: 'uuid', tenant_name: 'Toko ABC', schema: 'tenant_a1b2c3d4e5f6', role: 'owner', outlet_id: null }],
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/switch-tenant': {
      post: {
        tags: ['User'],
        summary: 'Switch active tenant / outlet (returns new tokens)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SwitchTenantRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'New tokens with updated active tenant',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiSuccess' }],
                  example: {
                    success: true,
                    data: { accessToken: 'eyJ...', refreshToken: 'eyJ...' },
                    message: 'Active tenant switched',
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          '403': { description: 'Not a member of this tenant', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
  },
};

export function setupSwagger(app: Application) {
  app.use('/api/auth/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
    },
  }));
}
