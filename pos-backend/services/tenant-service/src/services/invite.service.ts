import { randomBytes } from 'crypto';
import { getRedis, ConflictError, NotFoundError, logger } from '@pos/shared';
import { prisma } from '../lib/prisma';
import type { InviteUserInput } from '../validators/tenant.validator';

const INVITE_PREFIX = 'invite:';

/**
 * Invite flow (Phase 1 minimum):
 *   - If email already has UserGlobal → create tenant_users row as 'pending_accept' (activate immediately).
 *   - Else → store invite in Redis with random token; user must register/accept later.
 * In Phase 1 we fire-and-forget (no notification-service yet); return token in dev.
 */
export const inviteService = {
  async invite(tenantId: string, input: InviteUserInput, env: string) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundError('Tenant not found');

    const existingUser = await prisma.userGlobal.findUnique({ where: { email: input.email } });
    if (existingUser) {
      // Create membership directly
      const duplicate = await prisma.tenantUser.findUnique({
        where: { tenant_id_user_id: { tenant_id: tenantId, user_id: existingUser.id } },
      });
      if (duplicate) throw new ConflictError('User is already a member');
      await prisma.tenantUser.create({
        data: { tenant_id: tenantId, user_id: existingUser.id, role: input.role },
      });
      return { invited: true, member: true };
    }

    const token = randomBytes(32).toString('hex');
    const redis = getRedis();
    const payload = JSON.stringify({
      tenant_id: tenantId,
      email: input.email,
      role: input.role,
    });
    await redis.set(`${INVITE_PREFIX}${token}`, payload, 'EX', 60 * 60 * 24 * 7); // 7d
    logger.info('Invite created', { tenant_id: tenantId, email: input.email });
    return { invited: true, member: false, token_debug: env === 'development' ? token : undefined };
  },
};
