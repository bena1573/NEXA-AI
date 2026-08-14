import { notFound, ok, parseJson, route } from '@/lib/api/http';
import { requirePermission } from '@/lib/auth/context';
import { prisma } from '@/lib/db/client';
import { faqSchema } from '@/lib/validation/schemas';

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
    const ctx = await requirePermission('knowledge:write');
    const { id } = await params;
    const input = await parseJson(request, faqSchema.partial());

    const result = await prisma.fAQ.updateMany({
        where: { id, businessId: ctx.businessId },
        data: input,
    });
    if (result.count === 0) throw notFound('That FAQ no longer exists.');

    return ok({ updated: true });
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
    const ctx = await requirePermission('knowledge:write');
    const { id } = await params;

    const result = await prisma.fAQ.deleteMany({ where: { id, businessId: ctx.businessId } });
    if (result.count === 0) throw notFound('That FAQ no longer exists.');

    return ok({ deleted: true });
});
