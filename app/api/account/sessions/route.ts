import { ok, route } from '@/lib/api/http';
import { requireUser } from '@/lib/auth/context';
import { readSessionCookie } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';

export const GET = route(async () => {
    const user = await requireUser();
    const cookie = await readSessionCookie();

    const sessions = await prisma.session.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        select: { id: true, userAgent: true, ip: true, createdAt: true, expiresAt: true },
    });

    return ok({
        sessions: sessions.map(session => ({ ...session, current: session.id === cookie?.sid })),
    });
});

export const DELETE = route(async () => {
    const user = await requireUser();
    const cookie = await readSessionCookie();

    const result = await prisma.session.deleteMany({
        where: { userId: user.id, ...(cookie ? { id: { not: cookie.sid } } : {}) },
    });

    return ok({ revoked: result.count });
});
