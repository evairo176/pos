import { Router } from 'express';
import * as refundController from '../controllers/refund.controller';

const router = Router();

router.get('/', refundController.getRefunds);
router.get('/:id', refundController.getRefundById);
router.post('/', refundController.createRefund);

export default router;
