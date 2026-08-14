import type { Role } from '@prisma/client';
import { prisma } from '@/lib/db/client';
import { can, type Action } from '@/lib/auth/permissions';
import { forbidden, notFound } from '@/lib/api/http';

/**
 * The only object that authorises access to business-owned data. It is produced
 * from the server-side session — never from a client-supplied business id.
 */
export type BusinessContext = {
    businessId: string;
    userId: string;
    role: Role;
};

/** Narrow filter helper so queries cannot forget the tenant predicate. */
export function scope<T extends object>(ctx: BusinessContext, where: T = {} as T) {
    return { ...where, businessId: ctx.businessId };
}

export function assertCan(ctx: BusinessContext, action: Action): void {
    if (!can(ctx.role, action)) {
        throw forbidden(`Your role (${ctx.role.toLowerCase()}) cannot perform this action.`);
    }
}

/**
 * Loads a business-owned record and verifies it belongs to the context's tenant.
 * Returns 404 (not 403) for foreign ids so tenants cannot probe for existence.
 */
export async function findOwned<T extends { businessId: string }>(
    ctx: BusinessContext,
    loader: (id: string) => Promise<T | null>,
    id: string,
): Promise<T> {
    const record = await loader(id);
    if (!record || record.businessId !== ctx.businessId) {
        throw notFound();
    }
    return record;
}

export async function membershipFor(userId: string, businessId: string) {
    return prisma.membership.findUnique({ where: { userId_businessId: { userId, businessId } } });
}

export async function contextFor(userId: string, businessId: string): Promise<BusinessContext | null> {
    const membership = await membershipFor(userId, businessId);
    if (!membership) return null;
    return { businessId, userId, role: membership.role };
}
