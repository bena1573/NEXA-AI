'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ConversationStatus, Handler, MessageRole } from '@prisma/client';
import { apiRequest } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/field';
import { ErrorState } from '@/components/ui/states';
import { cn, formatTime } from '@/lib/utils';

export type ThreadMessage = {
    id: string;
    role: MessageRole;
    content: string;
    confidence: number | null;
    createdAt: string;
};

export function ConversationThread({
    conversationId,
    status,
    handler,
    messages,
    canReply,
    canManage,
}: {
    conversationId: string;
    status: ConversationStatus;
    handler: Handler;
    messages: ThreadMessage[];
    canReply: boolean;
    canManage: boolean;
}) {
    const router = useRouter();
    const [draft, setDraft] = useState('');
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function reply(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (draft.trim() === '') return;

        setPending(true);
        setError(null);
        const { error: failure } = await apiRequest(`/api/conversations/${conversationId}/messages`, {
            body: { content: draft },
        });
        setPending(false);

        if (failure) {
            setError(failure.message);
            return;
        }
        setDraft('');
        router.refresh();
    }

    async function setStatus(next: ConversationStatus) {
        setPending(true);
        setError(null);
        const { error: failure } = await apiRequest(`/api/conversations/${conversationId}`, {
            method: 'PATCH',
            body: { status: next, resolved: next === 'RESOLVED' },
        });
        setPending(false);

        if (failure) {
            setError(failure.message);
            return;
        }
        router.refresh();
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Transcript</CardTitle>
                <div className="flex items-center gap-2">
                    <Badge tone={status === 'ESCALATED' ? 'warning' : 'neutral'}>{status.toLowerCase()}</Badge>
                    <Badge tone={handler === 'HUMAN' ? 'accent' : 'primary'}>
                        {handler === 'HUMAN' ? 'human' : 'ai'}
                    </Badge>
                </div>
            </CardHeader>
            <CardBody className="space-y-4">
                {error && <ErrorState message={error} />}

                <ol className="space-y-3">
                    {messages.map(message => (
                        <li
                            key={message.id}
                            className={cn('flex', message.role === 'CUSTOMER' ? 'justify-start' : 'justify-end')}
                        >
                            <div
                                className={cn(
                                    'max-w-[80%] space-y-1 rounded-2xl px-3 py-2 text-sm',
                                    message.role === 'CUSTOMER'
                                        ? 'bg-surface-raised'
                                        : message.role === 'SYSTEM'
                                            ? 'bg-warning/10 text-warning'
                                            : 'bg-primary/15',
                                )}
                            >
                                <p className="whitespace-pre-wrap">{message.content}</p>
                                <p className="text-[11px] text-muted">
                                    {message.role.toLowerCase()} · {formatTime(message.createdAt)}
                                    {message.confidence !== null && ` · ${Math.round(message.confidence * 100)}% confident`}
                                </p>
                            </div>
                        </li>
                    ))}
                </ol>

                {canManage && (
                    <div className="flex flex-wrap gap-2">
                        {status !== 'RESOLVED' && (
                            <Button variant="secondary" size="sm" disabled={pending} onClick={() => void setStatus('RESOLVED')}>
                                Mark resolved
                            </Button>
                        )}
                        {status !== 'ESCALATED' && (
                            <Button variant="ghost" size="sm" disabled={pending} onClick={() => void setStatus('ESCALATED')}>
                                Flag for a human
                            </Button>
                        )}
                        {status !== 'OPEN' && (
                            <Button variant="ghost" size="sm" disabled={pending} onClick={() => void setStatus('OPEN')}>
                                Reopen
                            </Button>
                        )}
                    </div>
                )}

                {canReply && (
                    <form onSubmit={reply} className="space-y-2">
                        <Textarea
                            value={draft}
                            onChange={event => setDraft(event.target.value)}
                            aria-label="Reply to the customer"
                            placeholder="Reply as a human — the AI stops answering this conversation."
                        />
                        <Button type="submit" disabled={pending || draft.trim() === ''}>Send reply</Button>
                    </form>
                )}
            </CardBody>
        </Card>
    );
}
