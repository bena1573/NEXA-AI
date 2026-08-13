import type { Channel } from '@prisma/client';
import { prisma } from '@/lib/db/client';
import { getAIProvider } from '@/lib/ai';
import { buildSystemPrompt, NO_ANSWER_REPLY } from '@/lib/ai/prompt';
import { TOOL_SPECS } from '@/lib/ai/tools/registry';
import { executeTool, type ToolResult } from '@/lib/ai/tools/execute';
import type { ChatMessage } from '@/lib/ai/types';
import { bestScore, retrieveKnowledge, RETRIEVAL_CONFIDENCE_FLOOR } from '@/lib/knowledge/search';
import { recordUsage } from '@/lib/billing/usage';
import { logger } from '@/lib/logger';

/** How many tool round-trips one customer message may trigger. */
const MAX_TOOL_ROUNDS = 3;
const HISTORY_LIMIT = 12;

export type AgentReply = {
    content: string;
    confidence: number;
    escalated: boolean;
    toolsUsed: string[];
    citedChunkIds: string[];
    latencyMs: number;
};

/**
 * One turn of the support agent: retrieve → answer (optionally via allowlisted
 * tools) → persist. Facts come only from retrieval or tool results; anything else
 * falls back to the "connect you with a member of our team" reply.
 */
export async function respondToMessage(options: {
    businessId: string;
    conversationId: string;
    customerMessage: string;
    channel: Channel;
    customerId?: string;
}): Promise<AgentReply> {
    const startedAt = Date.now();
    const ai = getAIProvider();

    const [business, agent, history] = await Promise.all([
        prisma.business.findUniqueOrThrow({ where: { id: options.businessId } }),
        prisma.aIAgent.findUnique({ where: { businessId: options.businessId } }),
        prisma.message.findMany({
            where: { conversationId: options.conversationId },
            orderBy: { createdAt: 'desc' },
            take: HISTORY_LIMIT,
        }),
    ]);

    const knowledge = await retrieveKnowledge(options.businessId, options.customerMessage);
    const retrievalScore = bestScore(knowledge);

    const systemPrompt = buildSystemPrompt({
        agent: {
            agentName: agent?.name ?? 'Alex',
            personality: agent?.personality ?? 'PROFESSIONAL',
            responseStyle: agent?.responseStyle ?? 'BALANCED',
            instructions: agent?.instructions ?? '',
            escalationRules: agent?.escalationRules ?? '',
        },
        business: {
            name: business.name,
            industry: business.industry,
            description: business.description,
            timezone: business.timezone,
        },
        channel: options.channel === 'VOICE' ? 'VOICE' : 'CHAT',
        knowledge,
    });

    const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...history.reverse().map(message => ({
            role: message.role === 'CUSTOMER' ? ('user' as const) : ('assistant' as const),
            content: message.content,
        })),
        { role: 'user', content: options.customerMessage },
    ];

    const toolsUsed: string[] = [];
    let escalated = false;
    let customerId = options.customerId;
    let result = await ai.generateResponse({ messages, tools: TOOL_SPECS });
    let promptTokens = result.usage?.promptTokens ?? 0;
    let completionTokens = result.usage?.completionTokens ?? 0;

    for (let round = 0; round < MAX_TOOL_ROUNDS && result.toolCalls.length > 0; round += 1) {
        const results: ToolResult[] = [];

        for (const call of result.toolCalls) {
            const toolResult = await executeTool(
                { businessId: options.businessId, conversationId: options.conversationId, customerId },
                { name: call.name, arguments: call.arguments },
            );
            toolsUsed.push(call.name);
            results.push(toolResult);

            if (toolResult.effect?.kind === 'escalate') escalated = true;
            if (toolResult.effect?.kind === 'customer') customerId = toolResult.effect.customerId;
        }

        messages.push({ role: 'assistant', content: result.content, toolCalls: result.toolCalls });
        result.toolCalls.forEach((call, index) => {
            messages.push({
                role: 'tool',
                name: call.name,
                toolCallId: call.id,
                content: JSON.stringify(results[index]?.data ?? {}),
            });
        });

        result = await ai.generateResponse({ messages, tools: TOOL_SPECS });
        promptTokens += result.usage?.promptTokens ?? 0;
        completionTokens += result.usage?.completionTokens ?? 0;
    }

    // Ungrounded answer with nothing retrieved and no tool evidence: refuse rather
    // than let the model improvise business facts.
    const grounded = toolsUsed.length > 0 || retrievalScore >= RETRIEVAL_CONFIDENCE_FLOOR;
    const content = (grounded && result.content.trim())
        ? result.content.trim()
        : NO_ANSWER_REPLY;

    if (!grounded) {
        logger.info('agent_fallback', { businessId: options.businessId, retrievalScore });
    }

    const latencyMs = Date.now() - startedAt;
    const citedChunkIds = knowledge.map(snippet => snippet.id);

    await prisma.$transaction([
        prisma.message.create({
            data: {
                conversationId: options.conversationId,
                role: 'CUSTOMER',
                content: options.customerMessage,
            },
        }),
        prisma.message.create({
            data: {
                conversationId: options.conversationId,
                role: 'AGENT',
                content,
                confidence: grounded ? result.confidence : 0,
                citedChunkIds,
                latencyMs,
                toolCalls: toolsUsed.length > 0 ? toolsUsed : undefined,
            },
        }),
        prisma.conversation.update({
            where: { id: options.conversationId },
            data: {
                ...(customerId ? { customerId } : {}),
                ...(escalated ? { status: 'ESCALATED', handler: 'HUMAN', escalated: true } : {}),
            },
        }),
    ]);

    const tokens = promptTokens + completionTokens;
    if (tokens > 0) await recordUsage(options.businessId, 'AI_TOKENS', tokens);

    return {
        content,
        confidence: grounded ? result.confidence : 0,
        escalated,
        toolsUsed,
        citedChunkIds,
        latencyMs,
    };
}
