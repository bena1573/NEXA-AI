import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db/client';
import { respondToMessage } from '@/lib/ai/agent';
import { NO_ANSWER_REPLY } from '@/lib/ai/prompt';
import { ingestDocument } from '@/lib/knowledge/ingest';
import { createWorkspace, destroyWorkspace, type Workspace } from './helpers';

let clinic: Workspace;

async function newConversation(): Promise<string> {
    const conversation = await prisma.conversation.create({
        data: { businessId: clinic.businessId, channel: 'CHAT' },
    });
    return conversation.id;
}

beforeAll(async () => {
    clinic = await createWorkspace('agent-clinic');

    await prisma.service.create({
        data: { businessId: clinic.businessId, name: 'Check-up', durationMin: 30, priceCents: 6500 },
    });
    await prisma.fAQ.create({
        data: {
            businessId: clinic.businessId,
            question: 'Do you offer free parking for patients?',
            answer: 'Yes, patient parking behind the building is free while you are with us.',
            approved: true,
        },
    });
    await ingestDocument(
        { businessId: clinic.businessId, userId: clinic.userId, role: 'OWNER' },
        {
            title: 'Refund policy',
            type: 'TEXT',
            content: 'Deposits are refunded in full when an appointment is cancelled at least 24 hours ahead.',
        },
    );
}, 60_000);

afterAll(async () => {
    await destroyWorkspace(clinic);
});

describe('respondToMessage', () => {
    it('answers from approved knowledge and persists both messages', async () => {
        const conversationId = await newConversation();
        const reply = await respondToMessage({
            businessId: clinic.businessId,
            conversationId,
            customerMessage: 'Do you offer free parking for patients?',
            channel: 'CHAT',
        });

        expect(reply.content).not.toBe(NO_ANSWER_REPLY);
        expect(reply.confidence).toBeGreaterThan(0);
        expect(reply.escalated).toBe(false);

        const messages = await prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'asc' },
        });
        expect(messages.map(message => message.role)).toEqual(['CUSTOMER', 'AGENT']);
    }, 30_000);

    it('falls back instead of inventing facts it has no source for', async () => {
        const conversationId = await newConversation();
        const reply = await respondToMessage({
            businessId: clinic.businessId,
            conversationId,
            customerMessage: 'Which titanium alloy do you use for zygomatic implants?',
            channel: 'CHAT',
        });

        expect(reply.content).toBe(NO_ANSWER_REPLY);
        expect(reply.confidence).toBe(0);
    }, 30_000);

    it('uses tools for questions that need live business data', async () => {
        const conversationId = await newConversation();
        const reply = await respondToMessage({
            businessId: clinic.businessId,
            conversationId,
            customerMessage: 'What services do you offer and how much do they cost?',
            channel: 'CHAT',
        });

        expect(reply.toolsUsed.length).toBeGreaterThan(0);
        expect(reply.content).not.toBe(NO_ANSWER_REPLY);
    }, 30_000);

    it('records AI token usage against the tenant', async () => {
        const usage = await prisma.usageRecord.findFirst({
            where: { businessId: clinic.businessId, metric: 'AI_TOKENS' },
        });
        expect(usage?.quantity ?? 0).toBeGreaterThan(0);
    });
});
