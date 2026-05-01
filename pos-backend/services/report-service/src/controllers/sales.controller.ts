import { Request, Response } from 'express';
import { ok } from '@pos/shared';
import * as salesService from '../services/sales.service';

export async function getSalesReport(req: Request, res: Response) {
  const schema = req.tenant?.schema;
  if (!schema) throw new Error('Tenant schema not found');
  
  const outletId = req.query.outlet_id as string || req.tenant?.outletId;
  if (!outletId) {
    throw new Error('Outlet ID required');
  }
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  const result = await salesService.getSalesReport(schema, outletId, {
    startDate: req.query.start_date ? new Date(req.query.start_date as string) : startDate,
    endDate: req.query.end_date ? new Date(req.query.end_date as string) : endDate,
    groupBy: req.query.group_by as 'day' | 'week' | 'month',
  });
  
  ok(res, result);
}

export async function getProductSalesReport(req: Request, res: Response) {
  const schema = req.tenant?.schema;
  if (!schema) throw new Error('Tenant schema not found');
  
  const outletId = req.query.outlet_id as string || req.tenant?.outletId;
  if (!outletId) {
    throw new Error('Outlet ID required');
  }
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  const result = await salesService.getProductSalesReport(schema, outletId, {
    startDate: req.query.start_date ? new Date(req.query.start_date as string) : startDate,
    endDate: req.query.end_date ? new Date(req.query.end_date as string) : endDate,
    categoryId: req.query.category_id as string,
  });
  
  ok(res, result);
}

export async function getCashierReport(req: Request, res: Response) {
  const schema = req.tenant?.schema;
  if (!schema) throw new Error('Tenant schema not found');
  
  const outletId = req.query.outlet_id as string || req.tenant?.outletId;
  if (!outletId) {
    throw new Error('Outlet ID required');
  }
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  const result = await salesService.getCashierReport(schema, outletId, {
    startDate: req.query.start_date ? new Date(req.query.start_date as string) : startDate,
    endDate: req.query.end_date ? new Date(req.query.end_date as string) : endDate,
  });
  
  ok(res, result);
}
