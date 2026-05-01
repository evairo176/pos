import { Request, Response } from 'express';
import { ok } from '@pos/shared';
import * as dashboardService from '../services/dashboard.service';

export async function getDashboardSummary(req: Request, res: Response) {
  const schema = req.tenant?.schema;
  if (!schema) throw new Error('Tenant schema not found');
  
  const outletId = req.query.outlet_id as string || req.tenant?.outletId;
  if (!outletId) {
    throw new Error('Outlet ID required');
  }
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30); // Last 30 days
  
  const result = await dashboardService.getDashboardSummary(schema, outletId, {
    startDate: req.query.start_date ? new Date(req.query.start_date as string) : startDate,
    endDate: req.query.end_date ? new Date(req.query.end_date as string) : endDate,
  });
  
  ok(res, result);
}

export async function getSalesComparison(req: Request, res: Response) {
  const schema = req.tenant?.schema;
  if (!schema) throw new Error('Tenant schema not found');
  
  const outletId = req.query.outlet_id as string || req.tenant?.outletId;
  if (!outletId) {
    throw new Error('Outlet ID required');
  }
  
  // Current period: last 30 days
  const currentEnd = new Date();
  const currentStart = new Date();
  currentStart.setDate(currentStart.getDate() - 30);
  
  // Previous period: 30 days before that
  const previousEnd = new Date(currentStart);
  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - 30);
  
  const result = await dashboardService.getSalesComparison(
    schema,
    outletId,
    {
      startDate: currentStart,
      endDate: currentEnd,
    },
    {
      startDate: previousStart,
      endDate: previousEnd,
    }
  );
  
  ok(res, result);
}
