import { randomBytes } from 'node:crypto';
import { conflict, ok, parseJson, route } from '@/lib/api/http';
import { clientIp, enforceRateLimit } from '@/lib/api/rate-limit';
import { hashPassword } from '@/lib/auth/password';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { BUSINESS_COOKIE } from '@/lib/auth/context';
import { createBusinessForOwner } from '@/lib/businesses/create';
import { prisma } from '@/lib/db/client';
import { signupSchema } from '@/lib/validation/schemas';
import { cookies } from 'next/headers';

export const POST = route(async (request: Request) => {
    enforceRateLimit(`signup:${clientIp(request)}`, 5, 60_000);
    const input = await parseJson(request, signupSchema);

    const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (existing) throw conflict('An account with that email already exists. Sign in instead.');

    const user = await prisma.user.create({
        data: {
            name: input.name,
            email: input.email,
            passwordHash: await hashPassword(input.password),
            // Verification email delivery is a provider integration; the token is
            // issued now so the flow works as soon as one is configured.
            verifyToken: randomBytes(24).toString('hex'),
        },
    });

    const business = await createBusinessForOwner({ name: input.businessName, userId: user.id });

    const session = await createSession(user.id, {
        userAgent: request.headers.get('user-agent') ?? undefined,
        ip: clientIp(request),
    });
    await setSessionCookie(session.jwt, session.expiresAt);
    (await cookies()).set(BUSINESS_COOKIE, business.id, { path: '/', sameSite: 'lax' });

    return ok({ user: { id: user.id, name: user.name, email: user.email }, business: { id: business.id, slug: business.slug } }, 201);
});
