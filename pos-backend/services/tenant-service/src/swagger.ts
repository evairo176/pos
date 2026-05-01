import swaggerUi from 'swagger-ui-express';
import type { Application } from 'express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'POS Multitenant — Tenant Service API',
    version: '1.0.0',
    description: 'Tenant, subscription, outlet, and user invite management.\n\nAll tenant-scoped endpoints require `Authorization` header with JWT access token. Active tenant is resolved from JWT or `X-Tenant-Id` header.',
    contact: { name: 'POS Team' },
  },
  servers: [
    { url: 'http://localhost:8080/api', description: 'Gateway (Nginx)' },
    { url: 'http://localhost:3002/api', description: 'Direct (Tenant Service)' },
  ],
  tags: [
    { name: 'Tenants', description: 'Tenant management (super admin or owner)' },
    { name: 'Outlets', description: 'Outlet CRUD within active tenant' },
    { name: 'Internal', description: 'Internal service-to-service endpoints' },
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
      ProvisionTenantRequest: {
        type: 'object',
        required: ['name', 'slug', 'owner_email', 'owner_user_id'],
        properties: {
          name: { type: 'string', example: 'Toko ABC', minLength: 2, maxLength: 100 },
          slug: { type: 'string', example: 'toko-abc', pattern: '^[a-z0-9-]+$', minLength: 2, maxLength: 100 },
          owner_email: { type: 'string', format: 'email', example: 'owner@example.com' },
          owner_user_id: { type: 'string', format: 'uuid' },
          plan_id: { type: 'string', format: 'uuid', nullable: true },
        },
      },
      UpdateTenantRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          logo_url: { type: 'string', format: 'uri' },
          status: { type: 'string', enum: ['active', 'suspended', 'cancelled'] },
          settings: { type: 'object', additionalProperties: true },
          plan_id: { type: 'string', format: 'uuid' },
        },
      },
      InviteUserRequest: {
        type: 'object',
        required: ['email', 'role'],
        properties: {
          email: { type: 'string', format: 'email', example: 'manager@example.com' },
          role: { type: 'string', enum: ['owner', 'manager', 'cashier'], example: 'manager' },
        },
      },
      CreateOutletRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', example: 'Branch 2', minLength: 2, maxLength: 100 },
          address: { type: 'string', example: 'Jl. Merdeka 123' },
          phone: { type: 'string', example: '+6281234567890' },
          email: { type: 'string', format: 'email', example: 'branch2@tokoabc.com' },
          timezone: { type: 'string', example: 'Asia/Jakarta', default: 'Asia/Jakarta' },
          tax_rate: { type: 'number', example: 10, minimum: 0, maximum: 100, default: 0 },
        },
      },
      UpdateOutletRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          address: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string', format: 'email' },
          timezone: { type: 'string' },
          tax_rate: { type: 'number', minimum: 0, maximum: 100 },
          is_active: { type: 'boolean' },
        },
      },
      Tenant: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          slug: { type: 'string' },
          schema_name: { type: 'string' },
          owner_email: { type: 'string', format: 'email' },
          logo_url: { type: 'string', nullable: true },
          status: { type: 'string' },
          settings: { type: 'object' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
          plan: { type: 'object', nullable: true },
        },
      },
      Outlet: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          address: { type: 'string', nullable: true },
          phone: { type: 'string', nullable: true },
          email: { type: 'string', nullable: true },
          timezone: { type: 'string' },
          tax_rate: { type: 'number' },
          is_active: { type: 'boolean' },
          settings: { type: 'object' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      ApiSuccess: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {},
          message: { type: 'string', nullable: true },
          meta: { type: 'object', nullable: true },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: {},
            },
          },
        },
      },
    },
  },
  paths: {
    '/internal/tenants/provision': {
      post: {
        tags: ['Internal'],
        summary: '[Internal] Provision new tenant + schema',
        description: 'Called by auth-service during registration. Requires `x-internal-key` header.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProvisionTenantRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Tenant provisioned',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } } },
          },
          '409': { description: 'Slug already taken', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/tenants': {
      get: {
        tags: ['Tenants'],
        summary: 'List all tenants (super admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by name/slug/email' },
        ],
        responses: {
          '200': {
            description: 'Paginated tenant list',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiSuccess' }],
                  example: {
                    success: true,
                    data: [
                      {
                        id: 'uuid',
                        name: 'Toko ABC',
                        slug: 'toko-abc',
                        status: 'active',
                      },
                    ],
                    meta: { page: 1, limit: 20, total: 1, pages: 1 },
                  },
                },
              },
            },
          },
          '403': { description: 'Super admin only', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/tenants/{id}': {
      get: {
        tags: ['Tenants'],
        summary: 'Get tenant by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Tenant details',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } } },
          },
          '404': { description: 'Tenant not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
      put: {
        tags: ['Tenants'],
        summary: 'Update tenant (owner or super admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateTenantRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Tenant updated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } } },
          },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/tenants/{id}/invite': {
      post: {
        tags: ['Tenants'],
        summary: 'Invite user to tenant',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Tenant ID' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/InviteUserRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'User invited or added directly if already registered',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } } },
          },
          '409': { description: 'User already a member', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/outlets': {
      get: {
        tags: ['Outlets'],
        summary: 'List outlets in active tenant',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of outlets',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiSuccess' }],
                  example: {
                    success: true,
                    data: [
                      {
                        id: 'uuid',
                        name: 'Main Outlet',
                        address: null,
                        phone: null,
                        timezone: 'Asia/Jakarta',
                        tax_rate: 0,
                        is_active: true,
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Outlets'],
        summary: 'Create outlet (owner/manager)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateOutletRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Outlet created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } } },
          },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/outlets/{id}': {
      get: {
        tags: ['Outlets'],
        summary: 'Get outlet by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Outlet details',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } } },
          },
          '404': { description: 'Outlet not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
      put: {
        tags: ['Outlets'],
        summary: 'Update outlet (owner/manager)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateOutletRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Outlet updated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } } },
          },
        },
      },
      delete: {
        tags: ['Outlets'],
        summary: 'Delete outlet (owner only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Outlet deleted',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } } },
          },
          '403': { description: 'Owner only', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
  },
};

export function setupSwagger(app: Application) {
  app.use('/api/tenants/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
    },
  }));
}
