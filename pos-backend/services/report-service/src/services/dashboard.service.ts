import { prisma } from '../lib/prisma';

export async function getDashboardSummary(
  schemaName: string,
  outletId: string,
  dateRange: { startDate: Date; endDate: Date }
): Promise<any> {
  const [salesSummary, topProducts, topCategories, hourlySales] = await prisma.$transaction([
    // Sales summary
    prisma.$queryRawUnsafe(
      `SELECT 
        COUNT(*) as transaction_count,
        COALESCE(SUM(total_amount), 0) as total_sales,
        COALESCE(SUM(discount_amount), 0) as total_discount,
        COALESCE(SUM(tax_amount), 0) as total_tax,
        COALESCE(AVG(total_amount), 0) as avg_transaction
       FROM ${schemaName}.transactions
       WHERE outlet_id = $1 
       AND created_at >= $2 AND created_at <= $3
       AND status != 'voided'`,
      outletId,
      dateRange.startDate,
      dateRange.endDate
    ),
    
    // Top products
    prisma.$queryRawUnsafe(
      `SELECT 
        p.id,
        p.name,
        p.sku,
        SUM(ti.quantity) as total_quantity,
        SUM(ti.subtotal) as total_sales
       FROM ${schemaName}.transaction_items ti
       JOIN ${schemaName}.products p ON ti.product_id = p.id
       JOIN ${schemaName}.transactions t ON ti.transaction_id = t.id
       WHERE t.outlet_id = $1 
       AND t.created_at >= $2 AND t.created_at <= $3
       AND t.status != 'voided'
       GROUP BY p.id, p.name, p.sku
       ORDER BY total_sales DESC
       LIMIT 5`,
      outletId,
      dateRange.startDate,
      dateRange.endDate
    ),
    
    // Top categories
    prisma.$queryRawUnsafe(
      `SELECT 
        c.id,
        c.name,
        COUNT(DISTINCT t.id) as transaction_count,
        SUM(ti.subtotal) as total_sales
       FROM ${schemaName}.transaction_items ti
       JOIN ${schemaName}.products p ON ti.product_id = p.id
       LEFT JOIN ${schemaName}.categories c ON p.category_id = c.id
       JOIN ${schemaName}.transactions t ON ti.transaction_id = t.id
       WHERE t.outlet_id = $1 
       AND t.created_at >= $2 AND t.created_at <= $3
       AND t.status != 'voided'
       GROUP BY c.id, c.name
       ORDER BY total_sales DESC
       LIMIT 5`,
      outletId,
      dateRange.startDate,
      dateRange.endDate
    ),
    
    // Hourly sales breakdown
    prisma.$queryRawUnsafe(
      `SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as transaction_count,
        SUM(total_amount) as total_sales
       FROM ${schemaName}.transactions
       WHERE outlet_id = $1 
       AND created_at >= $2 AND created_at <= $3
       AND status != 'voided'
       GROUP BY EXTRACT(HOUR FROM created_at)
       ORDER BY hour`,
      outletId,
      dateRange.startDate,
      dateRange.endDate
    ),
  ]) as [any, any, any, any];
  
  return {
    sales_summary: salesSummary[0] || {
      transaction_count: 0,
      total_sales: 0,
      total_discount: 0,
      total_tax: 0,
      avg_transaction: 0,
    },
    top_products: topProducts,
    top_categories: topCategories,
    hourly_sales: hourlySales,
  };
}

export async function getSalesComparison(
  schemaName: string,
  outletId: string,
  currentPeriod: { startDate: Date; endDate: Date },
  previousPeriod: { startDate: Date; endDate: Date }
): Promise<any> {
  const [current, previous] = await prisma.$transaction([
    prisma.$queryRawUnsafe(
      `SELECT 
        COUNT(*) as transaction_count,
        COALESCE(SUM(total_amount), 0) as total_sales
       FROM ${schemaName}.transactions
       WHERE outlet_id = $1 
       AND created_at >= $2 AND created_at <= $3
       AND status != 'voided'`,
      outletId,
      currentPeriod.startDate,
      currentPeriod.endDate
    ),
    prisma.$queryRawUnsafe(
      `SELECT 
        COUNT(*) as transaction_count,
        COALESCE(SUM(total_amount), 0) as total_sales
       FROM ${schemaName}.transactions
       WHERE outlet_id = $1 
       AND created_at >= $2 AND created_at <= $3
       AND status != 'voided'`,
      outletId,
      previousPeriod.startDate,
      previousPeriod.endDate
    ),
  ]) as [any, any];
  
  const currentData = current[0] || { transaction_count: 0, total_sales: 0 };
  const previousData = previous[0] || { transaction_count: 0, total_sales: 0 };
  
  const salesChange = previousData.total_sales > 0
    ? ((Number(currentData.total_sales) - Number(previousData.total_sales)) / Number(previousData.total_sales)) * 100
    : 0;
    
  const transactionChange = previousData.transaction_count > 0
    ? ((Number(currentData.transaction_count) - Number(previousData.transaction_count)) / Number(previousData.transaction_count)) * 100
    : 0;
  
  return {
    current_period: currentData,
    previous_period: previousData,
    changes: {
      sales_percent: salesChange,
      transaction_percent: transactionChange,
    },
  };
}
