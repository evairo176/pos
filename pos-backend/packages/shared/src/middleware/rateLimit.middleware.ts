import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedis } from '../utils/redis';

export function createRateLimiter(opts: {
  windowMs?: number;
  max?: number;
  prefix?: string;
}) {
  const windowMs = opts.windowMs ?? 60_000;
  const max = opts.max ?? 60;
  const prefix = opts.prefix ?? 'rl:';

  let store: RedisStore | undefined;
  try {
    const redis = getRedis();
    store = new RedisStore({
      sendCommand: (...args: string[]) => redis.call(...(args as [string, ...string[]])) as any,
      prefix,
    });
  } catch {
    // Fallback to in-memory when Redis unavailable (tests)
    store = undefined;
  }

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store,
    message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
  });
}
