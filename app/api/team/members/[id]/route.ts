import { badRequest, notFound, ok, parseJson, route } from '@/lib/api/http';
import { requirePermission } from '@/lib/auth/context';
import { prisma } from '@/lib/db/client';
import { memberRoleSchema } from '@/lib/validation/schemas';

type Params = { params: Promise<{ id: string }> };

/** Refuses any change that would leave the workspace without an owner. */
async function assertAnotherOwnerExists(businessId: string, membershipId: string): Promise<void> {
    const owners = await prisma.membership.count({ where: { businessId, role: 'OWNER' } });
    const target = await prisma.membership.findFirst({
        where: { id: membershipId, businessId },
        select: { role: true },
    });
    if (!target) throw notFound('That team member no longer exists.');
    if (target.role === 'OWNER' && owners <= 1) {
        throw badRequest('Every workspace needs at least one owner. Promote someone else first.');
    }
}

export const PATCH = route(async (request: Request, { params }: Params) => {
    const ctx = await requirePermission('team:manage');
    const { id } = await params;
    const { role } = await parseJson(request, memberRoleSchema);

    if (role !== 'OWNER') await assertAnotherOwnerExists(ctx.businessId, id);

    const result = await prisma.membership.updateMany({
        where: { id, businessId: ctx.businessId },
        data: { role },
    });
    if (result.count === 0) throw notFound('That team member no longer exists.');

    return ok({ updated: true });
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
    const ctx = await requirePermission('team:manage');
    const { id } = await params;
    await assertAnotherOwnerExists(ctx.businessId, id);

    const result = await prisma.membership.deleteMany({ where: { id, businessId: ctx.businessId } });
    if (result.count === 0) throw notFound('That team member no longer exists.');

    return ok({ removed: true });
});
