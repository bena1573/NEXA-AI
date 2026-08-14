import { cookies } from 'next/headers';
import { ok, parseJson, route, unauthorized } from '@/lib/api/http';
import { clientIp, enforceRateLimit } from '@/lib/api/rate-limit';
import { verifyPassword } from '@/lib/auth/password';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { BUSINESS_COOKIE } from '@/lib/auth/context';
import { prisma } from '@/lib/db/client';
import { loginSchema } from '@/lib/validation/schemas';

export const POST = route(async (request: Request) => {
    const ip = clientIp(request);
    enforceRateLimit(`login:${ip}`, 10, 60_000);
    const input = await parseJson(request, loginSchema);
    enforceRateLimit(`login:${input.email}`, 10, 300_000);

    const user = await prisma.user.findUnique({ where: { email: input.email } });
    // Same message either way so the response cannot be used to enumerate accounts.
    const invalid = unauthorized('Those details do not match an account.');
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) throw invalid;

    const session = await createSession(user.id, {
        userAgent: request.headers.get('user-agent') ?? undefined,
        ip,
    });
    await setSessionCookie(session.jwt, session.expiresAt);

    const membership = await prisma.membership.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
    });
    const jar = await cookies();
    if (membership) jar.set(BUSINESS_COOKIE, membership.businessId, { path: '/', sameSite: 'lax' });

    return ok({
        user: { id: user.id, name: user.name, email: user.email },
        onboarded: Boolean(membership),
    });
});
