import type { Request, Response, NextFunction } from 'express';
import { ok, created, ForbiddenError, NotFoundError } from '@pos/shared';
import { tenantService } from '../services/tenant.service';
import { inviteService } from '../services/invite.service';
import { config } from '../config';

export const tenantController = {
  async provision(req: Request, res: Response, next: NextFunction) {
    // Internal-only: guard with shared secret
    try {
      const key = req.headers['x-internal-key'];
      if (key !== config.internalKey) throw new ForbiddenError('Invalid internal key');
      const result = await tenantService.provision(req.body);
      return created(res, result, 'Tenant provisioned');
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      // Only super_admin can list all tenants
      if (!req.user?.is_super_admin) throw new ForbiddenError('Super admin only');
      const result = await tenantService.list(req.query as any);
      return ok(res, result.data, undefined, 200);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      // Super admin or tenant member
      if (!req.user?.is_super_admin) {
        const member = req.user?.tenants.find((t) => t.tenant_id === id);
        if (!member) throw new NotFoundError('Tenant not found');
      }
      const tenant = await tenantService.getById(id);
      return ok(res, tenant);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      if (!req.user?.is_super_admin) {
        const member = req.user?.tenants.find((t) => t.tenant_id === id && t.role === 'owner');
        if (!member) throw new ForbiddenError('Only tenant owner can update');
      }
      const tenant = await tenantService.update(id, req.body);
      return ok(res, tenant, 'Tenant updated');
    } catch (err) {
      next(err);
    }
  },

  async invite(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const member = req.user?.tenants.find((t) => t.tenant_id === id);
      const allowed = req.user?.is_super_admin || member?.role === 'owner' || member?.role === 'manager';
      if (!allowed) throw new ForbiddenError('Cannot invite in this tenant');
      const result = await inviteService.invite(id, req.body, config.env);
      return created(res, result, 'Invite sent');
    } catch (err) {
      next(err);
    }
  },
};
