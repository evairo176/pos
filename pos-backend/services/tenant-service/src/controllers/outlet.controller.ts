import type { Request, Response, NextFunction } from 'express';
import { ok, created, BadRequestError } from '@pos/shared';
import { outletService } from '../services/outlet.service';

function getSchema(req: Request): string {
  if (!req.tenant) throw new BadRequestError('Tenant context missing');
  return req.tenant.schema_name;
}

export const outletController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const rows = await outletService.list(getSchema(req));
      return ok(res, rows);
    } catch (err) {
      next(err);
    }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const row = await outletService.get(getSchema(req), req.params.id);
      return ok(res, row);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const row = await outletService.create(getSchema(req), req.body);
      return created(res, row, 'Outlet created');
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const row = await outletService.update(getSchema(req), req.params.id, req.body);
      return ok(res, row, 'Outlet updated');
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await outletService.remove(getSchema(req), req.params.id);
      return ok(res, result, 'Outlet deleted');
    } catch (err) {
      next(err);
    }
  },
};
