import { badRequest, notFound, ok, parseJson, route } from '@/lib/api/http';
import { requirePermission } from '@/lib/auth/context';
import { prisma } from '@/lib/db/client';
import { ticketUpdateSchema } from '@/lib/validation/schemas';

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
    const ctx = await requirePermission('ticket:write');
    const { id } = await params;
    const input = await parseJson(request, ticketUpdateSchema);

    if (input.assigneeId) {
        const member = await prisma.membership.findFirst({
            where: { businessId: ctx.businessId, userId: input.assigneeId },
            select: { id: true },
        });
        if (!member) throw badRequest('That person is not a member of this workspace.');
    }

    const result = await prisma.supportTicket.updateMany({
        where: { id, businessId: ctx.businessId },
        data: input,
    });
    if (result.count === 0) throw notFound('That ticket no longer exists.');

    return ok({ updated: true });
});
