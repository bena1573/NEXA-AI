import { z } from 'zod';
import { notFound, ok, parseJson, route } from '@/lib/api/http';
import { requirePermission } from '@/lib/auth/context';
import { prisma } from '@/lib/db/client';

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
    name: z.string().trim().min(1).max(120).nullish(),
    status: z.enum(['NEW', 'ACTIVE', 'RETURNING', 'VIP', 'AT_RISK']).optional(),
    notes: z.string().trim().max(2000).nullish(),
    tags: z.array(z.string().trim().min(1).max(30)).max(20).optional(),
});

export const PATCH = route(async (request: Request, { params }: Params) => {
    const ctx = await requirePermission('customer:write');
    const { id } = await params;
    const input = await parseJson(request, patchSchema);

    const result = await prisma.customer.updateMany({
        where: { id, businessId: ctx.businessId },
        data: input,
    });
    if (result.count === 0) throw notFound('That customer no longer exists.');

    return ok({ updated: true });
});
