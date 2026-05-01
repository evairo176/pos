import { z } from 'zod';

export const registerSchema = z.object({
  full_name: z.string().min(2).max(100),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(100),
  phone: z.string().optional(),
  business_name: z.string().min(2).max(100),
  business_slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'lowercase letters, numbers, hyphens only')
    .optional(),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refresh_token: z.string().min(10),
});

export const forgotSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export const resetSchema = z.object({
  token: z.string().min(10),
  new_password: z.string().min(8).max(100),
});

export const switchTenantSchema = z.object({
  tenant_id: z.string().uuid(),
  outlet_id: z.string().uuid().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type ForgotInput = z.infer<typeof forgotSchema>;
export type ResetInput = z.infer<typeof resetSchema>;
export type SwitchTenantInput = z.infer<typeof switchTenantSchema>;
