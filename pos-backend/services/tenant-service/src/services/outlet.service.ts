import { NotFoundError } from '@pos/shared';
import { withTenantSchema } from './schema.service';
import type { CreateOutletInput, UpdateOutletInput } from '../validators/tenant.validator';

export const outletService = {
  async list(schemaName: string) {
    return withTenantSchema(schemaName, async (tx) => {
      const rows = await tx.$queryRawUnsafe<unknown[]>(`
        SELECT id, name, address, phone, email, timezone, tax_rate, is_active, settings, created_at, updated_at
        FROM outlets
        ORDER BY created_at ASC
      `);
      return rows;
    });
  },

  async get(schemaName: string, id: string) {
    return withTenantSchema(schemaName, async (tx) => {
      const rows = await tx.$queryRawUnsafe<unknown[]>(
        `SELECT * FROM outlets WHERE id = $1::uuid LIMIT 1`,
        id
      );
      if (!rows.length) throw new NotFoundError('Outlet not found');
      return rows[0];
    });
  },

  async create(schemaName: string, input: CreateOutletInput) {
    return withTenantSchema(schemaName, async (tx) => {
      const rows = await tx.$queryRawUnsafe<unknown[]>(
        `INSERT INTO outlets (name, address, phone, email, timezone, tax_rate)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        input.name,
        input.address ?? null,
        input.phone ?? null,
        input.email ?? null,
        input.timezone,
        input.tax_rate
      );
      return rows[0];
    });
  },

  async update(schemaName: string, id: string, input: UpdateOutletInput) {
    return withTenantSchema(schemaName, async (tx) => {
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;
      for (const [k, v] of Object.entries(input)) {
        if (v === undefined) continue;
        fields.push(`${k} = $${idx++}`);
        values.push(v);
      }
      if (!fields.length) {
        const rows = await tx.$queryRawUnsafe<unknown[]>(
          `SELECT * FROM outlets WHERE id = $1::uuid`,
          id
        );
        if (!rows.length) throw new NotFoundError('Outlet not found');
        return rows[0];
      }
      values.push(id);
      const sql = `UPDATE outlets SET ${fields.join(
        ', '
      )}, updated_at = NOW() WHERE id = $${idx}::uuid RETURNING *`;
      const rows = await tx.$queryRawUnsafe<unknown[]>(sql, ...values);
      if (!rows.length) throw new NotFoundError('Outlet not found');
      return rows[0];
    });
  },

  async remove(schemaName: string, id: string) {
    return withTenantSchema(schemaName, async (tx) => {
      const rows = await tx.$queryRawUnsafe<unknown[]>(
        `DELETE FROM outlets WHERE id = $1::uuid RETURNING id`,
        id
      );
      if (!rows.length) throw new NotFoundError('Outlet not found');
      return { id };
    });
  },
};
