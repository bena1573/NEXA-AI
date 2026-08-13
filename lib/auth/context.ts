import { cookies } from 'next/headers';
import type { User } from '@prisma/client';
import { prisma } from '@/lib/db/client';
import { resolveSessionUser } from '@/lib/auth/session';
import { forbidden, unauthorized } from '@/lib/api/http';
import { assertCan, type BusinessContext } from '@/lib/db/tenant';
import type { Action } from '@/lib/auth/permissions';

export const BUSINESS_COOKIE = 'nexa_business';

export async function currentUser(): Promise<User | null> {
    const resolved = await resolveSessionUser();
    return resolved?.user ?? null;
}

export async function requireUser(): Promise<User> {
    const user = await currentUser();
    if (!user) throw unauthorized();
    return user;
}

/**
 * Resolves the business the user is acting on: the one selected in the
 * `nexa_business` cookie when they are a member of it, otherwise their first
 * membership. The cookie is never trusted on its own.
 */
export async function currentContext(): Promise<BusinessContext | null> {
    const user = await currentUser();
    if (!user) return null;

    const jar = await cookies();
    const preferred = jar.get(BUSINESS_COOKIE)?.value;

    const memberships = await prisma.membership.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
    });
    if (memberships.length === 0) return null;

    const membership = memberships.find(entry => entry.businessId === preferred) ?? memberships[0];
    return { businessId: membership.businessId, userId: user.id, role: membership.role };
}

export async function requireContext(): Promise<BusinessContext> {
    const user = await requireUser();
    const context = await currentContext();
    if (!context) {
        throw forbidden(`${user.email} is not a member of any business yet. Complete onboarding first.`);
    }
    return context;
}

export async function requirePermission(action: Action): Promise<BusinessContext> {
    const context = await requireContext();
    assertCan(context, action);
    return context;
}
