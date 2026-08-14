'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { apiRequest } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { ErrorState, Spinner } from '@/components/ui/states';
import { cn } from '@/lib/utils';

type Turn = { id: string; role: 'agent' | 'caller'; content: string };

type StartResponse = { callId: string; conversationId: string; simulated: boolean; greeting: string };
type SayResponse = { content: string; escalated: boolean; confidence: number; toolsUsed: string[] };

let turnSeq = 0;
const nextId = () => `turn-${(turnSeq += 1)}`;

export function CallSimulator({ agentName }: { agentName: string }) {
    const router = useRouter();
    const [fromNumber, setFromNumber] = useState('+15551234567');
    const [call, setCall] = useState<StartResponse | null>(null);
    const [turns, setTurns] = useState<Turn[]>([]);
    const [utterance, setUtterance] = useState('');
    const [tools, setTools] = useState<string[]>([]);
    const [escalated, setEscalated] = useState(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function start() {
        setPending(true);
        setError(null);
        const { data, error: failure } = await apiRequest<StartResponse>('/api/voice/simulate', {
            body: { action: 'start', fromNumber },
        });
        setPending(false);

        if (failure || !data) {
            setError(failure?.message ?? 'The call could not be started.');
            return;
        }
        setCall(data);
        setEscalated(false);
        setTools([]);
        setTurns([{ id: nextId(), role: 'agent', content: data.greeting }]);
    }

    async function say(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const content = utterance.trim();
        if (!call || content === '') return;

        setUtterance('');
        setTurns(current => [...current, { id: nextId(), role: 'caller', content }]);
        setPending(true);
        setError(null);

        const { data, error: failure } = await apiRequest<SayResponse>('/api/voice/simulate', {
            body: { action: 'say', callId: call.callId, fromNumber, utterance: content },
        });
        setPending(false);

        if (failure || !data) {
            setError(failure?.message ?? 'The agent could not respond.');
            return;
        }
        if (data.escalated) setEscalated(true);
        if (data.toolsUsed.length > 0) setTools(current => [...new Set([...current, ...data.toolsUsed])]);
        setTurns(current => [...current, { id: nextId(), role: 'agent', content: data.content }]);
    }

    async function hangUp() {
        if (!call) return;
        setPending(true);
        await apiRequest('/api/voice/simulate', {
            body: { action: 'end', callId: call.callId, fromNumber },
        });
        setPending(false);
        setCall(null);
        router.refresh();
    }

    return (
        <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
            <Card>
                <CardHeader>
                    <CardTitle>Live transcript</CardTitle>
                    {call && <Badge tone={call.simulated ? 'warning' : 'success'}>
                        {call.simulated ? 'simulated call' : 'live call'}
                    </Badge>}
                </CardHeader>
                <CardBody className="space-y-4">
                    {error && <ErrorState message={error} />}

                    {!call
                        ? (
                            <div className="space-y-3">
                                <Field label="Caller number" hint="No telephony credentials are needed to try this.">
                                    {props => (
                                        <Input
                                            {...props}
                                            value={fromNumber}
                                            onChange={event => setFromNumber(event.target.value)}
                                        />
                                    )}
                                </Field>
                                <Button onClick={start} disabled={pending}>
                                    <Phone aria-hidden className="h-4 w-4" />
                                    Start call
                                </Button>
                            </div>
                        )
                        : (
                            <>
                                <ol className="space-y-3" aria-live="polite">
                                    {turns.map(turn => (
                                        <li
                                            key={turn.id}
                                            className={cn('flex', turn.role === 'caller' ? 'justify-start' : 'justify-end')}
                                        >
                                            <div
                                                className={cn(
                                                    'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
                                                    turn.role === 'caller' ? 'bg-surface-raised' : 'bg-primary/15',
                                                )}
                                            >
                                                <p className="whitespace-pre-wrap">{turn.content}</p>
                                                <p className="text-[11px] text-muted">
                                                    {turn.role === 'caller' ? 'Caller' : agentName}
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ol>

                                {pending && <Spinner label={`${agentName} is thinking`} />}

                                <form onSubmit={say} className="flex items-center gap-2">
                                    <Input
                                        value={utterance}
                                        onChange={event => setUtterance(event.target.value)}
                                        aria-label="What the caller says"
                                        placeholder="Say something as the caller…"
                                    />
                                    <Button type="submit" disabled={pending || utterance.trim() === ''}>Say</Button>
                                    <Button type="button" variant="danger" onClick={hangUp} disabled={pending}>
                                        <PhoneOff aria-hidden className="h-4 w-4" />
                                        Hang up
                                    </Button>
                                </form>
                            </>
                        )}
                </CardBody>
            </Card>

            <Card>
                <CardHeader><CardTitle>Call insight</CardTitle></CardHeader>
                <CardBody className="space-y-3 text-sm">
                    <p className="text-muted">
                        The simulator drives the same grounded agent, tools and escalation rules as a real call.
                    </p>
                    <div>
                        <p className="text-xs uppercase tracking-wider text-muted">Escalation</p>
                        <Badge tone={escalated ? 'warning' : 'neutral'}>
                            {escalated ? 'handed to a human' : 'handled by AI'}
                        </Badge>
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-wider text-muted">Tools used</p>
                        {tools.length === 0
                            ? <p className="text-muted">None yet</p>
                            : (
                                <ul className="space-y-1">
                                    {tools.map(tool => <li key={tool}><Badge tone="primary">{tool}</Badge></li>)}
                                </ul>
                            )}
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}
