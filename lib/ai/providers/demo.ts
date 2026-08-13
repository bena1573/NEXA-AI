import { createHash } from 'node:crypto';
import {
    EMBEDDING_DIMENSIONS,
    type AIProvider,
    type ChatMessage,
    type ConversationSummary,
    type GenerateInput,
    type GenerateResult,
    type IntentName,
    type IntentResult,
} from '@/lib/ai/types';
import { keywordOverlap, sentences, tokenize, truncate } from '@/lib/ai/text';
import { KNOWLEDGE_BLOCK_END, KNOWLEDGE_BLOCK_START, NO_ANSWER_REPLY } from '@/lib/ai/prompt';

const INTENT_KEYWORDS: Array<{ intent: IntentName; words: string[] }> = [
    { intent: 'HUMAN_REQUEST', words: ['human', 'agent', 'representative', 'person', 'manager', 'someone'] },
    { intent: 'REFUND', words: ['refund', 'money back', 'chargeback', 'reimburse'] },
    { intent: 'COMPLAINT', words: ['complaint', 'terrible', 'awful', 'angry', 'unacceptable', 'worst', 'rude'] },
    { intent: 'BOOK_APPOINTMENT', words: ['appointment', 'book', 'booking', 'schedule', 'reserve', 'slot', 'availability'] },
    { intent: 'ORDER_STATUS', words: ['order', 'delivery', 'shipment', 'tracking', 'package'] },
    { intent: 'BUSINESS_HOURS', words: ['open', 'hours', 'closing', 'close', 'closed', 'tomorrow', 'saturday', 'sunday', 'weekend'] },
    { intent: 'PRICING', words: ['price', 'pricing', 'cost', 'how much', 'fee', 'charge', 'plan'] },
    { intent: 'SERVICES', words: ['service', 'services', 'offer', 'treatment', 'product', 'products'] },
    { intent: 'SMALL_TALK', words: ['hello', 'hi', 'thanks', 'thank you', 'bye', 'goodbye'] },
];

const NEGATIVE_WORDS = ['angry', 'terrible', 'awful', 'unacceptable', 'worst', 'refund', 'complaint', 'broken', 'late', 'rude'];
const POSITIVE_WORDS = ['thanks', 'thank', 'great', 'perfect', 'awesome', 'love', 'helpful', 'excellent'];

function detectIntent(text: string): IntentResult {
    const lower = text.toLowerCase();

    let best: { intent: IntentName; hits: number } = { intent: 'GENERAL_QUESTION', hits: 0 };
    for (const { intent, words } of INTENT_KEYWORDS) {
        const hits = words.filter(word => lower.includes(word)).length;
        if (hits > best.hits) best = { intent, hits };
    }

    const negative = NEGATIVE_WORDS.filter(word => lower.includes(word)).length;
    const positive = POSITIVE_WORDS.filter(word => lower.includes(word)).length;

    return {
        intent: best.intent,
        confidence: best.hits === 0 ? 0.4 : Math.min(0.95, 0.55 + best.hits * 0.15),
        sentiment: negative > positive ? 'NEGATIVE' : positive > negative ? 'POSITIVE' : 'NEUTRAL',
    };
}

function knowledgeFrom(messages: ChatMessage[]): string[] {
    const system = messages.find(message => message.role === 'system')?.content ?? '';
    const start = system.indexOf(KNOWLEDGE_BLOCK_START);
    const end = system.indexOf(KNOWLEDGE_BLOCK_END);
    if (start === -1 || end === -1) return [];

    return system
        .slice(start + KNOWLEDGE_BLOCK_START.length, end)
        .split(/\n(?=\[\d+])/)
        .map(entry => entry.replace(/^\[\d+]\s*/, '').trim())
        .filter(Boolean);
}

function lastUserMessage(messages: ChatMessage[]): string {
    return [...messages].reverse().find(message => message.role === 'user')?.content ?? '';
}

