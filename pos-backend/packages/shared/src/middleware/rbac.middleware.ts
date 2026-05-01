import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import type { UserRole } from '../types';

/**
 * Role guard. Uses req.tenant.role if present, otherwise checks is_super_admin.
 * Super admin bypasses all role checks.
 */
export function requireRole(...allowed: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());
    if (req.user.is_super_admin) return next();
    const role = req.tenant?.role;
    if (!role) return next(new ForbiddenError('Role not found in context'));
    if (!allowed.includes(role)) {
      return next(new ForbiddenError(`Role '${role}' not allowed`));
    }
    next();
  };
}

export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new UnauthorizedError());
  if (!req.user.is_super_admin) return next(new ForbiddenError('Super admin only'));
  next();
}
