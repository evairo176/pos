import { prisma } from '../lib/prisma';
import { NotFoundError, BadRequestError, ConflictError } from '@pos/shared';

export interface RefundItem {
  transaction_item_id: string;
  quantity: number;
  reason?: string;
}

export async function createRefund(
  schemaName: string,
  transactionId: string,
  items: RefundItem[],
  refundPaymentMethod: string,
  reason: string,
  processedById: string
): Promise<any> {
  // Get original transaction
  const transactions = await prisma.$queryRawUnsafe(
    `SELECT * FROM ${schemaName}.transactions WHERE id = $1`,
    transactionId
  ) as any[];
  
  if (!transactions || transactions.length === 0) {
    throw new NotFoundError('Transaction not found');
  }
  
  const transaction = transactions[0];
  
  if (transaction.status === 'voided') {
    throw new ConflictError('Cannot refund a voided transaction');
  }
  
  // Validate and process refund items
  let refundTotal = 0;
  const processedItems: any[] = [];
  
  for (const refundItem of items) {
    // Get original transaction item
    const txItems = await prisma.$queryRawUnsafe(
      `SELECT * FROM ${schemaName}.transaction_items WHERE id = $1 AND transaction_id = $2`,
      refundItem.transaction_item_id,
      transactionId
    ) as any[];
    
    if (!txItems || txItems.length === 0) {
      throw new NotFoundError(`Transaction item ${refundItem.transaction_item_id} not found`);
    }
    
    const txItem = txItems[0];
    
    // Check if already refunded
    const existingRefunds = await prisma.$queryRawUnsafe(
      `SELECT COALESCE(SUM(quantity), 0) as total_refunded
       FROM ${schemaName}.refund_items ri
       JOIN ${schemaName}.refunds r ON ri.refund_id = r.id
       WHERE ri.transaction_item_id = $1 AND r.status = 'completed'`,
      refundItem.transaction_item_id
    ) as any[];
    
    const alreadyRefunded = Number(existingRefunds[0]?.total_refunded || 0);
    const maxRefundQty = txItem.quantity - alreadyRefunded;
    
    if (refundItem.quantity > maxRefundQty) {
      throw new BadRequestError(
        `Cannot refund ${refundItem.quantity} units. Only ${maxRefundQty} units available for refund.`
      );
    }
    
    const unitPrice = txItem.subtotal / txItem.quantity;
    const refundAmount = unitPrice * refundItem.quantity;
    refundTotal += refundAmount;
    
    processedItems.push({
      transaction_item_id: refundItem.transaction_item_id,
      product_id: txItem.product_id,
      variant_id: txItem.variant_id,
      quantity: refundItem.quantity,
      unit_price: unitPrice,
      refund_amount: refundAmount,
      reason: refundItem.reason,
    });
  }
  
  // Create refund
  const result = await prisma.$transaction(async (tx: any) => {
    // Create refund record
    const refund = await tx.$queryRawUnsafe(
      `INSERT INTO ${schemaName}.refunds (
        transaction_id, outlet_id, total_amount, reason, 
        refund_payment_method, status, processed_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *`,
      transactionId,
      transaction.outlet_id,
      refundTotal,
      reason || null,
      refundPaymentMethod,
      'completed',
      processedById
    );
    
    const refundId = refund[0].id;
    
    // Create refund items and restore stock
    for (const item of processedItems) {
      await tx.$queryRawUnsafe(
        `INSERT INTO ${schemaName}.refund_items (
          refund_id, transaction_item_id, product_id, variant_id,
          quantity, unit_price, refund_amount, reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        refundId,
        item.transaction_item_id,
        item.product_id,
        item.variant_id || null,
        item.quantity,
        item.unit_price,
        item.refund_amount,
        item.reason || null
      );
      
      // Restore stock
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
    
    // Update transaction refund status
    await tx.$queryRawUnsafe(
      `UPDATE ${schemaName}.transactions 
       SET refund_amount = COALESCE(refund_amount, 0) + $1,
           has_refund = true,
           updated_at = NOW()
       WHERE id = $2`,
      refundTotal,
      transactionId
    );
    
    return refund[0];
  });
  
  return {
    ...result,
    items: processedItems,
  };
}

export async function getRefunds(
  schemaName: string,
  outletId: string,
  params: {
    page?: number;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<{ data: any[]; meta: any }> {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const skip = (page - 1) * limit;
  
  let whereClause = 'WHERE r.outlet_id = $1';
  const values: any[] = [outletId];
  let paramIdx = 2;
  
  if (params.startDate) {
    whereClause += ` AND r.created_at >= $${paramIdx++}`;
    values.push(params.startDate);
  }
  
  if (params.endDate) {
    whereClause += ` AND r.created_at <= $${paramIdx++}`;
    values.push(params.endDate);
  }
  
  const [refunds, total] = await prisma.$transaction([
    prisma.$queryRawUnsafe(
      `SELECT r.*, u.name as processed_by_name, t.transaction_number
       FROM ${schemaName}.refunds r
       LEFT JOIN ${schemaName}.users u ON r.processed_by = u.id
       LEFT JOIN ${schemaName}.transactions t ON r.transaction_id = t.id
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      ...values,
      limit,
      skip
    ),
    prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM ${schemaName}.refunds r ${whereClause}`,
      ...values
    ),
  ]) as [any, any];
  
  return {
    data: refunds,
    meta: {
      page,
      limit,
      total: Number(total[0]?.count || 0),
      pages: Math.ceil(Number(total[0]?.count || 0) / limit),
    },
  };
}

export async function getRefundById(schemaName: string, id: string): Promise<any> {
  const refunds = await prisma.$queryRawUnsafe(
    `SELECT r.*, u.name as processed_by_name, t.transaction_number
     FROM ${schemaName}.refunds r
     LEFT JOIN ${schemaName}.users u ON r.processed_by = u.id
     LEFT JOIN ${schemaName}.transactions t ON r.transaction_id = t.id
     WHERE r.id = $1`,
    id
  ) as any[];
  
  if (!refunds || refunds.length === 0) {
    throw new NotFoundError('Refund not found');
  }
  
  const refund = refunds[0];
  
  // Get refund items
  const items = await prisma.$queryRawUnsafe(
    `SELECT ri.*, p.name as product_name, p.sku, pv.name as variant_name
     FROM ${schemaName}.refund_items ri
     LEFT JOIN ${schemaName}.products p ON ri.product_id = p.id
     LEFT JOIN ${schemaName}.product_variants pv ON ri.variant_id = pv.id
     WHERE ri.refund_id = $1`,
    id
  );
  
  return {
    ...refund,
    items,
  };
}
