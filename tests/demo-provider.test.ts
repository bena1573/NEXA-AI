import { describe, expect, it } from 'vitest';
import { DemoAIProvider } from '@/lib/ai/providers/demo';
import { buildSystemPrompt, NO_ANSWER_REPLY } from '@/lib/ai/prompt';
import { TOOL_SCHEMAS, isToolName, TOOL_SPECS } from '@/lib/ai/tools/registry';
import { EMBEDDING_DIMENSIONS } from '@/lib/ai/types';
import { cosineSimilarity } from '@/lib/knowledge/vector';

const ai = new DemoAIProvider();

function systemPrompt(knowledge: Array<{ id: string; content: string; source: string }>) {
    return buildSystemPrompt({
        agent: {
            agentName: 'Alex',
            personality: 'FRIENDLY',
            responseStyle: 'BALANCED',
            instructions: '',
            escalationRules: '',
        },
        business: { name: 'Nova Dental Clinic', industry: 'Dentistry', description: null, timezone: 'UTC' },
        channel: 'CHAT',
        knowledge,
    });
}

describe('demo provider answers', () => {
    it('answers from retrieved knowledge only', async () => {
        const result = await ai.generateResponse({
            messages: [
                {
                    role: 'system',
                    content: systemPrompt([{
                        id: 'k1',
                        source: 'FAQ',
                        content: 'Teeth whitening costs 199 USD and takes one visit.',
                    }]),
                },
                { role: 'user', content: 'How much is teeth whitening?' },
            ],
        });

        expect(result.content).toContain('199');
        expect(result.confidence).toBeGreaterThan(0.4);
    });

    it('falls back instead of inventing facts when nothing was retrieved', async () => {
        const result = await ai.generateResponse({
            messages: [
                { role: 'system', content: systemPrompt([]) },
                { role: 'user', content: 'Do you accept Bitcoin for implants?' },
            ],
        });

        expect(result.content).toBe(NO_ANSWER_REPLY);
        expect(result.toolCalls).toEqual([]);
    });
});

describe('demo provider tool calls', () => {
    it('only ever requests allowlisted tools with valid arguments', async () => {
        const questions = [
            'What time do you open on Saturday?',
            'What services do you offer?',
            'How much does a cleaning cost?',
            'I want to book an appointment',
            'Where is my order AB-1234?',
            'I want to speak to a human',
            'I demand a refund, this is unacceptable',
        ];

        for (const question of questions) {
            const result = await ai.generateResponse({
                messages: [
                    { role: 'system', content: systemPrompt([]) },
                    { role: 'user', content: question },
                ],
                tools: TOOL_SPECS,
            });

            for (const call of result.toolCalls) {
                expect(isToolName(call.name)).toBe(true);
                if (!isToolName(call.name)) continue;
                expect(TOOL_SCHEMAS[call.name].safeParse(call.arguments).success).toBe(true);
            }
        }
    });

    it('does not look up an order without a reference', async () => {
        const result = await ai.generateResponse({
            messages: [
                { role: 'system', content: systemPrompt([]) },
                { role: 'user', content: 'I have a question about my order' },
            ],
            tools: TOOL_SPECS,
        });

        expect(result.toolCalls).toEqual([]);
    });

    it('turns a tool result into a readable answer', async () => {
        const result = await ai.generateResponse({
            messages: [
                { role: 'system', content: systemPrompt([]) },
                { role: 'user', content: 'What are your opening hours?' },
                {
                    role: 'tool',
                    name: 'get_business_hours',
                    toolCallId: 'call-1',
                    content: JSON.stringify({
                        hours: [
                            { day: 'Monday', closed: false, opensAt: '09:00', closesAt: '17:00' },
                            { day: 'Sunday', closed: true },
                        ],
                    }),
                },
            ],
        });

        expect(result.content).toContain('Monday: 09:00');
        expect(result.content).toContain('Sunday: closed');
        expect(result.content.indexOf('Sunday')).toBeLessThan(result.content.indexOf('Monday'));
    });
});

describe('demo provider embeddings', () => {
    it('are deterministic, normalised and correctly sized', async () => {
        const first = await ai.generateEmbedding('dental cleaning price');
        const again = await ai.generateEmbedding('dental cleaning price');

        expect(first).toHaveLength(EMBEDDING_DIMENSIONS);
        expect(first).toEqual(again);
        expect(Math.hypot(...first)).toBeCloseTo(1, 5);
    });

    it('score related text above unrelated text', async () => {
        const [question, related, unrelated] = await Promise.all([
            ai.generateEmbedding('how much is a dental cleaning'),
            ai.generateEmbedding('a dental cleaning is 120 USD'),
            ai.generateEmbedding('our office is on the third floor of the tower'),
        ]);

        expect(cosineSimilarity(question, related)).toBeGreaterThan(cosineSimilarity(question, unrelated));
    });

    it('returns a zero vector for empty text', async () => {
        const empty = await ai.generateEmbedding('   ');
        expect(empty).toHaveLength(EMBEDDING_DIMENSIONS);
        expect(empty.every(value => value === 0)).toBe(true);
    });
});

describe('demo provider classification', () => {
    it('detects intent and sentiment', async () => {
        await expect(ai.classifyIntent('I want to book an appointment')).resolves.toMatchObject({
            intent: 'BOOK_APPOINTMENT',
        });
        await expect(ai.classifyIntent('This is terrible, I am angry')).resolves.toMatchObject({
            sentiment: 'NEGATIVE',
        });
        await expect(ai.classifyIntent('Thanks, that was great')).resolves.toMatchObject({
            sentiment: 'POSITIVE',
        });
    });

    it('summarises a conversation and marks the fallback as unresolved', async () => {
        const summary = await ai.summarizeConversation([
            { role: 'user', content: 'Can I book a cleaning next week?' },
            { role: 'assistant', content: NO_ANSWER_REPLY },
        ]);

        expect(summary.summary).toContain('cleaning');
        expect(summary.resolved).toBe(false);
    });
});
