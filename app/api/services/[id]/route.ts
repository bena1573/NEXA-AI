import { z } from 'zod';
import { notFound, ok, parseJson, route } from '@/lib/api/http';
import { requirePermission } from '@/lib/auth/context';
import { prisma } from '@/lib/db/client';

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(500).nullish(),
    durationMin: z.number().int().min(5).max(480).optional(),
    priceCents: z.number().int().min(0).max(10_000_000).nullish(),
    bookable: z.boolean().optional(),
});

export const PATCH = route(async (request: Request, { params }: Params) => {
    const ctx = await requirePermission('business:update');
    const { id } = await params;
    const input = await parseJson(request, patchSchema);

    const result = await prisma.service.updateMany({
        where: { id, businessId: ctx.businessId },
        data: input,
    });
    if (result.count === 0) throw notFound('That service no longer exists.');

    return ok({ updated: true });
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
    const ctx = await requirePermission('business:update');
    const { id } = await params;

    const result = await prisma.service.deleteMany({ where: { id, businessId: ctx.businessId } });
    if (result.count === 0) throw notFound('That service no longer exists.');

    return ok({ deleted: true });
});
