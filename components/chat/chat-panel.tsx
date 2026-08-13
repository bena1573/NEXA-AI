'use client';

import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { apiRequest } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { cn } from '@/lib/utils';

export type WidgetConfig = {
    businessName: string;
    agentName: string;
    greeting: string;
    suggestions: string[];
};

type Bubble = { id: string; role: 'customer' | 'agent'; content: string };

type ChatResponse = {
    conversationId: string;
    reply: { content: string; escalated: boolean; confidence: number };
};

let bubbleSeq = 0;
const nextId = () => `bubble-${(bubbleSeq += 1)}`;

/**
 * The customer-facing conversation surface. Used by the hosted widget page and
 * the in-dashboard preview, so it takes no server dependencies beyond widgetId.
 */
export function ChatPanel({ widgetId, config }: { widgetId: string; config: WidgetConfig }) {
    const [messages, setMessages] = useState<Bubble[]>([
        { id: nextId(), role: 'agent', content: config.greeting },
    ]);
    const [draft, setDraft] = useState('');
    const [pending, setPending] = useState(false);
    const [escalated, setEscalated] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const conversationId = useRef<string | undefined>(undefined);
    const endOfList = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endOfList.current?.scrollIntoView({ block: 'end' });
    }, [messages, pending]);

    async function send(text: string) {
        const content = text.trim();
        if (!content || pending) return;

        setDraft('');
        setError(null);
        setMessages(current => [...current, { id: nextId(), role: 'customer', content }]);
        setPending(true);

        const { data, error: failure } = await apiRequest<ChatResponse>('/api/public/chat', {
            body: { widgetId, conversationId: conversationId.current, message: content },
        });
        setPending(false);

        if (failure || !data) {
            setError(failure?.message ?? 'The assistant is unavailable right now.');
            return;
        }

        conversationId.current = data.conversationId;
        if (data.reply.escalated) setEscalated(true);
        setMessages(current => [...current, { id: nextId(), role: 'agent', content: data.reply.content }]);
    }

    const showSuggestions = messages.length === 1 && config.suggestions.length > 0;

    return (
        <div className="flex h-full flex-col">
            <header className="border-b border-border px-4 py-3">
                <p className="font-medium">{config.businessName}</p>
                <p className="text-xs text-muted">
                    {config.agentName} · AI assistant{escalated ? ' · a team member has been notified' : ''}
                </p>
            </header>

            <div
                className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
                role="log"
                aria-live="polite"
                aria-label="Conversation"
            >
                {messages.map(message => (
                    <div
                        key={message.id}
                        className={cn('flex', message.role === 'customer' ? 'justify-end' : 'justify-start')}
                    >
                        <p
                            className={cn(
                                'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm',
                                message.role === 'customer'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-surface-raised text-foreground',
                            )}
                        >
                            {message.content}
                        </p>
                    </div>
                ))}

                {pending && (
                    <p className="flex items-center gap-1 text-sm text-muted" aria-label={`${config.agentName} is typing`}>
                        <span className="h-1.5 w-1.5 animate-typing rounded-full bg-muted" />
                        <span className="h-1.5 w-1.5 animate-typing rounded-full bg-muted [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 animate-typing rounded-full bg-muted [animation-delay:300ms]" />
                    </p>
                )}

                {showSuggestions && (
                    <ul className="flex flex-wrap gap-2 pt-2">
                        {config.suggestions.map(suggestion => (
                            <li key={suggestion}>
                                <button
                                    type="button"
                                    onClick={() => void send(suggestion)}
                                    className="rounded-full border border-border px-3 py-1 text-xs text-muted transition hover:text-foreground"
                                >
                                    {suggestion}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                {error && <p role="alert" className="text-sm text-danger">{error}</p>}
                <div ref={endOfList} />
            </div>

            <form
                className="flex items-center gap-2 border-t border-border p-3"
                onSubmit={event => {
                    event.preventDefault();
                    void send(draft);
                }}
            >
                <Input
                    value={draft}
                    onChange={event => setDraft(event.target.value)}
                    placeholder="Type your question…"
                    aria-label="Message"
                    autoComplete="off"
                />
                <Button type="submit" size="icon" aria-label="Send message" disabled={pending || draft.trim() === ''}>
                    <Send aria-hidden className="h-4 w-4" />
                </Button>
            </form>
        </div>
    );
}