function orderReference(question: string): string | null {
    return /\b([A-Z]{2,}-?\d{3,}|\d{5,})\b/.exec(question)?.[1] ?? null;
}

const DAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Turns a tool's JSON result into a sentence a customer can read. */
function renderToolResult(name: string, raw: string): string {
    let data: Record<string, unknown>;
    try {
        data = JSON.parse(raw) as Record<string, unknown>;
    } catch {
        return '';
    }

    if (typeof data.error === 'string') return data.error;

    if (name === 'get_business_hours') {
        const hours = (data.hours ?? []) as Array<{ day: string; closed: boolean; opensAt?: string; closesAt?: string }>;
        if (hours.length === 0) return NO_ANSWER_REPLY;

        return hours
            .slice()
            .sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day))
            .map(hour => (hour.closed || !hour.opensAt || !hour.closesAt
                ? `${hour.day}: closed`
                : `${hour.day}: ${hour.opensAt}–${hour.closesAt}`))
            .join(', ') + '.';
    }

    if (name === 'get_service_information') {
        const services = (data.services ?? []) as Array<{ name: string; price: string | null; durationMinutes: number }>;
        if (services.length === 0) return NO_ANSWER_REPLY;

        return `Here is what we offer: ${services
            .map(service => `${service.name} (${service.durationMinutes} minutes${service.price ? `, ${service.price}` : ''})`)
            .join(', ')}. Which one would you like, and what day suits you?`;
    }

    if (name === 'search_knowledge_base') {
        const results = (data.results ?? []) as Array<{ content: string }>;
        return results.length === 0 ? NO_ANSWER_REPLY : truncate(results[0].content, 400);
    }

    if (name === 'check_availability') {
        const slots = (data.slots ?? []) as string[];
        if (slots.length === 0) return 'I could not find an opening then. Is another day possible?';
        return `These times are open: ${slots.slice(0, 4).join(', ')}. Which works for you?`;
    }

    if (name === 'create_appointment' && data.booked === true) {
        return `You are booked for ${String(data.service)} at ${String(data.startsAt)}. You will receive a confirmation shortly.`;
    }

    if (name === 'create_support_ticket' && data.created === true) {
        return `I have opened ticket ${String(data.reference)} for you and the team will follow up.`;
    }

    if (name === 'transfer_to_human' && data.transferred === true) {
        return 'I am connecting you with a member of our team now.';
    }

    if (name === 'create_customer' || name === 'get_customer') {
        return '';
    }

    return NO_ANSWER_REPLY;
}

/**
 * Deterministic, offline stand-in for a hosted LLM.
 *
 * It never invents business facts: answers are assembled from the retrieved
 * knowledge block and tool results that the agent loop supplies, and it returns
 * the standard fallback sentence when neither contains the answer.
 */
export class DemoAIProvider implements AIProvider {
    readonly id = 'demo' as const;

