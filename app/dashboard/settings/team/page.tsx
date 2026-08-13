import type { Metadata } from 'next';
import { TeamManager } from '@/components/settings/team-manager';
import { requirePermission } from '@/lib/auth/context';
import { can } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/client';
import { env } from '@/lib/env';

export const metadata: Metadata = { title: 'Team' };

export default async function TeamSettingsPage() {
    const ctx = await requirePermission('team:read');

    const [members, invites] = await Promise.all([
        prisma.membership.findMany({
            where: { businessId: ctx.businessId },
            orderBy: { createdAt: 'asc' },
            select: { id: true, role: true, user: { select: { id: true, name: true, email: true } } },
        }),
        prisma.invite.findMany({
            where: { businessId: ctx.businessId, acceptedAt: null },
            orderBy: { createdAt: 'desc' },
            select: { id: true, email: true, role: true, expiresAt: true },
        }),
    ]);

    return (
        <TeamManager
            members={members}
            invites={invites.map(invite => ({ ...invite, expiresAt: invite.expiresAt.toISOString() }))}
            currentUserId={ctx.userId}
            canInvite={can(ctx.role, 'team:invite')}
            canManage={can(ctx.role, 'team:manage')}
            demoMode={env.DEMO_MODE}
        />
    );
}
