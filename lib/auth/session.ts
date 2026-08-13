import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '@/lib/env';
import { prisma } from '@/lib/db/client';

export const SESSION_COOKIE = 'nexa_session';
const SESSION_TTL_DAYS = 30;

const secret = new TextEncoder().encode(env.AUTH_SECRET);

function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

/**
 * Creates a DB-backed session and returns the signed cookie value. The raw token
 * never leaves this module in plaintext form (only its hash is stored).
 */
export async function createSession(userId: string, meta: { userAgent?: string; ip?: string } = {}) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000);

    const session = await prisma.session.create({
        data: {
            userId,
            tokenHash: hashToken(token),
            userAgent: meta.userAgent?.slice(0, 255),
            ip: meta.ip,
            expiresAt,
        },
    });

    const jwt = await new SignJWT({ sid: session.id, token })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(expiresAt)
        .sign(secret);

    return { jwt, expiresAt, sessionId: session.id };
}

export async function readSessionCookie(): Promise<{ sid: string; token: string } | null> {
    const jar = await cookies();
    const raw = jar.get(SESSION_COOKIE)?.value;
    if (!raw) return null;

    try {
        const { payload } = await jwtVerify(raw, secret);
        if (typeof payload.sid !== 'string' || typeof payload.token !== 'string') return null;
        return { sid: payload.sid, token: payload.token };
    } catch {
        return null;
    }
}

export async function resolveSessionUser() {
    const cookie = await readSessionCookie();
    if (!cookie) return null;

    const session = await prisma.session.findUnique({
        where: { id: cookie.sid },
        include: { user: true },
    });

    if (!session || session.tokenHash !== hashToken(cookie.token)) return null;
    if (session.expiresAt.getTime() < Date.now()) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
        return null;
    }

    return { session, user: session.user };
}

export async function destroySession() {
    const cookie = await readSessionCookie();
    if (cookie) {
        await prisma.session.deleteMany({ where: { id: cookie.sid } });
    }
    const jar = await cookies();
    jar.delete(SESSION_COOKIE);
}

export async function setSessionCookie(jwt: string, expiresAt: Date) {
    const jar = await cookies();
    jar.set(SESSION_COOKIE, jwt, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        expires: expiresAt,
    });
}

export { hashToken };
