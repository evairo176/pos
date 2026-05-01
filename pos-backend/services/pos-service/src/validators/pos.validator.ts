import { z } from 'zod';

// Cart validators
export const addToCartSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().optional(),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
  discount_amount: z.number().default(0),
  notes: z.string().optional(),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive().optional(),
  price: z.number().positive().optional(),
  discount_amount: z.number().optional(),
  notes: z.string().optional(),
});

// Transaction validators
export const createTransactionSchema = z.object({
  outlet_id: z.string().uuid(),
  customer_id: z.string().uuid().optional(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    variant_id: z.string().uuid().optional(),
    quantity: z.number().int().positive(),
    price: z.number().positive(),
    discount_amount: z.number().default(0),
    notes: z.string().optional(),
  })).min(1),
  payments: z.array(z.object({
    method: z.enum(['cash', 'card', 'qris', 'transfer', 'ewallet', 'split']),
    amount: z.number().positive(),
    reference: z.string().optional(),
  })).min(1),
  discount_amount: z.number().default(0),
  tax_amount: z.number().default(0),
  notes: z.string().optional(),
});

export const voidTransactionSchema = z.object({
  reason: z.string().min(1),
});

// Refund validators
export const createRefundSchema = z.object({
  transaction_id: z.string().uuid(),
  items: z.array(z.object({
    transaction_item_id: z.string().uuid(),
    quantity: z.number().int().positive(),
    reason: z.string().optional(),
  })).min(1),
  refund_payment_method: z.enum(['cash', 'card', 'qris', 'transfer', 'ewallet']).default('cash'),
  reason: z.string().optional(),
});

// Shift validators
export const openShiftSchema = z.object({
  outlet_id: z.string().uuid(),
  opening_cash: z.number().default(0),
});

export const closeShiftSchema = z.object({
  closing_cash: z.number().positive(),
  notes: z.string().optional(),
});

// Types
export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type VoidTransactionInput = z.infer<typeof voidTransactionSchema>;
export type CreateRefundInput = z.infer<typeof createRefundSchema>;
export type OpenShiftInput = z.infer<typeof openShiftSchema>;
export type CloseShiftInput = z.infer<typeof closeShiftSchema>;
