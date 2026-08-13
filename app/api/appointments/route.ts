import { badRequest, notFound, ok, parseJson, route } from '@/lib/api/http';
import { requirePermission } from '@/lib/auth/context';
import { prisma } from '@/lib/db/client';
import { isSlotBookable } from '@/lib/appointments/availability';
import { appointmentSchema } from '@/lib/validation/schemas';

export const GET = route(async () => {
    const ctx = await requirePermission('appointment:read');
    const appointments = await prisma.appointment.findMany({
        where: { businessId: ctx.businessId },
        orderBy: { startsAt: 'asc' },
        include: {
            customer: { select: { id: true, name: true, email: true, phone: true } },
            service: { select: { id: true, name: true, durationMin: true } },
        },
    });
    return ok({ appointments });
});

export const POST = route(async (request: Request) => {
    const ctx = await requirePermission('appointment:write');
    const input = await parseJson(request, appointmentSchema);

    const [service, customer, hours] = await Promise.all([
        prisma.service.findFirst({ where: { id: input.serviceId, businessId: ctx.businessId } }),
        prisma.customer.findFirst({ where: { id: input.customerId, businessId: ctx.businessId } }),
        prisma.businessHour.findMany({ where: { businessId: ctx.businessId } }),
    ]);
    if (!service) throw notFound('That service does not exist.');
    if (!customer) throw notFound('That customer does not exist.');

    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(startsAt.getTime() + service.durationMin * 60_000);

    const busy = await prisma.appointment.findMany({
        where: {
            businessId: ctx.businessId,
            status: { in: ['REQUESTED', 'CONFIRMED'] },
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
        },
        select: { startsAt: true, endsAt: true },
    });

    const bookable = isSlotBookable({
        startsAt,
        hours,
        durationMin: service.durationMin,
        busy,
    });
    if (!bookable) throw badRequest('That time is outside opening hours or already taken.');

    const appointment = await prisma.appointment.create({
        data: {
            businessId: ctx.businessId,
            customerId: customer.id,
            serviceId: service.id,
            startsAt,
            endsAt,
            notes: input.notes,
            status: input.status ?? 'CONFIRMED',
        },
    });

    return ok({ appointment }, 201);
});
