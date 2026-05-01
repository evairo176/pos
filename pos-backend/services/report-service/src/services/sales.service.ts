import { prisma } from '../lib/prisma';

export async function getSalesReport(
  schemaName: string,
  outletId: string,
  params: {
    startDate: Date;
    endDate: Date;
    groupBy?: 'day' | 'week' | 'month';
  }
): Promise<any> {
  const groupBy = params.groupBy || 'day';
  
  let dateGrouping: string;
  switch (groupBy) {
    case 'week':
      dateGrouping = "DATE_TRUNC('week', created_at)";
      break;
    case 'month':
      dateGrouping = "DATE_TRUNC('month', created_at)";
      break;
    case 'day':
    default:
      dateGrouping = "DATE_TRUNC('day', created_at)";
      break;
  }
  
  const [summary, dailyBreakdown, paymentMethods] = await prisma.$transaction([
    // Summary
    prisma.$queryRawUnsafe(
      `SELECT 
        COUNT(*) as transaction_count,
        COALESCE(SUM(total_amount), 0) as total_sales,
        COALESCE(SUM(subtotal), 0) as subtotal,
        COALESCE(SUM(discount_amount), 0) as total_discount,
        COALESCE(SUM(tax_amount), 0) as total_tax,
        COALESCE(SUM(refund_amount), 0) as total_refunds,
        COALESCE(AVG(total_amount), 0) as avg_transaction
       FROM ${schemaName}.transactions
       WHERE outlet_id = $1 
       AND created_at >= $2 AND created_at <= $3
       AND status != 'voided'`,
      outletId,
      params.startDate,
      params.endDate
    ),
    
    // Daily/weekly/monthly breakdown
    prisma.$queryRawUnsafe(
      `SELECT 
        ${dateGrouping} as date,
        COUNT(*) as transaction_count,
        SUM(total_amount) as total_sales,
        AVG(total_amount) as avg_transaction,
        MIN(total_amount) as min_transaction,
        MAX(total_amount) as max_transaction
       FROM ${schemaName}.transactions
       WHERE outlet_id = $1 
       AND created_at >= $2 AND created_at <= $3
       AND status != 'voided'
       GROUP BY ${dateGrouping}
       ORDER BY date`,
      outletId,
      params.startDate,
      params.endDate
    ),
    
    // Payment methods breakdown
    prisma.$queryRawUnsafe(
      `SELECT 
        p.method,
        COUNT(*) as transaction_count,
        SUM(p.amount) as total_amount
       FROM ${schemaName}.payments p
       JOIN ${schemaName}.transactions t ON p.transaction_id = t.id
       WHERE t.outlet_id = $1 
       AND t.created_at >= $2 AND t.created_at <= $3
       AND t.status != 'voided'
       GROUP BY p.method
       ORDER BY total_amount DESC`,
      outletId,
      params.startDate,
      params.endDate
    ),
  ]) as [any, any, any];
  
  return {
    summary: summary[0] || {
      transaction_count: 0,
      total_sales: 0,
      subtotal: 0,
      total_discount: 0,
      total_tax: 0,
      total_refunds: 0,
      avg_transaction: 0,
    },
    breakdown: dailyBreakdown,
    payment_methods: paymentMethods,
  };
}

export async function getProductSalesReport(
  schemaName: string,
  outletId: string,
  params: {
    startDate: Date;
    endDate: Date;
    categoryId?: string;
  }
): Promise<any> {
  let categoryFilter = '';
  const values: any[] = [outletId, params.startDate, params.endDate];
  
  if (params.categoryId) {
    categoryFilter = 'AND p.category_id = $4';
    values.push(params.categoryId);
  }
  
  const [summary, productDetails] = await prisma.$transaction([
    // Summary
    prisma.$queryRawUnsafe(
      `SELECT 
        COUNT(DISTINCT t.id) as transaction_count,
        SUM(ti.quantity) as total_quantity,
        SUM(ti.subtotal) as total_sales,
        AVG(ti.price) as avg_price
       FROM ${schemaName}.transaction_items ti
       JOIN ${schemaName}.products p ON ti.product_id = p.id
       JOIN ${schemaName}.transactions t ON ti.transaction_id = t.id
       WHERE t.outlet_id = $1 
       AND t.created_at >= $2 AND t.created_at <= $3
       AND t.status != 'voided'
       ${categoryFilter}`,
      ...values
    ),
    
    // Product details
    prisma.$queryRawUnsafe(
      `SELECT 
        p.id,
        p.name,
        p.sku,
        c.name as category_name,
        SUM(ti.quantity) as total_quantity,
        SUM(ti.subtotal) as total_sales,
        AVG(ti.price) as avg_selling_price,
        p.cost_price,
        SUM(ti.subtotal - (p.cost_price * ti.quantity)) as estimated_profit
       FROM ${schemaName}.transaction_items ti
       JOIN ${schemaName}.products p ON ti.product_id = p.id
       LEFT JOIN ${schemaName}.categories c ON p.category_id = c.id
       JOIN ${schemaName}.transactions t ON ti.transaction_id = t.id
       WHERE t.outlet_id = $1 
       AND t.created_at >= $2 AND t.created_at <= $3
       AND t.status != 'voided'
       ${categoryFilter}
       GROUP BY p.id, p.name, p.sku, c.name, p.cost_price
       ORDER BY total_sales DESC`,
      ...values
    ),
  ]) as [any, any];
  
  return {
    summary: summary[0] || {
      transaction_count: 0,
      total_quantity: 0,
      total_sales: 0,
      avg_price: 0,
    },
    products: productDetails,
  };
}

export async function getCashierReport(
  schemaName: string,
  outletId: string,
  params: {
    startDate: Date;
    endDate: Date;
  }
): Promise<any> {
  const [cashierStats] = await prisma.$transaction([
    prisma.$queryRawUnsafe(
      `SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(t.id) as transaction_count,
        SUM(t.total_amount) as total_sales,
        AVG(t.total_amount) as avg_transaction,
        SUM(t.discount_amount) as total_discounts,
        COUNT(CASE WHEN t.has_refund THEN 1 END) as refund_count,
        SUM(t.refund_amount) as total_refunds
       FROM ${schemaName}.users u
       LEFT JOIN ${schemaName}.transactions t ON t.cashier_id = u.id
         AND t.outlet_id = $1 
         AND t.created_at >= $2 AND t.created_at <= $3
         AND t.status != 'voided'
       WHERE u.role IN ('cashier', 'manager', 'owner')
       GROUP BY u.id, u.name, u.email
       ORDER BY total_sales DESC`,
      outletId,
      params.startDate,
      params.endDate
    ),
  ]);
  
  return {
    cashiers: cashierStats,
  };
}
