import { Router } from 'express';
import * as shiftController from '../controllers/shift.controller';

const router = Router();

router.get('/', shiftController.getShifts);
router.get('/current', shiftController.getCurrentShift);
router.post('/open', shiftController.openShift);
router.post('/:id/close', shiftController.closeShift);

export default router;