    async generateResponse(input: GenerateInput): Promise<GenerateResult> {
        const question = lastUserMessage(input.messages);
        const { intent } = detectIntent(question);
        const toolResults = input.messages.filter(message => message.role === 'tool');
        const availableTools = new Set((input.tools ?? []).map(tool => tool.name));

        if (toolResults.length === 0) {
            const wanted = this.toolFor(intent, availableTools, question);
            if (wanted) {
                return {
                    content: '',
                    confidence: 0.8,
                    toolCalls: [{
                        id: `demo-${wanted}-${toolResults.length}`,
                        name: wanted,
                        arguments: this.argumentsFor(wanted, question),
                    }],
                };
            }
        }

        if (toolResults.length > 0) {
            const rendered = toolResults
                .map(result => renderToolResult(result.name ?? '', result.content))
                .filter(Boolean)
                .join(' ');
            return {
                content: rendered.trim() || NO_ANSWER_REPLY,
                confidence: 0.85,
                toolCalls: [],
            };
        }

        const knowledge = knowledgeFrom(input.messages);
        const ranked = knowledge
            .map(entry => ({ entry, score: keywordOverlap(question, entry) }))
            .sort((a, b) => b.score - a.score);
        const top = ranked[0];

        if (!top || top.score < 0.2) {
            return { content: NO_ANSWER_REPLY, confidence: 0.2, toolCalls: [] };
        }

        const relevant = sentences(top.entry)
            .map(sentence => ({ sentence, score: keywordOverlap(question, sentence) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 2)
            .filter(candidate => candidate.score > 0)
            .map(candidate => candidate.sentence);

        const answer = (relevant.length > 0 ? relevant.join(' ') : truncate(top.entry, 320)).trim();
        return {
            content: answer,
            confidence: Math.min(0.9, 0.45 + top.score / 2),
            toolCalls: [],
        };
    }

    /**
     * Demo mode only requests tools whose arguments it can fill from the customer's
     * own words. Booking, for example, asks about services rather than guessing a
     * date the customer never gave.
     */
    private toolFor(intent: IntentName, available: Set<string>, question: string): string | null {
        const preference: Partial<Record<IntentName, string>> = {
            BUSINESS_HOURS: 'get_business_hours',
            SERVICES: 'get_service_information',
            PRICING: 'get_service_information',
            BOOK_APPOINTMENT: 'get_service_information',
            ORDER_STATUS: 'get_order_status',
            HUMAN_REQUEST: 'transfer_to_human',
            REFUND: 'transfer_to_human',
            COMPLAINT: 'transfer_to_human',
        };

        const wanted = preference[intent];
        if (!wanted || !available.has(wanted)) return null;
        // Without a reference there is nothing to look up.
        if (wanted === 'get_order_status' && !orderReference(question)) return null;

        return wanted;
    }

    private argumentsFor(tool: string, question: string): Record<string, unknown> {
        if (tool === 'transfer_to_human') {
            const lower = question.toLowerCase();
            const reason = lower.includes('refund')
                ? 'REFUND_REQUEST'
                : lower.includes('legal') ? 'LEGAL_ISSUE'
                    : /human|agent|representative|person|manager|someone/.test(lower) ? 'HUMAN_REQUESTED'
                        : 'SENSITIVE_ISSUE';
            return { reason, summary: truncate(question, 200) };
        }
        if (tool === 'get_order_status') {
            return { orderReference: orderReference(question) ?? '' };
        }
        return {};
    }

    /**
     * Hashed bag-of-words projection: deterministic, offline and the same
     * dimensionality as the hosted model, so switching providers only requires
     * re-embedding existing documents.
     */
    async generateEmbedding(text: string): Promise<number[]> {
        const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
        const tokens = tokenize(text);
        if (tokens.length === 0) return vector;

        for (const token of tokens) {
            const digest = createHash('sha256').update(token).digest();
            for (let repeat = 0; repeat < 4; repeat += 1) {
                const index = digest.readUInt32BE(repeat * 4) % EMBEDDING_DIMENSIONS;
                const sign = (digest[16 + repeat] & 1) === 0 ? 1 : -1;
                vector[index] += sign;
            }
        }

        const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
        return magnitude === 0 ? vector : vector.map(value => value / magnitude);
    }

    async classifyIntent(text: string): Promise<IntentResult> {
        return detectIntent(text);
    }

    async summarizeConversation(messages: ChatMessage[]): Promise<ConversationSummary> {
        const customerTurns = messages.filter(message => message.role === 'user');
        const first = customerTurns[0]?.content ?? '';
        const { intent, sentiment } = detectIntent(customerTurns.map(turn => turn.content).join(' '));
        const lastAssistant = [...messages].reverse().find(message => message.role === 'assistant')?.content ?? '';

        return {
            summary: truncate(first || 'Customer conversation', 180),
            intent,
            sentiment,
            resolved: lastAssistant.length > 0 && lastAssistant !== NO_ANSWER_REPLY,
        };
    }
}
