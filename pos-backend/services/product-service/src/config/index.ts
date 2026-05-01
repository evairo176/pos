import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3003'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  LOG_LEVEL: z.string().default('info'),
  CORS_ORIGIN: z.string().default('*'),
  SERVICE_NAME: z.string().default('product-service'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  throw new Error('Invalid environment variables');
}

export const config = parsed.data;

export const assertConfig = () => {
  if (!config.DATABASE_URL) throw new Error('DATABASE_URL is required');
  if (!config.REDIS_URL) throw new Error('REDIS_URL is required');
};
