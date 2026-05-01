import { Request, Response } from 'express';
import { ok, created } from '@pos/shared';
import * as transactionService from '../services/transaction.service';

export async function getTransactions(req: Request, res: Response) {
  const schema = req.tenant?.schema;
  if (!schema) throw new Error('Tenant schema not found');
  
  const outletId = req.query.outlet_id as string || req.tenant?.outletId;
  if (!outletId) {
    throw new Error('Outlet ID required');
  }
  
  const result = await transactionService.getTransactions(schema, outletId, {
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    startDate: req.query.start_date ? new Date(req.query.start_date as string) : undefined,
    endDate: req.query.end_date ? new Date(req.query.end_date as string) : undefined,
    status: req.query.status as string,
  });
  
  ok(res, result.data, undefined).json({ meta: result.meta });
}

export async function getTransactionById(req: Request, res: Response) {
  const schema = req.tenant?.schema;
  if (!schema) throw new Error('Tenant schema not found');
  
  const transaction = await transactionService.getTransactionById(schema, req.params.id);
  ok(res, transaction);
}

export async function createTransaction(req: Request, res: Response) {
  const schema = req.tenant?.schema;
  if (!schema) throw new Error('Tenant schema not found');
  
  const data = {
    ...req.body,
    cashier_id: (req as any).user?.id,
  };
  
  const transaction = await transactionService.createTransaction(schema, data);
  created(res, transaction, 'Transaction created');
}

export async function voidTransaction(req: Request, res: Response) {
  const schema = req.tenant?.schema;
  if (!schema) throw new Error('Tenant schema not found');
  
  const result = await transactionService.voidTransaction(
    schema,
    req.params.id,
    (req as any).user?.id,
    req.body.reason
  );
  ok(res, result, 'Transaction voided');
}
