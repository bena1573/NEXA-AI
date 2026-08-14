import { createHash } from 'node:crypto';
import { badRequest, ok, parseJson, route } from '@/lib/api/http';
import { clientIp, enforceRateLimit } from '@/lib/api/rate-limit';
import { hashPassword } from '@/lib/auth/password';
import { prisma } from '@/lib/db/client';
import { resetPasswordSchema } from '@/lib/validation/schemas';

export const POST = route(async (request: Request) => {
    enforceRateLimit(`reset:${clientIp(request)}`, 10, 300_000);
    const input = await parseJson(request, resetPasswordSchema);

    const user = await prisma.user.findUnique({
        where: { resetToken: createHash('sha256').update(input.token).digest('hex') },
        select: { id: true, resetExpires: true },
    });
    if (!user || !user.resetExpires || user.resetExpires.getTime() < Date.now()) {
        throw badRequest('That reset link has expired. Request a new one.');
    }

    await prisma.$transaction([
        prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: await hashPassword(input.password), resetToken: null, resetExpires: null },
        }),
        // Every existing session is revoked so a stolen session cannot outlive the reset.
        prisma.session.deleteMany({ where: { userId: user.id } }),
    ]);

    return ok({ reset: true });
});
