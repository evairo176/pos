import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { UnauthorizedError } from '../utils/errors';

/**
 * Requires a valid JWT access token in Authorization header.
 * Attaches decoded payload to req.user.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing bearer token');
    }
    const token = header.slice('Bearer '.length).trim();
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) return next(err);
    next(new UnauthorizedError('Invalid or expired token'));
  }
}

/**
 * Optional auth: attach req.user if token valid, otherwise continue.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();
  try {
    const token = header.slice('Bearer '.length).trim();
    req.user = verifyAccessToken(token);
  } catch {
    /* ignore */
  }
  next();
}
