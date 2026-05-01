import { Router } from 'express';
import * as productController from '../controllers/product.controller';
// import { validate } from '@pos/shared';
import { createProductSchema, updateProductSchema } from '../validators/product.validator';

const router = Router();

// TODO: Add requireAuth, requireTenant middleware when implemented in shared package
// router.use(requireAuth, requireTenant);

router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);
router.post('/', /* validate(createProductSchema), */ productController.createProduct);
router.put('/:id', /* validate(updateProductSchema), */ productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

export default router;
