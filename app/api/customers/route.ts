import { conflict, ok, parseJson, route } from '@/lib/api/http';
import { requirePermission } from '@/lib/auth/context';
import { prisma } from '@/lib/db/client';
import { customerSchema } from '@/lib/validation/schemas';

export const GET = route(async (request: Request) => {
    const ctx = await requirePermission('customer:read');
    const query = new URL(request.url).searchParams.get('q')?.trim();

    const customers = await prisma.customer.findMany({
        where: {
            businessId: ctx.businessId,
            ...(query
                ? {
                    OR: [
                        { name: { contains: query, mode: 'insensitive' as const } },
                        { email: { contains: query, mode: 'insensitive' as const } },
                        { phone: { contains: query } },
                    ],
                }
                : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });

    return ok({ customers });
});

export const POST = route(async (request: Request) => {
    const ctx = await requirePermission('customer:write');
    const input = await parseJson(request, customerSchema);

    const email = input.email || null;
    const phone = input.phone || null;

    const existing = await prisma.customer.findFirst({
        where: {
            businessId: ctx.businessId,
            OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
        },
        select: { id: true },
    });
    if (existing) throw conflict('A customer with those contact details already exists.');

    const customer = await prisma.customer.create({
        data: {
            businessId: ctx.businessId,
            name: input.name,
            email,
            phone,
            status: input.status ?? 'NEW',
            notes: input.notes,
            tags: input.tags ?? [],
        },
    });

    return ok({ customer }, 201);
});
