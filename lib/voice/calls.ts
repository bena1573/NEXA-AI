import { prisma } from '@/lib/db/client';
import { respondToMessage } from '@/lib/ai/agent';
import { getVoiceProvider } from '@/lib/voice';
import { recordUsage } from '@/lib/billing/usage';

export type CallTurn = { role: 'AGENT' | 'CUSTOMER' | 'SYSTEM'; content: string };

/**
 * Starts a call and greets the caller. With no telephony credentials this runs
 * through the simulator, and `simulated` is returned so the UI can say so.
 */
export async function startCall(input: { businessId: string; fromNumber: string }) {
    const provider = getVoiceProvider();
    const [agent, business] = await Promise.all([
        prisma.aIAgent.findUnique({ where: { businessId: input.businessId } }),
        prisma.business.findUniqueOrThrow({
            where: { id: input.businessId },
            select: { phone: true },
        }),
    ]);

    const greeting = agent?.greeting ?? 'Thanks for calling. How can I help you today?';
    const handle = await provider.createCall({
        businessId: input.businessId,
        toNumber: business.phone ?? '+10000000000',
        fromNumber: input.fromNumber,
    });

    const conversation = await prisma.conversation.create({
        data: {
            businessId: input.businessId,
            channel: 'VOICE',
            call: {
                create: {
                    businessId: input.businessId,
                    provider: provider.id,
                    providerCallId: handle.providerCallId,
                    simulated: handle.simulated,
                    status: 'IN_PROGRESS',
                    fromNumber: input.fromNumber,
                    toNumber: business.phone,
                },
            },
            messages: { create: { role: 'AGENT', content: greeting } },
        },
        include: { call: true },
    });

    await recordUsage(input.businessId, 'CONVERSATIONS', 1);

    return {
        callId: conversation.call?.id as string,
        conversationId: conversation.id,
        simulated: handle.simulated,
        greeting,
    };
}

/** One caller utterance: the same grounded agent loop the chat channel uses. */
export async function speakToCall(input: { businessId: string; callId: string; utterance: string }) {
    const call = await prisma.call.findFirst({
        where: { id: input.callId, businessId: input.businessId },
        select: { id: true, conversationId: true, endedAt: true },
    });
    if (!call || call.endedAt) return null;

    const reply = await respondToMessage({
        businessId: input.businessId,
        conversationId: call.conversationId,
        customerMessage: input.utterance,
        channel: 'VOICE',
    });

    return { conversationId: call.conversationId, ...reply };
}

export async function endCall(input: { businessId: string; callId: string }) {
    const call = await prisma.call.findFirst({
        where: { id: input.callId, businessId: input.businessId },
        select: { id: true, conversationId: true, startedAt: true, endedAt: true, providerCallId: true },
    });
    if (!call) return null;
    if (call.endedAt) return call;

    if (call.providerCallId) {
        await getVoiceProvider().endCall(call.providerCallId);
    }

    const endedAt = new Date();
    const durationSec = Math.max(1, Math.round((endedAt.getTime() - call.startedAt.getTime()) / 1000));

    const [updated] = await prisma.$transaction([
        prisma.call.update({
            where: { id: call.id },
            data: { status: 'COMPLETED', endedAt, durationSec },
        }),
        prisma.conversation.update({
            where: { id: call.conversationId },
            data: { endedAt },
        }),
    ]);

    await recordUsage(input.businessId, 'VOICE_MINUTES', Math.max(1, Math.round(durationSec / 60)));

    return updated;
}
