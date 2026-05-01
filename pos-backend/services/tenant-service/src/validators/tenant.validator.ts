import { z } from 'zod';

export const provisionTenantSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'lowercase letters, numbers, hyphens only'),
  owner_email: z.string().email().toLowerCase(),
  owner_user_id: z.string().uuid(),
  plan_id: z.string().uuid().optional(),
});

export const updateTenantSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  logo_url: z.string().url().optional(),
  status: z.enum(['active', 'suspended', 'cancelled']).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  plan_id: z.string().uuid().optional(),
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export const createOutletSchema = z.object({
  name: z.string().min(2).max(100),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  timezone: z.string().default('Asia/Jakarta'),
  tax_rate: z.number().min(0).max(100).default(0),
});

export const updateOutletSchema = createOutletSchema.partial().extend({
  is_active: z.boolean().optional(),
});

export const inviteUserSchema = z.object({
  email: z.string().email().toLowerCase(),
  role: z.enum(['owner', 'manager', 'cashier']),
});

export type ProvisionTenantInput = z.infer<typeof provisionTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
export type CreateOutletInput = z.infer<typeof createOutletSchema>;
export type UpdateOutletInput = z.infer<typeof updateOutletSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
