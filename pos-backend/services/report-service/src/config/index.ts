import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: '../../.env' });
dotenv.config({ path: '.env.local', override: true });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3005'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  LOG_LEVEL: z.string().default('info'),
  CORS_ORIGIN: z.string().default('*'),
  SERVICE_NAME: z.string().default('report-service'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid env vars:', parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;

export function assertConfig() {
  if (!config.DATABASE_URL) throw new Error('DATABASE_URL required');
}
