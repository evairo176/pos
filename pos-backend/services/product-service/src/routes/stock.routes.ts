import { Router } from 'express';
import * as stockController from '../controllers/stock.controller';
// import { validate } from '@pos/shared';
import { adjustStockSchema, transferStockSchema } from '../validators/product.validator';

const router = Router();

// TODO: Add requireAuth, requireTenant middleware when implemented in shared package
// router.use(requireAuth, requireTenant);

router.get('/:outletId', stockController.getStock);
router.post('/adjust', /* validate(adjustStockSchema), */ stockController.adjustStock);
router.post('/transfer', /* validate(transferStockSchema), */ stockController.transferStock);

export default router;
