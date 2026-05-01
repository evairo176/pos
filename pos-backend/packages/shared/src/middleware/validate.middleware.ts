import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { ValidationError } from '../utils/errors';

type Source = 'body' | 'query' | 'params';

export function validate<T>(schema: ZodSchema<T>, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(new ValidationError(result.error.flatten()));
    }
    // Replace with parsed (coerced) data
    (req as unknown as Record<Source, unknown>)[source] = result.data;
    next();
  };
}
