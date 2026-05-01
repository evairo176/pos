import { Router } from 'express';
import { requireAuth, requireTenant, requireRole, validate } from '@pos/shared';
import { outletController } from '../controllers/outlet.controller';
import { createOutletSchema, updateOutletSchema } from '../validators/tenant.validator';

const router = Router();

router.use(requireAuth, requireTenant);

router.get('/api/outlets', outletController.list);
router.get('/api/outlets/:id', outletController.get);
router.post('/api/outlets', requireRole('owner', 'manager'), validate(createOutletSchema), outletController.create);
router.put('/api/outlets/:id', requireRole('owner', 'manager'), validate(updateOutletSchema), outletController.update);
router.delete('/api/outlets/:id', requireRole('owner'), outletController.remove);

export default router;
