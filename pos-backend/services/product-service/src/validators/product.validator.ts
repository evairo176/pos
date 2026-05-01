import { z } from 'zod';

export const createProductSchema = z.object({
  category_id: z.string().uuid().optional(),
  name: z.string().min(2).max(200),
  slug: z.string().min(2).max(200),
  sku: z.string().min(1).max(50).optional(),
  barcode: z.string().max(100).optional(),
  description: z.string().optional(),
  image_url: z.string().url().optional(),
  price: z.number().positive(),
  cost_price: z.number().nonnegative().default(0),
  is_active: z.boolean().default(true),
  has_variants: z.boolean().default(false),
  track_stock: z.boolean().default(true),
  min_stock: z.number().int().nonnegative().default(0),
  tags: z.array(z.string()).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const createCategorySchema = z.object({
  parent_id: z.string().uuid().optional(),
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100),
  description: z.string().optional(),
  image_url: z.string().url().optional(),
  sort_order: z.number().int().nonnegative().default(0),
  is_active: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

export const adjustStockSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().optional(),
  outlet_id: z.string().uuid(),
  quantity: z.number().int(),
  type: z.enum(['in', 'out', 'adjustment']),
  reference_type: z.string().optional(),
  reference_id: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const transferStockSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().optional(),
  from_outlet_id: z.string().uuid(),
  to_outlet_id: z.string().uuid(),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
});

export const createVariantSchema = z.object({
  name: z.string().min(1).max(100),
  sku: z.string().min(1).max(50).optional(),
  barcode: z.string().max(100).optional(),
  price: z.number().positive(),
  cost_price: z.number().nonnegative().default(0),
  is_active: z.boolean().default(true),
});

export const updateVariantSchema = createVariantSchema.partial();
