import { notFound, ok, parseJson, route } from '@/lib/api/http';
import { clientIp, enforceRateLimit } from '@/lib/api/rate-limit';
import { respondToMessage } from '@/lib/ai/agent';
import { prisma } from '@/lib/db/client';
import { publicChatSchema } from '@/lib/validation/schemas';
import { recordUsage } from '@/lib/billing/usage';

const CORS = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'POST,OPTIONS',
};

export function OPTIONS() {
    return new Response(null, { status: 204, headers: CORS });
}

export const POST = route(async (request: Request) => {
    enforceRateLimit(`chat:${clientIp(request)}`, 30, 60_000);

    const input = await parseJson(request, publicChatSchema);

    const business = await prisma.business.findUnique({
        where: { publicWidgetId: input.widgetId },
        select: { id: true },
    });
    if (!business) throw notFound('This chat widget is not active.');

    let conversationId = input.conversationId;
    if (conversationId) {
        const existing = await prisma.conversation.findFirst({
            where: { id: conversationId, businessId: business.id, channel: 'CHAT' },
            select: { id: true, status: true },
        });
        if (!existing) throw notFound('That conversation is no longer available.');
    } else {
        const customer = input.customer?.email || input.customer?.phone
            ? await upsertCustomer(business.id, input.customer)
            : null;

        const created = await prisma.conversation.create({
            data: { businessId: business.id, channel: 'CHAT', customerId: customer?.id },
            select: { id: true },
        });
        conversationId = created.id;
        await recordUsage(business.id, 'CONVERSATIONS', 1);
    }

    const reply = await respondToMessage({
        businessId: business.id,
        conversationId,
        customerMessage: input.message,
        channel: 'CHAT',
    });

    const response = ok({
        conversationId,
        reply: { content: reply.content, escalated: reply.escalated, confidence: reply.confidence },
    });
    for (const [header, value] of Object.entries(CORS)) response.headers.set(header, value);
    return response;
});

async function upsertCustomer(
    businessId: string,
    customer: { name?: string; email?: string; phone?: string } | undefined,
) {
    if (!customer) return null;

    const existing = await prisma.customer.findFirst({
        where: {
            businessId,
            OR: [
                ...(customer.email ? [{ email: customer.email }] : []),
                ...(customer.phone ? [{ phone: customer.phone }] : []),
            ],
        },
        select: { id: true },
    });
    if (existing) {
        return prisma.customer.update({
            where: { id: existing.id },
            data: { lastSeenAt: new Date(), name: customer.name ?? undefined },
            select: { id: true },
        });
    }

    return prisma.customer.create({
        data: {
            businessId,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            lastSeenAt: new Date(),
        },
        select: { id: true },
    });
}
