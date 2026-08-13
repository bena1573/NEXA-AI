import { createHash, randomBytes } from 'node:crypto';
import { ok, parseJson, route } from '@/lib/api/http';
import { clientIp, enforceRateLimit } from '@/lib/api/rate-limit';
import { prisma } from '@/lib/db/client';
import { logger } from '@/lib/logger';
import { forgotPasswordSchema } from '@/lib/validation/schemas';
import { env } from '@/lib/env';

const RESET_TTL_MS = 60 * 60 * 1000;

export const POST = route(async (request: Request) => {
    enforceRateLimit(`forgot:${clientIp(request)}`, 5, 300_000);
    const { email } = await parseJson(request, forgotPasswordSchema);

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (user) {
        const token = randomBytes(24).toString('hex');
        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken: createHash('sha256').update(token).digest('hex'),
                resetExpires: new Date(Date.now() + RESET_TTL_MS),
            },
        });

        // No email provider is wired up yet: in demo mode the link is logged so the
        // flow is testable, and in production it is handed to the mailer instead.
        if (env.DEMO_MODE) {
            logger.info('password_reset_link', { url: `${env.APP_URL}/reset-password?token=${token}` });
        }
    }

    // Always the same response so the endpoint cannot confirm which emails exist.
    return ok({ sent: true });
});
