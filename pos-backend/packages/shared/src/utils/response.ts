import type { Response } from 'express';
import type { ApiSuccess, ApiError } from '../types';

export function ok<T>(res: Response, data: T, message?: string, status = 200) {
  const body: ApiSuccess<T> = { success: true, data, message };
  return res.status(status).json(body);
}

export function created<T>(res: Response, data: T, message = 'Created') {
  return ok(res, data, message, 201);
}

export function fail(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown
) {
  const body: ApiError = { success: false, error: { code, message, details } };
  return res.status(status).json(body);
}
