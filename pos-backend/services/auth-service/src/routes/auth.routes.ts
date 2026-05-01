import { Router } from 'express';
import { validate, requireAuth, createRateLimiter } from '@pos/shared';
import { authController } from '../controllers/auth.controller';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotSchema,
  resetSchema,
  switchTenantSchema,
} from '../validators/auth.validator';

const router = Router();

const authLimiter = createRateLimiter({ windowMs: 60_000, max: 20, prefix: 'rl:auth:' });
const loginLimiter = createRateLimiter({ windowMs: 60_000, max: 10, prefix: 'rl:login:' });

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authLimiter, validate(refreshSchema), authController.refresh);
router.post('/logout', authController.logout);

router.post('/forgot-password', authLimiter, validate(forgotSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetSchema), authController.resetPassword);

router.get('/me', requireAuth, authController.me);
router.post('/switch-tenant', requireAuth, validate(switchTenantSchema), authController.switchTenant);

export default router;
