import { createHash, randomBytes } from 'node:crypto';
import { conflict, ok, parseJson, route } from '@/lib/api/http';
import { requirePermission } from '@/lib/auth/context';
import { prisma } from '@/lib/db/client';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { inviteSchema } from '@/lib/validation/schemas';

const INVITE_TTL_MS = 7 * 86_400_000;

export const GET = route(async () => {
    const ctx = await requirePermission('team:read');

    const [members, invites] = await Promise.all([
        prisma.membership.findMany({
            where: { businessId: ctx.businessId },
            orderBy: { createdAt: 'asc' },
            select: { id: true, role: true, createdAt: true, user: { select: { id: true, name: true, email: true } } },
        }),
        prisma.invite.findMany({
            where: { businessId: ctx.businessId, acceptedAt: null },
            orderBy: { createdAt: 'desc' },
            select: { id: true, email: true, role: true, expiresAt: true },
        }),
    ]);

    return ok({ members, invites });
});

export const POST = route(async (request: Request) => {
    const ctx = await requirePermission('team:invite');
    const { email, role } = await parseJson(request, inviteSchema);

    const alreadyMember = await prisma.membership.findFirst({
        where: { businessId: ctx.businessId, user: { email } },
        select: { id: true },
    });
    if (alreadyMember) throw conflict('That person is already on your team.');

    const token = randomBytes(24).toString('hex');
    const invite = await prisma.invite.upsert({
        where: { businessId_email: { businessId: ctx.businessId, email } },
        create: {
            businessId: ctx.businessId,
            email,
            role,
            tokenHash: createHash('sha256').update(token).digest('hex'),
            expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        },
        update: {
            role,
            tokenHash: createHash('sha256').update(token).digest('hex'),
            expiresAt: new Date(Date.now() + INVITE_TTL_MS),
            acceptedAt: null,
        },
        select: { id: true, email: true, role: true, expiresAt: true },
    });

    // No mailer is connected yet; in demo mode the link is logged so the flow is testable.
    if (env.DEMO_MODE) {
        logger.info('team_invite_link', { url: `${env.APP_URL}/signup?invite=${token}` });
    }

    return ok({ invite }, 201);
});
