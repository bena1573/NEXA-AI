import { notFound, ok, route } from '@/lib/api/http';
import { requirePermission } from '@/lib/auth/context';
import { prisma } from '@/lib/db/client';

type Params = { params: Promise<{ id: string }> };

export const DELETE = route(async (_request: Request, { params }: Params) => {
    const ctx = await requirePermission('team:invite');
    const { id } = await params;

    const result = await prisma.invite.deleteMany({ where: { id, businessId: ctx.businessId } });
    if (result.count === 0) throw notFound('That invite no longer exists.');

    return ok({ revoked: true });
});
