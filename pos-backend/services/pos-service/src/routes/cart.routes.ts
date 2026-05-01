import { Router } from 'express';
import * as cartController from '../controllers/cart.controller';

const router = Router();

router.get('/', cartController.getCart);
router.post('/items', cartController.addToCart);
router.put('/items/:id', cartController.updateCartItem);
router.delete('/items/:id', cartController.removeCartItem);
router.delete('/', cartController.clearCart);

export default router;
