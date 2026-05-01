import { prisma } from '../lib/prisma';
import { logger } from '@pos/shared';
import { NotFoundError, ConflictError } from '@pos/shared';

export async function getProducts(schemaName: string, params: {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: string;
}) {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { sku: { contains: params.search, mode: 'insensitive' } },
      { barcode: { contains: params.search, mode: 'insensitive' } },
    ];
  }
  if (params.category_id) {
    where.category_id = params.category_id;
  }

  const [products, total] = await prisma.$transaction([
    prisma.$queryRawUnsafe(
      `SELECT * FROM ${schemaName}.products WHERE ${Object.keys(where).length > 0 ? '1=1' : '1=1'} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      limit,
      skip
    ),
    prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM ${schemaName}.products WHERE ${Object.keys(where).length > 0 ? '1=1' : '1=1'}`
    ),
  ]) as [any, any];

  return {
    data: products,
    meta: { page, limit, total: Number(total[0]?.count || 0), pages: Math.ceil(Number(total[0]?.count || 0) / limit) },
  };
}

export async function getProductById(schemaName: string, id: string) {
  const products = await prisma.$queryRawUnsafe(
    `SELECT * FROM ${schemaName}.products WHERE id = $1`,
    id
  ) as any[];

  if (!products || products.length === 0) {
    throw new NotFoundError('Product not found');
  }

  return products[0];
}

export async function createProduct(schemaName: string, data: any) {
  const existing = await prisma.$queryRawUnsafe(
    `SELECT id FROM ${schemaName}.products WHERE sku = $1 LIMIT 1`,
    data.sku
  ) as any[];

  if (existing && existing.length > 0) {
    throw new ConflictError('SKU already exists');
  }

  const result = await prisma.$queryRawUnsafe(
    `INSERT INTO ${schemaName}.products (category_id, name, slug, sku, barcode, description, image_url, price, cost_price, is_active, has_variants, track_stock, min_stock, tags)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING *`,
    data.category_id || null,
    data.name,
    data.slug,
    data.sku || null,
    data.barcode || null,
    data.description || null,
    data.image_url || null,
    data.price,
    data.cost_price || 0,
    data.is_active !== false,
    data.has_variants || false,
    data.track_stock !== false,
    data.min_stock || 0,
    data.tags || []
  ) as any[];

  return result[0];
}

export async function updateProduct(schemaName: string, id: string, data: any) {
  const existing = await getProductById(schemaName, id);

  if (data.sku && data.sku !== existing.sku) {
    const skuExists = await prisma.$queryRawUnsafe(
      `SELECT id FROM ${schemaName}.products WHERE sku = $1 AND id != $2 LIMIT 1`,
      data.sku,
      id
    ) as any[];

    if (skuExists && skuExists.length > 0) {
      throw new ConflictError('SKU already exists');
    }
  }

  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  const updatableFields = ['category_id', 'name', 'slug', 'sku', 'barcode', 'description', 'image_url', 'price', 'cost_price', 'is_active', 'has_variants', 'track_stock', 'min_stock', 'tags'];

  for (const field of updatableFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = $${idx++}`);
      values.push(data[field]);
    }
  }

  if (fields.length === 0) return existing;

  values.push(id);

  const result = await prisma.$queryRawUnsafe(
    `UPDATE ${schemaName}.products SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
    ...values
  ) as any[];

  return result[0];
}

export async function deleteProduct(schemaName: string, id: string) {
  await getProductById(schemaName, id);

  await prisma.$queryRawUnsafe(
    `DELETE FROM ${schemaName}.products WHERE id = $1`,
    id
  );
}
