import 'dotenv/config';

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3001,
  serviceName: 'auth-service',
  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: process.env.REDIS_URL!,
  jwtSecret: process.env.JWT_SECRET!,
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  tenantServiceUrl: process.env.TENANT_SERVICE_URL || 'http://tenant-service:3002',
  bcryptRounds: 10,
};

export function assertConfig() {
  const missing: string[] = [];
  if (!config.databaseUrl) missing.push('DATABASE_URL');
  if (!config.redisUrl) missing.push('REDIS_URL');
  if (!config.jwtSecret) missing.push('JWT_SECRET');
  if (missing.length) {
    throw new Error(`Missing env: ${missing.join(', ')}`);
  }
}
