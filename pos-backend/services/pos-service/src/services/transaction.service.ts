import { prisma } from '../lib/prisma';
import { clearCart } from './cart.service';
import { NotFoundError, BadRequestError, ConflictError } from '@pos/shared';

export interface TransactionItem {
  product_id: string;
  variant_id?: string;
  quantity: number;
  price: number;
  discount_amount: number;
  subtotal: number;
  notes?: string;
}

export interface Payment {
  method: string;
  amount: number;
  reference?: string;
}

export interface CreateTransactionData {
  outlet_id: string;
  customer_id?: string;
  cashier_id: string;
  items: TransactionItem[];
  payments: Payment[];
  discount_amount: number;
  tax_amount: number;
  notes?: string;
}

export async function createTransaction(
  schemaName: string,
  data: CreateTransactionData
): Promise<any> {
  const subtotal = data.items.reduce((sum, item) => sum + item.subtotal, 0);
  const total_amount = subtotal - data.discount_amount + data.tax_amount;
  const total_paid = data.payments.reduce((sum, p) => sum + p.amount, 0);
  
  if (total_paid < total_amount) {
    throw new BadRequestError('Insufficient payment');
  }
  
  const change_amount = total_paid - total_amount;
  
  // Start transaction
  const result = await prisma.$transaction(async (tx: any) => {
    // Create transaction
    const transaction = await tx.$queryRawUnsafe(
      `INSERT INTO ${schemaName}.transactions (
        outlet_id, customer_id, cashier_id, status, 
        subtotal, discount_amount, tax_amount, total_amount, 
        total_paid, change_amount, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      data.outlet_id,
      data.customer_id || null,
      data.cashier_id,
      'completed',
      subtotal,
      data.discount_amount,
      data.tax_amount,
      total_amount,
      total_paid,
      change_amount,
      data.notes || null
    );
    
    const transactionId = transaction[0].id;
    
    // Create transaction items
    for (const item of data.items) {
      await tx.$queryRawUnsafe(
        `INSERT INTO ${schemaName}.transaction_items (
          transaction_id, product_id, variant_id, quantity, 
          price, discount_amount, subtotal, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        transactionId,
        item.product_id,
        item.variant_id || null,
        item.quantity,
        item.price,
        item.discount_amount,
        item.subtotal,
        item.notes || null
      );
      
      // Update stock if track_stock is enabled
      await tx.$queryRawUnsafe(
        `UPDATE ${schemaName}.stock 
         SET quantity = quantity - $1, updated_at = NOW()
         WHERE product_id = $2 AND COALESCE(variant_id, '00000000-0000-0000-0000-000000000000') = COALESCE($3, '00000000-0000-0000-0000-000000000000') 
         AND outlet_id = $4`,
        item.quantity,
        item.product_id,
        item.variant_id || '00000000-0000-0000-0000-000000000000',
        data.outlet_id
      );
    }
    
    // Create payments
    for (const payment of data.payments) {
      await tx.$queryRawUnsafe(
        `INSERT INTO ${schemaName}.payments (
          transaction_id, method, amount, reference, status
        ) VALUES ($1, $2, $3, $4, $5)`,
        transactionId,
        payment.method,
        payment.amount,
        payment.reference || null,
        'completed'
      );
    }
    
    return transaction[0];
  });
  
  // Clear cart after successful transaction
  await clearCart(data.outlet_id, data.cashier_id);
  
  return result;
}

export async function getTransactions(
  schemaName: string,
  outletId: string,
  params: {
    page?: number;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }
): Promise<{ data: any[]; meta: any }> {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const skip = (page - 1) * limit;
  
  let whereClause = 'WHERE t.outlet_id = $1';
  const values: any[] = [outletId];
  let paramIdx = 2;
  
  if (params.startDate) {
    whereClause += ` AND t.created_at >= $${paramIdx++}`;
    values.push(params.startDate);
  }
  
  if (params.endDate) {
    whereClause += ` AND t.created_at <= $${paramIdx++}`;
    values.push(params.endDate);
  }
  
  if (params.status) {
    whereClause += ` AND t.status = $${paramIdx++}`;
    values.push(params.status);
  }
  
  const [transactions, total] = await prisma.$transaction([
    prisma.$queryRawUnsafe(
      `SELECT t.*, u.name as cashier_name, c.name as customer_name
       FROM ${schemaName}.transactions t
       LEFT JOIN ${schemaName}.users u ON t.cashier_id = u.id
       LEFT JOIN ${schemaName}.customers c ON t.customer_id = c.id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      ...values,
      limit,
      skip
    ),
    prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM ${schemaName}.transactions t ${whereClause}`,
      ...values
    ),
  ]) as [any, any];
  
  return {
    data: transactions,
    meta: {
      page,
      limit,
      total: Number(total[0]?.count || 0),
      pages: Math.ceil(Number(total[0]?.count || 0) / limit),
    },
  };
}

export async function getTransactionById(
  schemaName: string,
  id: string
): Promise<any> {
  const transactions = await prisma.$queryRawUnsafe(
    `SELECT t.*, u.name as cashier_name, c.name as customer_name
     FROM ${schemaName}.transactions t
     LEFT JOIN ${schemaName}.users u ON t.cashier_id = u.id
     LEFT JOIN ${schemaName}.customers c ON t.customer_id = c.id
     WHERE t.id = $1`,
    id
  ) as any[];
  
  if (!transactions || transactions.length === 0) {
    throw new NotFoundError('Transaction not found');
  }
  
  const transaction = transactions[0];
  
  // Get items
  const items = await prisma.$queryRawUnsafe(
    `SELECT ti.*, p.name as product_name, p.sku, pv.name as variant_name
     FROM ${schemaName}.transaction_items ti
     LEFT JOIN ${schemaName}.products p ON ti.product_id = p.id
     LEFT JOIN ${schemaName}.product_variants pv ON ti.variant_id = pv.id
     WHERE ti.transaction_id = $1`,
    id
  );
  
  // Get payments
  const payments = await prisma.$queryRawUnsafe(
    `SELECT * FROM ${schemaName}.payments WHERE transaction_id = $1`,
    id
  );
  
  return {
    ...transaction,
    items,
    payments,
  };
}

export async function voidTransaction(
  schemaName: string,
  id: string,
  userId: string,
  reason: string
): Promise<any> {
  const transaction = await getTransactionById(schemaName, id);
  
  if (transaction.status === 'voided') {
    throw new ConflictError('Transaction already voided');
  }
  
  // Restore stock
  await prisma.$transaction(async (tx: any) => {
    // Update transaction status
    await tx.$queryRawUnsafe(
      `UPDATE ${schemaName}.transactions 
       SET status = 'voided', void_reason = $1, voided_by = $2, voided_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      reason,
      userId,
      id
    );
    
    // Restore stock
    for (const item of transaction.items) {
      await tx.$queryRawUnsafe(
        `UPDATE ${schemaName}.stock 
         SET quantity = quantity + $1, updated_at = NOW()
         WHERE product_id = $2 AND COALESCE(variant_id, '00000000-0000-0000-0000-000000000000') = COALESCE($3, '00000000-0000-0000-0000-000000000000')
         AND outlet_id = $4`,
        item.quantity,
        item.product_id,
        item.variant_id || '00000000-0000-0000-0000-000000000000',
        transaction.outlet_id
      );
    }
  });
  
  return { success: true, message: 'Transaction voided' };
}
