import { Router } from 'express';
import { requireAuth, validate } from '@pos/shared';
import { tenantController } from '../controllers/tenant.controller';
import {
  provisionTenantSchema,
  updateTenantSchema,
  listQuerySchema,
  inviteUserSchema,
} from '../validators/tenant.validator';

const router = Router();

// Internal: called by auth-service during register
router.post('/internal/tenants/provision', validate(provisionTenantSchema), tenantController.provision);

// Public (authenticated)
router.get('/api/tenants', requireAuth, validate(listQuerySchema, 'query'), tenantController.list);
router.get('/api/tenants/:id', requireAuth, tenantController.getById);
router.put('/api/tenants/:id', requireAuth, validate(updateTenantSchema), tenantController.update);
router.post('/api/tenants/:id/invite', requireAuth, validate(inviteUserSchema), tenantController.invite);

export default router;
