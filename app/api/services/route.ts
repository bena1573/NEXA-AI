import { conflict, ok, parseJson, route } from '@/lib/api/http';
import { requirePermission } from '@/lib/auth/context';
import { prisma } from '@/lib/db/client';
import { serviceSchema } from '@/lib/validation/schemas';

export const GET = route(async () => {
    const ctx = await requirePermission('business:read');
    const services = await prisma.service.findMany({
        where: { businessId: ctx.businessId },
        orderBy: { name: 'asc' },
    });
    return ok({ services });
});

export const POST = route(async (request: Request) => {
    const ctx = await requirePermission('business:update');
    const input = await parseJson(request, serviceSchema);

    const existing = await prisma.service.findFirst({
        where: { businessId: ctx.businessId, name: input.name },
        select: { id: true },
    });
    if (existing) throw conflict('A service with that name already exists.');

    const service = await prisma.service.create({
        data: {
            businessId: ctx.businessId,
            name: input.name,
            description: input.description ?? null,
            durationMin: input.durationMin,
            priceCents: input.priceCents ?? null,
            bookable: input.bookable,
        },
    });

    return ok({ service }, 201);
});
