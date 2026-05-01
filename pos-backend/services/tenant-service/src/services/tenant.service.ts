import { ConflictError, NotFoundError, logger } from '@pos/shared';
import { prisma } from '../lib/prisma';
import { createTenantSchema, dropTenantSchema, withTenantSchema } from './schema.service';
import type {
  ProvisionTenantInput,
  UpdateTenantInput,
  ListQuery,
} from '../validators/tenant.validator';

function generateSchemaName(tenantId: string): string {
  // Use first 12 chars of UUID (hex) — keeps within identifier limits.
  return `tenant_${tenantId.replace(/-/g, '').slice(0, 12)}`;
}

export const tenantService = {
  async provision(input: ProvisionTenantInput) {
    const slugTaken = await prisma.tenant.findUnique({ where: { slug: input.slug } });
    if (slugTaken) throw new ConflictError('Slug already taken');

    // Pick default plan (Free) if not supplied
    let planId = input.plan_id;
    if (!planId) {
      const freePlan = await prisma.plan.findFirst({ where: { name: 'Free' } });
      planId = freePlan?.id;
    }

    // Create tenant row first to get a stable id → build schema name from it.
    const tenant = await prisma.tenant.create({
      data: {
        name: input.name,
        slug: input.slug,
        schema_name: 'pending',
        owner_email: input.owner_email,
        plan_id: planId,
      },
    });

    const schemaName = generateSchemaName(tenant.id);

    try {
      await createTenantSchema(schemaName);

      // Update tenant.schema_name & add membership + subscription atomically.
      await prisma.$transaction([
        prisma.tenant.update({
          where: { id: tenant.id },
          data: { schema_name: schemaName },
        }),
        prisma.tenantUser.create({
          data: {
            tenant_id: tenant.id,
            user_id: input.owner_user_id,
            role: 'owner',
          },
        }),
        prisma.subscription.create({
          data: {
            tenant_id: tenant.id,
            plan_id: planId,
            status: 'trial',
            trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            current_period_start: new Date(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        }),
      ]);

      // Seed one default outlet in the new schema
      await withTenantSchema(schemaName, async (tx) => {
        await tx.$executeRawUnsafe(`
          INSERT INTO outlets (name, timezone) VALUES ('Main Outlet', 'Asia/Jakarta');
        `);
      });

      return { id: tenant.id, name: tenant.name, slug: tenant.slug, schema_name: schemaName };
    } catch (err) {
      // Rollback: drop schema + tenant row
      logger.error('Tenant provisioning failed, rolling back', { err: (err as Error).message });
      await dropTenantSchema(schemaName).catch(() => {});
      await prisma.tenant.delete({ where: { id: tenant.id } }).catch(() => {});
      throw err;
    }
  },

  async list(query: ListQuery) {
    const { page, limit, search } = query;
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
            { owner_email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [total, data] = await Promise.all([
      prisma.tenant.count({ where }),
      prisma.tenant.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { plan: true },
      }),
    ]);

    return { data, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
  },

  async getById(id: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: { plan: true, subscriptions: { orderBy: { created_at: 'desc' }, take: 1 } },
    });
    if (!tenant) throw new NotFoundError('Tenant not found');
    return tenant;
  },

  async update(id: string, input: UpdateTenantInput) {
    const exists = await prisma.tenant.findUnique({ where: { id } });
    if (!exists) throw new NotFoundError('Tenant not found');
    return prisma.tenant.update({
      where: { id },
      data: {
        ...input,
        settings: input.settings as any,
      },
    });
  },
};
