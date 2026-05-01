import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller';

const router = Router();

router.get('/summary', dashboardController.getDashboardSummary);
router.get('/comparison', dashboardController.getSalesComparison);

export default router;
