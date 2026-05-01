import type { Request, Response, NextFunction } from "express";
import { ok, created } from "@pos/shared";
import { authService } from "../services/auth.service";
import type {
  RegisterInput,
  LoginInput,
  RefreshInput,
  ForgotInput,
  ResetInput,
  SwitchTenantInput,
} from "../validators/auth.validator";

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const input = req.body as RegisterInput;
      const result = await authService.register(input);
      return created(res, result, "User registered");
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const input = req.body as LoginInput;
      const result = await authService.login(input);
      return ok(res, result, "Login successful");
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const input = req.body as RefreshInput;
      const tokens = await authService.refresh(input);
      return ok(res, tokens, "Tokens refreshed");
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.body?.refresh_token as string | undefined;
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
      return ok(res, null, "Logged out");
    } catch (err) {
      next(err);
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const input = req.body as ForgotInput;
      const result = await authService.forgotPassword(input);
      return ok(res, result, "Password reset email sent");
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const input = req.body as ResetInput;
      const result = await authService.resetPassword(input);
      return ok(res, result, "Password reset successfully");
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.sub) {
        throw new Error("User not authenticated");
      }
      const result = await authService.me(req.user.sub);
      return ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async switchTenant(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.sub) {
        throw new Error("User not authenticated");
      }
      const input = req.body as SwitchTenantInput;
      const tokens = await authService.switchTenant(req.user.sub, input);
      return ok(res, tokens, "Tenant switched");
    } catch (err) {
      next(err);
    }
  },
};
