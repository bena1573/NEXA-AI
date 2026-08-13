import { NextResponse } from 'next/server';
import { route } from '@/lib/api/http';
import { prisma } from '@/lib/db/client';
import { respondToMessage } from '@/lib/ai/agent';
import { getVoiceProvider } from '@/lib/voice';
import { logger } from '@/lib/logger';
import { recordUsage } from '@/lib/billing/usage';

function twiml(body: string): NextResponse {
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
        status: 200,
        headers: { 'content-type': 'text/xml' },
    });
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Telephony provider callback. Every request is signature-verified before it can
 * touch tenant data; unsigned requests get a generic refusal, never a session.
 */
export const POST = route(async (request: Request) => {
    const provider = getVoiceProvider();
    const body = await request.text();

    const verified = await provider.verifyWebhook({
        body,
        signature: request.headers.get('x-twilio-signature'),
        url: request.url,
    });
    if (!verified) {
        logger.warn('voice_webhook_rejected', { provider: provider.id });
        return new NextResponse('Signature verification failed.', { status: 401 });
    }

    const form = new URLSearchParams(body);
    const providerCallId = form.get('CallSid');
    const speech = form.get('SpeechResult');
    if (!providerCallId) return twiml('<Say>We could not identify this call.</Say><Hangup/>');

    const call = await prisma.call.findFirst({
        where: { providerCallId },
        select: { id: true, businessId: true, conversationId: true },
    });

    if (!call) {
        const number = form.get('To');
        const business = number
            ? await prisma.business.findFirst({ where: { phone: number }, select: { id: true } })
            : null;
        if (!business) return twiml('<Say>This number is not configured.</Say><Hangup/>');

        const agent = await prisma.aIAgent.findUnique({ where: { businessId: business.id } });
        const greeting = agent?.greeting ?? 'Thanks for calling. How can I help you today?';

        await prisma.conversation.create({
            data: {
                businessId: business.id,
                channel: 'VOICE',
                call: {
                    create: {
                        businessId: business.id,
                        provider: provider.id,
                        providerCallId,
                        simulated: false,
                        status: 'IN_PROGRESS',
                        fromNumber: form.get('From'),
                        toNumber: number,
                    },
                },
                messages: { create: { role: 'AGENT', content: greeting } },
            },
        });
        await recordUsage(business.id, 'CONVERSATIONS', 1);

        const answered = await provider.answerCall(providerCallId, greeting);
        return new NextResponse(answered.instructions, {
            status: 200,
            headers: { 'content-type': 'text/xml' },
        });
    }

    if (!speech) {
        return twiml(
            '<Gather input="speech" speechTimeout="auto"/>'
            + '<Say>I did not catch that. Please say it again.</Say>',
        );
    }

    const reply = await respondToMessage({
        businessId: call.businessId,
        conversationId: call.conversationId,
        customerMessage: speech,
        channel: 'VOICE',
    });

    return twiml(`<Say>${escapeXml(reply.content)}</Say><Gather input="speech" speechTimeout="auto"/>`);
});
