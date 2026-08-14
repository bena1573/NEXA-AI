import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
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
import { buildSummaryPrompt } from '@/lib/ai/prompt';

type ApiToolCall = { id: string; function: { name: string; arguments: string } };
type ApiMessage = {
    role: string;
    content: string | null;
    tool_calls?: ApiToolCall[];
    tool_call_id?: string;
    name?: string;
};

const INTENTS: IntentName[] = [
    'BUSINESS_HOURS', 'PRICING', 'SERVICES', 'BOOK_APPOINTMENT', 'ORDER_STATUS',
    'COMPLAINT', 'REFUND', 'HUMAN_REQUEST', 'GENERAL_QUESTION', 'SMALL_TALK',
];

/**
 * Works with any OpenAI-shaped chat completions endpoint (OpenAI, Azure OpenAI
 * gateways, OpenRouter, vLLM, Ollama's compat API) via AI_BASE_URL.
 */
export class OpenAICompatibleProvider implements AIProvider {
    readonly id = 'openai' as const;
    readonly similarityFloor = 0.35;

    constructor(
        private readonly apiKey: string,
        private readonly baseUrl: string = env.AI_BASE_URL,
        private readonly model: string = env.AI_MODEL,
        private readonly embeddingModel: string = env.AI_EMBEDDING_MODEL,
    ) {}

    private async request<T>(path: string, body: unknown): Promise<T> {
        const response = await fetch(`${this.baseUrl}${path}`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const detail = await response.text().catch(() => '');
            logger.error('ai_provider_error', { path, status: response.status, detail: detail.slice(0, 500) });
            throw new Error(`AI provider responded with ${response.status}`);
        }

        return response.json() as Promise<T>;
    }

    private toApiMessages(messages: ChatMessage[]): ApiMessage[] {
        return messages.map(message => {
            if (message.role === 'tool') {
                return { role: 'tool', content: message.content, tool_call_id: message.toolCallId, name: message.name };
            }
            if (message.toolCalls?.length) {
                return {
                    role: message.role,
                    content: message.content || null,
                    tool_calls: message.toolCalls.map(call => ({
                        id: call.id,
                        type: 'function',
                        function: { name: call.name, arguments: JSON.stringify(call.arguments) },
                    })),
                } as ApiMessage;
            }
            return { role: message.role, content: message.content };
        });
    }

    async generateResponse(input: GenerateInput): Promise<GenerateResult> {
        type Completion = {
            choices: Array<{ message: ApiMessage; finish_reason: string }>;
            usage?: { prompt_tokens: number; completion_tokens: number };
        };

        const data = await this.request<Completion>('/chat/completions', {
            model: this.model,
            temperature: input.temperature ?? 0.2,
            max_tokens: input.maxTokens ?? 500,
            messages: this.toApiMessages(input.messages),
            ...(input.tools?.length
                ? {
                    tools: input.tools.map(tool => ({
                        type: 'function',
                        function: { name: tool.name, description: tool.description, parameters: tool.parameters },
                    })),
                    tool_choice: 'auto',
                }
                : {}),
        });

        const choice = data.choices[0];
        const toolCalls = (choice?.message.tool_calls ?? []).map(call => ({
            id: call.id,
            name: call.function.name,
            arguments: safeJson(call.function.arguments),
        }));

        return {
            content: choice?.message.content ?? '',
            toolCalls,
            // Tool-driven answers are grounded by construction; text answers are
            // gated by retrieval score in the agent loop instead.
            confidence: toolCalls.length > 0 ? 0.9 : 0.7,
            usage: data.usage
                ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens }
                : undefined,
        };
    }

    async generateEmbedding(text: string): Promise<number[]> {
        type EmbeddingResponse = { data: Array<{ embedding: number[] }> };
        const data = await this.request<EmbeddingResponse>('/embeddings', {
            model: this.embeddingModel,
            input: text,
            dimensions: EMBEDDING_DIMENSIONS,
        });
        return data.data[0]?.embedding ?? new Array(EMBEDDING_DIMENSIONS).fill(0);
    }

    async classifyIntent(text: string): Promise<IntentResult> {
        const result = await this.generateResponse({
            temperature: 0,
            maxTokens: 80,
            messages: [
                {
                    role: 'system',
                    content: `Classify the customer message. Reply as JSON: {"intent":one of ${INTENTS.join('|')},`
                        + '"confidence":0-1,"sentiment":"POSITIVE"|"NEUTRAL"|"NEGATIVE"}.',
                },
                { role: 'user', content: text },
            ],
        });

        const parsed = safeJson(result.content);
        const intent = INTENTS.includes(parsed.intent as IntentName)
            ? (parsed.intent as IntentName)
            : 'GENERAL_QUESTION';

        return {
            intent,
            confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
            sentiment: parsed.sentiment === 'POSITIVE' || parsed.sentiment === 'NEGATIVE'
                ? parsed.sentiment
                : 'NEUTRAL',
        };
    }

    async summarizeConversation(messages: ChatMessage[]): Promise<ConversationSummary> {
        const result = await this.generateResponse({
            temperature: 0,
            maxTokens: 200,
            messages: buildSummaryPrompt(messages),
        });
        const parsed = safeJson(result.content);

        return {
            summary: typeof parsed.summary === 'string' ? parsed.summary : '',
            intent: INTENTS.includes(parsed.intent as IntentName) ? (parsed.intent as IntentName) : 'GENERAL_QUESTION',
            sentiment: parsed.sentiment === 'POSITIVE' || parsed.sentiment === 'NEGATIVE' ? parsed.sentiment : 'NEUTRAL',
            resolved: parsed.resolved === true,
        };
    }
}

function safeJson(raw: string): Record<string, unknown> {
    try {
        const start = raw.indexOf('{');
        const end = raw.lastIndexOf('}');
        return start === -1 ? {} : JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
        return {};
    }
}
