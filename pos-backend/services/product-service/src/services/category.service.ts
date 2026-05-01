import { prisma } from '../lib/prisma';
import { NotFoundError, ConflictError } from '@pos/shared';

export async function getCategories(schemaName: string, params: {
  page?: number;
  limit?: number;
  search?: string;
  parent_id?: string;
}) {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const skip = (page - 1) * limit;

  const where: string[] = ['1=1'];
  if (params.search) {
    where.push(`(name ILIKE $${where.length + 1} OR description ILIKE $${where.length + 1})`);
  }
  if (params.parent_id !== undefined) {
    where.push(`parent_id ${params.parent_id ? `= $${where.length + 1}` : 'IS NULL'}`);
  }

  const values: any[] = [];
  if (params.search) values.push(`%${params.search}%`);
  if (params.parent_id !== undefined && params.parent_id) values.push(params.parent_id);

  const whereClause = where.join(' AND ');

  const [categories, total] = await prisma.$transaction([
    prisma.$queryRawUnsafe(
      `SELECT * FROM ${schemaName}.categories WHERE ${whereClause} ORDER BY sort_order, name ASC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      ...values,
      limit,
      skip
    ),
    prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM ${schemaName}.categories WHERE ${whereClause}`,
      ...values
    ),
  ]) as [any, any];

  return {
    data: categories,
    meta: { page, limit, total: Number(total[0]?.count || 0), pages: Math.ceil(Number(total[0]?.count || 0) / limit) },
  };
}

export async function getCategoryById(schemaName: string, id: string) {
  const categories = await prisma.$queryRawUnsafe(
    `SELECT * FROM ${schemaName}.categories WHERE id = $1`,
    id
  ) as any[];

  if (!categories || categories.length === 0) {
    throw new NotFoundError('Category not found');
  }

  return categories[0];
}

export async function createCategory(schemaName: string, data: any) {
  const existing = await prisma.$queryRawUnsafe(
    `SELECT id FROM ${schemaName}.categories WHERE slug = $1 LIMIT 1`,
    data.slug
  ) as any[];

  if (existing && existing.length > 0) {
    throw new ConflictError('Slug already exists');
  }

  const result = await prisma.$queryRawUnsafe(
    `INSERT INTO ${schemaName}.categories (parent_id, name, slug, description, image_url, sort_order, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    data.parent_id || null,
    data.name,
    data.slug,
    data.description || null,
    data.image_url || null,
    data.sort_order || 0,
    data.is_active !== false
  ) as any[];

  return result[0];
}

export async function updateCategory(schemaName: string, id: string, data: any) {
  const existing = await getCategoryById(schemaName, id);

  if (data.slug && data.slug !== existing.slug) {
    const slugExists = await prisma.$queryRawUnsafe(
      `SELECT id FROM ${schemaName}.categories WHERE slug = $1 AND id != $2 LIMIT 1`,
      data.slug,
      id
    ) as any[];

    if (slugExists && slugExists.length > 0) {
      throw new ConflictError('Slug already exists');
    }
  }

  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  const updatableFields = ['parent_id', 'name', 'slug', 'description', 'image_url', 'sort_order', 'is_active'];

  for (const field of updatableFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = $${idx++}`);
      values.push(data[field]);
    }
  }

  if (fields.length === 0) return existing;

  values.push(id);

  const result = await prisma.$queryRawUnsafe(
    `UPDATE ${schemaName}.categories SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
    ...values
  ) as any[];

  return result[0];
}

export async function deleteCategory(schemaName: string, id: string) {
  const hasChildren = await prisma.$queryRawUnsafe(
    `SELECT id FROM ${schemaName}.categories WHERE parent_id = $1 LIMIT 1`,
    id
  ) as any[];

  if (hasChildren && hasChildren.length > 0) {
    throw new ConflictError('Cannot delete category with subcategories');
  }

  await getCategoryById(schemaName, id);

  await prisma.$queryRawUnsafe(
    `DELETE FROM ${schemaName}.categories WHERE id = $1`,
    id
  );
}
