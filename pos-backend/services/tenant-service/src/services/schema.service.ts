import fs from 'fs';
import { Prisma } from '@prisma/client';
import { logger, InternalError } from '@pos/shared';
import { prisma } from '../lib/prisma';
import { config } from '../config';

const SAFE_SCHEMA_NAME = /^[a-z][a-z0-9_]{2,62}$/;

/**
 * Provision a new tenant schema:
 *   1. CREATE SCHEMA IF NOT EXISTS <schema_name>
 *   2. SET search_path TO <schema_name>
 *   3. Execute tenant-schema.sql (DDL template)
 *   4. Reset search_path
 * All wrapped in a single transaction so failures rollback cleanly.
 */
export async function createTenantSchema(schemaName: string): Promise<void> {
  if (!SAFE_SCHEMA_NAME.test(schemaName)) {
    throw new InternalError(`Unsafe schema name: ${schemaName}`);
  }

  const sqlTemplate = readTenantSchemaSql();

  await prisma.$transaction(async (tx) => {
    // Use Prisma.raw for identifier interpolation (validated by regex above)
    await tx.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schemaName}"`);
    // Run DDL template. Executed as one statement is fine for postgres since
    // $executeRawUnsafe allows multiple statements via simple query protocol.
    await tx.$executeRawUnsafe(sqlTemplate);

    // Seed default payment methods (tenant-scoped)
    await tx.$executeRawUnsafe(`
      INSERT INTO payment_methods (name, type) VALUES
        ('Cash', 'cash'),
        ('Card', 'card'),
        ('QRIS', 'digital'),
        ('Bank Transfer', 'transfer');
    `);
  });

  logger.info('Tenant schema provisioned', { schema: schemaName });
}

export async function dropTenantSchema(schemaName: string): Promise<void> {
  if (!SAFE_SCHEMA_NAME.test(schemaName)) {
    throw new InternalError(`Unsafe schema name: ${schemaName}`);
  }
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
  logger.warn('Tenant schema dropped', { schema: schemaName });
}

/**
 * Executes a callback with prisma instance bound to a tenant schema via search_path.
 * Useful for querying tenant-scoped tables (outlets, products, etc).
 */
export async function withTenantSchema<T>(
  schemaName: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  if (!SAFE_SCHEMA_NAME.test(schemaName)) {
    throw new InternalError(`Unsafe schema name: ${schemaName}`);
  }
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schemaName}", public`);
    return fn(tx);
  });
}

let cachedSql: string | null = null;
function readTenantSchemaSql(): string {
  if (cachedSql) return cachedSql;
  try {
    cachedSql = fs.readFileSync(config.tenantSchemaSqlPath, 'utf8');
    return cachedSql;
  } catch (err) {
    logger.error('Failed to read tenant-schema.sql', {
      path: config.tenantSchemaSqlPath,
      err: (err as Error).message,
    });
    throw new InternalError('Tenant schema template not found');
  }
}
