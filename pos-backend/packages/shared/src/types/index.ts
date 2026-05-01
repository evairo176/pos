export type UserRole = 'super_admin' | 'owner' | 'manager' | 'cashier';

export interface TenantMembership {
  tenant_id: string;
  tenant_name: string;
  schema: string;
  role: UserRole;
  outlet_id?: string | null;
}

export interface JwtPayload {
  sub: string; // user id
  email: string;
  name: string;
  tenants: TenantMembership[];
  active_tenant?: string | null;
  active_outlet?: string | null;
  is_super_admin?: boolean;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string; // token id, used for revoke list
  iat?: number;
  exp?: number;
}

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// Augment Express Request
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      tenant?: TenantMembership & { schema_name: string };
    }
  }
}
