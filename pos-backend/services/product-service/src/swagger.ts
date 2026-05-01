import swaggerUi from 'swagger-ui-express';
import type { Application } from 'express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'POS Multitenant — Product Service API',
    version: '1.0.0',
    description: 'Product, category, and stock management.\n\nAll endpoints require JWT authentication and active tenant context.',
    contact: { name: 'POS Team' },
  },
  servers: [
    { url: 'http://localhost:8080/api', description: 'Gateway (Nginx)' },
    { url: 'http://localhost:3003/api', description: 'Direct (Product Service)' },
  ],
  tags: [
    { name: 'Products', description: 'Product CRUD' },
    { name: 'Categories', description: 'Category CRUD' },
    { name: 'Stock', description: 'Stock management & transfers' },
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
      CreateProductRequest: {
        type: 'object',
        required: ['name', 'slug', 'price'],
        properties: {
          category_id: { type: 'string', format: 'uuid' },
          name: { type: 'string', minLength: 2, maxLength: 200 },
          slug: { type: 'string', minLength: 2, maxLength: 200 },
          sku: { type: 'string', minLength: 1, maxLength: 50 },
          barcode: { type: 'string', maxLength: 100 },
          description: { type: 'string' },
          image_url: { type: 'string', format: 'uri' },
          price: { type: 'number', minimum: 0 },
          cost_price: { type: 'number', minimum: 0 },
          is_active: { type: 'boolean' },
          has_variants: { type: 'boolean' },
          track_stock: { type: 'boolean' },
          min_stock: { type: 'number', minimum: 0 },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
      CreateCategoryRequest: {
        type: 'object',
        required: ['name', 'slug'],
        properties: {
          parent_id: { type: 'string', format: 'uuid' },
          name: { type: 'string', minLength: 2, maxLength: 100 },
          slug: { type: 'string', minLength: 2, maxLength: 100 },
          description: { type: 'string' },
          image_url: { type: 'string', format: 'uri' },
          sort_order: { type: 'number', minimum: 0 },
          is_active: { type: 'boolean' },
        },
      },
      AdjustStockRequest: {
        type: 'object',
        required: ['product_id', 'outlet_id', 'quantity', 'type'],
        properties: {
          product_id: { type: 'string', format: 'uuid' },
          variant_id: { type: 'string', format: 'uuid' },
          outlet_id: { type: 'string', format: 'uuid' },
          quantity: { type: 'integer' },
          type: { type: 'string', enum: ['in', 'out', 'adjustment'] },
          reference_type: { type: 'string' },
          reference_id: { type: 'string', format: 'uuid' },
          notes: { type: 'string' },
        },
      },
      TransferStockRequest: {
        type: 'object',
        required: ['product_id', 'from_outlet_id', 'to_outlet_id', 'quantity'],
        properties: {
          product_id: { type: 'string', format: 'uuid' },
          variant_id: { type: 'string', format: 'uuid' },
          from_outlet_id: { type: 'string', format: 'uuid' },
          to_outlet_id: { type: 'string', format: 'uuid' },
          quantity: { type: 'integer', minimum: 1 },
          notes: { type: 'string' },
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
    '/products': {
      get: {
        tags: ['Products'],
        summary: 'List products (paginated)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'category_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Products list', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } } } },
        },
      },
      post: {
        tags: ['Products'],
        summary: 'Create product',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateProductRequest' } } },
        },
        responses: {
          '201': { description: 'Product created', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } } } },
        },
      },
    },
    '/products/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Get product by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Product details', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } } } },
        },
      },
      put: {
        tags: ['Products'],
        summary: 'Update product',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateProductRequest' } } },
        },
        responses: {
          '200': { description: 'Product updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } } } },
        },
      },
      delete: {
        tags: ['Products'],
        summary: 'Delete product',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Product deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } } } },
        },
      },
    },
    '/categories': {
      get: {
        tags: ['Categories'],
        summary: 'List categories (paginated)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'parent_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Categories list', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } } } },
        },
      },
      post: {
        tags: ['Categories'],
        summary: 'Create category',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateCategoryRequest' } } },
        },
        responses: {
          '201': { description: 'Category created', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } } } },
        },
      },
    },
    '/categories/{id}': {
      get: {
        tags: ['Categories'],
        summary: 'Get category by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Category details', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } } } },
        },
      },
      put: {
        tags: ['Categories'],
        summary: 'Update category',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateCategoryRequest' } } },
        },
        responses: {
          '200': { description: 'Category updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } } } },
        },
      },
      delete: {
        tags: ['Categories'],
        summary: 'Delete category',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Category deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } } } },
        },
      },
    },
    '/stock/{outletId}': {
      get: {
        tags: ['Stock'],
        summary: 'Get stock by outlet',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'outletId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Stock list', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } } } },
        },
      },
    },
    '/stock/adjust': {
      post: {
        tags: ['Stock'],
        summary: 'Adjust stock',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AdjustStockRequest' } } },
        },
        responses: {
          '200': { description: 'Stock adjusted', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } } } },
        },
      },
    },
    '/stock/transfer': {
      post: {
        tags: ['Stock'],
        summary: 'Transfer stock between outlets',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TransferStockRequest' } } },
        },
        responses: {
          '200': { description: 'Stock transferred', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } } } },
        },
      },
    },
  },
};

export function setupSwagger(app: Application) {
  app.use('/api/products/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
    },
  }));
}
