import { Request, Response } from 'express';
import './types';
import * as stockService from '../services/stock.service';
import { ok } from '@pos/shared';

export async function getStock(req: Request, res: Response) {
  const schema = req.tenant?.schema;
  if (!schema) throw new Error('Tenant schema not found');

  const result = await stockService.getStock(schema, req.params.outletId, req.query as any);
  ok(res, result.data, undefined).json({ meta: result.meta });
}

export async function adjustStock(req: Request, res: Response) {
  const schema = req.tenant?.schema;
  if (!schema) throw new Error('Tenant schema not found');

  const result = await stockService.adjustStock(schema, req.body, (req as any).user?.id);
  ok(res, result, 'Stock adjusted');
}

export async function transferStock(req: Request, res: Response) {
  const schema = req.tenant?.schema;
  if (!schema) throw new Error('Tenant schema not found');

  const result = await stockService.transferStock(schema, req.body, (req as any).user?.id);
  ok(res, result, 'Stock transferred');
}
