import bcrypt from 'bcryptjs';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getRedis,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  logger,
  type JwtPayload,
  type TenantMembership,
  type UserRole,
} from '@pos/shared';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import type {
  RegisterInput,
  LoginInput,
  RefreshInput,
  ResetInput,
  ForgotInput,
  SwitchTenantInput,
} from '../validators/auth.validator';

const REFRESH_PREFIX = 'auth:refresh:'; // key: auth:refresh:<jti> -> userId
const RESET_PREFIX = 'auth:reset:'; // key: auth:reset:<token> -> userId (TTL 1h)

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

async function buildMemberships(userId: string): Promise<TenantMembership[]> {
  const rows = await prisma.tenantUser.findMany({
    where: { user_id: userId, is_active: true },
    include: { tenant: true },
  });
  return rows.map((r) => ({
    tenant_id: r.tenant.id,
    tenant_name: r.tenant.name,
    schema: r.tenant.schema_name,
    role: r.role as UserRole,
    outlet_id: null,
  }));
}

async function issueTokens(payload: Omit<JwtPayload, 'iat' | 'exp'>) {
  const accessToken = signAccessToken(payload);
  const jti = uuidv4();
  const refreshToken = signRefreshToken({ sub: payload.sub, jti });
  const redis = getRedis();
  // store jti -> userId, ttl = refresh expires (seconds-approx)
  const ttlSec = 60 * 60 * 24 * 7; // 7 days (matches default)
  await redis.set(`${REFRESH_PREFIX}${jti}`, payload.sub, 'EX', ttlSec);
  return { accessToken, refreshToken };
}

export const authService = {
  async register(input: RegisterInput) {
    const existing = await prisma.userGlobal.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictError('Email already registered');

    const password_hash = await bcrypt.hash(input.password, config.bcryptRounds);

    // Create user first.
    const user = await prisma.userGlobal.create({
      data: {
        email: input.email,
        password_hash,
        full_name: input.full_name,
        phone: input.phone,
      },
    });

    // Delegate tenant creation to tenant-service (service-to-service).
    // It will create schema_<id>, migrate, seed, and create tenant_users membership as 'owner'.
    let tenant: { id: string; name: string; schema_name: string } | null = null;
    try {
      const resp = await axios.post(
        `${config.tenantServiceUrl}/internal/tenants/provision`,
        {
          name: input.business_name,
          slug: input.business_slug || slugify(input.business_name),
          owner_email: input.email,
          owner_user_id: user.id,
        },
        { timeout: 15000, headers: { 'x-internal-key': config.jwtSecret } }
      );
      tenant = resp.data?.data ?? null;
    } catch (err) {
      // Rollback user if tenant provisioning fails
      await prisma.userGlobal.delete({ where: { id: user.id } }).catch(() => {});
      logger.error('Tenant provisioning failed', { err: (err as Error).message });
      throw new BadRequestError('Failed to provision tenant');
    }

    const memberships = await buildMemberships(user.id);
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      name: user.full_name,
      tenants: memberships,
      active_tenant: tenant?.id ?? null,
      active_outlet: null,
      is_super_admin: user.is_super_admin,
    };
    const tokens = await issueTokens(payload);
    return {
      user: { id: user.id, email: user.email, full_name: user.full_name },
      tenant,
      ...tokens,
    };
  },

  async login(input: LoginInput) {
    const user = await prisma.userGlobal.findUnique({ where: { email: input.email } });
    if (!user || !user.is_active) throw new UnauthorizedError('Invalid credentials');
    const ok = await bcrypt.compare(input.password, user.password_hash);
    if (!ok) throw new UnauthorizedError('Invalid credentials');

    await prisma.userGlobal.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    const memberships = await buildMemberships(user.id);
    const active = memberships[0]?.tenant_id ?? null;

    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      name: user.full_name,
      tenants: memberships,
      active_tenant: active,
      active_outlet: null,
      is_super_admin: user.is_super_admin,
    };
    const tokens = await issueTokens(payload);
    return {
      user: { id: user.id, email: user.email, full_name: user.full_name, is_super_admin: user.is_super_admin },
      tenants: memberships,
      ...tokens,
    };
  },

  async refresh(input: RefreshInput) {
    let decoded;
    try {
      decoded = verifyRefreshToken(input.refresh_token);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }
    const redis = getRedis();
    const stored = await redis.get(`${REFRESH_PREFIX}${decoded.jti}`);
    if (!stored || stored !== decoded.sub) {
      throw new UnauthorizedError('Refresh token revoked');
    }
    // Rotate: revoke old jti
    await redis.del(`${REFRESH_PREFIX}${decoded.jti}`);

    const user = await prisma.userGlobal.findUnique({ where: { id: decoded.sub } });
    if (!user || !user.is_active) throw new UnauthorizedError('User inactive');

    const memberships = await buildMemberships(user.id);
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      name: user.full_name,
      tenants: memberships,
      active_tenant: memberships[0]?.tenant_id ?? null,
      active_outlet: null,
      is_super_admin: user.is_super_admin,
    };
    return issueTokens(payload);
  },

  async logout(refreshToken: string) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      const redis = getRedis();
      await redis.del(`${REFRESH_PREFIX}${decoded.jti}`);
    } catch {
      // swallow; logout is best-effort
    }
  },

  async me(userId: string) {
    const user = await prisma.userGlobal.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');
    const memberships = await buildMemberships(user.id);
    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        avatar_url: user.avatar_url,
        is_super_admin: user.is_super_admin,
      },
      tenants: memberships,
    };
  },

  async forgotPassword(input: ForgotInput) {
    const user = await prisma.userGlobal.findUnique({ where: { email: input.email } });
    // Always return success to avoid account enumeration
    if (!user) return { sent: true };
    const token = uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
    const redis = getRedis();
    await redis.set(`${RESET_PREFIX}${token}`, user.id, 'EX', 60 * 60); // 1h
    // TODO: hand off to notification-service. For Phase 1, just log.
    logger.info('Password reset requested', { email: input.email, token });
    return { sent: true, token_debug: config.env === 'development' ? token : undefined };
  },

  async resetPassword(input: ResetInput) {
    const redis = getRedis();
    const userId = await redis.get(`${RESET_PREFIX}${input.token}`);
    if (!userId) throw new BadRequestError('Invalid or expired reset token');
    const hash = await bcrypt.hash(input.new_password, config.bcryptRounds);
    await prisma.userGlobal.update({
      where: { id: userId },
      data: { password_hash: hash },
    });
    await redis.del(`${RESET_PREFIX}${input.token}`);
    return { reset: true };
  },

  async switchTenant(userId: string, input: SwitchTenantInput) {
    const user = await prisma.userGlobal.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedError();
    const memberships = await buildMemberships(user.id);
    const target = memberships.find((m) => m.tenant_id === input.tenant_id);
    if (!target) throw new ForbiddenError('Not a member of this tenant');

    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      name: user.full_name,
      tenants: memberships,
      active_tenant: target.tenant_id,
      active_outlet: input.outlet_id ?? null,
      is_super_admin: user.is_super_admin,
    };
    return issueTokens(payload);
  },
};
