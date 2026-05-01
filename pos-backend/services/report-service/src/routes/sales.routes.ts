import { Router } from 'express';
import * as salesController from '../controllers/sales.controller';

const router = Router();

router.get('/', salesController.getSalesReport);
router.get('/products', salesController.getProductSalesReport);
router.get('/cashiers', salesController.getCashierReport);

export default router;
