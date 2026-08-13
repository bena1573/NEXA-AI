import { z } from 'zod';
import { notFound, ok, parseJson, route } from '@/lib/api/http';
import { requirePermission } from '@/lib/auth/context';
import { prisma } from '@/lib/db/client';

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
    status: z.enum(['REQUESTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']).optional(),
    notes: z.string().trim().max(1000).nullish(),
});

export const PATCH = route(async (request: Request, { params }: Params) => {
    const ctx = await requirePermission('appointment:write');
    const { id } = await params;
    const input = await parseJson(request, patchSchema);

    const result = await prisma.appointment.updateMany({
        where: { id, businessId: ctx.businessId },
        data: input,
    });
    if (result.count === 0) throw notFound('That appointment no longer exists.');

    return ok({ updated: true });
});
