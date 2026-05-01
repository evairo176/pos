import { Request, Response } from 'express';
import { ok, created } from '@pos/shared';
import * as refundService from '../services/refund.service';

export async function getRefunds(req: Request, res: Response) {
  const schema = req.tenant?.schema;
  if (!schema) throw new Error('Tenant schema not found');
  
  const outletId = req.query.outlet_id as string || req.tenant?.outletId;
  if (!outletId) {
    throw new Error('Outlet ID required');
  }
  
  const result = await refundService.getRefunds(schema, outletId, {
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    startDate: req.query.start_date ? new Date(req.query.start_date as string) : undefined,
    endDate: req.query.end_date ? new Date(req.query.end_date as string) : undefined,
  });
  
  ok(res, result.data, undefined).json({ meta: result.meta });
}

export async function getRefundById(req: Request, res: Response) {
  const schema = req.tenant?.schema;
  if (!schema) throw new Error('Tenant schema not found');
  
  const refund = await refundService.getRefundById(schema, req.params.id);
  ok(res, refund);
}

export async function createRefund(req: Request, res: Response) {
  const schema = req.tenant?.schema;
  if (!schema) throw new Error('Tenant schema not found');
  
  const result = await refundService.createRefund(
    schema,
    req.body.transaction_id,
    req.body.items,
    req.body.refund_payment_method,
    req.body.reason,
    (req as any).user?.id
  );
  created(res, result, 'Refund created');
}
