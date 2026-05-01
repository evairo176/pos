import { Router } from 'express';
import * as transactionController from '../controllers/transaction.controller';

const router = Router();

router.get('/', transactionController.getTransactions);
router.get('/:id', transactionController.getTransactionById);
router.post('/', transactionController.createTransaction);
router.post('/:id/void', transactionController.voidTransaction);

export default router;
