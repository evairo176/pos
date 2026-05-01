import { prisma } from '../lib/prisma';
import { NotFoundError, ConflictError, BadRequestError } from '@pos/shared';

export async function openShift(
  schemaName: string,
  outletId: string,
  cashierId: string,
  openingCash: number
): Promise<any> {
  // Check if there's already an open shift
  const existingOpenShift = await prisma.$queryRawUnsafe(
    `SELECT id FROM ${schemaName}.shifts 
     WHERE cashier_id = $1 AND status = 'open'
     LIMIT 1`,
    cashierId
  ) as any[];
  
  if (existingOpenShift && existingOpenShift.length > 0) {
    throw new ConflictError('You already have an open shift. Please close it first.');
  }
  
  const result = await prisma.$queryRawUnsafe(
    `INSERT INTO ${schemaName}.shifts (
      outlet_id, cashier_id, status, opening_cash, opened_at
    ) VALUES ($1, $2, $3, $4, NOW())
    RETURNING *`,
    outletId,
    cashierId,
    'open',
    openingCash
  ) as any[];
  
  return result[0];
}

export async function closeShift(
  schemaName: string,
  shiftId: string,
  cashierId: string,
  closingCash: number,
  notes?: string
): Promise<any> {
  const shifts = await prisma.$queryRawUnsafe(
    `SELECT * FROM ${schemaName}.shifts WHERE id = $1 AND cashier_id = $2`,
    shiftId,
    cashierId
  ) as any[];
  
  if (!shifts || shifts.length === 0) {
    throw new NotFoundError('Shift not found');
  }
  
  const shift = shifts[0];
  
  if (shift.status !== 'open') {
    throw new BadRequestError('Shift is already closed');
  }
  
  // Calculate expected cash from transactions
  const transactionStats = await prisma.$queryRawUnsafe(
    `SELECT 
      COALESCE(SUM(total_paid), 0) as total_sales,
      COALESCE(SUM(change_amount), 0) as total_change,
      COUNT(*) as transaction_count
     FROM ${schemaName}.transactions 
     WHERE shift_id = $1 AND status != 'voided'`,
    shiftId
  ) as any[];
  
  const stats = transactionStats[0] || { total_sales: 0, total_change: 0, transaction_count: 0 };
  const expectedCash = shift.opening_cash + (Number(stats.total_sales) - Number(stats.total_change));
  const difference = closingCash - expectedCash;
  
  const result = await prisma.$queryRawUnsafe(
    `UPDATE ${schemaName}.shifts 
     SET status = 'closed',
         closing_cash = $1,
         expected_cash = $2,
         difference = $3,
         closed_at = NOW(),
         notes = COALESCE($4, notes),
         updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    closingCash,
    expectedCash,
    difference,
    notes || null,
    shiftId
  ) as any[];
  
  return {
    ...result[0],
    stats: {
      total_sales: Number(stats.total_sales),
      total_change: Number(stats.total_change),
      net_cash: Number(stats.total_sales) - Number(stats.total_change),
      transaction_count: Number(stats.transaction_count),
    },
  };
}

export async function getCurrentShift(
  schemaName: string,
  cashierId: string
): Promise<any | null> {
  const shifts = await prisma.$queryRawUnsafe(
    `SELECT s.*, o.name as outlet_name
     FROM ${schemaName}.shifts s
     LEFT JOIN ${schemaName}.outlets o ON s.outlet_id = o.id
     WHERE s.cashier_id = $1 AND s.status = 'open'
     LIMIT 1`,
    cashierId
  ) as any[];
  
  if (!shifts || shifts.length === 0) {
    return null;
  }
  
  const shift = shifts[0];
  
  // Get shift statistics
  const stats = await prisma.$queryRawUnsafe(
    `SELECT 
      COALESCE(SUM(total_amount), 0) as total_sales,
      COALESCE(SUM(total_paid), 0) as total_paid,
      COALESCE(SUM(change_amount), 0) as total_change,
      COALESCE(SUM(discount_amount), 0) as total_discount,
      COUNT(*) as transaction_count
     FROM ${schemaName}.transactions 
     WHERE shift_id = $1 AND status != 'voided'`,
    shift.id
  ) as any[];
  
  // Get payment method breakdown
  const paymentMethods = await prisma.$queryRawUnsafe(
    `SELECT 
      p.method,
      COALESCE(SUM(p.amount), 0) as total
     FROM ${schemaName}.payments p
     JOIN ${schemaName}.transactions t ON p.transaction_id = t.id
     WHERE t.shift_id = $1 AND t.status != 'voided'
     GROUP BY p.method`,
    shift.id
  );
  
  return {
    ...shift,
    stats: {
      total_sales: Number(stats[0]?.total_sales || 0),
      total_paid: Number(stats[0]?.total_paid || 0),
      total_change: Number(stats[0]?.total_change || 0),
      total_discount: Number(stats[0]?.total_discount || 0),
      transaction_count: Number(stats[0]?.transaction_count || 0),
    },
    payment_methods: paymentMethods,
  };
}

export async function getShifts(
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
  
  let whereClause = 'WHERE s.outlet_id = $1';
  const values: any[] = [outletId];
  let paramIdx = 2;
  
  if (params.startDate) {
    whereClause += ` AND s.opened_at >= $${paramIdx++}`;
    values.push(params.startDate);
  }
  
  if (params.endDate) {
    whereClause += ` AND s.opened_at <= $${paramIdx++}`;
    values.push(params.endDate);
  }
  
  if (params.status) {
    whereClause += ` AND s.status = $${paramIdx++}`;
    values.push(params.status);
  }
  
  const [shifts, total] = await prisma.$transaction([
    prisma.$queryRawUnsafe(
      `SELECT s.*, u.name as cashier_name, o.name as outlet_name
       FROM ${schemaName}.shifts s
       LEFT JOIN ${schemaName}.users u ON s.cashier_id = u.id
       LEFT JOIN ${schemaName}.outlets o ON s.outlet_id = o.id
       ${whereClause}
       ORDER BY s.opened_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      ...values,
      limit,
      skip
    ),
    prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM ${schemaName}.shifts s ${whereClause}`,
      ...values
    ),
  ]) as [any, any];
  
  return {
    data: shifts,
    meta: {
      page,
      limit,
      total: Number(total[0]?.count || 0),
      pages: Math.ceil(Number(total[0]?.count || 0) / limit),
    },
  };
}
