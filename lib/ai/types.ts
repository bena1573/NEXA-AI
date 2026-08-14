export const EMBEDDING_DIMENSIONS = 1536;

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export type ChatMessage = {
    role: ChatRole;
    content: string;
    /** Set on `tool` messages to link the result back to the model's call. */
    toolCallId?: string;
    name?: string;
    toolCalls?: ToolCall[];
};

export type ToolCall = {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
};

export type ToolSpec = {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
};

export type GenerateInput = {
    messages: ChatMessage[];
    tools?: ToolSpec[];
    temperature?: number;
    maxTokens?: number;
};

export type GenerateResult = {
    content: string;
    toolCalls: ToolCall[];
    /** 0–1 self-reported grounding confidence; drives escalation. */
    confidence: number;
    usage?: { promptTokens: number; completionTokens: number };
};

export type IntentName =
    | 'BUSINESS_HOURS'
    | 'PRICING'
    | 'SERVICES'
    | 'BOOK_APPOINTMENT'
    | 'ORDER_STATUS'
    | 'COMPLAINT'
    | 'REFUND'
    | 'HUMAN_REQUEST'
    | 'GENERAL_QUESTION'
    | 'SMALL_TALK';

export type IntentResult = {
    intent: IntentName;
    confidence: number;
    sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
};

export type ConversationSummary = {
    summary: string;
    intent: IntentName;
    sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
    resolved: boolean;
};

export interface AIProvider {
    readonly id: 'demo' | 'openai';
    /**
     * Cosine score below which a chunk match counts as "no answer". It belongs to
     * the provider because embedding families put useful matches on different
     * scales — a hosted semantic model and the offline lexical one do not agree.
     */
    readonly similarityFloor: number;
    generateResponse(input: GenerateInput): Promise<GenerateResult>;
    generateEmbedding(text: string): Promise<number[]>;
    classifyIntent(text: string): Promise<IntentResult>;
    summarizeConversation(messages: ChatMessage[]): Promise<ConversationSummary>;
}
