import { ok, parseJson, route } from '@/lib/api/http';
import { requirePermission } from '@/lib/auth/context';
import { prisma } from '@/lib/db/client';
import { agentSchema } from '@/lib/validation/schemas';

export const PATCH = route(async (request: Request) => {
    const ctx = await requirePermission('agent:update');
    const input = await parseJson(request, agentSchema);

    const data = {
        name: input.name,
        personality: input.personality,
        responseStyle: input.responseStyle,
        greeting: input.greeting,
        instructions: input.instructions,
        escalationRules: input.escalationRules,
        handoffEmail: input.handoffEmail || null,
    };

    const agent = await prisma.aIAgent.upsert({
        where: { businessId: ctx.businessId },
        create: { businessId: ctx.businessId, ...data },
        update: data,
    });

    return ok({ agent });
});
