import { z } from 'zod';
import { notFound, ok, parseJson, route } from '@/lib/api/http';
import { requirePermission } from '@/lib/auth/context';
import { prisma } from '@/lib/db/client';

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
    status: z.enum(['OPEN', 'RESOLVED', 'ESCALATED', 'ABANDONED']).optional(),
    resolved: z.boolean().optional(),
    handler: z.enum(['AI', 'HUMAN']).optional(),
});

export const PATCH = route(async (request: Request, { params }: Params) => {
    const ctx = await requirePermission('conversation:assign');
    const { id } = await params;
    const input = await parseJson(request, patchSchema);

    const result = await prisma.conversation.updateMany({
        where: { id, businessId: ctx.businessId },
        data: {
            ...input,
            ...(input.status === 'RESOLVED' || input.status === 'ABANDONED' ? { endedAt: new Date() } : {}),
        },
    });
    if (result.count === 0) throw notFound('That conversation no longer exists.');

    return ok({ updated: true });
});
