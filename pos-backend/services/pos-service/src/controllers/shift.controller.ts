import { Request, Response } from 'express';
import { ok, created } from '@pos/shared';
import * as shiftService from '../services/shift.service';

export async function getShifts(req: Request, res: Response) {
  const schema = req.tenant?.schema;
  if (!schema) throw new Error('Tenant schema not found');
  
  const outletId = req.query.outlet_id as string || req.tenant?.outletId;
  if (!outletId) {
    throw new Error('Outlet ID required');
  }
  
  const result = await shiftService.getShifts(schema, outletId, {
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    startDate: req.query.start_date ? new Date(req.query.start_date as string) : undefined,
    endDate: req.query.end_date ? new Date(req.query.end_date as string) : undefined,
    status: req.query.status as string,
  });
  
  ok(res, result.data, undefined).json({ meta: result.meta });
}

export async function getCurrentShift(req: Request, res: Response) {
  const schema = req.tenant?.schema;
  if (!schema) throw new Error('Tenant schema not found');
  
  const shift = await shiftService.getCurrentShift(schema, (req as any).user?.id);
  ok(res, shift);
}

export async function openShift(req: Request, res: Response) {
  const schema = req.tenant?.schema;
  if (!schema) throw new Error('Tenant schema not found');
  
  const shift = await shiftService.openShift(
    schema,
    req.body.outlet_id,
    (req as any).user?.id,
    req.body.opening_cash || 0
  );
  created(res, shift, 'Shift opened');
}

export async function closeShift(req: Request, res: Response) {
  const schema = req.tenant?.schema;
  if (!schema) throw new Error('Tenant schema not found');
  
  const result = await shiftService.closeShift(
    schema,
    req.params.id,
    (req as any).user?.id,
    req.body.closing_cash,
    req.body.notes
  );
  ok(res, result, 'Shift closed');
}
