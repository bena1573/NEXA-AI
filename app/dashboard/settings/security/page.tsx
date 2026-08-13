import type { Metadata } from 'next';
import { SecurityPanel } from '@/components/settings/security-panel';
import { requireUser } from '@/lib/auth/context';
import { readSessionCookie } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';

export const metadata: Metadata = { title: 'Security' };

export default async function SecuritySettingsPage() {
    const user = await requireUser();
    const cookie = await readSessionCookie();

    const sessions = await prisma.session.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        select: { id: true, userAgent: true, ip: true, createdAt: true },
    });

    return (
        <SecurityPanel
            sessions={sessions.map(session => ({
                id: session.id,
                userAgent: session.userAgent,
                ip: session.ip,
                createdAt: session.createdAt.toISOString(),
                current: session.id === cookie?.sid,
            }))}
        />
    );
}
