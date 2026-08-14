import { z } from 'zod';
import { notFound, ok, parseJson, route } from '@/lib/api/http';
import { requirePermission } from '@/lib/auth/context';
import { prisma } from '@/lib/db/client';

type Params = { params: Promise<{ id: string }> };

const replySchema = z.object({
    content: z.string().trim().min(1, 'Write a reply.').max(4000),
});

/** A human takes over: the reply is stored as an agent message and the AI stops answering. */
export const POST = route(async (request: Request, { params }: Params) => {
    const ctx = await requirePermission('conversation:reply');
    const { id } = await params;
    const input = await parseJson(request, replySchema);

    const conversation = await prisma.conversation.findFirst({
        where: { id, businessId: ctx.businessId },
        select: { id: true },
    });
    if (!conversation) throw notFound('That conversation no longer exists.');

    const [message] = await prisma.$transaction([
        prisma.message.create({
            data: { conversationId: conversation.id, role: 'AGENT', content: input.content },
        }),
        prisma.conversation.update({
            where: { id: conversation.id },
            data: { handler: 'HUMAN' },
        }),
    ]);

    return ok({ message }, 201);
});
