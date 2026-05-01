import 'dotenv/config';
import path from 'path';

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3002,
  serviceName: 'tenant-service',
  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: process.env.REDIS_URL!,
  jwtSecret: process.env.JWT_SECRET!,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  // Path to tenant schema SQL template (used to provision tenant schemas)
  tenantSchemaSqlPath:
    process.env.TENANT_SCHEMA_SQL_PATH ||
    path.resolve(__dirname, '../../../../prisma/tenant-schema.sql'),
  // Internal secret for service-to-service calls (shared with auth-service)
  internalKey: process.env.JWT_SECRET!,
};

export function assertConfig() {
  const missing: string[] = [];
  if (!config.databaseUrl) missing.push('DATABASE_URL');
  if (!config.redisUrl) missing.push('REDIS_URL');
  if (!config.jwtSecret) missing.push('JWT_SECRET');
  if (missing.length) throw new Error(`Missing env: ${missing.join(', ')}`);
}
