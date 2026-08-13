import { badRequest, ok, parseJson, route } from '@/lib/api/http';
import { requireUser } from '@/lib/auth/context';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { readSessionCookie } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { changePasswordSchema } from '@/lib/validation/schemas';

export const POST = route(async (request: Request) => {
    const user = await requireUser();
    const { currentPassword, newPassword } = await parseJson(request, changePasswordSchema);

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw badRequest('That is not your current password.');

    const cookie = await readSessionCookie();

    await prisma.$transaction([
        prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: await hashPassword(newPassword), resetToken: null, resetExpires: null },
        }),
        // Every other device is signed out; the current session stays valid.
        prisma.session.deleteMany({
            where: { userId: user.id, ...(cookie ? { id: { not: cookie.sid } } : {}) },
        }),
    ]);

    return ok({ changed: true });
});
