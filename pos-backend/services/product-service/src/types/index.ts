import 'express';

declare module 'express' {
  interface Request {
    tenant?: {
      schema: string;
      tenantId: string;
      outletId?: string;
    };
    user?: {
      id: string;
      email: string;
    };
  }
}
