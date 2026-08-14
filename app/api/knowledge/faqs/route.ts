import { ok, parseJson, route } from '@/lib/api/http';
import { requirePermission } from '@/lib/auth/context';
import { prisma } from '@/lib/db/client';
import { faqSchema } from '@/lib/validation/schemas';

export const GET = route(async () => {
    const ctx = await requirePermission('knowledge:read');
    const faqs = await prisma.fAQ.findMany({
        where: { businessId: ctx.businessId },
        orderBy: { createdAt: 'desc' },
    });
    return ok({ faqs });
});

export const POST = route(async (request: Request) => {
    const ctx = await requirePermission('knowledge:write');
    const input = await parseJson(request, faqSchema);

    const faq = await prisma.fAQ.create({
        data: { businessId: ctx.businessId, ...input },
    });
    return ok({ faq }, 201);
});
