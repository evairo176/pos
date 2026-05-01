import { prisma } from '../lib/prisma';
import { NotFoundError, BadRequestError } from '@pos/shared';

export async function getStock(schemaName: string, outletId: string, params: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const skip = (page - 1) * limit;

  const searchClause = params.search
    ? `AND (p.name ILIKE $3 OR p.sku ILIKE $3)`
    : '';
  const searchValue = params.search ? `%${params.search}%` : null;

  const [stock, total] = await prisma.$transaction([
    prisma.$queryRawUnsafe(
      `SELECT s.*, p.name as product_name, p.sku, v.name as variant_name
       FROM ${schemaName}.stock s
       LEFT JOIN ${schemaName}.products p ON s.product_id = p.id
       LEFT JOIN ${schemaName}.product_variants v ON s.variant_id = v.id
       WHERE s.outlet_id = $1 ${searchClause}
       ORDER BY p.name ASC
       LIMIT $2 OFFSET $3`,
      outletId,
      limit,
      skip,
      ...(params.search ? [searchValue] : [])
    ),
    prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count
       FROM ${schemaName}.stock s
       LEFT JOIN ${schemaName}.products p ON s.product_id = p.id
       WHERE s.outlet_id = $1 ${searchClause}`,
      outletId,
      ...(params.search ? [searchValue] : [])
    ),
  ]) as [any, any];

  return {
    data: stock,
    meta: { page, limit, total: Number(total[0]?.count || 0), pages: Math.ceil(Number(total[0]?.count || 0) / limit) },
  };
}

export async function adjustStock(schemaName: string, data: any, userId: string) {
  const { product_id, variant_id, outlet_id, quantity, type, reference_type, reference_id, notes } = data;

  if (type === 'out' && quantity > 0) {
    const currentStock = await prisma.$queryRawUnsafe(
      `SELECT quantity FROM ${schemaName}.stock
       WHERE product_id = $1 AND COALESCE(variant_id, '00000000-0000-0000-0000-000000000000') = COALESCE($2, '00000000-0000-0000-0000-000000000000') AND outlet_id = $3`,
      product_id,
      variant_id || '00000000-0000-0000-0000-000000000000',
      outlet_id
    ) as any[];

    if (!currentStock || currentStock.length === 0 || currentStock[0].quantity < quantity) {
      throw new BadRequestError('Insufficient stock');
    }
  }

  await prisma.$transaction(async (tx: any) => {
    await tx.$queryRawUnsafe(
      `INSERT INTO ${schemaName}.stock (product_id, variant_id, outlet_id, quantity, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (product_id, variant_id, outlet_id)
       DO UPDATE SET quantity = stock.quantity + $4, updated_at = NOW()`,
      product_id,
      variant_id || null,
      outlet_id,
      type === 'out' ? -quantity : quantity
    );

    await tx.$queryRawUnsafe(
      `INSERT INTO ${schemaName}.stock_movements (product_id, variant_id, outlet_id, type, quantity, reference_type, reference_id, notes, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      product_id,
      variant_id || null,
      outlet_id,
      type,
      quantity,
      reference_type || null,
      reference_id || null,
      notes || null,
      userId
    );
  });

  return { success: true };
}

export async function transferStock(schemaName: string, data: any, userId: string) {
  const { product_id, variant_id, from_outlet_id, to_outlet_id, quantity, notes } = data;

  const fromStock = await prisma.$queryRawUnsafe(
    `SELECT quantity FROM ${schemaName}.stock
     WHERE product_id = $1 AND COALESCE(variant_id, '00000000-0000-0000-0000-000000000000') = COALESCE($2, '00000000-0000-0000-0000-000000000000') AND outlet_id = $3`,
    product_id,
    variant_id || '00000000-0000-0000-0000-000000000000',
    from_outlet_id
  ) as any[];

  if (!fromStock || fromStock.length === 0 || fromStock[0].quantity < quantity) {
    throw new BadRequestError('Insufficient stock at source outlet');
  }

  await prisma.$transaction(async (tx: any) => {
    await tx.$queryRawUnsafe(
      `INSERT INTO ${schemaName}.stock (product_id, variant_id, outlet_id, quantity, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (product_id, variant_id, outlet_id)
       DO UPDATE SET quantity = stock.quantity + $4, updated_at = NOW()`,
      product_id,
      variant_id || null,
      from_outlet_id,
      -quantity
    );

    await tx.$queryRawUnsafe(
      `INSERT INTO ${schemaName}.stock (product_id, variant_id, outlet_id, quantity, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (product_id, variant_id, outlet_id)
       DO UPDATE SET quantity = stock.quantity + $4, updated_at = NOW()`,
      product_id,
      variant_id || null,
      to_outlet_id,
      quantity
    );

    await tx.$queryRawUnsafe(
      `INSERT INTO ${schemaName}.stock_movements (product_id, variant_id, outlet_id, type, quantity, reference_type, reference_id, notes, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      product_id,
      variant_id || null,
      from_outlet_id,
      'out',
      quantity,
      'transfer',
      null,
      `Transfer to outlet ${to_outlet_id}. ${notes || ''}`,
      userId
    );

    await tx.$queryRawUnsafe(
      `INSERT INTO ${schemaName}.stock_movements (product_id, variant_id, outlet_id, type, quantity, reference_type, reference_id, notes, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      product_id,
      variant_id || null,
      to_outlet_id,
      'in',
      quantity,
      'transfer',
      null,
      `Transfer from outlet ${from_outlet_id}. ${notes || ''}`,
      userId
    );
  });

  return { success: true };
}
