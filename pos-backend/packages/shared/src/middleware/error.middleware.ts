import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { fail } from '../utils/response';

export function notFoundHandler(req: Request, res: Response) {
  return fail(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`);
}

// Express 4 requires 4-arg signature for error handlers.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    if (err.status >= 500) logger.error(err.message, { code: err.code, details: err.details });
    return fail(res, err.status, err.code, err.message, err.details);
  }
  logger.error('Unhandled error', { err: (err as Error)?.message, stack: (err as Error)?.stack });
  return fail(res, 500, 'INTERNAL_ERROR', 'Internal server error');
}
