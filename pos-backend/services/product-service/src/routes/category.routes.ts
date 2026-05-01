import { Router } from 'express';
import * as categoryController from '../controllers/category.controller';
// import { validate } from '@pos/shared';
import { createCategorySchema, updateCategorySchema } from '../validators/product.validator';

const router = Router();

// TODO: Add requireAuth, requireTenant middleware when implemented in shared package
// router.use(requireAuth, requireTenant);

router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategoryById);
router.post('/', /* validate(createCategorySchema), */ categoryController.createCategory);
router.put('/:id', /* validate(updateCategorySchema), */ categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

export default router;
